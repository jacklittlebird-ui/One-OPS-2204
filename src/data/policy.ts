// Policy Engine — single source of truth for query scope, range, and role rules.
//
// Replaces ad-hoc combinations of { mode, dateWindowDays, stationFilter } scattered
// across pages. Domain hooks accept a QueryPolicy and the engine resolves it to the
// concrete options consumed by useSupabaseTable.
//
// Role enforcement: "history" scope is operationally expensive and a common source
// of accidental over-fetching. Restrict it to roles that legitimately need full
// datasets (admin, operations, finance). For other roles the policy silently
// downgrades to "active" — UI components should disable the toggle for them.

export type QueryScope = "active" | "history";
export type QueryRange = "180d" | "365d" | "730d" | "custom";

export interface QueryPolicy {
  /** Operational vs audit/history scope. */
  scope?: QueryScope;
  /** Named range bucket. Overridden by `customDays` when scope is not history. */
  range?: QueryRange;
  /** Explicit window in days. Wins over `range`. */
  customDays?: number;
  /** Apply station scoping at the data layer. Defaults to true. */
  stationScoped?: boolean;
  /**
   * Column projection (PostgREST syntax). Used by list-projection hooks like
   * `useFlightList` to cut payload — heavy tables have 30–68 columns and most
   * screens render under a dozen. Omit (or pass undefined) for full rows.
   */
  select?: string;
}

// Roles allowed to switch to "history" / full-dataset scope.
// Keep this list narrow — every name here gets the heaviest queries.
const HISTORY_ROLES = new Set([
  "admin",
  "operations",
  "general_accounts",
  "accountant",
  "receivables",
  "payables",
  "contracts",
]);

/** Returns true if any of the user's roles is allowed to use history scope. */
export function canUseHistoryScope(roles: string[]): boolean {
  return roles.some((r) => HISTORY_ROLES.has(r));
}

/**
 * Resolve a QueryPolicy + the caller's roles into the concrete options
 * consumed by `useSupabaseTable`. Centralizes the rule set.
 */
export function resolvePolicy(
  policy: QueryPolicy | undefined,
  roles: string[],
): { mode: QueryScope; dateWindowDays: number | null | undefined; stationFilter: boolean; select?: string } {
  const requested: QueryScope = policy?.scope ?? "active";
  const allowed = requested === "history" ? canUseHistoryScope(roles) : true;
  const scope: QueryScope = allowed ? requested : "active";

  let dateWindowDays: number | null | undefined;
  if (scope === "history") {
    dateWindowDays = null; // full history
  } else if (typeof policy?.customDays === "number") {
    dateWindowDays = policy.customDays;
  } else if (policy?.range === "180d") {
    dateWindowDays = 180;
  } else if (policy?.range === "365d") {
    dateWindowDays = 365;
  } else if (policy?.range === "730d") {
    dateWindowDays = 730;
  } else {
    dateWindowDays = undefined; // fall back to useSupabaseTable per-table default
  }

  return {
    mode: scope,
    dateWindowDays,
    stationFilter: policy?.stationScoped ?? true,
    select: policy?.select,
  };
}

