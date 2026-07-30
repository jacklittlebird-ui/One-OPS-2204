// Single source of truth for "what does this security dispatch row cost?".
//
// Both the Service Report list (AMOUNT column / Total Charges KPI) and the
// Invoices billing previews MUST use these helpers. Previously each page had
// its own variant (different ground-time source, different stored-vs-live
// precedence, no airline→contract fallback), which produced drifting station
// totals (e.g. RMF 5740 vs 5540).

import { calculateSecurityCharges } from "@/lib/securityChargeCalculator";

export function timeDiffMinutes(start?: string | null, end?: string | null): number {
  if (!start || !end) return 0;
  const [h1, m1] = String(start).split(":").map(Number);
  const [h2, m2] = String(end).split(":").map(Number);
  if ([h1, m1, h2, m2].some(v => Number.isNaN(v))) return 0;
  let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (diff < 0) diff += 24 * 60;
  return diff;
}

export function minutesToHMM(mins: number): number {
  if (!mins || mins < 0) return 0;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return Math.round((h + m / 100) * 100) / 100;
}

export function timeDiffHours(start?: string | null, end?: string | null): number {
  return minutesToHMM(timeDiffMinutes(start, end));
}

/** dispatch service_type → contract flight_type */
export function mapServiceTypeToFlightType(st?: string | null): string {
  const s = (st || "").toLowerCase();
  if (s.includes("turnaround")) return "Turnaround";
  if (s.includes("maintenance")) return "Maintenance Security";
  if (s.includes("departure")) return "Departure Security";
  if (s.includes("arrival")) return "Arrival Security";
  return st || "Turnaround";
}

/** airline (lowercased) → contract id, only when exactly ONE active contract exists. */
export function buildAirlineContractMap(contracts: any[]): Map<string, string> {
  const first = new Map<string, string>();
  const counts = new Map<string, number>();
  for (const c of contracts || []) {
    const k = String(c?.airline || "").toLowerCase().trim();
    if (!k) continue;
    counts.set(k, (counts.get(k) || 0) + 1);
    if (!first.has(k)) first.set(k, c.id);
  }
  const out = new Map<string, string>();
  for (const [k, id] of first) if (counts.get(k) === 1) out.set(k, id);
  return out;
}

export function buildRatesByContract(rates: any[]): Map<string, any[]> {
  const map = new Map<string, any[]>();
  for (const r of rates || []) {
    const id = String(r?.contract_id || "");
    if (!id) continue;
    const bucket = map.get(id) || [];
    bucket.push(r);
    map.set(id, bucket);
  }
  return map;
}

export interface LiveChargeResult {
  amount: number;
  base: number;
  overtime: number;
  currency: string;
  lines: any[];
}

const EMPTY: LiveChargeResult = { amount: 0, base: 0, overtime: 0, currency: "USD", lines: [] };

/**
 * Live-compute the charge for a dispatch row from its contract rates.
 * Ground time prefers actual_start/actual_end, falling back to the stored
 * actual_duration_hours — identical to the Edit dialog and DURATION column.
 */
export function computeLiveSecurityCharge(
  row: any,
  ctx: {
    ratesByContractId: Map<string, any[]>;
    airlineToContractId?: Map<string, string>;
    skdType?: string | null;
  },
): LiveChargeResult {
  const airlineKey = String(row?.airline || "").toLowerCase().trim();
  const contractId = row?.contract_id || ctx.airlineToContractId?.get(airlineKey) || "";
  if (!contractId) return EMPTY;
  const rates = ctx.ratesByContractId.get(String(contractId)) || [];
  if (!rates.length) return EMPTY;

  const gt = (row?.actual_start && row?.actual_end)
    ? timeDiffHours(row.actual_start, row.actual_end)
    : (Number(row?.actual_duration_hours) || 0);

  const skd = (ctx.skdType || "").toString().trim().toUpperCase();
  const result = calculateSecurityCharges({
    airport: row?.station || "CAI",
    flightType: mapServiceTypeToFlightType(row?.service_type),
    groundTimeHours: gt,
    isAdhoc: skd === "ADHOC",
    rates: rates as any,
  });
  const lines = result.lines || [];
  const overtime = lines
    .filter((l: any) => /overtime/i.test(l.label))
    .reduce((s: number, l: any) => s + (Number(l.amount) || 0), 0);
  const base = lines
    .filter((l: any) => !/overtime/i.test(l.label))
    .reduce((s: number, l: any) => s + (Number(l.amount) || 0), 0);
  return { amount: result.total || 0, base, overtime, currency: result.currency, lines };
}

/**
 * Effective billable amount for a dispatch row.
 * Precedence (must stay identical everywhere): live-computed > stored
 * total_security_charges > legacy total_charge.
 */
export function resolveEffectiveSecurityCharge(
  row: any,
  ctx: Parameters<typeof computeLiveSecurityCharge>[1],
): LiveChargeResult {
  const live = computeLiveSecurityCharge(row, ctx);
  if (live.amount > 0) return live;
  const saved = Number(row?.total_security_charges) || 0;
  const legacy = Number(row?.total_charge) || 0;
  const amount = saved > 0 ? saved : legacy;
  const overtime = Number(row?.overtime_charge) || 0;
  const base = Number(row?.base_fee) || Math.max(amount - overtime, 0);
  return { amount, base, overtime, currency: row?.charges_currency || "USD", lines: [] };
}
