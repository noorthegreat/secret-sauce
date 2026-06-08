import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split heavy, separable vendor libraries into their own cacheable
        // chunks. The admin-only libs (recharts/leaflet/reactflow) additionally
        // sit behind the lazy-loaded Admin route, so regular users never fetch
        // them. React/router are intentionally left in the default chunk to
        // avoid init-order issues from over-splitting.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("recharts") || id.includes("/d3-") || id.includes("victory-vendor")) return "charts";
          if (id.includes("leaflet")) return "maps";
          if (id.includes("reactflow") || id.includes("@reactflow")) return "flow";
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("i18next")) return "i18n";
        },
      },
    },
  },
}));
