import { v4 as uuidv4 } from "uuid";
import { getDb } from "./db";
import type { Agent, AgentLink } from "../types";

// 在线 agent Socket ID → Agent ID 映射
const socketToAgent = new Map<string, string>();
const agentToSocket = new Map<string, string>();

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

  const existing = db.prepare("SELECT * FROM agents WHERE id = ?").get(id) as Record<string, unknown> | undefined;

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

  socketToAgent.set(socketId, id);
  agentToSocket.set(id, socketId);

  const row = db.prepare("SELECT * FROM agents WHERE id = ?").get(id) as Record<string, unknown>;
  return rowToAgent(row);
}

export function markOffline(socketId: string): string | undefined {
  const agentId = socketToAgent.get(socketId);
  if (!agentId) return undefined;

  const db = getDb();
  db.prepare("UPDATE agents SET status = 'offline', last_seen_at = ? WHERE id = ?")
    .run(new Date().toISOString(), agentId);

  socketToAgent.delete(socketId);
  agentToSocket.delete(agentId);
  return agentId;
}

export function heartbeat(agentId: string) {
  const db = getDb();
  db.prepare("UPDATE agents SET last_seen_at = ?, status = 'active' WHERE id = ?")
    .run(new Date().toISOString(), agentId);
}

export function getAllAgents(): Agent[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM agents ORDER BY created_at DESC").all() as Record<string, unknown>[];
  return rows.map(rowToAgent);
}

export function getAgent(id: string): Agent | undefined {
  const db = getDb();
  const row = db.prepare("SELECT * FROM agents WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? rowToAgent(row) : undefined;
}

export function getNetworkLinks(): AgentLink[] {
  const db = getDb();
  // 基于消息记录生成链接
  const rows = db.prepare(`
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
}

export function incrementMessages(agentId: string) {
  getDb().prepare("UPDATE agents SET total_messages = total_messages + 1 WHERE id = ?").run(agentId);
}

export function getSocketId(agentId: string): string | undefined {
  return agentToSocket.get(agentId);
}
