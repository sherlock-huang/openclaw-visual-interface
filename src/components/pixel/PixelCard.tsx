"use client";

import { clsx } from "clsx";
import React from "react";

interface PixelCardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  glowColor?: "green" | "cyan" | "red" | "purple" | "orange";
  onClick?: () => void;
}

const glowMap = {
  green: "border-pixel-green shadow-pixel-green",
  cyan: "border-pixel-cyan shadow-pixel-cyan",
  red: "border-pixel-red shadow-pixel-red",
  purple: "border-[#cc44ff] shadow-[0_0_10px_#cc44ff]",
  orange: "border-[#ff8c00] shadow-[0_0_10px_#ff8c00]",
};

export function PixelCard({ title, children, className, glowColor = "green", onClick }: PixelCardProps) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        "bg-pixel-surface border-2 p-4 relative",
        "before:absolute before:inset-0 before:pointer-events-none",
        glowMap[glowColor],
        onClick && "cursor-pointer hover:brightness-110 transition-all",
        className
      )}
      style={{ imageRendering: "pixelated" }}
    >
      {title && (
        <div className="font-pixel text-[10px] text-pixel-green mb-3 uppercase tracking-widest border-b border-pixel-border pb-2">
          {title}
        </div>
      )}
      {children}
    </div>
  );
}
