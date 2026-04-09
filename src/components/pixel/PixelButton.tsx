"use client";

import { clsx } from "clsx";
import React from "react";

type Variant = "primary" | "danger" | "ghost" | "cyan" | "purple";

const variants: Record<Variant, string> = {
  primary: "bg-pixel-green text-black hover:bg-[#00cc33] active:translate-y-px shadow-pixel btn-shimmer relative overflow-hidden",
  danger:  "bg-pixel-red text-white hover:bg-[#cc1133] active:translate-y-px shadow-pixel btn-shimmer relative overflow-hidden",
  ghost:   "bg-transparent text-pixel-green border-2 border-pixel-green hover:bg-pixel-green hover:text-black shadow-pixel active:shadow-none",
  cyan:    "bg-transparent text-pixel-cyan border-2 border-pixel-cyan hover:bg-pixel-cyan hover:text-black shadow-pixel active:shadow-none",
  purple:  "bg-transparent text-pixel-purple border-2 border-[#cc44ff] hover:bg-[#cc44ff] hover:text-black shadow-pixel active:shadow-none",
};

interface PixelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  glow?: boolean;
}

export function PixelButton({ variant = "primary", className, children, glow = false, ...props }: PixelButtonProps) {
  return (
    <button
      {...props}
      className={clsx(
        "font-pixel text-[9px] px-4 py-2 uppercase tracking-wider transition-all",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        variants[variant],
        glow && "shadow-[0_0_10px_currentColor]",
        className
      )}
    >
      {/* Pixel corner decorations */}
      <span className="absolute top-0 left-0 w-1 h-1 bg-white/30" />
      <span className="absolute top-0 right-0 w-1 h-1 bg-white/30" />
      <span className="absolute bottom-0 left-0 w-1 h-1 bg-black/20" />
      <span className="absolute bottom-0 right-0 w-1 h-1 bg-black/20" />
      {children}
    </button>
  );
}
