// Deterministic per-airline display colors for record tables.
// Same airline always gets the same color in every portal; readable on dark backgrounds.
const PALETTE = [
  "#60A5FA", // blue
  "#F472B6", // pink
  "#34D399", // emerald
  "#FBBF24", // amber
  "#A78BFA", // violet
  "#F87171", // red
  "#22D3EE", // cyan
  "#A3E635", // lime
  "#FB923C", // orange
  "#E879F9", // fuchsia
  "#4ADE80", // green
  "#FACC15", // yellow
  "#2DD4BF", // teal
  "#FDBA74", // light orange
];

export function airlineColor(name?: string | null): string {
  if (!name) return "";
  const key = String(name).toLowerCase().trim();
  if (!key) return "";
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
