import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for Cloudflare Pages deployment
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },

  webpack: (config) => {
    config.externals = config.externals || [];
    config.externals.push({ "better-sqlite3": "commonjs better-sqlite3" });
    return config;
  },
};

export default nextConfig;
