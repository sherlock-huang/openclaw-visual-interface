"use client";

import { useEffect, useState, useMemo } from "react";
import { clsx } from "clsx";
import { connectSocket, disconnectSocket, shareExperience } from "../lib/socket";
import { useNetworkStore } from "../lib/store";
import { NetworkGraph } from "./network/NetworkGraph";
import { AgentCard } from "./agents/AgentCard";
import { MessageFeed } from "./chat/MessageFeed";
import { PixelCard } from "./pixel/PixelCard";
import { PixelButton } from "./pixel/PixelButton";
import { StatusBadge, RoleBadge } from "./pixel/PixelBadge";
import { LobsterSprite } from "./pixel/LobsterSprite";
import type { AgentStatus, AgentRole } from "../types";

// ── Raw experience row from API ──────────────────────────────
interface ExpRow {
  id: string;
  agent_id: string;
  category: string;
  content: string;
  tags: string;         // JSON-encoded string[]
  confidence: number;
  usage_count: number;
  created_at: string;
}

// ── Helpers ──────────────────────────────────────────────────
function parseTags(raw: string): string[] {
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}

function StatBox({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="flex flex-col items-center px-4 py-2 border border-pixel-border">
      <span className={`font-pixel text-lg ${color}`}>{value}</span>
      <span className="font-pixel text-[7px] text-pixel-gray mt-1">{label}</span>
    </div>
  );
}

function EmptyState({ icon, message, sub }: { icon: string; message: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <p className="font-pixel text-[10px] text-pixel-gray">{message}</p>
      <p className="font-pixel text-[8px] text-pixel-gray mt-2">{sub}</p>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────
export function Dashboard() {
  const { agents, isConnected, serverUrl, setServerUrl, stats, setStats } = useNetworkStore();
  const [serverInput, setServerInput] = useState(serverUrl);
  const [activeTab, setActiveTab] = useState<"graph" | "agents" | "messages" | "experience">("graph");

  useEffect(() => {
    connectSocket(serverUrl);
    return () => disconnectSocket();
  }, []);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch(`${serverUrl}/api/stats`);
        if (res.ok) setStats(await res.json());
      } catch { /* server offline */ }
    }
    fetchStats();
    const t = setInterval(fetchStats, 5000);
    return () => clearInterval(t);
  }, [serverUrl, setStats]);

  function handleConnect() {
    setServerUrl(serverInput);
    connectSocket(serverInput);
  }

  const onlineAgents = agents.filter((a) => a.status !== "offline");

  const tabs = [
    { id: "graph",      label: "NETWORK"  },
    { id: "agents",     label: "AGENTS"   },
    { id: "messages",   label: "COMMS"    },
    { id: "experience", label: "XPSHARE"  },
  ] as const;

  return (
    <div className="flex flex-col h-screen bg-pixel-bg text-pixel-green overflow-hidden">

      {/* ── Header ── */}
      <header className="flex items-center gap-4 px-4 py-2 border-b-2 border-pixel-green bg-pixel-surface flex-shrink-0">
        <LobsterSprite status={isConnected ? "active" : "offline"} size={32} />
        <div>
          <h1 className="font-pixel text-[13px] text-pixel-green">OPENCLAW</h1>
          <p className="font-pixel text-[7px] text-pixel-gray">MULTI-AGENT VISUAL MANAGER v0.1</p>
        </div>

        <div className="flex items-center gap-2 ml-4">
          <span className={`w-2 h-2 rounded-none ${isConnected ? "bg-pixel-green animate-pulse" : "bg-pixel-red"}`} />
          <input
            value={serverInput}
            onChange={(e) => setServerInput(e.target.value)}
            className="bg-pixel-bg border border-pixel-border font-mono text-[10px] text-pixel-cyan px-2 py-1 w-52 outline-none focus:border-pixel-cyan"
            onKeyDown={(e) => e.key === "Enter" && handleConnect()}
          />
          <PixelButton variant={isConnected ? "ghost" : "primary"} onClick={handleConnect} className="py-1">
            {isConnected ? "RECONNECT" : "CONNECT"}
          </PixelButton>
        </div>

        <div className="flex gap-0 ml-auto">
          <StatBox label="ONLINE"    value={onlineAgents.length}       color="text-pixel-green"  />
          <StatBox label="MSGS"      value={stats.totalMessages}        color="text-pixel-cyan"   />
          <StatBox label="XP"        value={stats.totalExperiences}     color="text-pixel-purple" />
          <StatBox label="TRANSFERS" value={stats.completedTransfers}   color="text-pixel-orange" />
        </div>
      </header>

      {/* ── Tabs ── */}
      <nav className="flex border-b border-pixel-border bg-pixel-surface flex-shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "font-pixel text-[9px] px-6 py-2 border-r border-pixel-border transition-colors",
              activeTab === tab.id
                ? "text-pixel-green bg-pixel-bg border-b-2 border-b-pixel-green"
                : "text-pixel-gray hover:text-pixel-green"
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-hidden">

        {/* ── Network Graph ── */}
        {activeTab === "graph" && (
          <div className="flex h-full">
            <div className="flex-1 relative">
              <NetworkGraph />
              {!isConnected && (
                <div className="absolute inset-0 flex items-center justify-center bg-pixel-bg/80">
                  <div className="text-center">
                    <LobsterSprite status="offline" size={64} className="mx-auto mb-4" />
                    <p className="font-pixel text-[10px] text-pixel-red">SERVER OFFLINE</p>
                    <p className="font-pixel text-[8px] text-pixel-gray mt-2">
                      Start the server with: npm run dev:server
                    </p>
                  </div>
                </div>
              )}
            </div>
            <AgentDetailPanel />
          </div>
        )}

        {/* ── Agents Tab ── */}
        {activeTab === "agents" && <AgentGridTab />}

        {/* ── Messages Tab ── */}
        {activeTab === "messages" && (
          <div className="h-full">
            <MessageFeed />
          </div>
        )}

        {/* ── Experience Tab ── */}
        {activeTab === "experience" && <ExperiencePanel />}
      </main>

      {/* ── Footer ── */}
      <footer className="flex-shrink-0 border-t border-pixel-border px-4 py-1 bg-pixel-surface flex items-center justify-between">
        <span className="font-pixel text-[7px] text-pixel-gray">
          {isConnected ? `● CONNECTED TO ${serverUrl}` : "○ DISCONNECTED"}
        </span>
        <span className="font-pixel text-[7px] text-pixel-gray animate-blink">_</span>
      </footer>
    </div>
  );
}

// ── Agent Detail Side Panel ───────────────────────────────────
function AgentDetailPanel() {
  const { agents, selectedAgentId } = useNetworkStore();
  const agent = agents.find((a) => a.id === selectedAgentId);

  if (!agent) {
    return (
      <div className="w-64 border-l border-pixel-border bg-pixel-surface p-4 flex items-center justify-center">
        <p className="font-pixel text-[8px] text-pixel-gray text-center">
          CLICK NODE<br />TO INSPECT
        </p>
      </div>
    );
  }

  return (
    <div className="w-64 border-l border-pixel-border bg-pixel-surface overflow-y-auto">
      <div className="p-4">
        <AgentCard agent={agent} />

        <div className="mt-3 space-y-2">
          <div className="font-pixel text-[8px] text-pixel-gray border-b border-pixel-border pb-1">
            CAPABILITIES
          </div>
          {agent.capabilities.length === 0 ? (
            <p className="font-pixel text-[7px] text-pixel-gray">None reported</p>
          ) : (
            agent.capabilities.map((cap) => (
              <div key={cap.name} className="flex justify-between items-center">
                <span className="font-pixel text-[7px] text-white">{cap.name}</span>
                <div className="flex items-center gap-1">
                  <div className="w-16 h-2 bg-pixel-border">
                    <div className="h-full bg-pixel-cyan" style={{ width: `${cap.level}%` }} />
                  </div>
                  <span className="font-pixel text-[7px] text-pixel-cyan">{cap.level}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-3 text-[8px] font-mono text-pixel-gray space-y-1">
          <div>ID: <span className="text-pixel-green">{agent.id.slice(0, 12)}…</span></div>
          <div>HOST: <span className="text-pixel-cyan">{agent.host}:{agent.port}</span></div>
          <div>VERSION: <span className="text-pixel-green">{agent.version}</span></div>
          <div>MSGS: <span className="text-pixel-orange">{agent.totalMessages}</span></div>
          <div>XP: <span className="text-pixel-purple">{agent.totalExperiences}</span></div>
          <div>LAST SEEN: <span className="text-pixel-green">{new Date(agent.lastSeenAt).toLocaleTimeString()}</span></div>
        </div>
      </div>
    </div>
  );
}

// ── Agent Grid Tab ────────────────────────────────────────────
type GroupBy = "host" | "role" | "none";

function AgentGridTab() {
  const { agents } = useNetworkStore();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<AgentStatus | "all">("all");
  const [groupBy, setGroupBy] = useState<GroupBy>("host");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return agents.filter((a) => {
      const matchStatus = filterStatus === "all" || a.status === filterStatus;
      const matchSearch = !q || a.name.toLowerCase().includes(q) || a.host.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [agents, search, filterStatus]);

  // Build groups
  const groups = useMemo(() => {
    if (groupBy === "none") return [{ key: "ALL", items: filtered }];
    const map = new Map<string, typeof filtered>();
    for (const a of filtered) {
      const key = groupBy === "host" ? a.host : a.role;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, items]) => ({ key, items }));
  }, [filtered, groupBy]);

  const statusOptions: (AgentStatus | "all")[] = ["all", "active", "idle", "busy", "error", "offline"];

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-pixel-border bg-pixel-surface flex-shrink-0">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="SEARCH AGENTS…"
          className="bg-pixel-bg border border-pixel-border text-pixel-green font-pixel text-[8px] px-2 py-1 w-40 placeholder:text-pixel-gray outline-none focus:border-pixel-green"
        />

        {/* Status filter */}
        <div className="flex gap-1">
          {statusOptions.map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={clsx(
                "font-pixel text-[7px] px-2 py-1 border transition-colors",
                filterStatus === s
                  ? "border-pixel-green text-pixel-green bg-[#00ff4122]"
                  : "border-pixel-border text-pixel-gray hover:border-pixel-green hover:text-pixel-green"
              )}
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Group by */}
        <div className="flex gap-1 ml-auto items-center">
          <span className="font-pixel text-[7px] text-pixel-gray">GROUP:</span>
          {(["host", "role", "none"] as GroupBy[]).map((g) => (
            <button
              key={g}
              onClick={() => setGroupBy(g)}
              className={clsx(
                "font-pixel text-[7px] px-2 py-1 border transition-colors",
                groupBy === g
                  ? "border-pixel-cyan text-pixel-cyan bg-[#00ffff22]"
                  : "border-pixel-border text-pixel-gray hover:border-pixel-cyan hover:text-pixel-cyan"
              )}
            >
              {g.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Groups */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {filtered.length === 0 ? (
          <EmptyState icon="🦞" message="NO AGENTS FOUND" sub="Adjust filters or connect agents" />
        ) : (
          groups.map(({ key, items }) => (
            <div key={key}>
              {groupBy !== "none" && (
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-pixel text-[8px] text-pixel-cyan">{key.toUpperCase()}</span>
                  <div className="flex-1 border-t border-pixel-border" />
                  <span className="font-pixel text-[7px] text-pixel-gray">{items.length}</span>
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {items.map((a) => <AgentCard key={a.id} agent={a} />)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Experience Vault Panel ────────────────────────────────────
type SortMode = "confidence" | "date" | "usage";

function ExperiencePanel() {
  const { agents, serverUrl } = useNetworkStore();
  const [experiences, setExperiences] = useState<ExpRow[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>("date");
  const [transferTarget, setTransferTarget] = useState<{ expId: string; toId: string } | null>(null);

  const onlineAgents = agents.filter((a) => a.status !== "offline");

  // Fetch experiences
  useEffect(() => {
    fetch(`${serverUrl}/api/experiences`)
      .then((r) => r.json())
      .then((rows: ExpRow[]) => setExperiences(rows))
      .catch(() => {});
  }, [serverUrl]);

  // Unique categories
  const categories = useMemo(() => {
    const cats = [...new Set(experiences.map((e) => e.category))].sort();
    return ["all", ...cats];
  }, [experiences]);

  // Filtered + sorted experiences
  const displayed = useMemo(() => {
    const q = search.toLowerCase();
    let list = experiences.filter((e) => {
      const matchCat = activeCategory === "all" || e.category === activeCategory;
      const tags = parseTags(e.tags);
      const matchSearch =
        !q ||
        e.content.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        tags.some((t) => t.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });

    if (sortMode === "confidence") list = [...list].sort((a, b) => b.confidence - a.confidence);
    else if (sortMode === "usage") list = [...list].sort((a, b) => b.usage_count - a.usage_count);
    // default: already sorted by date from API

    return list;
  }, [experiences, search, activeCategory, sortMode]);

  function handleTransfer(expId: string, toId: string) {
    const exp = experiences.find((e) => e.id === expId);
    if (!exp) return;
    shareExperience({
      fromId: "dashboard",
      toId,
      experienceIds: [expId],
      accepted: true,
      reason: "Shared from dashboard",
    });
    setTransferTarget(null);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-pixel-border bg-pixel-surface flex-shrink-0">
        <span className="font-pixel text-[9px] text-pixel-purple">EXPERIENCE VAULT</span>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="SEARCH…"
          className="bg-pixel-bg border border-pixel-border text-pixel-green font-pixel text-[8px] px-2 py-1 w-32 placeholder:text-pixel-gray outline-none focus:border-pixel-green ml-2"
        />

        {/* Sort */}
        <div className="flex gap-1 ml-auto items-center">
          <span className="font-pixel text-[7px] text-pixel-gray">SORT:</span>
          {(["date", "confidence", "usage"] as SortMode[]).map((s) => (
            <button
              key={s}
              onClick={() => setSortMode(s)}
              className={clsx(
                "font-pixel text-[7px] px-2 py-1 border transition-colors",
                sortMode === s
                  ? "border-pixel-purple text-pixel-purple bg-[#cc44ff22]"
                  : "border-pixel-border text-pixel-gray hover:border-pixel-purple hover:text-pixel-purple"
              )}
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>

        <span className="font-pixel text-[7px] text-pixel-gray">{displayed.length} ENTRIES</span>
      </div>

      {/* Category tabs */}
      <div className="flex gap-0 border-b border-pixel-border bg-pixel-surface flex-shrink-0 overflow-x-auto">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={clsx(
              "font-pixel text-[7px] px-3 py-2 border-r border-pixel-border whitespace-nowrap transition-colors flex-shrink-0",
              activeCategory === cat
                ? "text-pixel-purple border-b-2 border-b-pixel-purple bg-pixel-bg"
                : "text-pixel-gray hover:text-pixel-purple"
            )}
          >
            {cat.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Experience cards */}
      <div className="flex-1 overflow-y-auto p-4">
        {displayed.length === 0 ? (
          <EmptyState icon="📚" message="NO EXPERIENCES YET" sub="Agents share experiences via the SDK" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {displayed.map((exp) => {
              const tags = parseTags(exp.tags);
              const agentName =
                agents.find((a) => a.id === exp.agent_id)?.name ?? exp.agent_id.slice(0, 8);
              const isTransferring = transferTarget?.expId === exp.id;

              return (
                <PixelCard key={exp.id} glowColor="purple">
                  {/* Header row */}
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <span className="font-pixel text-[8px] text-pixel-purple truncate">
                      {exp.category}
                    </span>
                    <span className="font-pixel text-[7px] text-pixel-gray flex-shrink-0">
                      🦞 {agentName}
                    </span>
                  </div>

                  {/* Content */}
                  <p className="text-[10px] font-mono text-white leading-relaxed mb-3">
                    {exp.content}
                  </p>

                  {/* Tags */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="font-pixel text-[6px] px-1.5 py-0.5 border border-pixel-border text-pixel-cyan bg-[#00ffff11]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Confidence bar + usage */}
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-pixel-border">
                      <div
                        className="h-full bg-pixel-purple transition-all"
                        style={{ width: `${exp.confidence}%` }}
                      />
                    </div>
                    <span className="font-pixel text-[7px] text-pixel-purple w-8 text-right">
                      {exp.confidence}%
                    </span>
                    <span className="font-pixel text-[7px] text-pixel-gray">
                      ×{exp.usage_count}
                    </span>
                  </div>

                  {/* Transfer control */}
                  <div className="mt-3 pt-2 border-t border-pixel-border">
                    {isTransferring ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={transferTarget?.toId ?? ""}
                          onChange={(e) =>
                            setTransferTarget({ expId: exp.id, toId: e.target.value })
                          }
                          className="flex-1 bg-pixel-bg border border-pixel-border text-pixel-cyan font-pixel text-[7px] px-1 py-1"
                        >
                          <option value="">SELECT AGENT…</option>
                          {onlineAgents
                            .filter((a) => a.id !== exp.agent_id)
                            .map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name}
                              </option>
                            ))}
                        </select>
                        <button
                          onClick={() => {
                            if (transferTarget?.toId) handleTransfer(exp.id, transferTarget.toId);
                          }}
                          disabled={!transferTarget?.toId}
                          className="font-pixel text-[7px] px-2 py-1 bg-pixel-purple text-black disabled:opacity-30"
                        >
                          TEACH
                        </button>
                        <button
                          onClick={() => setTransferTarget(null)}
                          className="font-pixel text-[7px] px-2 py-1 border border-pixel-border text-pixel-gray hover:text-white"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setTransferTarget({ expId: exp.id, toId: "" })}
                        disabled={onlineAgents.length === 0}
                        className="font-pixel text-[7px] px-2 py-1 border border-pixel-purple text-pixel-purple hover:bg-[#cc44ff22] disabled:opacity-30 transition-colors"
                      >
                        TEACH ▸
                      </button>
                    )}
                  </div>
                </PixelCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
