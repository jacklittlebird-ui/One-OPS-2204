// Helpers for the Security Service Reports tab.
// Pure functions so they can be unit-tested without React/Supabase.

export interface DispatchLike {
  id: string;
  flight_schedule_id: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  [k: string]: any;
}

/**
 * Deduplicate dispatch_assignments by flight_schedule_id.
 * - Rows without a flight_schedule_id are kept as-is (they cannot collide).
 * - Among rows sharing the same flight_schedule_id, the most-recently-updated
 *   one wins (falls back to created_at, then to id).
 */
export function dedupeDispatchRows<T extends DispatchLike>(rows: T[]): T[] {
  const byFlight = new Map<string, T>();
  const orphans: T[] = [];

  const scoreOf = (r: T) =>
    String(r.updated_at || r.created_at || "") + "|" + String(r.id || "");

  for (const r of rows) {
    const fid = r.flight_schedule_id;
    if (!fid) {
      orphans.push(r);
      continue;
    }
    const existing = byFlight.get(fid);
    if (!existing || scoreOf(r) > scoreOf(existing)) {
      byFlight.set(fid, r);
    }
  }
  return [...byFlight.values(), ...orphans];
}

/**
 * Build the set of flight_schedule_ids that belong to Security
 * (any flight with a dispatch_assignment). Used by the Handling tab to
 * exclude them so they never show up in both places.
 */
export function buildSecurityFlightIdSet(
  rows: Array<{ flight_schedule_id: string | null }>
): Set<string> {
  const s = new Set<string>();
  for (const r of rows) if (r.flight_schedule_id) s.add(r.flight_schedule_id);
  return s;
}

/**
 * Authoritative billing/list date for a dispatch row.
 *
 * flight_schedules is the SSoT: `dispatch_assignments.flight_date` can go stale
 * after a date/route amendment (e.g. a flight moved from 31 Aug to 1 Sep), which
 * made the Service Report list and the generated invoice disagree on the month.
 * Both screens MUST resolve the period through this helper.
 */
export function resolveBillingDate(row: {
  fs_arrival_date?: string | null;
  fs_departure_date?: string | null;
  arrival_date?: string | null;
  departure_date?: string | null;
  flight_date?: string | null;
}): string {
  const v =
    row?.fs_arrival_date ||
    row?.fs_departure_date ||
    row?.arrival_date ||
    row?.departure_date ||
    row?.flight_date ||
    "";
  return String(v).slice(0, 10);
}

/** Shift a YYYY-MM-DD date string by `days` (used for fetch-window buffers). */
export function shiftDateStr(date: string, days: number): string {
  if (!date) return date;
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
