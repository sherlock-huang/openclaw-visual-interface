"use client";

import { clsx } from "clsx";
import type { AgentStatus } from "../../types";

export type LobsterMood = "normal" | "happy" | "worried" | "sleepy" | "waving";

const statusGlow: Record<AgentStatus, string> = {
  active:  "drop-shadow-[0_0_6px_#00ff41]",
  idle:    "drop-shadow-[0_0_6px_#ffff00]",
  busy:    "drop-shadow-[0_0_6px_#ff8c00]",
  error:   "drop-shadow-[0_0_6px_#ff2244] animate-pulse",
  offline: "opacity-30 grayscale",
};

const statusColor: Record<AgentStatus, string> = {
  active:  "#00ff41",
  idle:    "#ffff00",
  busy:    "#ff8c00",
  error:   "#ff2244",
  offline: "#444466",
};

interface LobsterSpriteProps {
  status: AgentStatus;
  mood?: LobsterMood;
  size?: number;
  className?: string;
}

export function LobsterSprite({ status, mood = "normal", size = 48, className }: LobsterSpriteProps) {
  const color = statusColor[status];
  const isSleepy  = mood === "sleepy";
  const isHappy   = mood === "happy";
  const isWorried = mood === "worried";
  const isWaving  = mood === "waving";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={clsx(statusGlow[status], className)}
      style={{ imageRendering: "pixelated" }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 身体 */}
      <rect x="5" y="5" width="6" height="7" fill={color} />
      {/* 头 */}
      <rect x="6" y="3" width="4" height="3" fill={color} />
      {/* 触角 */}
      <rect x="5" y="2" width="1" height="2" fill={color} />
      <rect x="4" y="1" width="1" height="2" fill={color} />
      <rect x="10" y="2" width="1" height="2" fill={color} />
      <rect x="11" y="1" width="1" height="2" fill={color} />

      {/* ── 眼睛（mood-aware）─────────────────── */}
      {isSleepy ? (
        /* 睡眼：细横条 */
        <>
          <rect x="6" y="4" width="1" height="1" fill="#000" opacity="0.5" />
          <rect x="9" y="4" width="1" height="1" fill="#000" opacity="0.5" />
          {/* ZZZ */}
          <rect x="7" y="2" width="1" height="1" fill={color} opacity="0.6" />
          <rect x="8" y="1" width="1" height="1" fill={color} opacity="0.4" />
        </>
      ) : isHappy ? (
        /* 开心：眼睛 + 上扬嘴角 */
        <>
          <rect x="6" y="4" width="1" height="1" fill="#000" />
          <rect x="9" y="4" width="1" height="1" fill="#000" />
          {/* 笑容：两侧各一像素 */}
          <rect x="6" y="5" width="1" height="1" fill="rgba(0,0,0,0.5)" />
          <rect x="9" y="5" width="1" height="1" fill="rgba(0,0,0,0.5)" />
        </>
      ) : isWorried ? (
        /* 担心：眼睛 + 倒八字眉 */
        <>
          <rect x="6" y="4" width="1" height="1" fill="#000" />
          <rect x="9" y="4" width="1" height="1" fill="#000" />
          {/* 内高外低的忧愁眉 */}
          <rect x="6" y="3" width="1" height="1" fill={color} opacity="0.8" />
          <rect x="9" y="3" width="1" height="1" fill={color} opacity="0.8" />
          <rect x="7" y="2" width="1" height="1" fill={color} opacity="0.6" />
          <rect x="8" y="2" width="1" height="1" fill={color} opacity="0.6" />
        </>
      ) : (
        /* 默认 / waving */
        <>
          <rect x="6" y="4" width="1" height="1" fill="#000" />
          <rect x="9" y="4" width="1" height="1" fill="#000" />
        </>
      )}

      {/* ── 大钳子（mood-aware）───────────────── */}
      {isWaving ? (
        /* 左钳举起挥手 */
        <>
          <rect x="2" y="1" width="2" height="2" fill={color} />
          <rect x="1" y="0" width="2" height="1" fill={color} />
          <rect x="3" y="0" width="2" height="1" fill={color} />
        </>
      ) : (
        /* 正常左钳 */
        <>
          <rect x="2" y="5" width="3" height="2" fill={color} />
          <rect x="1" y="4" width="2" height="1" fill={color} />
          <rect x="1" y="7" width="2" height="1" fill={color} />
        </>
      )}
      {/* 右钳（始终正常） */}
      <rect x="11" y="5" width="3" height="2" fill={color} />
      <rect x="13" y="4" width="2" height="1" fill={color} />
      <rect x="13" y="7" width="2" height="1" fill={color} />

      {/* 腿 */}
      <rect x="4" y="9"  width="1" height="3" fill={color} />
      <rect x="6" y="10" width="1" height="3" fill={color} />
      <rect x="9" y="10" width="1" height="3" fill={color} />
      <rect x="11" y="9" width="1" height="3" fill={color} />
      {/* 尾巴 */}
      <rect x="5" y="12" width="2" height="2" fill={color} />
      <rect x="9" y="12" width="2" height="2" fill={color} />
      <rect x="7" y="13" width="2" height="2" fill={color} />
      {/* 身体纹路 */}
      <rect x="6" y="7" width="1" height="1" fill="rgba(0,0,0,0.4)" />
      <rect x="9" y="7" width="1" height="1" fill="rgba(0,0,0,0.4)" />
      <rect x="7" y="9" width="2" height="1" fill="rgba(0,0,0,0.3)" />
    </svg>
  );
}
