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

// Fire-and-forget: native plugin wiring (no-op on web)
initNativeBridges();

createRoot(document.getElementById("root")!).render(<App />);
