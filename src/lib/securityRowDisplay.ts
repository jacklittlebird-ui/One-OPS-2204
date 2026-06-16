/**
 * Resolves the display fields for a Security service report row, falling back
 * through three sources in priority order:
 *   1. dispatch_assignments.task_sheet_data (the latest station task sheet edit)
 *   2. flight_schedules lookup (when dispatch is linked to a schedule)
 *   3. flightMeta (the merged-pending row's clearance metadata)
 *
 * This guarantees that every column has a value as long as ANY of the data
 * sources contains it — so unlinked records (like SM 0486) never appear empty.
 */

export interface SecurityFlightDetails {
  flight_no?: string;
  registration?: string;
  route?: string;
  sta?: string;
  std?: string;
  skd_type?: string;
  clearance_type?: string;
  arrival_date?: string;
  departure_date?: string;
  aircraft_type?: string;
}

export interface SecurityRowLike {
  flight_no?: string;
  flight_date?: string;
  arrival_date?: string;
  departure_date?: string;
  station?: string;
  airline?: string;
  service_type?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  actual_start?: string;
  actual_end?: string;
  staff_names?: string;
  staff_count?: number;
  task_sheet_data?: Record<string, any> | null;
}

export interface SecurityRowDisplay {
  flightNo: string;
  station: string;
  airline: string;
  serviceType: string;
  registration: string;
  route: string;
  aircraftType: string;
  skdType: string;
  arrivalDate: string;
  departureDate: string;
  sta: string;
  std: string;
  ata: string;
  atd: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart: string;
  actualEnd: string;
  staffNames: string;
  staffCount: number;
  flightType: string;
  remarks: string;
}

const pick = (...vals: Array<unknown>): string => {
  for (const v of vals) {
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return "";
};

export function resolveSecurityRowDisplay(
  row: SecurityRowLike | null | undefined,
  flightDetails?: SecurityFlightDetails | null,
  flightMeta?: Record<string, any> | null
): SecurityRowDisplay {
  const r = row || {};
  const fd = flightDetails || {};
  const meta = flightMeta || {};
  const ts = (r.task_sheet_data || {}) as Record<string, any>;
  const serviceType = pick(r.service_type, fd.clearance_type, meta.clearance_type, ts.service_type);

  // If the station form explicitly saved arrival_date / departure_date in
  // task_sheet_data, honor those values VERBATIM — even when empty. The user
  // intentionally cleared them; do not fabricate a value from other fields.
  const tsHasArrival = ts && Object.prototype.hasOwnProperty.call(ts, "arrival_date");
  const tsHasDeparture = ts && Object.prototype.hasOwnProperty.call(ts, "departure_date");

  // Same intent for the row column itself: if the dispatch row has the
  // arrival_date / departure_date column persisted (even empty string), respect it.
  const rowHasArrival = r && Object.prototype.hasOwnProperty.call(r, "arrival_date");
  const rowHasDeparture = r && Object.prototype.hasOwnProperty.call(r, "departure_date");

  let arrivalDate: string;
  if (tsHasArrival) {
    arrivalDate = String(ts.arrival_date ?? "").trim();
  } else if (rowHasArrival) {
    arrivalDate = String((r as any).arrival_date ?? "").trim();
  } else {
    arrivalDate = pick(fd.arrival_date, meta.arrival_date);
  }

  let departureDate: string;
  if (tsHasDeparture) {
    departureDate = String(ts.departure_date ?? "").trim();
  } else if (rowHasDeparture) {
    departureDate = String(r.departure_date ?? "").trim();
  } else {
    departureDate = pick(fd.departure_date, meta.departure_date);
  }

  // SSoT Phase B: flight_schedules (fd) is the AUTHORITATIVE source for every
  // master field. task_sheet_data (ts) is a frozen snapshot taken when the
  // station first saved the sheet — using it ahead of fd masks later
  // Clearance amendments. Order is therefore: fd → meta → ts → row.
  return {
    flightNo: pick(fd.flight_no, meta.flight_no, ts.flight_no, r.flight_no),
    station: pick(r.station, meta.authority, ts.station),
    airline: pick(r.airline, meta.airline, ts.airline),
    serviceType,
    registration: pick(fd.registration, meta.registration, ts.registration),
    route: pick(fd.route, meta.route, ts.route),
    aircraftType: pick(fd.aircraft_type, meta.aircraft_type, ts.aircraft_type),
    skdType: pick(fd.skd_type, meta.skd_type, ts.flight_type, ts.skd_type),
    arrivalDate,
    departureDate,
    // STA/STD reflect the FLIGHT schedule only. Never fall back to dispatch
    // shift times (scheduled_start/scheduled_end) or actual times — those are
    // guard shift / actual movement times and would fabricate a fake STD when
    // the flight has no scheduled departure (e.g. arrival-only flights).
    sta: pick(fd.sta, meta.sta, ts.sta),
    std: pick(fd.std, meta.std, ts.std),
    ata: pick(ts.ata, r.actual_start),
    atd: pick(ts.atd, r.actual_end),
    scheduledStart: pick(r.scheduled_start, ts.shift_start, ts.sta),
    scheduledEnd: pick(r.scheduled_end, ts.shift_end, ts.std),
    actualStart: pick(r.actual_start, ts.ata, ts.shift_start),
    actualEnd: pick(r.actual_end, ts.atd, ts.shift_end),
    staffNames: pick(r.staff_names, ts.staff_names),
    staffCount: typeof r.staff_count === "number" && r.staff_count > 0 ? r.staff_count : 0,
    flightType: pick(fd.skd_type, meta.skd_type, ts.flight_type, ts.skd_type),
    remarks: pick(ts.remarks, meta.remarks),
  };
}
