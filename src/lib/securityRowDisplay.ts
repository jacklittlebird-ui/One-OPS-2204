/**
 * Resolves the display fields for a Security service report row, falling back
 * through three sources in priority order:
 *   1. flight_schedules lookup (when dispatch is linked to a schedule)
 *   2. flightMeta (the merged-pending row's clearance metadata)
 *   3. dispatch_assignments.task_sheet_data (the security task sheet itself)
 *
 * This guarantees that every column has a value as long as ANY of the data
 * sources contains it — so unlinked records (like SM 0486) never appear empty.
 */

export interface SecurityFlightDetails {
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

  return {
    flightNo: pick(r.flight_no, ts.flight_no, meta.flight_no),
    station: pick(r.station, meta.authority, ts.station),
    airline: pick(r.airline, meta.airline, ts.airline),
    serviceType: pick(r.service_type, ts.service_type),
    registration: pick(fd.registration, meta.registration, ts.registration),
    route: pick(fd.route, meta.route, ts.route),
    aircraftType: pick(fd.aircraft_type, meta.aircraft_type, ts.aircraft_type),
    skdType: pick(fd.skd_type, meta.skd_type, ts.flight_type, ts.skd_type),
    arrivalDate: pick(fd.arrival_date, meta.arrival_date, ts.arrival_date, ts.shift_start_date, r.flight_date),
    departureDate: pick(fd.departure_date, meta.departure_date, ts.departure_date, ts.shift_end_date, r.flight_date),
    sta: pick(fd.sta, meta.sta, ts.sta, r.scheduled_start),
    std: pick(fd.std, meta.std, ts.std, r.scheduled_end),
    ata: pick(ts.ata, r.actual_start),
    atd: pick(ts.atd, r.actual_end),
    scheduledStart: pick(r.scheduled_start, ts.shift_start, ts.sta),
    scheduledEnd: pick(r.scheduled_end, ts.shift_end, ts.std),
    actualStart: pick(r.actual_start, ts.ata, ts.shift_start),
    actualEnd: pick(r.actual_end, ts.atd, ts.shift_end),
    staffNames: pick(r.staff_names, ts.staff_names),
    staffCount: typeof r.staff_count === "number" && r.staff_count > 0 ? r.staff_count : 0,
    flightType: pick(ts.flight_type, fd.skd_type, meta.skd_type),
    remarks: pick(ts.remarks, meta.remarks),
  };
}
