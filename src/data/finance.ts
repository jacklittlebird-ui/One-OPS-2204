// Finance domain — invoices, aging, journal entries.
//
// Finance pages reconcile cross-year data, so they ALWAYS use "history" scope by
// default (no date window). Operational summaries can opt back into "active".
//
//   useInvoices(policy?)        → full-row finance invoices (default: full history)
//   useInvoicesActive(policy?)  → operational current-window view
//   useInvoiceList(policy?)     → narrow projection for invoice tables (preferred)
//   useInvoiceById(id)          → single-row detail (line items, etc.)
//   usePrefetchInvoice()        → hover/focus prefetch
//   useEnsureInvoice()          → cache-first detail load
//   useAgingInvoices()          → invoices for aging reports (full history, full rows)

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import { useChannel } from "@/contexts/ChannelContext";
import { useAuth } from "@/contexts/AuthContext";
import { resolvePolicy, type QueryPolicy } from "@/data/policy";
import { queryKeys } from "@/cache/queryKeys";

export function useInvoices<T extends Record<string, any> = any>(policy?: QueryPolicy) {
  const { userRoles } = useChannel();
  const resolved = resolvePolicy({ scope: "history", stationScoped: true, ...policy }, userRoles);
  return useSupabaseTable<T>("invoices", resolved);
}

export function useInvoicesActive<T extends Record<string, any> = any>(policy?: QueryPolicy) {
  const { userRoles } = useChannel();
  const resolved = resolvePolicy({ scope: "active", stationScoped: true, ...policy }, userRoles);
  return useSupabaseTable<T>("invoices", resolved);
}

export function useAgingInvoices<T extends Record<string, any> = any>() {
  const { userRoles } = useChannel();
  const resolved = resolvePolicy({ scope: "history", stationScoped: false }, userRoles);
  return useSupabaseTable<T>("invoices", { ...resolved, orderBy: "date", ascending: false });
}

/**
 * Narrow column projection for invoice LIST views.
 * `invoices` has 32 columns; tables render ~12. Excludes derived/computed
 * subtotal breakdowns and notes — detail modal fetches the full row.
 */
export const INVOICE_LIST_COLUMNS =
  "id,invoice_no,operator,airline,station,category,date,due_date,currency,subtotal,vat,total,status,paid_amount";

export interface InvoiceListRow {
  id: string;
  invoice_no: string | null;
  operator: string | null;
  airline: string | null;
  station: string | null;
  category: string | null;
  date: string | null;
  due_date: string | null;
  currency: string | null;
  subtotal: number | null;
  vat: number | null;
  total: number | null;
  status: string | null;
  paid_amount: number | null;
}

export function useInvoiceList<T extends Record<string, any> = InvoiceListRow>(
  policy?: QueryPolicy,
) {
  const { userRoles } = useChannel();
  const resolved = resolvePolicy(
    { scope: "history", stationScoped: true, select: INVOICE_LIST_COLUMNS, ...policy },
    userRoles,
  );
  return useSupabaseTable<T>("invoices", resolved);
}

async function fetchInvoiceById(id: string) {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function useInvoiceById(id: string | null | undefined) {
  const { session } = useAuth();
  return useQuery({
    queryKey: id ? queryKeys.invoices.byId(id) : ["invoices", "byId", "__noop__"],
    queryFn: () => fetchInvoiceById(id as string),
    enabled: !!session && !!id,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

export function usePrefetchInvoice() {
  const qc = useQueryClient();
  return useCallback(
    (id: string) => {
      if (!id) return;
      qc.prefetchQuery({
        queryKey: queryKeys.invoices.byId(id),
        queryFn: () => fetchInvoiceById(id),
        staleTime: 60_000,
      });
    },
    [qc],
  );
}

export function useEnsureInvoice() {
  const qc = useQueryClient();
  return useCallback(
    (id: string) =>
      qc.ensureQueryData({
        queryKey: queryKeys.invoices.byId(id),
        queryFn: () => fetchInvoiceById(id),
        staleTime: 60_000,
      }),
    [qc],
  );
}
