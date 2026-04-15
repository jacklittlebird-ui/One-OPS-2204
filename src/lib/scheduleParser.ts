import * as XLSX from "xlsx";

export type ParsedFlight = {
  flight_no: string;
  airline_name: string;
  route: string;
  origin: string;
  destination: string;
  aircraft_type: string;
  registration: string;
  sta: string;
  std: string;
  arrival_date: string;
  departure_date: string;
  passengers: number;
  cargo_kg: number;
  week_days: string;
  skd_type: string;
  clearance_type: string;
  permit_no: string;
  handling_agent: string;
  config: number;
  matched_station: string;
  station_role: "arrival" | "departure" | "turnaround" | "";
  _raw: Record<string, any>;
};

type FormatType = "clearance" | "traffic" | "unknown";

const CLEARANCE_HEADERS = ["flight no", "route", "sta", "std", "a/c type", "aircraft type", "permit"];
const TRAFFIC_HEADERS = ["fltid", "depstn", "arrstn", "datop", "fltno"];

function detectFormat(headers: string[]): FormatType {
  const lower = headers.map(h => h.toLowerCase().trim());
  const trafficScore = TRAFFIC_HEADERS.filter(h => lower.some(l => l.includes(h))).length;
  const clearanceScore = CLEARANCE_HEADERS.filter(h => lower.some(l => l.includes(h))).length;
  if (trafficScore >= 2) return "traffic";
  if (clearanceScore >= 2) return "clearance";
  return "unknown";
}

function col(row: Record<string, any>, ...keys: string[]): string {
  for (const k of keys) {
    for (const rk of Object.keys(row)) {
      if (rk.toLowerCase().trim() === k.toLowerCase()) return String(row[rk] ?? "").trim();
    }
  }
  return "";
}

function colNum(row: Record<string, any>, ...keys: string[]): number {
  const v = col(row, ...keys);
  return Number(v) || 0;
}

function normalizeDate(val: string): string {
  if (!val) return "";
  // Try ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(val)) return val.slice(0, 10);
  // DD/MM/YYYY
  const dmy = val.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  // Excel serial
  const num = Number(val);
  if (num > 30000 && num < 100000) {
    const d = new Date((num - 25569) * 86400 * 1000);
    return d.toISOString().slice(0, 10);
  }
  return val;
}

function matchStations(
  origin: string,
  destination: string,
  stationCodes: string[]
): { matched_station: string; station_role: ParsedFlight["station_role"] } {
  const o = origin.toUpperCase();
  const d = destination.toUpperCase();
  const oMatch = stationCodes.includes(o);
  const dMatch = stationCodes.includes(d);
  if (oMatch && dMatch) return { matched_station: o, station_role: "turnaround" };
  if (dMatch) return { matched_station: d, station_role: "arrival" };
  if (oMatch) return { matched_station: o, station_role: "departure" };
  return { matched_station: "", station_role: "" };
}

function autoServiceType(role: ParsedFlight["station_role"]): string {
  if (role === "arrival") return "Arrival Handling";
  if (role === "departure") return "Departure Handling";
  return "Full Handling";
}

function parseClearanceRow(row: Record<string, any>, stationCodes: string[]): ParsedFlight[] {
  const flightNo = col(row, "Flight No", "Flight", "flight_no", "FLIGHT", "FltNo");
  if (!flightNo) return [];

  const route = col(row, "Route", "ROUTE", "route");
  const parts = route.split(/[-\/]/).map(s => s.trim().toUpperCase());
  const origin = parts[0] || col(row, "Origin", "DepStn", "DEP");
  const destination = parts[1] || col(row, "Destination", "ArrStn", "ARR");
  const stationMatch = matchStations(origin, destination, stationCodes);

  return [{
    flight_no: flightNo,
    airline_name: col(row, "Airline", "Operator", "airline", "Account"),
    route: route || `${origin}-${destination}`,
    origin, destination,
    aircraft_type: col(row, "A/C Type", "Aircraft Type", "aircraft_type", "AcType"),
    registration: col(row, "Reg No", "Registration", "REG", "registration"),
    sta: col(row, "STA", "sta"),
    std: col(row, "STD", "std"),
    arrival_date: normalizeDate(col(row, "Arrival Date", "arrival_date", "Date")),
    departure_date: normalizeDate(col(row, "Departure Date", "departure_date", "Date")),
    passengers: colNum(row, "PAX", "passengers", "Pax"),
    cargo_kg: colNum(row, "Cargo", "cargo_kg"),
    week_days: col(row, "Days", "week_days", "WeekDays"),
    skd_type: col(row, "Skd Type", "SKD", "skd_type"),
    clearance_type: col(row, "Service Type", "Type", "clearance_type") || autoServiceType(stationMatch.station_role),
    permit_no: col(row, "Permit No", "permit_no", "Permit"),
    handling_agent: col(row, "Handling Agent", "handling_agent", "Handling"),
    config: colNum(row, "Config", "config"),
    ...stationMatch,
    _raw: row,
  }];
}

function parseTrafficRow(row: Record<string, any>, stationCodes: string[]): ParsedFlight[] {
  const flightNo = col(row, "FltId", "FltNo", "Flight No", "FlightId", "FLIGHT");
  if (!flightNo) return [];

  const origin = col(row, "DepStn", "DEP", "Origin").toUpperCase();
  const destination = col(row, "ArrStn", "ARR", "Destination").toUpperCase();
  const date = normalizeDate(col(row, "DatOp", "Date", "FlightDate", "DateOp"));
  const acType = col(row, "AcType", "A/C Type", "Aircraft", "ACType");
  const reg = col(row, "Registration", "Reg", "REG", "AcReg");
  const pax = colNum(row, "Pax", "PAX", "PaxTotal");
  const airline = col(row, "Airline", "Operator", "Carrier");

  const results: ParsedFlight[] = [];
  const oMatch = stationCodes.includes(origin);
  const dMatch = stationCodes.includes(destination);

  const base: Omit<ParsedFlight, "matched_station" | "station_role" | "clearance_type"> = {
    flight_no: flightNo,
    airline_name: airline,
    route: `${origin}-${destination}`,
    origin, destination,
    aircraft_type: acType,
    registration: reg,
    sta: col(row, "STA", "ArrTime", "sta"),
    std: col(row, "STD", "DepTime", "std"),
    arrival_date: date,
    departure_date: date,
    passengers: pax,
    cargo_kg: colNum(row, "Cargo", "cargo_kg"),
    week_days: "",
    skd_type: "",
    permit_no: "",
    handling_agent: "",
    config: 0,
    _raw: row,
  };

  if (oMatch && dMatch) {
    // Both match → 2 records
    results.push({ ...base, matched_station: origin, station_role: "departure", clearance_type: "Departure Handling" });
    results.push({ ...base, matched_station: destination, station_role: "arrival", clearance_type: "Arrival Handling" });
  } else if (dMatch) {
    results.push({ ...base, matched_station: destination, station_role: "arrival", clearance_type: "Arrival Handling" });
  } else if (oMatch) {
    results.push({ ...base, matched_station: origin, station_role: "departure", clearance_type: "Departure Handling" });
  } else {
    // No match - still add but flag
    results.push({ ...base, matched_station: "", station_role: "", clearance_type: "Full Handling" });
  }

  return results;
}

export function parseScheduleData(
  rows: Record<string, any>[],
  stationCodes: string[]
): { flights: ParsedFlight[]; format: FormatType; unmatchedCount: number } {
  if (rows.length === 0) return { flights: [], format: "unknown", unmatchedCount: 0 };

  const headers = Object.keys(rows[0]);
  const format = detectFormat(headers);
  const parser = format === "traffic" ? parseTrafficRow : parseClearanceRow;
  const codes = stationCodes.map(s => s.toUpperCase());

  const flights: ParsedFlight[] = [];
  for (const row of rows) {
    flights.push(...parser(row, codes));
  }

  const unmatchedCount = flights.filter(f => !f.matched_station).length;
  return { flights, format, unmatchedCount };
}

export async function readFileAsRows(file: File): Promise<Record<string, any>[]> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "csv") {
    const text = await file.text();
    const wb = XLSX.read(text, { type: "string" });
    return XLSX.utils.sheet_to_json<Record<string, any>>(wb.Sheets[wb.SheetNames[0]]);
  }

  if (ext === "xlsx" || ext === "xls") {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    return XLSX.utils.sheet_to_json<Record<string, any>>(wb.Sheets[wb.SheetNames[0]]);
  }

  throw new Error(`Unsupported file format: .${ext}. Please use .xlsx, .xls, or .csv files.`);
}
