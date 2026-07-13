import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSettingsFromStorage } from "./lib/themeStorage";
import "./i18n";
import { initArabicOverlay } from "./i18n/arabicOverlay";

// Restore user's saved theme + system preferences before first paint
initSettingsFromStorage();
initArabicOverlay();

createRoot(document.getElementById("root")!).render(<App />);
