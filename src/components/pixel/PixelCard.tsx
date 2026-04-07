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
}

const glowMap: Record<string, string> = {
  green:  "border-pixel-green  animate-neon-green",
  cyan:   "border-pixel-cyan   animate-neon-cyan",
  red:    "border-pixel-red    animate-neon-red",
  purple: "border-[#cc44ff]   shadow-[0_0_8px_#cc44ff,0_0_20px_#cc44ff44]",
  orange: "border-[#ff8c00]   shadow-[0_0_8px_#ff8c00,0_0_20px_#ff8c0044]",
};

const cornerMap: Record<string, string> = {
  green:  "border-pixel-green",
  cyan:   "border-pixel-cyan",
  red:    "border-pixel-red",
  purple: "border-[#cc44ff]",
  orange: "border-[#ff8c00]",
};

export function PixelCard({
  title, children, className, glowColor = "green", onClick, scanLine = false,
}: PixelCardProps) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        "relative bg-pixel-surface border p-4",
        glowMap[glowColor],
        onClick && "cursor-pointer hover:brightness-110 transition-all duration-150",
        scanLine && "card-scan",
        className
      )}
      style={{ imageRendering: "pixelated" }}
    >
      {/* Corner pixel accents */}
      <span className={clsx("absolute top-0 left-0 w-2 h-2 opacity-80", cornerMap[glowColor].replace("border-", "bg-"))} />
      <span className={clsx("absolute top-0 right-0 w-2 h-2 opacity-80", cornerMap[glowColor].replace("border-", "bg-"))} />
      <span className={clsx("absolute bottom-0 left-0 w-2 h-2 opacity-40", cornerMap[glowColor].replace("border-", "bg-"))} />
      <span className={clsx("absolute bottom-0 right-0 w-2 h-2 opacity-40", cornerMap[glowColor].replace("border-", "bg-"))} />

      {title && (
        <div className="font-pixel text-[9px] text-pixel-green mb-3 uppercase tracking-widest border-b border-pixel-border pb-2 flex items-center gap-2">
          <span className="text-pixel-green opacity-60">▸</span>
          {title}
        </div>
      )}
      {children}
    </div>
  );
}
