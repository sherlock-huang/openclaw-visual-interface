"use client";

import { clsx } from "clsx";
import React from "react";

interface PixelCardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  glowColor?: "green" | "cyan" | "red" | "purple" | "orange";
  onClick?: () => void;
  scanLine?: boolean;
  animated?: boolean;
}

const glowMap: Record<string, string> = {
  green:  "border-pixel-green  animate-neon-green",
  cyan:   "border-pixel-cyan   animate-neon-cyan",
  red:    "border-pixel-red    animate-neon-red",
  purple: "border-[#cc44ff]   shadow-[0_0_8px_#cc44ff,0_0_20px_#cc44ff44]",
  orange: "border-[#ff8c00]   shadow-[0_0_8px_#ff8c00,0_0_20px_#ff8c0044]",
};

const cornerMap: Record<string, string> = {
  green:  "bg-pixel-green",
  cyan:   "bg-pixel-cyan",
  red:    "bg-pixel-red",
  purple: "bg-[#cc44ff]",
  orange: "bg-[#ff8c00]",
};

const glowColorMap: Record<string, string> = {
  green:  "#00ff41",
  cyan:   "#00ffff",
  red:    "#ff2244",
  purple: "#cc44ff",
  orange: "#ff8c00",
};

export function PixelCard({
  title, children, className, glowColor = "green", onClick, scanLine = false, animated = false,
}: PixelCardProps) {
  const glow = glowColorMap[glowColor];

  return (
    <div
      onClick={onClick}
      className={clsx(
        "relative bg-pixel-surface border p-4 pixel-card-enhanced",
        glowMap[glowColor],
        onClick && "cursor-pointer hover:brightness-110 transition-all duration-150",
        scanLine && "card-scan",
        animated && "animate-float",
        className
      )}
      style={{
        imageRendering: "pixelated",
        ["--card-glow" as string]: glow,
      }}
    >
      {/* Corner pixel accents - animated */}
      <span className={clsx("absolute top-0 left-0 w-2.5 h-2.5 opacity-80", cornerMap[glowColor])} />
      <span className={clsx("absolute top-0 right-0 w-2.5 h-2.5 opacity-80", cornerMap[glowColor])} />
      <span className={clsx("absolute bottom-0 left-0 w-2 h-2 opacity-40", cornerMap[glowColor])} />
      <span className={clsx("absolute bottom-0 right-0 w-2 h-2 opacity-40", cornerMap[glowColor])} />

      {/* Animated top glow line */}
      <div
        className="absolute top-0 left-2 right-2 h-px opacity-60"
        style={{
          background: `linear-gradient(90deg, transparent, ${glow}, transparent)`,
          boxShadow: `0 0 8px ${glow}`,
        }}
      />

      {/* Inner decorative frame */}
      <div className="absolute inset-1 border border-dashed border-white/5 pointer-events-none" />

      {title && (
        <div
          className="font-pixel text-[9px] text-pixel-green mb-3 uppercase tracking-widest border-b border-pixel-border pb-2 flex items-center gap-2 section-header"
          style={{ textShadow: `0 0 6px ${glow}` }}
        >
          {title}
        </div>
      )}
      {children}
    </div>
  );
}
