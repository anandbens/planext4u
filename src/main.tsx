// Pre-bootstrap: purge any legacy non-portal-scoped Supabase auth token.
// Older builds wrote the session under `sb-<project>-auth-token` (no portal
// suffix). On the new per-portal storage scheme, that legacy entry would still
// be readable by every tab and would silently re-hydrate the wrong identity
// (admin → customer, etc). Removing it here, before the Supabase client module
// is loaded, prevents cross-portal session leaks across tabs.
try {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  if (projectId && typeof localStorage !== "undefined") {
    const legacyKey = `sb-${projectId}-auth-token`;
    if (localStorage.getItem(legacyKey)) localStorage.removeItem(legacyKey);
  }
} catch { /* ignore */ }

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initNativeBridges } from "./lib/native-bootstrap";
import { installCdnImagePatch } from "./lib/cdn-runtime-patch";

// Install global runtime safety net so any <img>/<video>/<source>/<audio>
// pointing at a raw Backblaze URL is transparently routed via Cloudflare CDN
// before the browser fires the network request. Must run before React renders.
installCdnImagePatch();

// Fire-and-forget: native plugin wiring (no-op on web)
initNativeBridges();

// Recover from stale chunk errors after a redeploy. When the app tries to
// dynamically import a route module whose hashed file no longer exists on the
// server, the browser throws "Failed to fetch dynamically imported module".
// We reload the page once (guarded by sessionStorage) so the fresh index.html
// is fetched and the new chunk hashes are picked up. Without this, users see
// a blank screen or a broken navigation until they manually hard-refresh.
const isStaleChunkError = (msg: string) =>
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError/i.test(msg || "");

const reloadOnce = () => {
  try {
    const key = "__stale_chunk_reloaded_at";
    const last = Number(sessionStorage.getItem(key) || 0);
    // Only reload once per 60s to avoid infinite loops if the server itself is broken.
    if (Date.now() - last > 60_000) {
      sessionStorage.setItem(key, String(Date.now()));
      window.location.reload();
    }
  } catch { /* ignore */ }
};

window.addEventListener("error", (e) => {
  if (isStaleChunkError(e?.message || String(e?.error || ""))) reloadOnce();
});
window.addEventListener("unhandledrejection", (e) => {
  const msg = (e?.reason && (e.reason.message || String(e.reason))) || "";
  if (isStaleChunkError(msg)) reloadOnce();
});

createRoot(document.getElementById("root")!).render(<App />);

// After first paint, warm up the most-visited route chunks in the background
// so the second navigation is instant. Skips on Save-Data / 2G connections.
import("./lib/prefetch-routes")
  .then((m) => m.prefetchLikelyRoutes())
  .catch(() => { /* non-fatal */ });
