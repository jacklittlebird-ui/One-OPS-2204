// Service Reports domain — handling service reports.
//
//   useServiceReports(policy?)  → active operational view (default 365d)
//   useServiceReportHistory()   → full history, role-gated (audits, finance joins)

import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import { useChannel } from "@/contexts/ChannelContext";
import { resolvePolicy, canUseHistoryScope, type QueryPolicy } from "@/data/policy";

export function useServiceReports<T extends Record<string, any> = any>(policy?: QueryPolicy) {
  const { userRoles } = useChannel();
  const resolved = resolvePolicy({ scope: "active", ...policy }, userRoles);
  return useSupabaseTable<T>("service_reports", resolved);
}

export function useServiceReportHistory<T extends Record<string, any> = any>(policy?: Omit<QueryPolicy, "scope">) {
  const { userRoles } = useChannel();
  const resolved = resolvePolicy({ scope: "history", ...policy }, userRoles);
  return useSupabaseTable<T>("service_reports", resolved);
}

export function useCanViewServiceReportHistory(): boolean {
  const { userRoles } = useChannel();
  return canUseHistoryScope(userRoles);
}
