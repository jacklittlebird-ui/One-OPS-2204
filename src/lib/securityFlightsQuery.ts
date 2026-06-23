// Shared query layer for the Security flight lists rendered in BOTH the
// Clearance portal (AllClearanceFlights with securityOnly) and the
// Operations portal (SecurityServiceReports).
//
// Goal: identical filters + identical pagination + deterministic order so
// both portals report the EXACT same flight count for the same data set.
//
// Filter contract (single source of truth):
//   - station scope (authority = userStation) when station-scoped
//   - clearance_type IN SECURITY_CLEARANCE_TYPES  (unless `includeAllForStation`)
//   - status NOT IN ('Cancelled', 'Rejected')
//   - optional arrival_date window (dateFrom / dateTo, inclusive)
//
// Order: arrival_date DESC NULLS LAST, then id ASC (deterministic tiebreaker).
// Pagination: 1000-row pages until the table is exhausted.

import { SECURITY_CLEARANCE_TYPES } from "@/components/clearances/ClearanceTypes";

export const SECURITY_FLIGHT_PAGE_SIZE = 1000;

export interface SecurityFlightsOptions {
  station?: string | null;
  /** When true (station-scoped or Operations portal), skip the clearance_type IN filter. */
  includeAllForStation?: boolean;
  /** When true, do not exclude status=Rejected rows (so Station/Ops can still
   *  see a flight that was returned to Clearance — the row keeps rendering
   *  with its return-reason banner until Clearance resolves it). */
  includeRejected?: boolean;
  dateFrom?: string | null;
  dateTo?: string | null;
  select?: string;
  /** Optional progress callback fired after every page. */
  onPage?: (info: { loaded: number; pageRows: number }) => void;
}

/**
 * Minimal supabase-like surface so this helper is trivially testable with
 * an in-memory mock.
 */
export interface SupabaseLike {
  from: (table: string) => any;
}

export async function fetchSecurityFlights(
  supabase: SupabaseLike,
  opts: SecurityFlightsOptions = {}
): Promise<any[]> {
  const {
    station,
    includeAllForStation = false,
    includeRejected = false,
    dateFrom,
    dateTo,
    select = "*",
    onPage,
  } = opts;

  const out: any[] = [];
  for (let from = 0; ; from += SECURITY_FLIGHT_PAGE_SIZE) {
    let q: any = supabase
      .from("flight_schedules")
      .select(select)
      // Deterministic order: primary by arrival date (most recent first),
      // tie-broken by id so paginated results never drift between refreshes.
      .order("arrival_date", { ascending: false, nullsFirst: false })
      .order("id", { ascending: true })
      .range(from, from + SECURITY_FLIGHT_PAGE_SIZE - 1);

    if (station) q = q.eq("authority", station);
    if (!includeAllForStation) q = q.in("clearance_type", SECURITY_CLEARANCE_TYPES);
    q = q.not("status", "in", includeRejected ? "(Cancelled)" : "(Cancelled,Rejected)");
    if (dateFrom) q = q.gte("arrival_date", dateFrom);
    if (dateTo) q = q.lte("arrival_date", dateTo);

    const { data, error } = await q;
    if (error) throw error;
    const rows = data || [];
    out.push(...rows);
    onPage?.({ loaded: out.length, pageRows: rows.length });
    if (rows.length < SECURITY_FLIGHT_PAGE_SIZE) break;
  }
  return out;
}
