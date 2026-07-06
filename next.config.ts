import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Dev-only allowance so impeccable live mode can load.
const __impeccableLiveDev =
  process.env.NODE_ENV === "development" ? " http://localhost:8400" : "";

const csp = [
  "default-src 'self'",
  // wasm-unsafe-eval is kept for worker-compatible optimizer dependencies.
  `script-src 'self' 'wasm-unsafe-eval'${__impeccableLiveDev}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // blob: allows the worker URL created with new Worker(new URL(...))
  "worker-src blob:",
  `connect-src 'self'${__impeccableLiveDev}`,
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compress: true,
  serverExternalPackages: ["@neplex/vectorizer"],
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
