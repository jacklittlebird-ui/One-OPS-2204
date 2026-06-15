// Service Reports domain — handling service reports.
//
//   useServiceReports(policy?)       → full-row active view (legacy / forms)
//   useServiceReportList(policy?)    → narrow projection for tables (preferred)
//   useServiceReportById(id)         → single-row detail fetch
//   usePrefetchServiceReport()       → hover/focus prefetch
//   useEnsureServiceReport()         → cache-first detail load
//   useServiceReportHistory()        → full history, role-gated (audits, finance joins)

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import { useChannel } from "@/contexts/ChannelContext";
import { useAuth } from "@/contexts/AuthContext";
import { resolvePolicy, canUseHistoryScope, type QueryPolicy } from "@/data/policy";
import { queryKeys } from "@/cache/queryKeys";

/**
 * Phase 3B Step 2.1 — Read-only hook backed by `v_service_report_with_flight`.
 * Flight identity fields (`flight_no`, `station`, `aircraft_type`,
 * `registration`, `route`) are sourced from `flight_schedules` via the view;
 * billing/operational fields (incl. `handling_type`) remain authoritative on
 * `service_reports`. Use this for any READ path. Mutations must continue to
 * target the `service_reports` base table.
 *
 *   scope:   "active"  → last 180 days (default)
 *            "history" → no date window (invoice joins, audits)
 *   station: optional FS-derived station filter (uses view's `station` column)
 */
export function useServiceReportsFS<T extends Record<string, any> = any>(opts?: {
  scope?: "active" | "history";
  station?: string | null;
}) {
  const { session } = useAuth();
  const scope = opts?.scope ?? "active";
  const station = opts?.station ?? null;
  return useQuery({
    queryKey: ["v_service_report_with_flight", "list", scope, station],
    queryFn: async (): Promise<T[]> => {
      let q: any = (supabase as any).from("v_service_report_with_flight").select("*");
      if (scope === "active") {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 180);
        q = q.gte("arrival_date", cutoff.toISOString().slice(0, 10));
      }
      if (station) q = q.eq("station", station);
      const { data, error } = await q
        .order("arrival_date", { ascending: false, nullsFirst: false })
        .order("sta", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data || []) as T[];
    },
    enabled: !!session,
    // Batch 2: 60s TTL aligns with global default; dedupes cross-page reads
    // (Invoices + OperationsReports share this exact key).
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}

export function useServiceReports<T extends Record<string, any> = any>(policy?: QueryPolicy) {
  const { userRoles } = useChannel();
  const resolved = resolvePolicy({ scope: "active", ...policy }, userRoles);
  return useSupabaseTable<T>("service_reports", resolved);
}

export function useServiceReportHistory<T extends Record<string, any> = any>(policy?: Omit<QueryPolicy, "scope">) {
  const { userRoles } = useChannel();
  const resolved = resolvePolicy({ scope: "history", ...policy }, userRoles);
  return useSupabaseTable<T>("service_reports", resolved);
}

export function useCanViewServiceReportHistory(): boolean {
  const { userRoles } = useChannel();
  return canUseHistoryScope(userRoles);
}

/**
 * Narrow column projection for service-report LIST views.
 * Phase 3B Step 2.1: backed by `v_service_report_with_flight` so flight
 * identity fields (`flight_no`, `station`, `aircraft_type`, `registration`,
 * `route`) are FS-driven. `handling_type` remains from `service_reports`.
 * Excludes large freeform/jsonb fields — detail dialogs should call
 * useServiceReportById().
 */
export const SERVICE_REPORT_LIST_COLUMNS =
  "id,operator,handling_type,flight_no,station,aircraft_type,registration,route,arrival_date,departure_date,sta,std,review_status,total_cost,currency,flight_schedule_id";

export interface ServiceReportListRow {
  id: string;
  operator: string | null;
  flight_no: string | null;
  station: string | null;
  handling_type: string | null;
  aircraft_type: string | null;
  registration: string | null;
  route: string | null;
  arrival_date: string | null;
  departure_date: string | null;
  sta: string | null;
  std: string | null;
  review_status: string | null;
  total_cost: number | null;
  currency: string | null;
  flight_schedule_id: string | null;
}

export function useServiceReportList<T extends Record<string, any> = ServiceReportListRow>(opts?: {
  scope?: "active" | "history";
  station?: string | null;
}) {
  const { session } = useAuth();
  const scope = opts?.scope ?? "active";
  const station = opts?.station ?? null;
  return useQuery({
    queryKey: ["v_service_report_with_flight", "list-narrow", scope, station],
    queryFn: async (): Promise<T[]> => {
      let q: any = (supabase as any)
        .from("v_service_report_with_flight")
        .select(SERVICE_REPORT_LIST_COLUMNS);
      if (scope === "active") {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 180);
        q = q.gte("arrival_date", cutoff.toISOString().slice(0, 10));
      }
      if (station) q = q.eq("station", station);
      const { data, error } = await q
        .order("arrival_date", { ascending: false, nullsFirst: false })
        .order("sta", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data || []) as T[];
    },
    enabled: !!session,
    // Batch 2: 60s TTL, no remount/focus refetch — see useServiceReportsFS notes.
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}

async function fetchServiceReportById(id: string) {
  const { data, error } = await supabase
    .from("service_reports")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function useServiceReportById(id: string | null | undefined) {
  const { session } = useAuth();
  return useQuery({
    queryKey: id ? queryKeys.serviceReports.byId(id) : ["service_reports", "byId", "__noop__"],
    queryFn: () => fetchServiceReportById(id as string),
    enabled: !!session && !!id,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

export function usePrefetchServiceReport() {
  const qc = useQueryClient();
  return useCallback(
    (id: string) => {
      if (!id) return;
      qc.prefetchQuery({
        queryKey: queryKeys.serviceReports.byId(id),
        queryFn: () => fetchServiceReportById(id),
        staleTime: 60_000,
      });
    },
    [qc],
  );
}

export function useEnsureServiceReport() {
  const qc = useQueryClient();
  return useCallback(
    (id: string) =>
      qc.ensureQueryData({
        queryKey: queryKeys.serviceReports.byId(id),
        queryFn: () => fetchServiceReportById(id),
        staleTime: 60_000,
      }),
    [qc],
  );
}
