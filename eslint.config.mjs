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
    "next-env.d.ts",
    // One-off Node smoke-test script, not part of the app build.
    "smoke-test.js",
  ]),
]);

export default eslintConfig;
