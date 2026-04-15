import * as XLSX from "xlsx";

type ServiceType = string;

export interface ParsedRow {
  flight_number: string;
  route: string;
  aircraft_type: string;
  config: string;
  arrival_flight: string;
  arrival_date: string;
  sta: string;
  departure_flight: string;
  departure_date: string;
  std: string;
  service_type: ServiceType;
  week_days: string[];
  period_from: string;
  period_to: string;
  number_of_flights: number | null;
  ref_number: string;
  notes: string;
  _station_raw: string;
  _station_id: string;
  _dep_stn: string;
  _arr_stn: string;
  _ac_reg: string;
}

const COL_MAP: Record<string, keyof ParsedRow> = {
  "flight": "flight_number", "flight no": "flight_number", "flight_number": "flight_number",
  "flightno": "flight_number", "flt": "flight_number", "flt no": "flight_number",
  "fltid": "flight_number",
  "route": "route",
  "a/c type": "aircraft_type", "ac type": "aircraft_type", "aircraft": "aircraft_type",
  "aircraft_type": "aircraft_type", "actype": "aircraft_type",
  "acreg": "_ac_reg", "ac reg": "_ac_reg", "registration": "_ac_reg", "reg": "_ac_reg",
  "config": "config", "configuration": "config", "cfg": "config",
  "arrival flight": "arrival_flight", "arr flight": "arrival_flight",
  "arrival_flight": "arrival_flight", "arr flt": "arrival_flight",
  "arrival date": "arrival_date", "arr date": "arrival_date", "arrival_date": "arrival_date",
  "sta": "sta", "eta": "sta",
  "departure flight": "departure_flight", "dep flight": "departure_flight",
  "departure_flight": "departure_flight", "dep flt": "departure_flight",
  "departure date": "departure_date", "dep date": "departure_date", "departure_date": "departure_date",
  "std": "std", "etd": "std",
  "datop": "arrival_date",
  "depstn": "_dep_stn", "dep stn": "_dep_stn", "dep": "_dep_stn", "origin": "_dep_stn",
  "arrstn": "_arr_stn", "arr stn": "_arr_stn", "arr": "_arr_stn", "dest": "_arr_stn", "destination": "_arr_stn",
  "handling": "service_type", "service type": "service_type", "service_type": "service_type",
  "handling type": "service_type",
  "week days": "week_days", "weekdays": "week_days", "days": "week_days",
  "week_days": "week_days", "day": "week_days",
  "from": "period_from", "period from": "period_from", "period_from": "period_from",
  "start": "period_from", "start date": "period_from",
  "to": "period_to", "period to": "period_to", "period_to": "period_to",
  "end": "period_to", "end date": "period_to",
  "no of flights": "number_of_flights", "number_of_flights": "number_of_flights",
  "flights": "number_of_flights", "no flights": "number_of_flights", "total flights": "number_of_flights",
  "ref": "ref_number", "ref#": "ref_number", "ref_number": "ref_number", "reference": "ref_number",
  "notes": "notes", "remarks": "notes", "comment": "notes",
};

export const STATION_COL_NAMES = ["station", "airport", "iata", "apt", "base", "port"];

export function normalizeServiceType(val: string): ServiceType {
  const lower = val?.toLowerCase().trim() || "";
  if (lower.includes("arrival") && !lower.includes("departure")) return "arrival";
  if (lower.includes("departure") && !lower.includes("arrival")) return "departure";
  if (lower.includes("turnaround") || lower.includes("turn")) return "turnaround";
  if (lower.includes("maintenance") || lower.includes("maint")) return "maintenance";
  if (lower.includes("adhoc") || lower.includes("ad-hoc") || lower.includes("ad hoc")) return "adhoc";
  if (lower.includes("transport")) return "transportation";
  return "turnaround";
}

export function parseDate(val: any): string {
  if (!val) return "";
  if (val instanceof Date || (typeof val === "object" && val.getFullYear)) {
    const d = val as Date;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  if (typeof val === "number") {
    const date = XLSX.SSF.parse_date_code(val);
    return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
  }
  const str = String(val).trim();
  const parts = str.split(/[\/\-]/);
  if (parts.length === 3) {
    const [a, b, c] = parts.map(Number);
    if (c > 100) return `${c}-${String(a).padStart(2, "0")}-${String(b).padStart(2, "0")}`;
    if (a > 100) return `${a}-${String(b).padStart(2, "0")}-${String(c).padStart(2, "0")}`;
  }
  return str;
}

export function parseTime(val: any): string {
  if (!val && val !== 0) return "";
  if (typeof val === "number") {
    if (val >= 0 && val < 1) {
      const totalMinutes = Math.round(val * 24 * 60);
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
    const intVal = Math.round(val);
    if (intVal >= 0 && intVal <= 2400) {
      const h = Math.floor(intVal / 100);
      const m = intVal % 100;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
  }
  const str = String(val).trim();
  if (/^\d{1,2}:\d{2}$/.test(str)) return str;
  if (/^\d{3,4}$/.test(str)) {
    const n = parseInt(str);
    return `${String(Math.floor(n / 100)).padStart(2, "0")}:${String(n % 100).padStart(2, "0")}`;
  }
  return str;
}

export function parseWeekDays(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  const str = String(val);
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days.filter((d) => str.toLowerCase().includes(d.toLowerCase().slice(0, 3)));
}

function emptyRow(): ParsedRow {
  return {
    flight_number: "", route: "", aircraft_type: "", config: "",
    arrival_flight: "", arrival_date: "", sta: "", departure_flight: "",
    departure_date: "", std: "", service_type: "turnaround",
    week_days: [], period_from: "", period_to: "",
    number_of_flights: null, ref_number: "", notes: "",
    _station_raw: "", _station_id: "", _dep_stn: "", _arr_stn: "", _ac_reg: "",
  };
}

function mapRowFromJson(
  row: Record<string, any>,
  mapping: Record<string, keyof ParsedRow>,
  stationColName: string
): ParsedRow {
  const r: any = emptyRow();
  for (const [origCol, field] of Object.entries(mapping)) {
    const val = row[origCol];
    if (field === "service_type") r[field] = normalizeServiceType(String(val));
    else if (["arrival_date", "departure_date", "period_from", "period_to"].includes(field)) r[field] = parseDate(val);
    else if (field === "sta" || field === "std") r[field] = parseTime(val);
    else if (field === "week_days") r[field] = parseWeekDays(val);
    else if (field === "number_of_flights") r[field] = val ? parseInt(String(val)) || null : null;
    else r[field] = String(val || "");
  }
  if (stationColName && row[stationColName]) {
    r._station_raw = String(row[stationColName]).trim();
  }
  if (r._dep_stn && r._arr_stn && !r.route) {
    r.route = `${r._dep_stn}/${r._arr_stn}`;
  }
  if (r.arrival_date && !r.departure_date) {
    r.departure_date = r.arrival_date;
  }
  return r;
}

function buildMapping(headers: string[]): { mapping: Record<string, keyof ParsedRow>; stationCol: string; isTrafficReport: boolean } {
  const mapping: Record<string, keyof ParsedRow> = {};
  let stationCol = "";
  let isTrafficReport = false;
  const seen = new Set<string>();

  for (const h of headers) {
    const baseName = h.replace(/_\d+$/, "");
    const normalized = baseName.toLowerCase().trim();
    if (COL_MAP[normalized] && !seen.has(normalized)) {
      mapping[h] = COL_MAP[normalized];
      seen.add(normalized);
    }
    if (STATION_COL_NAMES.some((s) => normalized === s || normalized.includes(s))) {
      stationCol = h;
    }
    if (normalized === "depstn" || normalized === "arrstn" || normalized === "fltid" || normalized === "datop") {
      isTrafficReport = true;
    }
  }
  return { mapping, stationCol, isTrafficReport };
}

function findHeaderRow(ws: XLSX.WorkSheet): number {
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
  const knownHeaders = new Set(Object.keys(COL_MAP));
  for (let r = range.s.r; r <= Math.min(range.e.r, 20); r++) {
    let matchCount = 0;
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell?.v) {
        const val = String(cell.v).toLowerCase().trim();
        if (knownHeaders.has(val)) matchCount++;
      }
    }
    if (matchCount >= 2) return r;
  }
  return 0;
}

export function parseExcel(buffer: ArrayBuffer): { rows: ParsedRow[]; stationCol: string; isTrafficReport: boolean } {
  const data = new Uint8Array(buffer);
  const wb = XLSX.read(data, { type: "array", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const headerRowIdx = findHeaderRow(ws);
  const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "", range: headerRowIdx });
  if (json.length === 0) return { rows: [], stationCol: "", isTrafficReport: false };
  const headers = Object.keys(json[0]);
  const { mapping, stationCol, isTrafficReport } = buildMapping(headers);
  if (Object.keys(mapping).length === 0) return { rows: [], stationCol: "", isTrafficReport: false };
  const rows = json.map((row) => mapRowFromJson(row, mapping, stationCol)).filter((r) => r.flight_number);
  return { rows, stationCol, isTrafficReport };
}

export async function parseDocx(buffer: ArrayBuffer): Promise<{ rows: ParsedRow[]; stationCol: string; isTrafficReport: boolean }> {
  const mammoth = await import("mammoth");
  const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
  return parseHtmlTables(result.value);
}

export async function parsePdf(buffer: ArrayBuffer): Promise<{ rows: ParsedRow[]; stationCol: string; isTrafficReport: boolean }> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "";
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.filter((item: any) => "str" in item).map((item: any) => item.str);
    fullText += strings.join(" ") + "\n";
  }
  return parseTextContent(fullText);
}

function parseHtmlTables(html: string): { rows: ParsedRow[]; stationCol: string; isTrafficReport: boolean } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const tables = doc.querySelectorAll("table");
  if (tables.length > 0) {
    let bestTable: HTMLTableElement | null = null;
    let maxRows = 0;
    tables.forEach((t) => { if (t.rows.length > maxRows) { maxRows = t.rows.length; bestTable = t; } });
    if (bestTable) {
      const tbl = bestTable as HTMLTableElement;
      const headers = Array.from(tbl.rows[0]?.cells || []).map((c) => c.textContent?.trim() || "");
      const { mapping, stationCol, isTrafficReport } = buildMapping(headers);
      const rows: ParsedRow[] = [];
      for (let i = 1; i < tbl.rows.length; i++) {
        const cells = tbl.rows[i].cells;
        const rowObj: Record<string, any> = {};
        headers.forEach((h, idx) => { rowObj[h] = cells[idx]?.textContent?.trim() || ""; });
        rows.push(mapRowFromJson(rowObj, mapping, stationCol));
      }
      return { rows: rows.filter((r) => r.flight_number), stationCol, isTrafficReport };
    }
  }
  const textContent = doc.body?.textContent || "";
  return parseTextContent(textContent);
}

function parseTextContent(text: string): { rows: ParsedRow[]; stationCol: string; isTrafficReport: boolean } {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  let headerIdx = -1;
  let headerTokens: string[] = [];
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const tokens = lines[i].split(/\s{2,}|\t/).map((t) => t.trim()).filter(Boolean);
    const matchCount = tokens.filter((t) => COL_MAP[t.toLowerCase().trim()]).length;
    if (matchCount >= 2) { headerIdx = i; headerTokens = tokens; break; }
  }
  if (headerIdx === -1) return { rows: [], stationCol: "", isTrafficReport: false };
  const { mapping, stationCol, isTrafficReport } = buildMapping(headerTokens);
  const rows: ParsedRow[] = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const tokens = lines[i].split(/\s{2,}|\t/).map((t) => t.trim()).filter(Boolean);
    if (tokens.length < 2) continue;
    const rowObj: Record<string, any> = {};
    headerTokens.forEach((h, idx) => { rowObj[h] = tokens[idx] || ""; });
    rows.push(mapRowFromJson(rowObj, mapping, stationCol));
  }
  return { rows: rows.filter((r) => r.flight_number), stationCol, isTrafficReport };
}

export async function parseScheduleFile(
  file: File
): Promise<{ rows: ParsedRow[]; stationCol: string; isTrafficReport: boolean }> {
  const buffer = await file.arrayBuffer();
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (["xlsx", "xls", "csv"].includes(ext)) return parseExcel(buffer);
  if (ext === "docx" || ext === "doc") return parseDocx(buffer);
  if (ext === "pdf") return parsePdf(buffer);
  try { return parseExcel(buffer); }
  catch { throw new Error(`Unsupported file format: .${ext}`); }
}
