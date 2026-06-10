/**
 * Single source of truth for resolving Security Service Report download fields
 * (used by both the PDF task-sheet print and the Excel export).
 *
 * Sourcing rules (saved DB only — UI dialog props are NEVER fallbacks):
 *   ATA / ATD           : task_sheet_data ONLY. Blank stays blank.
 *   STA / STD           : task_sheet_data → flight_schedules.
 *   Flight metadata     : task_sheet_data → flight_schedules → dispatch row.
 *   Operational fields  : dispatch_assignments columns (authoritative).
 *
 * Keeping this logic in one file guarantees that the downloaded PDF and the
 * exported Excel both render the same value for the same record.
 */

export interface DownloadFields {
  station: string;
  airline: string;
  flightNo: string;
  date: string;
  serviceType: string;
  registration: string;
  route: string;
  aircraftType: string;
  skdType: string;
  sta: string;
  std: string;
  ata: string;   // strict: empty when not saved
  atd: string;   // strict: empty when not saved
  staffCount: number;
  staffNames: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart: string;
  actualEnd: string;
  contractDurationHours: number;
  actualDurationHours: number;
  overtimeHours: number;
  baseFee: number;
  serviceRate: number;
  overtimeCharge: number;
  totalCharge: number;
  status: string;
  reviewStatus: string;
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

const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

export function resolveDownloadFields(
  dispatchRow: Record<string, any> | null | undefined,
  flightSchedule?: Record<string, any> | null,
): DownloadFields {
  const d = dispatchRow || {};
  const f = flightSchedule || {};
  const ts = (d.task_sheet_data || {}) as Record<string, any>;

  return {
    station:        pick(d.station, f.authority),
    airline:        pick(d.airline, f.handling_agent),
    flightNo:       pick(ts.flight_no, f.flight_no, d.flight_no),
    date:           pick(d.flight_date, f.arrival_date, f.departure_date),
    serviceType:    pick(d.service_type, f.clearance_type),
    registration:   pick(ts.registration, f.registration, d.registration),
    route:          pick(ts.route, f.route, d.route),
    aircraftType:   pick(ts.aircraft_type, f.aircraft_type),
    skdType:        pick(ts.flight_type, ts.skd_type, f.skd_type, d.skd_type),
    sta:            pick(ts.sta, f.sta),
    std:            pick(ts.std, f.std),
    // ATA/ATD: strict task_sheet_data only. If the operator did not enter an
    // actual time, the download MUST render blank — do not fabricate from
    // scheduled times, dispatch shift times, or dialog props.
    ata:            pick(ts.ata),
    atd:            pick(ts.atd),
    staffCount:     num(d.staff_count),
    staffNames:     pick(d.staff_names),
    scheduledStart: pick(d.scheduled_start),
    scheduledEnd:   pick(d.scheduled_end),
    actualStart:    pick(d.actual_start),
    actualEnd:      pick(d.actual_end),
    contractDurationHours: num(d.contract_duration_hours),
    actualDurationHours:   num(d.actual_duration_hours),
    overtimeHours:         num(d.overtime_hours),
    baseFee:               num(d.base_fee),
    serviceRate:           num(d.service_rate),
    overtimeCharge:        num(d.overtime_charge),
    totalCharge:           num(d.total_charge),
    status:        pick(d.status),
    reviewStatus:  pick(d.review_status),
    remarks:       pick(ts.remarks, d.notes),
  };
}
