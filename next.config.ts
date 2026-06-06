import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const csp = [
  "default-src 'self'",
  // wasm-unsafe-eval is required for the imagetracerjs Web Worker
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // blob: allows the worker URL created with new Worker(new URL(...))
  "worker-src blob:",
  "connect-src 'self'",
].join("; ");

const nextConfig: NextConfig = {
  // output:'export' only during `next build` — it breaks `next dev`
  ...(isProd ? { output: "export" } : {}),
  reactStrictMode: true,
  // Serve CSP as an HTTP header in production (meta tags can't cover all Next.js inline scripts)
  async headers() {
    if (!isProd) return [];
    return [
      {
        source: "/(.*)",
        headers: [{ key: "Content-Security-Policy", value: csp }],
      },
    ];
  },
};

export default nextConfig;
