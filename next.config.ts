import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Dev-only allowance so impeccable live mode can load.
const __impeccableLiveDev =
  process.env.NODE_ENV === "development" ? " http://localhost:8400" : "";

const csp = [
  "default-src 'self'",
  // Next.js App Router emits inline RSC flight scripts (self.__next_f.push).
  // Without nonces, 'unsafe-inline' is required (see Next.js CSP guide).
  // wasm-unsafe-eval covers worker-compatible optimizer dependencies.
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${__impeccableLiveDev}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // Turbopack serves the vectorizer as /_next/static/... (needs 'self');
  // blob: kept for any blob-backed worker URLs.
  "worker-src 'self' blob:",
  `connect-src 'self'${__impeccableLiveDev}`,
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compress: true,
  experimental: {
    proxyClientMaxBodySize: '20mb',
  },
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
