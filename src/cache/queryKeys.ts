// Centralized React Query key factory.
// Use these everywhere instead of inline arrays so invalidation stays consistent.
//
// Pattern:
//   queryKeys.flights.list({ station, dateRange })
//   queryKeys.flights.byId(id)
//
// Always include scoping (station, date range, filters) in the key — the cache
// is keyed by identity, so missing scope = stale or cross-tenant bleed.

export const queryKeys = {
  flights: {
    all: ["flights"] as const,
    list: (scope: { station?: string | null; from?: string; to?: string; status?: string } = {}) =>
      ["flights", "list", scope] as const,
    byId: (id: string) => ["flights", "byId", id] as const,
  },
  dispatch: {
    all: ["dispatch_assignments"] as const,
    list: (scope: { station?: string | null; from?: string; to?: string; status?: string } = {}) =>
      ["dispatch_assignments", "list", scope] as const,
    byId: (id: string) => ["dispatch_assignments", "byId", id] as const,
  },
  serviceReports: {
    all: ["service_reports"] as const,
    list: (scope: { station?: string | null; from?: string; to?: string } = {}) =>
      ["service_reports", "list", scope] as const,
    byId: (id: string) => ["service_reports", "byId", id] as const,
  },
  invoices: {
    all: ["invoices"] as const,
    list: (scope: { station?: string | null; status?: string; operator?: string } = {}) =>
      ["invoices", "list", scope] as const,
    byId: (id: string) => ["invoices", "byId", id] as const,
  },
  contracts: {
    all: ["contracts"] as const,
    list: () => ["contracts", "list"] as const,
    rates: (contractId: string) => ["contract_service_rates", contractId] as const,
  },
  userRoles: (userId: string) => ["user_roles", userId] as const,
} as const;

export type QueryScope = { station?: string | null; from?: string; to?: string; status?: string };
