// Finance domain — invoices, aging, journal entries.
//
// Finance pages reconcile cross-year data, so they ALWAYS use "history" scope by
// default (no date window). Operational summaries can opt back into "active".
//
//   useInvoices(policy?)        → finance invoices (default: full history, station-scoped)
//   useInvoicesActive(policy?)  → operational current-window view
//   useAgingInvoices()          → invoices for aging reports (full history)
//
// Exposes the full useSupabaseTable surface (add/update/remove/bulkInsert).

import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import { useChannel } from "@/contexts/ChannelContext";
import { resolvePolicy, type QueryPolicy } from "@/data/policy";

export function useInvoices<T extends Record<string, any> = any>(policy?: QueryPolicy) {
  const { userRoles } = useChannel();
  // Finance default = full history. Callers can override with scope: "active".
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
