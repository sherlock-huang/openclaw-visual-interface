"use client";

import { clsx } from "clsx";
import React from "react";

type Variant = "primary" | "danger" | "ghost" | "cyan";

const variants: Record<Variant, string> = {
  primary: "bg-pixel-green text-black hover:bg-[#00cc33] active:translate-y-px",
  danger:  "bg-pixel-red text-white hover:bg-[#cc1133] active:translate-y-px",
  ghost:   "bg-transparent text-pixel-green border border-pixel-green hover:bg-pixel-green hover:text-black",
  cyan:    "bg-transparent text-pixel-cyan border border-pixel-cyan hover:bg-pixel-cyan hover:text-black",
};

interface PixelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function PixelButton({ variant = "primary", className, children, ...props }: PixelButtonProps) {
  return (
    <button
      {...props}
      className={clsx(
        "font-pixel text-[9px] px-4 py-2 uppercase tracking-wider transition-all",
        "shadow-pixel active:shadow-none disabled:opacity-40 disabled:cursor-not-allowed",
        variants[variant],
        className
      )}
    >
      {children}
    </button>
  );
}
