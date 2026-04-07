import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type TableName = 
  | "flight_schedules" | "service_reports" | "service_report_delays"
  | "invoices" | "contracts" | "lost_found" | "staff_roster" | "overfly_schedules"
  | "airlines" | "aircrafts" | "delay_codes" | "abbreviations" | "aircraft_types_ref"
  | "traffic_rights" | "bulletins" | "manuals_forms" | "catering_items" | "tube_charges"
  | "airport_tax" | "basic_ramp" | "vendor_equipment" | "hall_vvip"
  | "countries" | "airports" | "services_catalog" | "service_providers"
  | "airline_airport_services" | "clearances"
  | "chart_of_accounts" | "journal_entries" | "journal_entry_lines"
  | "vendor_invoices" | "airline_incentives" | "airport_charges";

export function useSupabaseTable<T extends Record<string, any>>(
  table: TableName,
  options?: { orderBy?: string; ascending?: boolean }
) {
  const queryClient = useQueryClient();
  const orderCol = options?.orderBy || "created_at";
  const asc = options?.ascending ?? false;

  const query = useQuery({
    queryKey: [table],
    queryFn: async () => {
      const PAGE_SIZE = 1000;
      let allData: any[] = [];
      let from = 0;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .order(orderCol, { ascending: asc })
          .range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        allData = allData.concat(data || []);
        hasMore = (data?.length || 0) === PAGE_SIZE;
        from += PAGE_SIZE;
      }
      return allData as T[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (row: Partial<T>) => {
      const { data, error } = await supabase.from(table).insert(row as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table] });
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
      queryClient.invalidateQueries({ queryKey: [table] });
      toast({ title: "Updated", description: "Record updated successfully." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table] });
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
      queryClient.invalidateQueries({ queryKey: [table] });
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
