/**
 * Theme + UI settings persistence.
 * Stored in localStorage and applied to <html> on app boot
 * so the user's choices survive page reloads.
 */

export type ThemeMode = "light" | "dark";
export type SidebarStyle = "tinted" | "dark" | "light" | "glass";
export type BackgroundStyle = "solid" | "subtle-gradient" | "mesh";
export type FontScale = "compact" | "comfortable" | "spacious";

export interface ThemeSettings {
  mode: ThemeMode;
  primary: string;        // HSL triplet, e.g. "243 55% 25%"
  accent: string;         // HSL triplet
  radius: string;         // numeric in rem (no unit), e.g. "0.5"
  sidebarStyle: SidebarStyle;
  backgroundStyle: BackgroundStyle;
  fontScale: FontScale;
  highContrast: boolean;
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
  sidebarStyle: "tinted",
  backgroundStyle: "solid",
  fontScale: "comfortable",
  highContrast: false,
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

/* ───────────── Curated Presets ───────────── */
export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  mode: ThemeMode;
  primary: string;
  accent: string;
  radius: string;
  sidebarStyle: SidebarStyle;
  backgroundStyle: BackgroundStyle;
}

export const THEME_PRESETS: ThemePreset[] = [
  { id: "aviation",   name: "Aviation Blue",  description: "Classic airline cockpit feel",      mode: "light", primary: "205 85% 35%", accent: "190 80% 45%", radius: "0.5",  sidebarStyle: "tinted", backgroundStyle: "solid" },
  { id: "midnight",   name: "Midnight Cockpit", description: "Dark mode for night ops",         mode: "dark",  primary: "210 90% 55%", accent: "190 80% 50%", radius: "0.5",  sidebarStyle: "dark",   backgroundStyle: "subtle-gradient" },
  { id: "desert",     name: "Desert Sand",    description: "Warm sandy palette",                 mode: "light", primary: "30 60% 38%",  accent: "40 85% 50%",  radius: "0.625",sidebarStyle: "tinted", backgroundStyle: "subtle-gradient" },
  { id: "emerald",    name: "Emerald Tower",  description: "Crisp green & teal",                 mode: "light", primary: "160 60% 32%", accent: "175 70% 40%", radius: "0.5",  sidebarStyle: "tinted", backgroundStyle: "solid" },
  { id: "monochrome", name: "Monochrome",     description: "Minimal black & white",              mode: "light", primary: "220 15% 20%", accent: "220 10% 45%", radius: "0.25", sidebarStyle: "dark",   backgroundStyle: "solid" },
  { id: "sunset",     name: "Sunset Gate",    description: "Warm amber & rose",                  mode: "light", primary: "15 80% 48%",  accent: "340 75% 55%", radius: "0.75", sidebarStyle: "tinted", backgroundStyle: "mesh" },
  { id: "royal",      name: "Royal Indigo",   description: "Deep indigo & gold accents",         mode: "light", primary: "243 55% 30%", accent: "45 90% 50%",  radius: "0.5",  sidebarStyle: "tinted", backgroundStyle: "solid" },
  { id: "ocean",      name: "Deep Ocean",     description: "Soothing dark blue tones",           mode: "dark",  primary: "200 90% 50%", accent: "180 70% 45%", radius: "0.625",sidebarStyle: "dark",   backgroundStyle: "mesh" },
  { id: "forest",     name: "Forest Lounge",  description: "Earthy greens & browns",             mode: "light", primary: "145 50% 28%", accent: "85 55% 40%",  radius: "0.5",  sidebarStyle: "tinted", backgroundStyle: "solid" },
  { id: "contrast",   name: "High Contrast",  description: "Maximum readability (a11y)",         mode: "light", primary: "220 100% 30%",accent: "0 85% 45%",   radius: "0.25", sidebarStyle: "dark",   backgroundStyle: "solid" },
];

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
  root.style.setProperty("--accent", t.accent);
  root.style.setProperty("--sidebar-primary", t.accent);
  root.style.setProperty("--success", t.accent);
  root.style.setProperty("--radius", `${t.radius}rem`);
  root.classList.toggle("dark", t.mode === "dark");

  // Sidebar style
  const sidebarBg =
    t.sidebarStyle === "dark"   ? "220 25% 12%" :
    t.sidebarStyle === "light"  ? "0 0% 100%"   :
    t.sidebarStyle === "glass"  ? "0 0% 100%"   :
    /* tinted */                  darken(t.primary);
  root.style.setProperty("--sidebar-background", sidebarBg);
  root.classList.toggle("sidebar-glass", t.sidebarStyle === "glass");
  root.classList.toggle("sidebar-light", t.sidebarStyle === "light");

  // Background style
  root.classList.remove("bg-solid", "bg-subtle-gradient", "bg-mesh");
  root.classList.add(`bg-${t.backgroundStyle}`);

  // Font scale
  const fontPx =
    t.fontScale === "compact"   ? "14px" :
    t.fontScale === "spacious"  ? "17px" :
    /* comfortable */             "16px";
  root.style.fontSize = fontPx;

  // High contrast
  root.classList.toggle("high-contrast", t.highContrast);
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
