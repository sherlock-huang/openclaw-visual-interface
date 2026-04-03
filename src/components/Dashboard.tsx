"use client";

import { useEffect, useState } from "react";
import { connectSocket, disconnectSocket } from "../lib/socket";
import { useNetworkStore } from "../lib/store";
import { NetworkGraph } from "./network/NetworkGraph";
import { AgentCard } from "./agents/AgentCard";
import { MessageFeed } from "./chat/MessageFeed";
import { PixelCard } from "./pixel/PixelCard";
import { PixelButton } from "./pixel/PixelButton";
import { LobsterSprite } from "./pixel/LobsterSprite";

function StatBox({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="flex flex-col items-center px-4 py-2 border border-pixel-border">
      <span className={`font-pixel text-lg ${color}`}>{value}</span>
      <span className="font-pixel text-[7px] text-pixel-gray mt-1">{label}</span>
    </div>
  );
}

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
    { id: "graph", label: "NETWORK" },
    { id: "agents", label: "AGENTS" },
    { id: "messages", label: "COMMS" },
    { id: "experience", label: "XPSHARE" },
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

        {/* Connection bar */}
        <div className="flex items-center gap-2 ml-4">
          <span className={`w-2 h-2 rounded-none ${isConnected ? "bg-pixel-green animate-pulse" : "bg-pixel-red"}`} />
          <input
            value={serverInput}
            onChange={(e) => setServerInput(e.target.value)}
            className="bg-pixel-bg border border-pixel-border font-mono text-[10px] text-pixel-cyan px-2 py-1 w-52"
            onKeyDown={(e) => e.key === "Enter" && handleConnect()}
          />
          <PixelButton variant={isConnected ? "ghost" : "primary"} onClick={handleConnect} className="py-1">
            {isConnected ? "RECONNECT" : "CONNECT"}
          </PixelButton>
        </div>

        {/* Stats */}
        <div className="flex gap-0 ml-auto">
          <StatBox label="ONLINE" value={onlineAgents.length} color="text-pixel-green" />
          <StatBox label="MSGS" value={stats.totalMessages} color="text-pixel-cyan" />
          <StatBox label="XP" value={stats.totalExperiences} color="text-pixel-purple" />
          <StatBox label="TRANSFERS" value={stats.completedTransfers} color="text-pixel-orange" />
        </div>
      </header>

      {/* ── Tabs ── */}
      <nav className="flex border-b border-pixel-border bg-pixel-surface flex-shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`font-pixel text-[9px] px-6 py-2 border-r border-pixel-border transition-colors ${
              activeTab === tab.id
                ? "text-pixel-green bg-pixel-bg border-b-2 border-b-pixel-green"
                : "text-pixel-gray hover:text-pixel-green"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-hidden">

        {/* Network Graph */}
        {activeTab === "graph" && (
          <div className="flex h-full">
            <div className="flex-1 relative">
              <NetworkGraph />
              {!isConnected && (
                <div className="absolute inset-0 flex items-center justify-center bg-pixel-bg/80">
                  <div className="text-center">
                    <LobsterSprite status="offline" size={64} className="mx-auto mb-4" />
                    <p className="font-pixel text-[10px] text-pixel-red">SERVER OFFLINE</p>
                    <p className="font-pixel text-[8px] text-pixel-gray mt-2">Start the server with: npm run dev:server</p>
                  </div>
                </div>
              )}
            </div>
            {/* Side panel: selected agent detail */}
            <AgentDetailPanel />
          </div>
        )}

        {/* Agent Grid */}
        {activeTab === "agents" && (
          <div className="h-full overflow-y-auto p-4">
            {onlineAgents.length === 0 ? (
              <EmptyState icon="🦞" message="NO ACTIVE AGENTS" sub="Connect agents using the OpenClaw SDK" />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {onlineAgents.map((a) => <AgentCard key={a.id} agent={a} />)}
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        {activeTab === "messages" && (
          <div className="h-full">
            <MessageFeed />
          </div>
        )}

        {/* Experience sharing */}
        {activeTab === "experience" && (
          <ExperiencePanel />
        )}
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
          <div className="font-pixel text-[8px] text-pixel-gray border-b border-pixel-border pb-1">CAPABILITIES</div>
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
          <div>VERSION: <span className="text-pixel-green">{agent.version}</span></div>
          <div>LAST SEEN: <span className="text-pixel-green">{new Date(agent.lastSeenAt).toLocaleTimeString()}</span></div>
        </div>
      </div>
    </div>
  );
}

function ExperiencePanel() {
  const { agents, isConnected } = useNetworkStore();
  const [experiences, setExperiences] = useState<Record<string, unknown>[]>([]);
  const [serverUrl] = useNetworkStore((s) => [s.serverUrl]);

  useEffect(() => {
    fetch(`${serverUrl}/api/experiences`)
      .then((r) => r.json())
      .then(setExperiences)
      .catch(() => {});
  }, [serverUrl]);

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-pixel text-[10px] text-pixel-purple">EXPERIENCE VAULT</h2>
        <span className="font-pixel text-[8px] text-pixel-gray">{experiences.length} ENTRIES</span>
      </div>
      {experiences.length === 0 ? (
        <EmptyState icon="📚" message="NO EXPERIENCES YET" sub="Agents share experiences via the SDK" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {experiences.map((exp) => (
            <PixelCard key={exp.id as string} glowColor="purple">
              <div className="flex justify-between items-start mb-2">
                <span className="font-pixel text-[8px] text-pixel-purple">{exp.category as string}</span>
                <span className="font-pixel text-[8px] text-pixel-gray">
                  {agents.find((a) => a.id === exp.agent_id)?.name || (exp.agent_id as string).slice(0, 8)}
                </span>
              </div>
              <p className="text-[10px] font-mono text-white leading-relaxed">{exp.content as string}</p>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1 bg-pixel-border">
                  <div className="h-full bg-pixel-purple" style={{ width: `${exp.confidence as number}%` }} />
                </div>
                <span className="font-pixel text-[7px] text-pixel-purple">{exp.confidence as number}%</span>
              </div>
            </PixelCard>
          ))}
        </div>
      )}
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
