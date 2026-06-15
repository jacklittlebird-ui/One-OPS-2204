// Phase 3A.5 / 3B.0.6 — Target-aware INSERT/UPDATE hardener.
//
// service_reports (legacy mirror columns still present + NOT NULL):
//   The resolver fetches the canonical flight_schedules row and overwrites
//   the mirror keys (flight_no, station, aircraft_type, registration, route,
//   arrival_date, departure_date, sta, std) on the outgoing dbData so the
//   NOT NULL constraints stay satisfied without any schema change.
//
// dispatch_assignments (Phase 3B.0.6 — write-side decoupled):
//   The four mirror columns (flight_no, station, airline, service_type) are
//   FS-driven via v_dispatch_with_flight on the read side and are about to be
//   dropped in Phase 3B Step 1. The resolver MUST NOT inject them into the
//   payload. We also defensively STRIP them if a caller passes them in, so
//   no stale UI state can contaminate the insert.

import { supabase } from "@/integrations/supabase/client";

export type ResolverTarget = "service_reports" | "dispatch_assignments";

// Mirror keys overwritten from FS for service_reports.
const SR_OVERRIDE_KEYS = [
  "flight_no",
  "station",
  "aircraft_type",
  "registration",
  "route",
  "arrival_date",
  "departure_date",
  "sta",
  "std",
] as const;

// Mirror keys that must NEVER reach a dispatch_assignments INSERT/UPDATE.
const DA_FORBIDDEN_KEYS = [
  "flight_no",
  "station",
  "airline",
  "service_type",
  "aircraft_type",
] as const;

function nonEmpty(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function stripDispatchMirrors<T extends Record<string, any>>(dbData: T): T {
  const out: Record<string, any> = { ...dbData };
  for (const k of DA_FORBIDDEN_KEYS) delete out[k];
  return out as T;
}

/**
 * Returns a payload safe to INSERT/UPDATE on the chosen target.
 *
 *   target = "service_reports"   (default — legacy compatibility)
 *     → fetches FS and overwrites mirror columns from the master row.
 *
 *   target = "dispatch_assignments"
 *     → does NOT touch FS, simply STRIPS the legacy mirror keys so the
 *       payload contains only operational + flight_schedule_id columns.
 *
 * Safe to call with `flightScheduleId = undefined` for service_reports — it
 * then returns dbData unchanged (legacy / unlinked report path).
 */
export async function resolveFlightMasterForWrite<T extends Record<string, any>>(
  dbData: T,
  flightScheduleId: string | null | undefined,
  target: ResolverTarget = "service_reports",
): Promise<T> {
  if (target === "dispatch_assignments") {
    // Phase 3B.0.6: dispatch writes are flight_schedule_id-only.
    return stripDispatchMirrors(dbData);
  }

  if (!flightScheduleId) return dbData;

  const { data: fs, error } = await supabase
    .from("flight_schedules")
    .select(
      "flight_no, authority, aircraft_type, registration, route, arrival_date, departure_date, sta, std"
    )
    .eq("id", flightScheduleId)
    .maybeSingle();

  if (error || !fs) {
    console.warn(
      "[Phase3A.5] FS resolver could not fetch master row; falling back to UI values",
      { flightScheduleId, error }
    );
    return dbData;
  }

  // FS uses `authority` as the station/airport authority field; mirror tables
  // expose it as `station`. Map explicitly.
  const fsMapped: Record<(typeof SR_OVERRIDE_KEYS)[number], unknown> = {
    flight_no: (fs as any).flight_no,
    station: (fs as any).authority,
    aircraft_type: (fs as any).aircraft_type,
    registration: (fs as any).registration,
    route: (fs as any).route,
    arrival_date: (fs as any).arrival_date,
    departure_date: (fs as any).departure_date,
    sta: (fs as any).sta,
    std: (fs as any).std,
  };

  const out: Record<string, any> = { ...dbData };
  for (const k of SR_OVERRIDE_KEYS) {
    const fsVal = fsMapped[k];
    if (nonEmpty(fsVal)) {
      out[k] = fsVal; // FS wins for non-empty values
    } else if (out[k] === undefined || out[k] === null) {
      out[k] = ""; // satisfy NOT NULL when both FS and UI are blank
    }
  }

  return out as T;
}
