// Shared utilities for the Security Invoice detail (Annex A) embedded in
// `invoices.notes` as `__DETAIL__:[ ... ]`. Keeping this in one place lets the
// preview, the PDF print view, the regeneration helper and tests all agree on
// the canonical field list — preventing the legacy "Service / Notes" column
// from ever creeping back in.

export type SecurityDetailRow = {
  date?: string;
  arrDate?: string;
  depDate?: string;
  flight?: string;
  route?: string;
  reg?: string;
  station?: string;
  type?: string;
  serviceType?: string;
  aircraftType?: string;
  skdType?: string;
  actualStart?: string;
  actualEnd?: string;
  durationHours?: number;
  overtimeHours?: number;
  staffCount?: number;
  civil?: number;
  handling?: number;
  airport?: number;
  other?: number;
  total?: number;
  category?: string;
};

/**
 * Canonical column headers for the per-flight security invoice table.
 * Tests assert this exact list is rendered (and that "Service / Notes"
 * is NOT present).
 */
export const SECURITY_INVOICE_COLUMNS = [
  "S",
  "ARR DATE",
  "DEP DATE",
  "Flight",
  "Reg.",
  "A/C Type",
  "Route",
  "Service Type",
  "SKD",
  "Start",
  "End",
  "Duration (h)",
  "OT (h)",
  "Staff",
  "Amount",
] as const;

/**
 * Fields backfilled by the regeneration helper when an existing invoice
 * was created before the expanded field set existed.
 */
export const SECURITY_DETAIL_FIELDS = [
  "serviceType",
  "aircraftType",
  "skdType",
  "actualStart",
  "actualEnd",
  "durationHours",
  "overtimeHours",
  "staffCount",
] as const;

export function parseSecurityDetail(notes: string | null | undefined): {
  detail: SecurityDetailRow[];
  cleanNotes: string;
} {
  const raw = (notes ?? "").toString();
  const idx = raw.indexOf("__DETAIL__:");
  if (idx === -1) return { detail: [], cleanNotes: raw.trim() };
  const start = raw.indexOf("[", idx);
  if (start === -1) return { detail: [], cleanNotes: raw.replace(/__DETAIL__:.*$/s, "").trim() };
  let depth = 0;
  let end = -1;
  let inStr = false;
  let esc = false;
  for (let i = start; i < raw.length; i++) {
    const c = raw[i];
    if (esc) { esc = false; continue; }
    if (c === "\\") { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === "[") depth++;
    else if (c === "]") { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) return { detail: [], cleanNotes: raw.slice(0, idx).trim() };
  const cleanNotes = (raw.slice(0, idx) + raw.slice(end + 1)).trim();
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1));
    if (!Array.isArray(parsed)) return { detail: [], cleanNotes };
    return {
      detail: parsed.map((r: any) => ({
        date: r.date || "",
        flight: r.flight || "",
        reg: r.reg || "",
        route: r.route || "",
        station: r.station || "",
        type: r.type || "",
        serviceType: r.serviceType || "",
        aircraftType: r.aircraftType || "",
        skdType: r.skdType || "",
        actualStart: r.actualStart || "",
        actualEnd: r.actualEnd || "",
        durationHours: Number(r.durationHours) || 0,
        overtimeHours: Number(r.overtimeHours) || 0,
        staffCount: Number(r.staffCount) || 0,
        category: r.category || "",
        civil: Number(r.civil) || 0,
        handling: Number(r.handling) || 0,
        airport: Number(r.airport) || 0,
        other: Number(r.other) || 0,
        total: Number(r.total) || 0,
      })),
      cleanNotes,
    };
  } catch {
    return { detail: [], cleanNotes };
  }
}

export function serializeSecurityDetail(cleanNotes: string, detail: SecurityDetailRow[]): string {
  const base = (cleanNotes || "").trim();
  return `${base}\n__DETAIL__:${JSON.stringify(detail)}`;
}

/**
 * Backfill missing fields on each detail row by looking up the matching
 * dispatch assignment (by flight_no + flight_date) and flight schedule.
 * Returns the new rows plus a count of how many fields were filled in.
 */
export function backfillSecurityDetail(
  detail: SecurityDetailRow[],
  opts: {
    dispatches?: any[];
    flightSchedules?: any[];
  },
): { rows: SecurityDetailRow[]; filledCount: number } {
  const dispatches = opts.dispatches || [];
  const schedules = opts.flightSchedules || [];

  const dispatchByKey = new Map<string, any>();
  for (const d of dispatches) {
    const k = `${(d.flight_no || "").trim().toUpperCase()}__${(d.flight_date || "").toString().slice(0, 10)}`;
    if (k !== "__" && !dispatchByKey.has(k)) dispatchByKey.set(k, d);
  }
  const scheduleByKey = new Map<string, any>();
  for (const f of schedules) {
    const k = `${(f.flight_no || "").trim().toUpperCase()}__${(f.flight_date || "").toString().slice(0, 10)}`;
    if (k !== "__" && !scheduleByKey.has(k)) scheduleByKey.set(k, f);
  }

  let filledCount = 0;
  const rows = detail.map(row => {
    const k = `${(row.flight || "").trim().toUpperCase()}__${(row.date || "").toString().slice(0, 10)}`;
    const d = dispatchByKey.get(k);
    const f = scheduleByKey.get(k);
    const next: SecurityDetailRow = { ...row };
    const fill = (key: keyof SecurityDetailRow, value: any) => {
      const cur = next[key];
      const isEmpty = cur === undefined || cur === null || cur === "" || cur === 0;
      if (isEmpty && value !== undefined && value !== null && value !== "" && value !== 0) {
        (next as any)[key] = value;
        filledCount++;
      }
    };
    if (d) {
      fill("serviceType", d.service_type);
      fill("actualStart", d.actual_start);
      fill("actualEnd", d.actual_end);
      fill("durationHours", Number(d.actual_duration_hours) || 0);
      fill("overtimeHours", Number(d.overtime_hours) || 0);
      fill("staffCount", Number(d.staff_count) || 0);
      fill("reg", d.registration);
      fill("route", d.route);
      fill("station", d.station);
    }
    if (f) {
      fill("aircraftType", f.aircraft_type);
      fill("skdType", f.skd_type);
      fill("reg", f.registration);
      fill("route", f.route);
    }
    return next;
  });
  return { rows, filledCount };
}
