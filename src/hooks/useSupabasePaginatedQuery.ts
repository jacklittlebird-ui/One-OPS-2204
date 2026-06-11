import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStation } from "@/contexts/UserStationContext";

/**
 * Server-side paginated query hook.
 *
 * Use this instead of `useSupabaseTable` for LARGE list views like
 * `flight_schedules` and `dispatch_assignments`. It fetches only the
 * current page from Postgres using `.range()` and gets an `exact`
 * row count in the same request — no full-table downloads.
 *
 * It is intentionally a NEW hook (not a replacement for useSupabaseTable)
 * so existing client-side filtered pages keep working unchanged. Migrate
 * pages opt-in, one at a time.
 *
 * Example:
 *   const { rows, total, page, setPage, pageSize, isLoading } =
 *     useSupabasePaginatedQuery({
 *       table: "dispatch_assignments",
 *       pageSize: 50,
 *       orderBy: "flight_date",
 *       ascending: false,
 *       stationFilter: true,
 *       filters: (q) => q.eq("status", "Pending"),
 *     });
 */
export interface PaginatedQueryOptions<T> {
  table: string;
  pageSize?: number;
  initialPage?: number;
  orderBy?: string;
  ascending?: boolean;
  /** When true, scope by user's station (authority for flight_schedules, station otherwise) */
  stationFilter?: boolean;
  /** Custom column for station filtering (defaults: authority for flight_schedules, station otherwise) */
  stationColumn?: string;
  /** Apply extra filters to the PostgREST query builder. Return the modified builder. */
  filters?: (q: any) => any;
  /** Comma-separated SELECT projection. Defaults to "*". Keep narrow for speed. */
  select?: string;
  /** Disable until truthy */
  enabled?: boolean;
  /**
   * Row-count strategy. PostgREST options:
   *   - "planned"  (default) → near-free; uses Postgres planner stats. Total is approximate.
   *   - "estimated"          → planned for big tables, exact for small ones.
   *   - "exact"              → accurate but runs a full filtered COUNT(*) every page (SLOW).
   *   - "none"               → no total; pageCount becomes unknown.
   */
  countMode?: "planned" | "estimated" | "exact" | "none";
}

export function useSupabasePaginatedQuery<T = any>(opts: PaginatedQueryOptions<T>) {
  const {
    table,
    pageSize = 50,
    initialPage = 0,
    orderBy,
    ascending = false,
    stationFilter,
    stationColumn,
    filters,
    select = "*",
    enabled = true,
    countMode = "planned",
  } = opts;


  const { session } = useAuth();
  const { station, isStationScoped } = useUserStation();
  const [page, setPage] = useState(initialPage);

  const defaultOrder =
    table === "flight_schedules" ? "arrival_date" :
    table === "service_reports" ? "arrival_date" :
    table === "dispatch_assignments" ? "flight_date" :
    "created_at";
  const orderCol = orderBy || defaultOrder;
  const stationCol = stationColumn || (table === "flight_schedules" ? "authority" : "station");
  const applyStation = !!stationFilter && isStationScoped && !!station;

  // Filters are passed by identity; consumers should memoize. We include a
  // simple discriminator (filters?.toString()) so a stable arrow-function
  // produces a stable key.
  const filterKey = useMemo(() => (filters ? filters.toString() : ""), [filters]);

  const queryKey = [
    `${table}:paginated`,
    session?.user?.id,
    applyStation ? station : null,
    orderCol,
    ascending,
    pageSize,
    page,
    select,
    filterKey,
    countMode,
  ];

  const query = useQuery({
    queryKey,
    enabled: !!session && enabled,
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: (prev) => prev, // keep previous page while next one loads
    queryFn: async () => {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      const selectOpts: any = countMode === "none" ? undefined : { count: countMode };
      let q: any = supabase
        .from(table as any)
        .select(select, selectOpts)
        .order(orderCol, { ascending, nullsFirst: false })
        .range(from, to);

      if (applyStation) q = q.eq(stationCol, station as string);
      if (filters) q = filters(q);
      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: (data || []) as T[], total: count ?? 0 };
    },
  });

  const total = query.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return {
    rows: query.data?.rows ?? [],
    total,
    page,
    pageCount,
    pageSize,
    setPage: (p: number) => setPage(Math.max(0, Math.min(p, pageCount - 1))),
    nextPage: () => setPage((p) => Math.min(p + 1, pageCount - 1)),
    prevPage: () => setPage((p) => Math.max(0, p - 1)),
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}
