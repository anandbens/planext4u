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

createRoot(document.getElementById("root")!).render(<App />);
