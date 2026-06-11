// Flights domain — the first proper domain-driven data layer.
//
// Callers depend on this surface, NOT on `useSupabaseTable("flight_schedules")`.
// Internal storage/columns/cache can change without touching pages.
//
//   useFlights(policy?)        → active operational view (default 180d, station-scoped)
//   useFlightHistory()         → full history, role-gated to history-eligible roles
//   useFlightRealtime()        → reserved for the live ops board (Tier 3)
//
// All hooks share the same React Query cache via useSupabaseTable, so invalidations
// stay consistent across the app.

import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import { useChannel } from "@/contexts/ChannelContext";
import { resolvePolicy, canUseHistoryScope, type QueryPolicy } from "@/data/policy";

/** Active flights — server-side date window applied (default 180d). */
export function useFlights<T extends Record<string, any> = any>(policy?: QueryPolicy) {
  const { userRoles } = useChannel();
  const resolved = resolvePolicy({ scope: "active", ...policy }, userRoles);
  return useSupabaseTable<T>("flight_schedules", resolved);
}

/**
 * Full-history flights — role-gated.
 * For roles without history access this transparently downgrades to active
 * (same as useFlights). UI should hide / disable history affordances for them.
 */
export function useFlightHistory<T extends Record<string, any> = any>(policy?: Omit<QueryPolicy, "scope">) {
  const { userRoles } = useChannel();
  const resolved = resolvePolicy({ scope: "history", ...policy }, userRoles);
  return useSupabaseTable<T>("flight_schedules", resolved);
}

/** Whether the current user is allowed to view full flight history. */
export function useCanViewFlightHistory(): boolean {
  const { userRoles } = useChannel();
  return canUseHistoryScope(userRoles);
}

/**
 * Narrow column projection used by every flight LIST view (tables, boards, pickers).
 * 12 columns instead of 37 — payload drops ~60–70%, JSON parsing is faster,
 * and React Query memory pressure on /flight-schedule and /clearances drops.
 * Detail dialogs should call useFlights() (full row) when opened.
 */
export const FLIGHT_LIST_COLUMNS =
  "id,flight_no,airline_id,authority,clearance_type,skd_type,aircraft_type,registration,route,sta,std,arrival_date,departure_date,status";

export interface FlightListRow {
  id: string;
  flight_no: string | null;
  airline_id: string | null;
  authority: string | null;
  clearance_type: string | null;
  skd_type: string | null;
  aircraft_type: string | null;
  registration: string | null;
  route: string | null;
  sta: string | null;
  std: string | null;
  arrival_date: string | null;
  departure_date: string | null;
  status: string | null;
}

/**
 * List-projection hook — same scope rules as useFlights() but only ships
 * the columns list/board screens actually render. Cache key includes the
 * projection so list and full-row queries never collide.
 */
export function useFlightList<T extends Record<string, any> = FlightListRow>(
  policy?: QueryPolicy,
) {
  const { userRoles } = useChannel();
  const resolved = resolvePolicy({ scope: "active", select: FLIGHT_LIST_COLUMNS, ...policy }, userRoles);
  return useSupabaseTable<T>("flight_schedules", resolved);
}

// Realtime placeholder — wired in Tier 3 (ops live board only).
export function useFlightRealtime(): void {
  // Intentionally a no-op for now. The live ops board will register a
  // Supabase realtime channel here and invalidate the flights cache.
}

