// Phase 3A.5 / 3B.0.6 / 3B Step 2.2 — Target-aware INSERT/UPDATE hardener.
//
// service_reports (Phase 3B Step 2.2 — write-side decoupled):
//   The five FS-mirror columns (flight_no, station, aircraft_type,
//   registration, route) are read at query time from
//   v_service_report_with_flight (FS-driven) and must NEVER be written from
//   the application layer. The resolver STRIPS them from every payload.
//
//   The base table still carries those columns as NOT NULL (column drop is
//   the next phase). Four of them have defaults (station, aircraft_type,
//   registration, route); `flight_no` has no default, so on INSERT we set
//   an empty-string compatibility shim to keep the NOT NULL constraint
//   happy. The shim is NOT sourced from flight_schedules — display always
//   resolves through the FS view.
//
// dispatch_assignments (Phase 3B.0.6):
//   Same shape — strip the legacy mirror keys; payload contains only
//   operational fields + flight_schedule_id.

import { supabase as _supabase } from "@/integrations/supabase/client";

export type ResolverTarget = "service_reports" | "dispatch_assignments";
export type ResolverOp = "insert" | "update";

// FS-mirror keys that must NEVER reach a service_reports INSERT/UPDATE.
const SR_FORBIDDEN_KEYS = [
  "flight_no",
  "station",
  "aircraft_type",
  "registration",
  "route",
] as const;

// Mirror keys that must NEVER reach a dispatch_assignments INSERT/UPDATE.
const DA_FORBIDDEN_KEYS = [
  "flight_no",
  "station",
  "airline",
  "service_type",
  "aircraft_type",
] as const;

function stripKeys<T extends Record<string, any>>(
  dbData: T,
  keys: readonly string[],
): T {
  const out: Record<string, any> = { ...dbData };
  for (const k of keys) delete out[k];
  return out as T;
}

/**
 * Returns a payload safe to INSERT/UPDATE on the chosen target.
 *
 *   target = "service_reports"
 *     → STRIPS FS-mirror keys (flight_no, station, aircraft_type,
 *       registration, route). On INSERT, sets `flight_no = ""` only as a
 *       NOT-NULL/no-default compatibility shim (NOT sourced from FS).
 *
 *   target = "dispatch_assignments"
 *     → STRIPS the legacy mirror keys; payload contains only operational
 *       fields + flight_schedule_id.
 *
 * The `flightScheduleId` argument is retained for backwards-compatible call
 * sites but is no longer used for any FS lookup — all flight identity is
 * resolved at read time via the FS-driven views.
 */
export async function resolveFlightMasterForWrite<T extends Record<string, any>>(
  dbData: T,
  _flightScheduleId?: string | null,
  target: ResolverTarget = "service_reports",
  op: ResolverOp = "update",
): Promise<T> {
  if (target === "dispatch_assignments") {
    return stripKeys(dbData, DA_FORBIDDEN_KEYS);
  }

  // service_reports — fully decoupled from FS at write time.
  // Phase 3B Step 2.3: FS-mirror columns dropped from base table; just strip.
  void op;
  return stripKeys(dbData, SR_FORBIDDEN_KEYS) as T;
}
