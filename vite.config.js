import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { computeSiteStats } from "./scripts/site-stats.mjs";

export default defineConfig({
  plugins: [reactRouter(), tailwindcss()],
  define: {
    __SITE_STATS__: JSON.stringify(computeSiteStats()),
  },
  build: {
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@supabase')) return 'supabase'
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.js",
  },
});
