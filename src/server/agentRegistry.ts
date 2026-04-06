import { v4 as uuidv4 } from "uuid";
import { getDb } from "./db";
import type { Agent, AgentLink } from "../types";

// ── Socket ↔ Agent mappings (always in-memory) ────────────────
const socketToAgent = new Map<string, string>();
const agentToSocket = new Map<string, string>();

// ── In-memory agent cache (source of truth when DB unavailable) ─
const agentCache = new Map<string, Agent>();

function rowToAgent(row: Record<string, unknown>): Agent {
  return {
    id: row.id as string,
    name: row.name as string,
    role: row.role as Agent["role"],
    platform: row.platform as Agent["platform"],
    status: row.status as Agent["status"],
    host: row.host as string,
    port: row.port as number,
    pid: row.pid as number | undefined,
    version: row.version as string,
    capabilities: JSON.parse(row.capabilities as string),
    metadata: JSON.parse(row.metadata as string),
    connectedTo: JSON.parse(row.connected_to as string),
    createdAt: row.created_at as string,
    lastSeenAt: row.last_seen_at as string,
    totalMessages: row.total_messages as number,
    totalExperiences: row.total_experiences as number,
  };
}

export function registerAgent(
  data: Omit<Agent, "createdAt" | "lastSeenAt" | "totalMessages" | "totalExperiences">,
  socketId: string
): Agent {
  const db = getDb();
  const now = new Date().toISOString();
  const id = data.id || uuidv4();

  // Build the agent object directly from input (no re-read from DB needed)
  const existing = agentCache.get(id);
  const agent: Agent = {
    id,
    name: data.name,
    role: data.role,
    platform: data.platform,
    status: "active",
    host: data.host,
    port: data.port,
    pid: data.pid,
    version: data.version,
    capabilities: data.capabilities ?? [],
    metadata: data.metadata ?? {},
    connectedTo: [],
    createdAt: existing?.createdAt ?? now,
    lastSeenAt: now,
    totalMessages: existing?.totalMessages ?? 0,
    totalExperiences: existing?.totalExperiences ?? 0,
  };

  // Persist to DB (best-effort)
  try {
    if (existing) {
      db.prepare(`
        UPDATE agents SET
          name = ?, status = 'active', host = ?, port = ?, pid = ?,
          version = ?, capabilities = ?, metadata = ?, last_seen_at = ?
        WHERE id = ?
      `).run(
        data.name, data.host, data.port, data.pid ?? null,
        data.version,
        JSON.stringify(data.capabilities),
        JSON.stringify(data.metadata),
        now, id
      );
    } else {
      db.prepare(`
        INSERT INTO agents (id, name, role, platform, status, host, port, pid, version, capabilities, metadata, connected_to, created_at, last_seen_at, total_messages, total_experiences)
        VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, '[]', ?, ?, 0, 0)
      `).run(
        id, data.name, data.role, data.platform,
        data.host, data.port, data.pid ?? null,
        data.version,
        JSON.stringify(data.capabilities),
        JSON.stringify(data.metadata),
        now, now
      );
    }
  } catch { /* DB unavailable – memory cache is source of truth */ }

  agentCache.set(id, agent);
  socketToAgent.set(socketId, id);
  agentToSocket.set(id, socketId);

  return agent;
}

export function markOffline(socketId: string): string | undefined {
  const agentId = socketToAgent.get(socketId);
  if (!agentId) return undefined;

  const now = new Date().toISOString();
  try {
    getDb().prepare("UPDATE agents SET status = 'offline', last_seen_at = ? WHERE id = ?")
      .run(now, agentId);
  } catch { /* ignore */ }

  const cached = agentCache.get(agentId);
  if (cached) agentCache.set(agentId, { ...cached, status: "offline", lastSeenAt: now });

  socketToAgent.delete(socketId);
  agentToSocket.delete(agentId);
  return agentId;
}

export function heartbeat(agentId: string) {
  const now = new Date().toISOString();
  try {
    getDb().prepare("UPDATE agents SET last_seen_at = ?, status = 'active' WHERE id = ?")
      .run(now, agentId);
  } catch { /* ignore */ }
  const cached = agentCache.get(agentId);
  if (cached) agentCache.set(agentId, { ...cached, status: "active", lastSeenAt: now });
}

export function getAllAgents(): Agent[] {
  // Try DB first; fall back to memory cache
  try {
    const rows = getDb().prepare("SELECT * FROM agents ORDER BY created_at DESC").all() as Record<string, unknown>[];
    if (rows.length > 0 || agentCache.size === 0) return rows.map(rowToAgent);
  } catch { /* fall through */ }
  return Array.from(agentCache.values()).sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt)
  );
}

export function clearOfflineAgents(): number {
  let count = 0;
  // Clear from memory cache
  for (const [id, agent] of agentCache.entries()) {
    if (agent.status === "offline") { agentCache.delete(id); count++; }
  }
  // Clear from DB
  try {
    const result = getDb().prepare("DELETE FROM agents WHERE status = 'offline'").run() as { changes: number };
    count = Math.max(count, result.changes);
  } catch { /* memory mode */ }
  return count;
}

export function getAgent(id: string): Agent | undefined {
  try {
    const row = getDb().prepare("SELECT * FROM agents WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (row) return rowToAgent(row);
  } catch { /* fall through */ }
  return agentCache.get(id);
}

export function getNetworkLinks(): AgentLink[] {
  try {
    const rows = getDb().prepare(`
      SELECT
        from_id, to_id,
        COUNT(*) as message_count,
        MAX(created_at) as last_activity
      FROM messages
      WHERE to_id != 'broadcast'
      GROUP BY from_id, to_id
    `).all() as { from_id: string; to_id: string; message_count: number; last_activity: string }[];

    return rows.map((r) => ({
      source: r.from_id,
      target: r.to_id,
      strength: Math.min(r.message_count / 100, 1),
      messageCount: r.message_count,
      lastActivity: r.last_activity,
    }));
  } catch {
    return [];
  }
}

export function incrementMessages(agentId: string) {
  try {
    getDb().prepare("UPDATE agents SET total_messages = total_messages + 1 WHERE id = ?").run(agentId);
  } catch { /* ignore */ }
  const cached = agentCache.get(agentId);
  if (cached) agentCache.set(agentId, { ...cached, totalMessages: cached.totalMessages + 1 });
}

export function getSocketId(agentId: string): string | undefined {
  return agentToSocket.get(agentId);
}
