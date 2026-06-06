import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",      // pure static files — no server attack surface
  reactStrictMode: true,
};

export default nextConfig;
