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

export function useDispatchRealtime(): void {
  // No-op until Tier 3 (live ops board) wires up the realtime channel.
}
