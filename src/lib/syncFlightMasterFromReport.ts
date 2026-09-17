// Handling Service Report → flight_schedules (SSoT) write-back.
//
// Flight identity (flight_no, registration, route, aircraft_type, station) is
// owned by flight_schedules and READ back through v_service_report_with_flight.
// The report form lets the user edit those fields, but the service_reports
// payload strips them (see resolveFlightMasterForWrite) — so without this
// write-back the edits are silently discarded and the records list keeps
// showing the old values. That is the "form says X, record says Y" mismatch.
//
// Rules:
//  - never blank an existing master value with an empty form value
//  - only send fields that actually changed (avoids tripping the
//    ops-approved / invoiced protection triggers for no reason)
//  - schedule dates + STA/STD stay aligned with the report so every portal
//    groups the flight in the same period.

import { supabase } from "@/integrations/supabase/client";

const STATION_NAME_TO_IATA: Record<string, string> = {
  cairo: "CAI",
  alexandria: "ALY",
  hurghada: "HRG",
  "sharm el sheikh": "SSH",
  luxor: "LXR",
  aswan: "ASW",
  asyut: "ATZ",
  "marsa alam": "RMF",
  sohag: "HMB",
};

/** Normalize a station value (name or IATA) to the IATA code stored on flight_schedules.authority. */
export function toStationCode(station?: string | null): string {
  const v = String(station || "").trim();
  if (!v) return "";
  if (/^[A-Za-z]{3}$/.test(v)) return v.toUpperCase();
  return STATION_NAME_TO_IATA[v.toLowerCase()] || v.toUpperCase();
}

export interface ReportMasterInput {
  flightNo?: string | null;
  registration?: string | null;
  route?: string | null;
  aircraftType?: string | null;
  station?: string | null;
  arrivalDate?: string | null;
  departureDate?: string | null;
  sta?: string | null;
  std?: string | null;
}

export interface FlightMasterRow {
  flight_no?: string | null;
  registration?: string | null;
  route?: string | null;
  aircraft_type?: string | null;
  authority?: string | null;
  arrival_date?: string | null;
  departure_date?: string | null;
  sta?: string | null;
  std?: string | null;
}

const txt = (v: unknown) => String(v ?? "").trim();

/**
 * Pure diff: master fields on flight_schedules that the report form changed.
 * Returns an empty object when nothing needs writing.
 */
export function buildFlightMasterPatch(
  form: ReportMasterInput,
  current: FlightMasterRow | null | undefined,
): Record<string, string> {
  const cur = current || {};
  const patch: Record<string, string> = {};

  const put = (col: keyof FlightMasterRow, next: string, upper = false) => {
    const value = upper ? next.toUpperCase() : next;
    if (!value) return; // never blank an existing master value
    if (txt((cur as any)[col]).toUpperCase() === value.toUpperCase()) return;
    patch[col as string] = value;
  };

  put("flight_no", txt(form.flightNo), true);
  put("registration", txt(form.registration), true);
  put("route", txt(form.route), true);
  put("aircraft_type", txt(form.aircraftType));
  put("authority", toStationCode(form.station), true);
  put("arrival_date", txt(form.arrivalDate));
  put("departure_date", txt(form.departureDate));
  put("sta", txt(form.sta));
  put("std", txt(form.std));

  return patch;
}

export interface SyncResult {
  applied: Record<string, string>;
  error?: string;
}

/**
 * Push the report's master-field edits onto flight_schedules and verify the
 * write landed. Never throws — a locked (ops-approved / invoiced) flight is
 * reported back so the caller can warn the user instead of failing silently.
 */
export async function syncFlightMasterFromReport(
  flightScheduleId: string | null | undefined,
  form: ReportMasterInput,
): Promise<SyncResult> {
  if (!flightScheduleId) return { applied: {} };

  const { data: current, error: readErr } = await supabase
    .from("flight_schedules")
    .select("flight_no,registration,route,aircraft_type,authority,arrival_date,departure_date,sta,std")
    .eq("id", flightScheduleId)
    .maybeSingle();
  if (readErr) return { applied: {}, error: readErr.message };

  const patch = buildFlightMasterPatch(form, current as FlightMasterRow | null);
  if (Object.keys(patch).length === 0) return { applied: {} };

  const { data: updated, error } = await supabase
    .from("flight_schedules")
    .update(patch as any)
    .eq("id", flightScheduleId)
    .select("id")
    .maybeSingle();
  if (error) return { applied: {}, error: error.message };
  if (!updated) {
    return {
      applied: {},
      error: "This flight is locked (approved or already invoiced) — flight details were not changed.",
    };
  }
  return { applied: patch };
}
