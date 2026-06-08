import { defineConfig } from "vitest/config";
import path from "path";

// Vitest config. No React plugin needed for the current pure-logic tests
// (esbuild transpiles TS); add @vitejs/plugin-react here if/when .tsx
// component tests are introduced.
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
