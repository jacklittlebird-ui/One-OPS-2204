/**
 * Utilities for matching invoice `flight_ref` strings to schedule `flight_no`s.
 *
 * Invoice flight_ref values are free-form lists like:
 *   "SM 0452/485, AOG, SM 0486, SM 0034/0035, SM1042/451, SM212/1041"
 *
 * Schedule flight_no values look like: "SM212", "SM 0212/1045", "SM 0485".
 *
 * To reliably match, we expand each invoice ref into all individual flight
 * keys (carrying the airline prefix across `/` and `-` separators) and
 * normalize both sides (uppercase, no spaces, strip leading zeros after the
 * airline code).
 */

/** Normalize a flight token for map lookup: uppercase, no spaces, strip
 *  leading zeros from the numeric tail (so "SM 0212" === "SM212"). */
export function normalizeFlightKey(raw: string): string {
  if (!raw) return "";
  const cleaned = raw.toUpperCase().replace(/\s+/g, "");
  // Strip leading zeros between the airline letters and the flight number
  // e.g. "SM0212" → "SM212", "QR007" → "QR7". Keep "AOG" / non-digit tails as-is.
  const m = cleaned.match(/^([A-Z]{1,3})0*(\d+.*)$/);
  return m ? `${m[1]}${m[2]}` : cleaned;
}

/** Expand a free-form flight_ref string into ALL the individual flight keys
 *  it represents (each normalized). The airline prefix from the first sub-token
 *  is carried over to bare-number sub-tokens. */
export function expandFlightRef(raw: string): string[] {
  if (!raw) return [];
  const out = new Set<string>();
  // Split on top-level separators
  const groups = raw.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
  for (const group of groups) {
    out.add(normalizeFlightKey(group));
    // Within a group, split on `/` and `-` to get individual flights
    const parts = group.split(/[/\-]+/).map(s => s.trim()).filter(Boolean);
    if (parts.length <= 1) continue;
    // Detect the prefix from the first part with letters (e.g. "SM 0452" → "SM")
    let prefix = "";
    const first = parts[0].toUpperCase().replace(/\s+/g, "");
    const pm = first.match(/^([A-Z]{1,3})\d/);
    if (pm) prefix = pm[1];
    for (const p of parts) {
      const upper = p.toUpperCase().replace(/\s+/g, "");
      if (/^\d+$/.test(upper) && prefix) {
        out.add(normalizeFlightKey(prefix + upper));
      } else {
        out.add(normalizeFlightKey(upper));
      }
    }
  }
  return Array.from(out).filter(Boolean);
}
