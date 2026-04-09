"use client";

import { clsx } from "clsx";
import { LobsterSprite } from "../pixel/LobsterSprite";
import { StatusBadge, RoleBadge } from "../pixel/PixelBadge";
import type { Agent } from "../../types";
import { useNetworkStore } from "../../lib/store";

interface AgentCardProps {
  agent: Agent;
}

const statusStripe: Record<string, string> = {
  active:  "bg-pixel-green",
  idle:    "bg-pixel-yellow",
  busy:    "bg-pixel-orange animate-pulse",
  error:   "bg-pixel-red animate-pulse",
  offline: "bg-pixel-offline",
};

const statusGlow: Record<string, string> = {
  active:  "border-pixel-green  shadow-[0_0_6px_#00ff4144]",
  idle:    "border-pixel-yellow shadow-[0_0_6px_#ffff0033]",
  busy:    "border-pixel-orange shadow-[0_0_8px_#ff8c0066] animate-neon-green",
  error:   "border-pixel-red   shadow-[0_0_10px_#ff224488] animate-neon-red",
  offline: "border-pixel-offline",
};

const capBarColor: Record<string, string> = {
  active:  "bg-pixel-green",
  idle:    "bg-pixel-yellow",
  busy:    "bg-pixel-orange",
  error:   "bg-pixel-red",
  offline: "bg-pixel-offline",
};

const platformLabel: Record<string, string> = {
  openclaw:     "OpenClaw",
  "claude-code": "CC",
  codex:        "Codex",
  custom:       "Custom",
};

const platformBadge: Record<string, string> = {
  openclaw:     "text-pixel-cyan   border-pixel-cyan",
  "claude-code": "text-pixel-purple border-[#cc44ff]",
  codex:        "text-pixel-orange border-pixel-orange",
  custom:       "text-pixel-gray   border-pixel-border",
};

export function AgentCard({ agent }: AgentCardProps) {
  const { selectedAgentId, selectAgent } = useNetworkStore();
  const isSelected = selectedAgentId === agent.id;
  const isOffline = agent.status === "offline";

  return (
    <div
      onClick={() => selectAgent(isSelected ? null : agent.id)}
      className={clsx(
        "relative border cursor-pointer group transition-all duration-150 pixel-card-enhanced",
        "bg-pixel-surface overflow-hidden",
        isSelected
          ? "border-pixel-cyan shadow-[0_0_10px_#00ffff55,inset_0_0_10px_#00ffff08]"
          : statusGlow[agent.status],
        isOffline && "opacity-50",
      )}
    >
      {/* Status stripe — left edge */}
      <div className={clsx(
        "absolute left-0 top-0 bottom-0 w-1.5",
        statusStripe[agent.status]
      )} />

      {/* Animated corner pixels */}
      <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-pixel-border opacity-60 group-hover:bg-pixel-green group-hover:opacity-100 transition-all" />
      <span className="absolute bottom-0 left-0 w-1.5 h-1.5 bg-pixel-border opacity-30 group-hover:bg-pixel-green group-hover:opacity-60 transition-all" />

      {/* Top glow line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-20" />

      <div className="pl-4 pr-3 pt-3 pb-2 relative">
        {/* Scan line overlay on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-pixel-green/5 to-transparent" />
          <div
            className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-pixel-green/20 to-transparent"
            style={{ top: "-4px", animation: "scan-beam-fast 2s linear infinite" }}
          />
        </div>
        {/* Top row: sprite + name + platform */}
        <div className="flex items-start gap-2 mb-2">
          <div className={clsx(
            "flex-shrink-0",
            agent.status === "busy" && "animate-float",
          )}>
            <LobsterSprite status={agent.status} size={36} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 mb-0.5">
              <span className="font-pixel text-[9px] text-white truncate">{agent.name}</span>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              <span className={clsx(
                "font-pixel text-[6px] border px-1 py-0.5",
                platformBadge[agent.platform] || platformBadge.custom
              )}>
                {platformLabel[agent.platform] || agent.platform}
              </span>
              <span className="font-mono text-[7px] text-pixel-gray truncate">
                {agent.host}
              </span>
            </div>
          </div>
        </div>

        {/* Status + Role badges */}
        <div className="flex flex-wrap gap-1 mb-2">
          <StatusBadge status={agent.status} />
          <RoleBadge role={agent.role} />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[8px] font-mono mb-2">
          <div className="flex items-center gap-1">
            <span className="text-pixel-gray">MSG</span>
            <span className="text-pixel-cyan font-bold">{agent.totalMessages}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-pixel-gray">XP</span>
            <span className="text-pixel-purple font-bold">{agent.totalExperiences}</span>
          </div>
        </div>

        {/* Capability bars */}
        {agent.capabilities.length > 0 && (
          <div className="space-y-1">
            {agent.capabilities.slice(0, 3).map((cap) => (
              <div key={cap.name}>
                <div className="flex justify-between items-center mb-0.5">
                  <span className="font-pixel text-[5.5px] text-pixel-gray uppercase">{cap.name}</span>
                  <span className="font-pixel text-[5.5px] text-pixel-gray">{cap.level}</span>
                </div>
                <div className="status-bar-track rounded-none">
                  <div
                    className={clsx("status-bar-fill", capBarColor[agent.status] || "bg-pixel-green")}
                    style={{ width: `${cap.level}%`, opacity: 0.8 }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom bar — activity indicator */}
      <div className={clsx(
        "h-0.5 w-full transition-all duration-300",
        agent.status === "busy"   ? "bg-pixel-orange opacity-80" :
        agent.status === "active" ? "bg-pixel-green  opacity-50" :
        agent.status === "error"  ? "bg-pixel-red    opacity-80" :
        "bg-pixel-border opacity-30"
      )} />
    </div>
  );
}
