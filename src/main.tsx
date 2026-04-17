import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initNativeBridges } from "./lib/native-bootstrap";

// Fire-and-forget: native plugin wiring (no-op on web)
initNativeBridges();

createRoot(document.getElementById("root")!).render(<App />);
