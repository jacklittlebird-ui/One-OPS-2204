// Dispatch domain — security service tasks.
//
//   useDispatchBoard(policy?)  → full-row active operational view (legacy / detail-heavy pages)
//   useDispatchList(policy?)   → narrow projection for list/board grids (preferred)
//   useDispatchById(id)        → single-row detail fetch (for dialogs)
//   usePrefetchDispatch()      → hover/focus prefetch for instant-open dialogs
//   useEnsureDispatch()        → guarantees full row in cache before opening editor
//   useDispatchHistory()       → full history, role-gated
//   useDispatchRealtime()      → reserved for the live ops board (Tier 3)

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import { useChannel } from "@/contexts/ChannelContext";
import { useAuth } from "@/contexts/AuthContext";
import { resolvePolicy, canUseHistoryScope, type QueryPolicy } from "@/data/policy";
import { queryKeys } from "@/cache/queryKeys";

export function useDispatchBoard<T extends Record<string, any> = any>(policy?: QueryPolicy) {
  const { userRoles } = useChannel();
  const resolved = resolvePolicy({ scope: "active", ...policy }, userRoles);
  return useSupabaseTable<T>("dispatch_assignments", resolved);
}

export function useDispatchHistory<T extends Record<string, any> = any>(policy?: Omit<QueryPolicy, "scope">) {
  const { userRoles } = useChannel();
  const resolved = resolvePolicy({ scope: "history", ...policy }, userRoles);
  return useSupabaseTable<T>("dispatch_assignments", resolved);
}

export function useCanViewDispatchHistory(): boolean {
  const { userRoles } = useChannel();
  return canUseHistoryScope(userRoles);
}

/**
 * Narrow column projection for dispatch LIST/board views.
 * `dispatch_assignments` has 41 columns; the board renders ~10.
 * Excludes the heaviest payloads — `task_sheet_data` (jsonb) and
 * `charges_breakdown` (jsonb). Detail dialog should call useDispatchById().
 */
export const DISPATCH_LIST_COLUMNS =
  "id,flight_no,airline,station,service_type,flight_date,scheduled_start,scheduled_end,actual_start,actual_end,staff_count,status,review_status,total_charge,charges_currency,flight_schedule_id";

export interface DispatchListRow {
  id: string;
  flight_no: string | null;
  airline: string | null;
  station: string | null;
  service_type: string | null;
  flight_date: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  staff_count: number | null;
  status: string | null;
  review_status: string | null;
  total_charge: number | null;
  charges_currency: string | null;
  flight_schedule_id: string | null;
}

export function useDispatchList<T extends Record<string, any> = DispatchListRow>(
  policy?: QueryPolicy,
) {
  const { userRoles } = useChannel();
  const resolved = resolvePolicy({ scope: "active", select: DISPATCH_LIST_COLUMNS, ...policy }, userRoles);
  return useSupabaseTable<T>("dispatch_assignments", resolved);
}

async function fetchDispatchById(id: string) {
  // SSoT Phase A: also pull the joined flight_schedules row so callers
  // can read master fields via getMasterFields() instead of the
  // deprecated mirrored columns on dispatch_assignments. Triggers and
  // mirror columns remain active until the refactor is fully verified.
  const { data, error } = await supabase
    .from("dispatch_assignments")
    .select("*, flight_schedules:flight_schedule_id(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function useDispatchById(id: string | null | undefined) {
  const { session } = useAuth();
  return useQuery({
    queryKey: id ? queryKeys.dispatch.byId(id) : ["dispatch_assignments", "byId", "__noop__"],
    queryFn: () => fetchDispatchById(id as string),
    enabled: !!session && !!id,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

export function usePrefetchDispatch() {
  const qc = useQueryClient();
  return useCallback(
    (id: string) => {
      if (!id) return;
      qc.prefetchQuery({
        queryKey: queryKeys.dispatch.byId(id),
        queryFn: () => fetchDispatchById(id),
        staleTime: 60_000,
      });
    },
    [qc],
  );
}

export function useEnsureDispatch() {
  const qc = useQueryClient();
  return useCallback(
    (id: string) =>
      qc.ensureQueryData({
        queryKey: queryKeys.dispatch.byId(id),
        queryFn: () => fetchDispatchById(id),
        staleTime: 60_000,
      }),
    [qc],
  );
}

export function useDispatchRealtime(): void {
  // No-op until Tier 3 (live ops board) wires up the realtime channel.
}
