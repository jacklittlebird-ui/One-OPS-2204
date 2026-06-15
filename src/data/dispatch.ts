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

/**
 * Phase 3B.0.5 — Read-only board hook backed by `v_dispatch_with_flight`.
 * Same flat shape as `useDispatchBoard().data`, but the four mirror fields
 * (`flight_no`, `station`, `airline`, `service_type`) are FS-driven via the
 * view's COALESCE(fs.X, d.X). Use this for pages that only READ dispatch
 * data (Invoices, OperationsReports, StationDispatch list, DispatchContent,
 * Clearances). Mutations remain on `useDispatchBoard` against the base table.
 */
export function useDispatchBoardFS<T extends Record<string, any> = any>() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["v_dispatch_with_flight", "board", "active"],
    queryFn: async (): Promise<T[]> => {
      const { data, error } = await (supabase as any)
        .from("v_dispatch_with_flight")
        .select("*")
        .order("flight_date", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data || []) as T[];
    },
    enabled: !!session,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
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

// ───────────────────────────────────────────────────────────────────────────
// SSoT Phase B — normalized projection backed by v_dispatch_with_flight.
// All master fields (flight_number, registration, route, aircraft_type, sta,
// std, arrival_date, skd_type, clearance_type) are resolved from
// flight_schedules inside the view. Use this for any NEW UI that should never
// read mirrored columns directly. Existing helpers above keep working so the
// rollout stays backward compatible.
// ───────────────────────────────────────────────────────────────────────────

export interface NormalizedFlightMaster {
  flight_schedule_id: string | null;
  flight_number: string | null;
  registration: string | null;
  route: string | null;
  aircraft_type: string | null;
  sta: string | null;
  std: string | null;
  arrival_date: string | null;
  skd_type: string | null;
  clearance_type: string | null;
}

export interface NormalizedDispatchRow {
  id: string;
  flight_date: string | null;
  station: string | null;
  airline: string | null;
  service_type: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  staff_count: number | null;
  status: string | null;
  review_status: string | null;
  total_charge: number | null;
  charges_currency: string | null;
  flight: NormalizedFlightMaster;
}

function normalizeDispatchViewRow(v: any): NormalizedDispatchRow {
  // The view exposes both the dispatch mirror (`flight_no`, etc.) AND the
  // master fields (`fs_flight_no`, etc.). Master wins; mirror is a fallback
  // ONLY for legacy rows that have no flight_schedule_id yet. Marked for
  // removal in Phase 3 once backfill is verified.
  return {
    id: v.id,
    flight_date: v.flight_date ?? null,
    station: v.station ?? null,
    airline: v.airline ?? null,
    service_type: v.service_type ?? null,
    scheduled_start: v.scheduled_start ?? null,
    scheduled_end: v.scheduled_end ?? null,
    actual_start: v.actual_start ?? null,
    actual_end: v.actual_end ?? null,
    staff_count: v.staff_count ?? null,
    status: v.status ?? null,
    review_status: v.review_status ?? null,
    total_charge: v.total_charge ?? null,
    charges_currency: v.charges_currency ?? null,
    flight: {
      flight_schedule_id: v.flight_schedule_id ?? null,
      flight_number:  v.fs_flight_no      ?? v.flight_no      ?? null,
      registration:   v.fs_registration   ?? v.registration   ?? null,
      route:          v.fs_route          ?? v.route          ?? null,
      aircraft_type:  v.fs_aircraft_type  ?? v.aircraft_type  ?? null,
      sta:            v.fs_sta            ?? v.sta            ?? null,
      std:            v.fs_std            ?? v.std            ?? null,
      arrival_date:   v.fs_arrival_date   ?? v.arrival_date   ?? null,
      skd_type:       v.fs_skd_type       ?? v.skd_type       ?? null,
      clearance_type: v.fs_clearance_type ?? v.clearance_type ?? null,
    },
  };
}

export function useDispatchListWithFlight(opts?: {
  station?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
}) {
  const { session } = useAuth();
  const station = opts?.station ?? null;
  const dateFrom = opts?.dateFrom ?? null;
  const dateTo = opts?.dateTo ?? null;
  return useQuery({
    queryKey: ["v_dispatch_with_flight", "list", station, dateFrom, dateTo],
    queryFn: async (): Promise<NormalizedDispatchRow[]> => {
      let q: any = supabase.from("v_dispatch_with_flight" as any).select("*");
      if (station) q = q.eq("station", station);
      if (dateFrom) q = q.gte("flight_date", dateFrom);
      if (dateTo) q = q.lte("flight_date", dateTo);
      const { data, error } = await q.order("flight_date", { ascending: false });
      if (error) throw error;
      return (data || []).map(normalizeDispatchViewRow);
    },
    enabled: !!session,
    staleTime: 30_000,
  });
}
