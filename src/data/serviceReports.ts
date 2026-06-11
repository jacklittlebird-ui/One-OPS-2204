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
 * `service_reports` has 68 columns; tables render ~15.
 * Excludes large freeform/jsonb fields (remarks, billing_data, etc.)
 * — detail dialogs should call useServiceReportById().
 */
export const SERVICE_REPORT_LIST_COLUMNS =
  "id,report_no,flight_no,airline,station,handling_type,aircraft_type,registration,route,arrival_date,departure_date,sta,std,status,review_status,total_charge,charges_currency";

export interface ServiceReportListRow {
  id: string;
  report_no: string | null;
  flight_no: string | null;
  airline: string | null;
  station: string | null;
  handling_type: string | null;
  aircraft_type: string | null;
  registration: string | null;
  route: string | null;
  arrival_date: string | null;
  departure_date: string | null;
  sta: string | null;
  std: string | null;
  status: string | null;
  review_status: string | null;
  total_charge: number | null;
  charges_currency: string | null;
}

export function useServiceReportList<T extends Record<string, any> = ServiceReportListRow>(
  policy?: QueryPolicy,
) {
  const { userRoles } = useChannel();
  const resolved = resolvePolicy(
    { scope: "active", select: SERVICE_REPORT_LIST_COLUMNS, ...policy },
    userRoles,
  );
  return useSupabaseTable<T>("service_reports", resolved);
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
