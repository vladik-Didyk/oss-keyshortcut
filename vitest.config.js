import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { computeSiteStats } from "./scripts/site-stats.mjs";

export default defineConfig({
  plugins: [react()],
  define: {
    __SITE_STATS__: JSON.stringify(computeSiteStats()),
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.js",
    exclude: ["e2e/**", "node_modules/**"],
  },
});
