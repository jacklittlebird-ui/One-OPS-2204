// Domain hooks — thin, named wrappers around the data layer.
//
// Why: the architecture blueprint mandates `useFlights()` / `useDispatchAssignments()`
// / `useServiceReports()` instead of generic `useSupabaseTable("flight_schedules")`
// scattered across pages. Same cache, same RLS, but pages now depend on a domain
// surface that can be swapped to narrow projections or RPC/views later WITHOUT
// touching the callsites.
//
// Existing pages can migrate to these incrementally — both APIs share the
// underlying React Query cache via the same query keys.

import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import { useSupabasePaginatedQuery, type PaginatedQueryOptions } from "@/hooks/useSupabasePaginatedQuery";
import { LIST_PAGE_SIZE } from "@/lib/pagination";

/** Flight schedules — station-scoped by default (authority column). */
export function useFlights() {
  return useSupabaseTable<any>("flight_schedules", { stationFilter: true });
}

/** Server-paginated flights — use on long list views. */
export function useFlightsPaginated(opts: Partial<PaginatedQueryOptions<any>> = {}) {
  return useSupabasePaginatedQuery<any>({
    table: "flight_schedules",
    stationFilter: true,
    orderBy: "arrival_date",
    pageSize: LIST_PAGE_SIZE,
    ...opts,
  });
}

/** Dispatch assignments — security service tasks, station-scoped. */
export function useDispatchAssignments() {
  return useSupabaseTable<any>("dispatch_assignments", { stationFilter: true });
}

export function useDispatchAssignmentsPaginated(opts: Partial<PaginatedQueryOptions<any>> = {}) {
  return useSupabasePaginatedQuery<any>({
    table: "dispatch_assignments",
    stationFilter: true,
    orderBy: "flight_date",
    pageSize: LIST_PAGE_SIZE,
    ...opts,
  });
}

/** Service reports (handling). */
export function useServiceReports(stationScoped = true) {
  return useSupabaseTable<any>("service_reports", { stationFilter: stationScoped });
}

export function useServiceReportsPaginated(opts: Partial<PaginatedQueryOptions<any>> = {}) {
  return useSupabasePaginatedQuery<any>({
    table: "service_reports",
    stationFilter: true,
    orderBy: "arrival_date",
    pageSize: LIST_PAGE_SIZE,
    ...opts,
  });
}

/** Invoices. */
export function useInvoices(stationScoped = true) {
  return useSupabaseTable<any>("invoices", { stationFilter: stationScoped });
}

/** Contracts. */
export function useContracts() {
  return useSupabaseTable<any>("contracts");
}
