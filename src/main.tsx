import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSettingsFromStorage } from "./lib/themeStorage";

// Restore user's saved theme + system preferences before first paint
initSettingsFromStorage();

createRoot(document.getElementById("root")!).render(<App />);
