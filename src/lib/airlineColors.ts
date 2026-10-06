import type { CSSProperties } from "react";

// Light highlighter-style palette: pastel backgrounds with black text.
const PALETTE = [
  "#BFDBFE", // light blue
  "#FBCFE8", // light pink
  "#A7F3D0", // light emerald
  "#FDE68A", // light amber
  "#DDD6FE", // light violet
  "#FECACA", // light red
  "#A5F3FC", // light cyan
  "#D9F99D", // light lime
  "#FED7AA", // light orange
  "#F5D0FE", // light fuchsia
  "#BBF7D0", // light green
  "#FEF08A", // light yellow
  "#99F6E4", // light teal
  "#FED7AA", // light orange 2
];

export function airlineColor(name?: string | null): string {
  if (!name) return "";
  const key = String(name).toLowerCase().trim();
  if (!key) return "";
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

// Highlighter style: black text over a solid airline-colored background.
export function airlineBadgeStyle(name?: string | null): CSSProperties | undefined {
  const c = airlineColor(name);
  if (!c) return undefined;
  return { backgroundColor: c, color: "#000000", borderColor: c };
}
