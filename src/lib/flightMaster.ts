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
  return {
    flight_no:      pick(fs?.flight_no, row?.flight_no, ts.flight_no),
    registration:   pick(fs?.registration, row?.registration, ts.registration),
    aircraft_type:  pick(fs?.aircraft_type, row?.aircraft_type, ts.aircraft_type),
    route:          pick(fs?.route, row?.route, ts.route),
    sta:            pick(fs?.sta, row?.sta, ts.sta),
    std:            pick(fs?.std, row?.std, ts.std),
    skd_type:       pick(fs?.skd_type, row?.skd_type, ts.skd_type, ts.flight_type),
    clearance_type: pick(fs?.clearance_type, row?.clearance_type, row?.service_type),
    arrival_date:   pick(fs?.arrival_date, row?.arrival_date, ts.arrival_date, row?.flight_date),
    departure_date: pick(fs?.departure_date, row?.departure_date, ts.departure_date),
    authority:      pick(fs?.authority, row?.authority, row?.station),
    airline_id:     pick(fs?.airline_id, row?.airline_id),
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
