// Dispatch domain — security service tasks.
//
//   useDispatchBoard(policy?)  → active operational view (default 180d, station-scoped)
//   useDispatchHistory()       → full history, role-gated
//   useDispatchRealtime()      → reserved for the live ops board (Tier 3)

import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import { useChannel } from "@/contexts/ChannelContext";
import { resolvePolicy, canUseHistoryScope, type QueryPolicy } from "@/data/policy";

export function useDispatchBoard<T extends Record<string, any> = any>(policy?: QueryPolicy) {
  const { userRoles } = useChannel();
  const resolved = resolvePolicy({ scope: "active", ...policy }, userRoles);
  return useSupabaseTable<T>("dispatch_assignments", resolved);
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
 * `task_sheet_data` (jsonb) and `charges_breakdown` (jsonb) are the heaviest —
 * excluding them is the biggest payload win. Detail dialog should call
 * useDispatchBoard() (full row) when opened.
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

export function useDispatchRealtime(): void {
  // No-op until Tier 3 (live ops board) wires up the realtime channel.
}

