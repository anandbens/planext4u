import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "react": path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "@tanstack/react-query", "react-router-dom"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react/jsx-runtime", "@tanstack/react-query", "react-router-dom", "@supabase/supabase-js"],
  },
  build: {
    // NOTE: Do NOT re-introduce a manualChunks split that puts recharts / d3
    // in a separate chunk from react. Doing so causes a cross-chunk circular
    // init and a runtime "Cannot access 'S' before initialization" TDZ crash
    // in the minified production build (dev works because Vite serves modules
    // on demand). Let Rollup decide chunk boundaries — its default correctly
    // co-locates React with its dependents.
    chunkSizeWarningLimit: 1600,
  },
}));

