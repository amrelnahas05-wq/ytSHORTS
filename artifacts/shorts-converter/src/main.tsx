import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Point API calls at the backend (Render) when running on GitHub Pages
// Falls back to relative URLs for local dev (where the API runs alongside)
const apiBase = import.meta.env.VITE_API_URL;
if (apiBase) {
  // Dynamically set base URL on the generated API client
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__API_BASE_URL__ = apiBase;
}

createRoot(document.getElementById("root")!).render(<App />);
