import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    ".cursor/**",
    ".impeccable/**",
    ".superpowers/**",
    ".worktrees/**",
    "next-env.d.ts",
    // One-off Node smoke-test script, not part of the app build.
    "smoke-test.js",
    // Local experimental spikes — not part of the app build.
    "scripts/spike-*.mjs",
  ]),
]);

export default eslintConfig;
