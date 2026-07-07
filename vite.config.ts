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
    // Split big vendor libs into their own chunks so route-level lazy loading
    // is not undone by a giant shared vendor bundle.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) return "react-vendor";
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("@tanstack")) return "query";
          if (id.includes("@radix-ui")) return "radix";
          if (id.includes("date-fns") || id.includes("react-day-picker")) return "date";
          if (id.includes("embla-carousel")) return "embla";
          if (id.includes("@dnd-kit")) return "dnd";
          if (id.includes("firebase") || id.includes("@capacitor-firebase")) return "firebase";
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
          if (id.includes("xlsx") || id.includes("jspdf") || id.includes("html2canvas")) return "export";
          if (id.includes("framer-motion")) return "motion";
          if (id.includes("lucide-react")) return "icons";
        },
      },
    },
    // Silence noisy warnings; chunks are now intentionally split.
    chunkSizeWarningLimit: 1200,
  },
}));

