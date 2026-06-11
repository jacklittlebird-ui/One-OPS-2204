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

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import { useChannel } from "@/contexts/ChannelContext";
import { useAuth } from "@/contexts/AuthContext";
import { resolvePolicy, canUseHistoryScope, type QueryPolicy } from "@/data/policy";
import { queryKeys } from "@/cache/queryKeys";


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
  "id,flight_no,airline_id,authority,clearance_type,skd_type,aircraft_type,registration,route,sta,std,arrival_date,departure_date,status,handling_agent";


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
  handling_agent: string | null;
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

/**
 * Single-row fetcher — used by detail dialogs after a list row is clicked.
 * Pair with `usePrefetchFlight` on hover for an instant-open feel.
 */
async function fetchFlightById(id: string) {
  const { data, error } = await supabase
    .from("flight_schedules")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function useFlightById(id: string | null | undefined) {
  const { session } = useAuth();
  return useQuery({
    queryKey: id ? queryKeys.flights.byId(id) : ["flights", "byId", "__noop__"],
    queryFn: () => fetchFlightById(id as string),
    enabled: !!session && !!id,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Imperative prefetch — wire to `onMouseEnter` / `onFocus` on list rows so the
 * detail row lands in the cache before the user clicks. Combined with
 * `useFlightById` the modal opens with zero perceived latency.
 */
export function usePrefetchFlight() {
  const qc = useQueryClient();
  return useCallback(
    (id: string) => {
      if (!id) return;
      qc.prefetchQuery({
        queryKey: queryKeys.flights.byId(id),
        queryFn: () => fetchFlightById(id),
        staleTime: 60_000,
      });
    },
    [qc],
  );
}

/**
 * Ensures the full flight row is in cache and returns it. Use on Edit/Open
 * clicks to guarantee the modal sees every column (the list projection
 * intentionally omits some). Resolves from cache instantly when the row was
 * prefetched on hover.
 */
export function useEnsureFlight() {
  const qc = useQueryClient();
  return useCallback(
    (id: string) =>
      qc.ensureQueryData({
        queryKey: queryKeys.flights.byId(id),
        queryFn: () => fetchFlightById(id),
        staleTime: 60_000,
      }),
    [qc],
  );
}

// Realtime placeholder — wired in Tier 3 (ops live board only).
export function useFlightRealtime(): void {
  // Intentionally a no-op for now. The live ops board will register a
  // Supabase realtime channel here and invalidate the flights cache.
}


