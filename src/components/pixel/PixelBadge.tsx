"use client";

import { clsx } from "clsx";
import type { AgentStatus } from "../../types";

const statusStyles: Record<AgentStatus, { color: string; label: string; dot: string; glow: string }> = {
  active:  { color: "text-pixel-green border-pixel-green",  label: "ACTIVE",  dot: "bg-pixel-green animate-pulse", glow: "shadow-[0_0_6px_#00ff41]" },
  idle:    { color: "text-pixel-yellow border-pixel-yellow", label: "IDLE",    dot: "bg-pixel-yellow", glow: "shadow-[0_0_6px_#ffff00]" },
  busy:    { color: "text-pixel-orange border-pixel-orange", label: "BUSY",    dot: "bg-pixel-orange animate-pulse", glow: "shadow-[0_0_6px_#ff8c00]" },
  error:   { color: "text-pixel-red border-pixel-red",       label: "ERROR",   dot: "bg-pixel-red animate-ping", glow: "shadow-[0_0_8px_#ff2244]" },
  offline: { color: "text-pixel-offline border-pixel-offline", label: "OFFLINE", dot: "bg-pixel-offline", glow: "" },
};

interface StatusBadgeProps {
  status: AgentStatus;
  className?: string;
  glow?: boolean;
}

export function StatusBadge({ status, className, glow = false }: StatusBadgeProps) {
  const s = statusStyles[status];
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 font-pixel text-[8px] border px-2 py-1",
        s.color,
        glow && s.glow,
        className
      )}
      style={{ imageRendering: "pixelated" }}
    >
      <span className={clsx("w-2 h-2 rounded-none inline-block relative", s.dot)} />
      {/* Status indicator bar */}
      <span
        className="w-px h-3 bg-current opacity-50 ml-1"
        style={{ boxShadow: glow ? `0 0 4px currentColor` : undefined }}
      />
      {s.label}
    </span>
  );
}

interface RoleBadgeProps {
  role: string;
  className?: string;
  glow?: boolean;
}

const roleColors: Record<string, string> = {
  master:     "text-pixel-purple border-[#cc44ff] shadow-[0_0_6px_#cc44ff]",
  worker:     "text-pixel-cyan border-pixel-cyan shadow-[0_0_6px_#00ffff]",
  specialist: "text-pixel-orange border-pixel-orange shadow-[0_0_6px_#ff8c00]",
  observer:   "text-pixel-gray border-pixel-gray",
};

export function RoleBadge({ role, className, glow = false }: RoleBadgeProps) {
  const color = roleColors[role] || roleColors.worker;
  return (
    <span
      className={clsx(
        "font-pixel text-[8px] border px-2 py-1 uppercase inline-flex items-center gap-1.5",
        color,
        glow && "shadow-[0_0_8px_currentColor]",
        className
      )}
    >
      <span className="text-[10px] opacity-70">◆</span>
      {role}
    </span>
  );
}
