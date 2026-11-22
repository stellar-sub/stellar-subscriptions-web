import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * Resolve a path relative to this config file.
 */
function local(rel: string): string {
  return fileURLToPath(new URL(rel, import.meta.url));
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": local("."),
      // msw/node and @mswjs/interceptors sub-paths export "browser": null (or
      // browser-specific files) which vite's import-analysis rejects when the
      // "browser" condition is active.  Alias them directly to their Node
      // build so the exports map is never evaluated for these entries.
      "msw/node": local("node_modules/msw/lib/node/index.js"),
      "@mswjs/interceptors/ClientRequest": local(
        "node_modules/@mswjs/interceptors/lib/node/interceptors/ClientRequest/index.js",
      ),
      "@mswjs/interceptors/XMLHttpRequest": local(
        "node_modules/@mswjs/interceptors/lib/node/interceptors/XMLHttpRequest/node.js",
      ),
      "@mswjs/interceptors/WebSocket": local(
        "node_modules/@mswjs/interceptors/lib/node/interceptors/WebSocket/index.js",
      ),
      "@mswjs/interceptors/fetch": local(
        "node_modules/@mswjs/interceptors/lib/node/interceptors/fetch/node.js",
      ),
    },
    // Drop "browser" so packages that export null for that condition don't
    // break.  "node" first so server-only sub-paths resolve correctly.
    conditions: ["node", "module", "import", "default"],
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
    // `browser` is intentionally omitted: msw/node exports `browser: null`
    // which causes vite to fail when `browser` is listed as a condition.
    // Tests run in jsdom so browser-specific entry points aren't needed;
    // packages that have only a browser build still resolve via `default`.
    conditions: ["module", "import", "default"],
    conditions: ["node", "browser", "module", "import", "default"],
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next"],
    server: {
      deps: {
        // Inline most node_modules so source maps resolve to .ts source files.
        // Exclude vitest/its runner internals to prevent duplicate module
        // instances (which break beforeAll/afterAll suite registration).
        inline: [/node_modules\/(?!vitest|@vitest)/],
        // Inline most dependencies so their source maps are resolved and stack
        // traces point to .ts source files rather than compiled .js output.
        // vitest's own packages must NOT be inlined — doing so breaks the
        // suite-context tracking that beforeAll/afterAll rely on.
        inline: [/node_modules\/(?!vitest)/],
        // Inline most third-party deps so source maps resolve to .ts files.
        // Exclude vitest's own runner/utils (inlining them creates duplicate
        // module instances that break suite tracking) and msw + interceptors
        // (they use "node" export conditions incompatible with vite's browser
        // transformer even with the aliases above).
        inline: [/node_modules\/(?!(@vitest|vitest|msw|@mswjs)\/)/],
      },
    },
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
