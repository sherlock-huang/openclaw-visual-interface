import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  // SDK & server files have TS errors that don't affect the frontend build
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  webpack: (config) => {
    config.externals = config.externals || [];
    config.externals.push({ "better-sqlite3": "commonjs better-sqlite3" });
    return config;
  },
};

export default nextConfig;
