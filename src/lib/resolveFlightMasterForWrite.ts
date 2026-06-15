// Phase 3A.5 — INSERT/UPDATE hardener for service_reports + dispatch_assignments.
//
// Goal: guarantee mirror columns (flight_no, station, aircraft_type, registration,
// route, arrival_date, departure_date, sta, std, mtow) are ALWAYS populated and
// ALWAYS sourced from flight_schedules (SSoT) at write time — never from raw UI
// payload state. This keeps the NOT NULL constraints satisfied without any
// schema change while making the legacy mirrors a pure write-through projection
// of the master row.
//
// Strategy: if `flightScheduleId` is provided, fetch the canonical FS row and
// override the mirror keys on the outgoing dbData. If FS is missing, fall back
// to whatever the form supplied (legacy ad-hoc reports without a master link).

import { supabase } from "@/integrations/supabase/client";

// Columns that exist on flight_schedules AND must be overwritten from SSoT.
// `mtow` is intentionally excluded — it is not on flight_schedules; it is
// derived from the aircraft registry on the form side and remains UI-supplied.
const FS_OVERRIDE_KEYS = [
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

type FSOverrideKey = (typeof FS_OVERRIDE_KEYS)[number];

function nonEmpty(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/**
 * Returns a new dbData object with mirror fields overwritten from the
 * authoritative flight_schedules row. Existing UI values are kept only as
 * fallback when the FS row has the column blank.
 *
 * Safe to call with `flightScheduleId = undefined` — it then returns dbData
 * unchanged (legacy / unlinked report path).
 */
export async function resolveFlightMasterForWrite<T extends Record<string, any>>(
  dbData: T,
  flightScheduleId: string | null | undefined,
): Promise<T> {
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
  const fsMapped: Record<FSOverrideKey, unknown> = {
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
  for (const k of FS_OVERRIDE_KEYS) {
    const fsVal = fsMapped[k];
    if (nonEmpty(fsVal)) {
      out[k] = fsVal; // FS wins for non-empty values
    } else if (out[k] === undefined || out[k] === null) {
      out[k] = ""; // satisfy NOT NULL when both FS and UI are blank
    }
  }

  return out as T;
}

