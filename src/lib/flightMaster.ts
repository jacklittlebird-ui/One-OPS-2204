/**
 * Single Source of Truth adapter for flight master data.
 *
 * Phase 3 of the refactor: every read of a master flight field
 * (registration, route, aircraft_type, sta, std, skd_type,
 * clearance_type, flight_no, arrival_date, departure_date, authority)
 * MUST go through this adapter so we get the value from
 * `flight_schedules` whenever the row was joined, and only fall back
 * to the deprecated mirror columns (on dispatch_assignments /
 * service_reports / task_sheet_data) for legacy rows that don't yet
 * have a flight_schedule_id link.
 *
 * The mirror columns and the synchronization triggers are still
 * active during the rollout — this adapter prefers the master so we
 * can flip the read source without dropping anything.
 */

import { supabase } from "@/integrations/supabase/client";

export type FlightMasterFields = {
  flight_no: string | null;
  registration: string | null;
  aircraft_type: string | null;
  route: string | null;
  sta: string | null;
  std: string | null;
  skd_type: string | null;
  clearance_type: string | null;
  arrival_date: string | null;
  departure_date: string | null;
  authority: string | null;
  airline_id: string | null;
};

type AnyRow = Record<string, any> | null | undefined;

function pick(...candidates: any[]): string | null {
  for (const c of candidates) {
    if (c !== undefined && c !== null && c !== "") return String(c);
  }
  return null;
}

/**
 * Resolve canonical master fields from a row.
 * - `fs` is the joined `flight_schedules` row (preferred source).
 * - `row` is the operational/billing row that may carry deprecated
 *   mirror columns and/or `task_sheet_data` JSON.
 */
export function getMasterFields(row: AnyRow, fs?: AnyRow): FlightMasterFields {
  const ts = (row?.task_sheet_data ?? {}) as Record<string, any>;
  // Rows read from `v_dispatch_with_flight` carry the authoritative
  // flight_schedules values as flat `fs_*` columns instead of a nested
  // `flight_schedules` object. Treat them with the same (highest) priority as
  // a joined FS row — otherwise the frozen task_sheet_data snapshot wins and
  // forms show stale times while list records show the real schedule.
  const f = fs ?? {};
  const r = row ?? {};
  return {
    flight_no:      pick(f.flight_no, r.fs_flight_no, r.flight_no, ts.flight_no),
    registration:   pick(f.registration, r.fs_registration, r.registration, ts.registration),
    aircraft_type:  pick(f.aircraft_type, r.fs_aircraft_type, r.aircraft_type, ts.aircraft_type),
    route:          pick(f.route, r.fs_route, r.route, ts.route),
    sta:            pick(f.sta, r.fs_sta, r.sta, ts.sta),
    std:            pick(f.std, r.fs_std, r.std, ts.std),
    skd_type:       pick(f.skd_type, r.fs_skd_type, r.skd_type, ts.skd_type, ts.flight_type),
    clearance_type: pick(f.clearance_type, r.fs_clearance_type, r.clearance_type, r.service_type),
    arrival_date:   pick(f.arrival_date, r.fs_arrival_date, r.arrival_date, ts.arrival_date, r.flight_date),
    departure_date: pick(f.departure_date, r.fs_departure_date, r.departure_date, ts.departure_date),
    authority:      pick(f.authority, r.fs_authority, r.authority, r.station),
    airline_id:     pick(f.airline_id, r.fs_airline_id, r.airline_id),
  };
}

/** FK resolver for rows that may use either column name. */
export function pickFlightScheduleId(row: AnyRow): string | null {
  return pick(row?.flight_schedule_id, row?.fs_id);
}

/**
 * Station-only RPC that updates the allow-listed master fields on
 * flight_schedules and writes to migration_audit_log. Bypasses the
 * mirror columns — the existing sync triggers propagate to dispatch.
 */
export async function updateFlightMasterFromStation(
  flightScheduleId: string,
  patch: Partial<Pick<FlightMasterFields,
    "arrival_date" | "departure_date" | "registration" |
    "aircraft_type" | "route" | "sta" | "std">>,
) {
  const { data, error } = await (supabase.rpc as any)(
    "update_flight_master_from_station",
    { _id: flightScheduleId, _patch: patch as any },
  );
  if (error) throw error;
  return data;
}
