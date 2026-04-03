"use client";

import { clsx } from "clsx";
import type { AgentStatus } from "../../types";

const statusStyles: Record<AgentStatus, { color: string; label: string; dot: string }> = {
  active:  { color: "text-pixel-green border-pixel-green",  label: "ACTIVE",  dot: "bg-pixel-green animate-pulse" },
  idle:    { color: "text-pixel-yellow border-pixel-yellow", label: "IDLE",    dot: "bg-pixel-yellow" },
  busy:    { color: "text-pixel-orange border-pixel-orange", label: "BUSY",    dot: "bg-pixel-orange animate-pulse" },
  error:   { color: "text-pixel-red border-pixel-red",       label: "ERROR",   dot: "bg-pixel-red animate-ping" },
  offline: { color: "text-pixel-offline border-pixel-offline", label: "OFFLINE", dot: "bg-pixel-offline" },
};

interface StatusBadgeProps {
  status: AgentStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const s = statusStyles[status];
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 font-pixel text-[8px] border px-2 py-1",
        s.color, className
      )}
    >
      <span className={clsx("w-2 h-2 rounded-none inline-block", s.dot)} />
      {s.label}
    </span>
  );
}

interface RoleBadgeProps {
  role: string;
  className?: string;
}

const roleColors: Record<string, string> = {
  master:     "text-pixel-purple border-[#cc44ff]",
  worker:     "text-pixel-cyan border-pixel-cyan",
  specialist: "text-pixel-orange border-pixel-orange",
  observer:   "text-pixel-gray border-pixel-gray",
};

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const color = roleColors[role] || roleColors.worker;
  return (
    <span className={clsx("font-pixel text-[8px] border px-2 py-1 uppercase", color, className)}>
      {role}
    </span>
  );
}
