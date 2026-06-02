/**
 * Returns a consistent Tailwind color badge class for a given service/clearance type.
 * Uses semantic colors for known types; falls back to a hash-based palette for unknowns.
 */
export const TYPE_COLOR_MAP: Record<string, string> = {
  // Security types
  "Arrival Security": "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  "Departure Security": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  "Turnaround Security": "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
  "Maintenance Security": "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
  "Ramp Security": "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",

  // Handling / clearance types
  "Full Handling": "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  "Arrival Handling": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200",
  "Departure Handling": "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200",
  "Technical Stop": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200",
  "Catering Only": "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-200",
  "Fuel Only": "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
  "Hotel Accommodation": "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
  "Maintenance": "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  "Payment": "bg-lime-100 text-lime-800 dark:bg-lime-900/40 dark:text-lime-200",
  "Supervision Only": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200",
  "Touch & Go": "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-200",
  "Transportation": "bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-200",
  "Landing": "bg-stone-100 text-stone-800 dark:bg-stone-900/40 dark:text-stone-200",

  // Short / dispatch names
  "Arrival": "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  "Departure": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  "Turnaround": "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",

  // Handling report types (already had statusColor; kept for consistency)
  "Turn Around": "bg-primary/10 text-primary",
  "Night Stop": "bg-info/10 text-info",
  "Transit": "bg-success/10 text-success",
  "Technical": "bg-warning/10 text-warning",
  "Ferry In": "bg-accent/10 text-accent",
  "Ferry Out": "bg-accent/10 text-accent",
  "VIP Hall": "bg-destructive/10 text-destructive",
  "Overflying": "bg-muted text-muted-foreground",
};

const FALLBACK_PALETTE = [
  "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
  "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
  "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200",
  "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200",
  "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200",
  "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-200",
  "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
  "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
  "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  "bg-lime-100 text-lime-800 dark:bg-lime-900/40 dark:text-lime-200",
  "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200",
  "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-200",
  "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
  "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
  "bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-200",
];

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function getTypeBadgeClass(type: string | undefined | null): string {
  if (!type) return "bg-muted text-muted-foreground";
  const key = type.trim();
  if (TYPE_COLOR_MAP[key]) return TYPE_COLOR_MAP[key];
  const idx = hashString(key) % FALLBACK_PALETTE.length;
  return FALLBACK_PALETTE[idx];
}
