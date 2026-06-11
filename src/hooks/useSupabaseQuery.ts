import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStation } from "@/contexts/UserStationContext";

type TableName = 
  | "flight_schedules" | "service_reports" | "service_report_delays"
  | "invoices" | "contracts" | "contract_service_rates" | "lost_found" | "staff_roster" | "overfly_schedules"
  | "airlines" | "aircrafts" | "delay_codes" | "abbreviations" | "aircraft_types_ref"
  | "traffic_rights" | "bulletins" | "manuals_forms" | "catering_items" | "tube_charges"
  | "airport_tax" | "basic_ramp" | "vendor_equipment" | "hall_vvip"
  | "countries" | "airports" | "services_catalog" | "service_providers"
  | "airline_airport_services"
  | "chart_of_accounts" | "journal_entries" | "journal_entry_lines"
  | "vendor_invoices" | "airline_incentives" | "airport_charges" | "audit_logs"
  | "irregularity_reports" | "dispatch_assignments";

export function useSupabaseTable<T extends Record<string, any>>(
  table: TableName,
  options?: {
    orderBy?: string;
    ascending?: boolean;
    stationFilter?: boolean;
    /**
     * Restrict the query to rows whose operational date is within the last N days.
     * Server-side filter — drops payload dramatically on hot tables. Pass `null`
     * to opt out. Defaults: 180d for flight_schedules / dispatch_assignments,
     * 365d for service_reports. All other tables default to no window.
     *
     * Date column used:
     *   flight_schedules     → arrival_date
     *   dispatch_assignments → flight_date
     *   service_reports      → arrival_date
     */
    dateWindowDays?: number | null;
  }
) {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const { station, isStationScoped } = useUserStation();
  // Default sort: flight-centric tables sort by their arrival/operational date so
  // all portals/tabs show flights ordered by ARR date (most recent first) consistently.
  const defaultOrder =
    table === "flight_schedules" ? "arrival_date" :
    table === "service_reports" ? "arrival_date" :
    table === "dispatch_assignments" ? "flight_date" :
    "created_at";
  const orderCol = options?.orderBy || defaultOrder;
  const asc = options?.ascending ?? false;

  // Per-domain cache tiers (from the architecture blueprint):
  //   reference (static)   → 10m stale / 30m gc
  //   semi-static          → 5m / 20m   (assignments, reports, contracts, invoices)
  //   live ops             → 90s / 10m  (flight_schedules, dispatch_assignments live status)
  //   default              → 2m / 10m
  const REFERENCE_TABLES = new Set<TableName>([
    "airlines", "aircrafts", "delay_codes", "abbreviations", "aircraft_types_ref",
    "traffic_rights", "bulletins", "manuals_forms", "catering_items", "tube_charges",
    "airport_tax", "basic_ramp", "vendor_equipment", "hall_vvip",
    "countries", "airports", "services_catalog", "service_providers",
    "chart_of_accounts", "airport_charges",
  ]);
  const SEMI_STATIC_TABLES = new Set<TableName>([
    "service_reports", "contracts", "contract_service_rates", "invoices",
    "vendor_invoices", "airline_incentives", "airline_airport_services",
    "journal_entries", "journal_entry_lines", "staff_roster",
  ]);
  const LIVE_OPS_TABLES = new Set<TableName>([
    "flight_schedules", "dispatch_assignments",
  ]);
  const isReference = REFERENCE_TABLES.has(table);
  const isSemiStatic = SEMI_STATIC_TABLES.has(table);
  const isLiveOps = LIVE_OPS_TABLES.has(table);
  const tableStaleTime = isReference ? 10 * 60_000
                       : isSemiStatic ? 5 * 60_000
                       : isLiveOps ? 90_000
                       : 2 * 60_000;
  const tableGcTime = isReference ? 30 * 60_000
                    : isSemiStatic ? 20 * 60_000
                    : 10 * 60_000;
  const applyStationFilter = !!options?.stationFilter && isStationScoped && !!station;

  const query = useQuery({
    queryKey: [table, session?.user?.id, applyStationFilter ? station : null],
    queryFn: async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
        throw new Error("No active session");
      }

      const PAGE_SIZE = 1000;
      let allData: any[] = [];
      let from = 0;
      let hasMore = true;
      while (hasMore) {
        let q = supabase
          .from(table)
          .select("*")
          .order(orderCol, { ascending: asc, nullsFirst: false })
          .range(from, from + PAGE_SIZE - 1);
        if (applyStationFilter) {
          // Scope strictly by the record's STATION field (authority for flight_schedules) — not by route contents.
          if (table === "flight_schedules") {
            q = (q as any).eq("authority", station as string);
          } else {
            q = (q as any).eq("station", station as string);
          }
        }
        const { data, error } = await q;
        if (error) throw error;
        allData = allData.concat(data || []);
        hasMore = (data?.length || 0) === PAGE_SIZE;
        from += PAGE_SIZE;
      }
      return allData as T[];
    },
    enabled: !!session,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    staleTime: tableStaleTime,
    gcTime: tableGcTime,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [table] });
    if (table === "flight_schedules") {
      queryClient.invalidateQueries({ queryKey: ["dispatch_assignments"] });
    }
  };

  const addMutation = useMutation({
    mutationFn: async (row: Partial<T>) => {
      const { data, error } = await supabase.from(table).insert(row as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Saved", description: "Record added successfully." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<T>) => {
      const { data, error } = await supabase
        .from(table)
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Updated", description: "Record updated successfully." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from(table).delete().eq("id", id).select("id");
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Delete blocked: you don't have permission to delete this record.");
      }
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Deleted", description: "Record removed." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const bulkInsertMutation = useMutation({
    mutationFn: async (rows: Partial<T>[]) => {
      const { data, error } = await supabase.from(table).insert(rows as any[]).select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Imported", description: "Records imported successfully." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    add: addMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    bulkInsert: bulkInsertMutation.mutateAsync,
    isAdding: addMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
