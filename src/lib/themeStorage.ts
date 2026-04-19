/**
 * Theme + UI settings persistence.
 * Stored in localStorage and applied to <html> on app boot
 * so the user's choices survive page reloads.
 */

export type ThemeMode = "light" | "dark";

export interface ThemeSettings {
  mode: ThemeMode;
  primary: string;        // HSL triplet, e.g. "243 55% 25%"
  accent: string;         // HSL triplet
  radius: string;         // numeric in rem (no unit), e.g. "0.5"
}

export interface SystemSettings {
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  language: string;
  autoLogout: string;
  paginationSize: string;
  enableAnimations: boolean;
  compactMode: boolean;
}

export const THEME_KEY = "app:theme";
export const SYSTEM_KEY = "app:system";
export const COMPANY_KEY = "app:company";

export const DEFAULT_THEME: ThemeSettings = {
  mode: "light",
  primary: "205 85% 35%",
  accent: "190 80% 45%",
  radius: "0.5",
};

export const DEFAULT_SYSTEM: SystemSettings = {
  timezone: "Africa/Cairo",
  dateFormat: "DD/MM/YYYY",
  timeFormat: "24h",
  language: "en",
  autoLogout: "30",
  paginationSize: "25",
  enableAnimations: true,
  compactMode: false,
};

export function loadTheme(): ThemeSettings {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (!raw) return DEFAULT_THEME;
    return { ...DEFAULT_THEME, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_THEME;
  }
}

export function saveTheme(t: ThemeSettings) {
  localStorage.setItem(THEME_KEY, JSON.stringify(t));
}

export function loadSystem(): SystemSettings {
  try {
    const raw = localStorage.getItem(SYSTEM_KEY);
    if (!raw) return DEFAULT_SYSTEM;
    return { ...DEFAULT_SYSTEM, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SYSTEM;
  }
}

export function saveSystem(s: SystemSettings) {
  localStorage.setItem(SYSTEM_KEY, JSON.stringify(s));
}

/** Subtract a few % from the lightness of an HSL triplet for sidebar tint */
function darken(hsl: string, deltaPct = 7): string {
  return hsl.replace(/(\d+)%$/, (m) => {
    const n = parseInt(m);
    return `${Math.max(0, n - deltaPct)}%`;
  });
}

/** Apply a theme to the document root */
export function applyTheme(t: ThemeSettings) {
  const root = document.documentElement;
  root.style.setProperty("--primary", t.primary);
  root.style.setProperty("--ring", t.primary);
  root.style.setProperty("--sidebar-background", darken(t.primary));
  root.style.setProperty("--accent", t.accent);
  root.style.setProperty("--sidebar-primary", t.accent);
  root.style.setProperty("--success", t.accent);
  root.style.setProperty("--radius", `${t.radius}rem`);
  root.classList.toggle("dark", t.mode === "dark");
}

/** Apply system display prefs (compact mode, animations) */
export function applySystem(s: SystemSettings) {
  const root = document.documentElement;
  root.classList.toggle("no-animations", !s.enableAnimations);
  root.classList.toggle("compact", s.compactMode);
}

/** Initialize from localStorage. Call once before React renders. */
export function initSettingsFromStorage() {
  applyTheme(loadTheme());
  applySystem(loadSystem());
}
