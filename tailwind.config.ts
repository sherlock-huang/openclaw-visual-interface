import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Press Start 2P"', "monospace"],
        mono: ['"Courier New"', "monospace"],
      },
      colors: {
        // 像素风调色板
        pixel: {
          bg: "#0a0a0f",
          surface: "#12121a",
          border: "#2a2a3f",
          green: "#00ff41",
          cyan: "#00ffff",
          yellow: "#ffff00",
          orange: "#ff8c00",
          red: "#ff2244",
          purple: "#cc44ff",
          blue: "#4488ff",
          gray: "#666688",
          // 龙虾状态色
          active: "#00ff41",
          idle: "#ffff00",
          busy: "#ff8c00",
          error: "#ff2244",
          offline: "#444466",
        },
      },
      boxShadow: {
        pixel: "4px 4px 0px #000000",
        "pixel-green": "0 0 10px #00ff41, 0 0 20px #00ff4144",
        "pixel-cyan": "0 0 10px #00ffff, 0 0 20px #00ffff44",
        "pixel-red": "0 0 10px #ff2244, 0 0 20px #ff224444",
      },
      animation: {
        blink: "blink 1s step-end infinite",
        scanline: "scanline 8s linear infinite",
        "pulse-green": "pulse-green 2s ease-in-out infinite",
        "float-up": "float-up 3s ease-out forwards",
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        "pulse-green": {
          "0%, 100%": { boxShadow: "0 0 5px #00ff41" },
          "50%": { boxShadow: "0 0 20px #00ff41, 0 0 40px #00ff4166" },
        },
        "float-up": {
          "0%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(-60px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
