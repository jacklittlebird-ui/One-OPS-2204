// Batch 4 — Precomputed invoice monthly summary.
//
// Reads from the `mv_invoice_monthly_summary` materialized view created in
// the Batch 4 migration. The view groups approved / "ready for billing"
// service reports by (month, operator, station, handling_type) and
// precomputes every fee column so the Invoices page renders monthly
// breakdowns with ZERO client-side .reduce() / groupBy aggregation.
//
// Refresh strategy: ON-DEMAND via `refresh_invoice_monthly_summary()` RPC.
// Finance/admin roles only (enforced in the SECURITY DEFINER function).
// No write-path trigger — dispatch & service-report INSERT/UPDATE latency
// is unchanged.

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface InvoiceMonthlySummaryRow {
  month: string;           // ISO date, first of month
  operator: string;
  station: string;
  handling_type: string;
  flight_count: number;
  total_cost: number;
  civil_aviation_fee: number;
  handling_fee: number;
  airport_charge: number;
  landing_charge: number;
  parking_charge: number;
  housing_charge: number;
  fuel_charge: number;
  catering_charge: number;
  hotac_charge: number;
}

export interface InvoiceMonthlyTotals {
  civil: number;
  handling: number;
  airport: number;
  other: number;
  total: number;
  flightCount: number;
}

export interface InvoiceMonthlyBreakdownRow {
  station: string;
  type: string;
  flights: number;
  total: number;
}

const TABLE = "mv_invoice_monthly_summary";

/**
 * Reads precomputed monthly summary rows. Pass filters to narrow the
 * server-side aggregation; cache key includes every filter so unrelated
 * dashboards do not invalidate each other.
 */
export function useInvoiceMonthlySummary(opts?: {
  operator?: string | null;
  month?: string | null;   // "YYYY-MM"
  station?: string | null;
}) {
  const { session } = useAuth();
  const operator = opts?.operator ?? null;
  const month = opts?.month ?? null;
  const station = opts?.station ?? null;

  return useQuery({
    queryKey: ["mv_invoice_monthly_summary", operator, month, station],
    queryFn: async (): Promise<InvoiceMonthlySummaryRow[]> => {
      let q: any = (supabase as any).from(TABLE).select("*");
      if (operator) q = q.eq("operator", operator);
      if (station)  q = q.eq("station", station);
      if (month) {
        // month param is "YYYY-MM"; MV stores first-of-month dates.
        q = q.eq("month", `${month}-01`);
      }
      const { data, error } = await q.order("month", { ascending: false });
      if (error) throw error;
      return (data || []) as InvoiceMonthlySummaryRow[];
    },
    enabled: !!session,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}

/**
 * Distinct operator list, sourced from the precomputed MV. Replaces the
 * client-side `new Set(serviceReports.map(r => r.operator))` aggregation.
 * Caller can union with dispatch-side operators in pure JS (no .reduce()).
 */
export function useInvoiceMonthlyOperators() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["mv_invoice_monthly_summary", "operators"],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .select("operator")
        .neq("operator", "");
      if (error) throw error;
      // Unique distinct in O(n) — not aggregation, just dedupe.
      const seen = new Set<string>();
      for (const r of (data as Array<{ operator: string }>) || []) {
        if (r.operator) seen.add(r.operator);
      }
      return [...seen].sort();
    },
    enabled: !!session,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

/** Pure helper: collapse N pre-aggregated rows into top-level totals. */
export function rollupMonthlySummary(
  rows: InvoiceMonthlySummaryRow[],
): InvoiceMonthlyTotals {
  let civil = 0, handling = 0, airport = 0, other = 0, total = 0, flightCount = 0;
  for (const r of rows) {
    civil    += Number(r.civil_aviation_fee) || 0;
    handling += Number(r.handling_fee) || 0;
    airport  += (Number(r.airport_charge)  || 0)
              + (Number(r.landing_charge)  || 0)
              + (Number(r.parking_charge)  || 0)
              + (Number(r.housing_charge)  || 0);
    other    += (Number(r.fuel_charge)     || 0)
              + (Number(r.catering_charge) || 0)
              + (Number(r.hotac_charge)    || 0);
    total    += Number(r.total_cost) || 0;
    flightCount += Number(r.flight_count) || 0;
  }
  return { civil, handling, airport, other, total, flightCount };
}

/** Pure helper: map MV rows to the (station × type) breakdown shape. */
export function breakdownMonthlySummary(
  rows: InvoiceMonthlySummaryRow[],
): InvoiceMonthlyBreakdownRow[] {
  // Each MV row is already pre-grouped by (station, handling_type, month, operator)
  // so this is a 1:1 projection — no reduce, no groupBy.
  return rows.map(r => ({
    station: r.station,
    type: r.handling_type,
    flights: Number(r.flight_count) || 0,
    total: Number(r.total_cost) || 0,
  }));
}

/** Manual refresh hook for the finance "Refresh totals" button. */
export function useRefreshInvoiceMonthlySummary() {
  const qc = useQueryClient();
  return useCallback(async () => {
    const { error } = await (supabase as any).rpc(
      "refresh_invoice_monthly_summary",
    );
    if (error) {
      toast({
        title: "Refresh failed",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
    await qc.invalidateQueries({ queryKey: ["mv_invoice_monthly_summary"] });
    toast({ title: "Refreshed", description: "Invoice summary recomputed." });
    return true;
  }, [qc]);
}
