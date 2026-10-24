import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next"],
    coverage: {
      provider: "v8",
      include: ["lib/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
      reporter: ["text"],
      // Floors sit just below today's numbers so a drop fails but today passes.
      // Raise them as the missing component and lib tests land.
      thresholds: {
        "lib/**": { statements: 35, branches: 85, functions: 45, lines: 35 },
        "components/**": { statements: 50, branches: 80, functions: 60, lines: 50 },
      },
    },
  },
});
