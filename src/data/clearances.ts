// Clearances domain — clearance team's view onto flight_schedules.
//
//   useClearanceFlights(policy?)  → active operational window (default 180d, station-scoped)
//   useClearanceHistory()         → full history, role-gated
//
// Exposes the full useSupabaseTable surface (add/update/remove/bulkInsert) so
// the Clearances page keeps its existing mutation flow.

import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import { useChannel } from "@/contexts/ChannelContext";
import { resolvePolicy, canUseHistoryScope, type QueryPolicy } from "@/data/policy";

export function useClearanceFlights<T extends Record<string, any> = any>(policy?: QueryPolicy) {
  const { userRoles } = useChannel();
  const resolved = resolvePolicy({ scope: "active", ...policy }, userRoles);
  return useSupabaseTable<T>("flight_schedules", resolved);
}

export function useClearanceHistory<T extends Record<string, any> = any>(policy?: Omit<QueryPolicy, "scope">) {
  const { userRoles } = useChannel();
  const resolved = resolvePolicy({ scope: "history", ...policy }, userRoles);
  return useSupabaseTable<T>("flight_schedules", resolved);
}

export function useCanViewClearanceHistory(): boolean {
  const { userRoles } = useChannel();
  return canUseHistoryScope(userRoles);
}
