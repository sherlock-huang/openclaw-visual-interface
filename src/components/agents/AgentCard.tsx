"use client";

import { clsx } from "clsx";
import { LobsterSprite } from "../pixel/LobsterSprite";
import { StatusBadge, RoleBadge } from "../pixel/PixelBadge";
import { PixelCard } from "../pixel/PixelCard";
import type { Agent } from "../../types";
import { useNetworkStore } from "../../lib/store";

interface AgentCardProps {
  agent: Agent;
}

const platformLabel: Record<string, string> = {
  openclaw: "OpenClaw",
  "claude-code": "Claude Code",
  codex: "Codex",
  custom: "Custom",
};

export function AgentCard({ agent }: AgentCardProps) {
  const { selectedAgentId, selectAgent } = useNetworkStore();
  const isSelected = selectedAgentId === agent.id;

  return (
    <PixelCard
      glowColor={isSelected ? "cyan" : agent.status === "error" ? "red" : "green"}
      onClick={() => selectAgent(isSelected ? null : agent.id)}
      className={clsx("min-w-[200px]", isSelected && "ring-1 ring-pixel-cyan")}
    >
      <div className="flex items-start gap-3">
        <LobsterSprite status={agent.status} size={40} className="flex-shrink-0 mt-1" />
        <div className="flex-1 min-w-0">
          <div className="font-pixel text-[10px] text-white truncate mb-1">{agent.name}</div>
          <div className="text-[9px] text-pixel-gray font-mono mb-2">
            {platformLabel[agent.platform] || agent.platform}
          </div>
          <div className="flex flex-wrap gap-1 mb-2">
            <StatusBadge status={agent.status} />
            <RoleBadge role={agent.role} />
          </div>
          <div className="text-[8px] text-pixel-gray font-mono">
            {agent.host}:{agent.port}
          </div>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-pixel-border grid grid-cols-2 gap-2 text-[8px] font-mono">
        <div>
          <span className="text-pixel-gray">MSG</span>
          <span className="text-pixel-cyan ml-1">{agent.totalMessages}</span>
        </div>
        <div>
          <span className="text-pixel-gray">EXP</span>
          <span className="text-pixel-purple ml-1">{agent.totalExperiences}</span>
        </div>
      </div>

      {agent.capabilities.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {agent.capabilities.slice(0, 3).map((cap) => (
            <span key={cap.name} className="font-pixel text-[7px] text-pixel-gray border border-pixel-border px-1">
              {cap.name}
            </span>
          ))}
          {agent.capabilities.length > 3 && (
            <span className="font-pixel text-[7px] text-pixel-gray">+{agent.capabilities.length - 3}</span>
          )}
        </div>
      )}
    </PixelCard>
  );
}
