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

// Realtime placeholder — wired in Tier 3 (ops live board only).
export function useFlightRealtime(): void {
  // Intentionally a no-op for now. The live ops board will register a
  // Supabase realtime channel here and invalidate the flights cache.
}
