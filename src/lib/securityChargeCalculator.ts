import type { SecurityRateRow } from "@/components/contracts/ContractTypes";

export interface SecurityChargeInput {
  airport: string;                 // e.g. "CAI", "HRG"
  flightType: string;              // "Turnaround Departure", "Turnaround Arrival", "Night Stop", "ADHOC"
  groundTimeHours: number;         // total ground time
  shortNotice?: boolean;           // ADHOC notified < 6h
  extraManpower?: number;          // additional security personnel
  rampVehicleTrips?: number;       // number of ramp vehicle trips
  returnToRampWithLoadChange?: boolean; // applies 50% of turnaround
  isAdhoc?: boolean;               // SKD type = ADHOC → add ADHOC surcharge on top of base
  rates: SecurityRateRow[];        // from the linked contract
}

export interface ChargeLine {
  label: string;
  qty: number;
  unit: string;
  rate: number;
  amount: number;
  notes?: string;
  /** Set when this line represents a missing-rate error so UIs can render a tooltip. */
  missingDetail?: {
    airport: string;
    flightType: string;
    location: string; // human-readable path: "Contracts → Security Rates → <airport> / <flightType>"
  };
}

export interface SecurityChargeResult {
  currency: string;
  lines: ChargeLine[];
  total: number;
}

/**
 * Find rate row by airport (with fallback to ALL) and flight_type.
 */
function findRate(rates: SecurityRateRow[], airport: string, flightType: string): SecurityRateRow | undefined {
  return (
    rates.find(r => r.airport === airport && r.flight_type === flightType) ||
    rates.find(r => r.airport === "ALL" && r.flight_type === flightType)
  );
}

/**
 * Compute security charges from a contract per the Air Cairo SGHA rules:
 * - Turnaround flights: ground time ≤ 3h base rate; extras at overtime rate using H.MM literal (e.g. 3h30m → 3.30, OT = 0.30 → 0.3h).
 * - Night Stop (>3h ground time): includes 2h Departure + 1h Arrival; extras charged.
 * - ADHOC: base rate; if short-notice, add Short Notice ADHOC fee.
 * - Return to Ramp with load change: 50% of turnaround rate.
 * - Additional Manpower: per person.
 * - Ramp Vehicle: per trip.
 */
export function calculateSecurityCharges(input: SecurityChargeInput): SecurityChargeResult {
  const { airport, flightType, groundTimeHours, rates } = input;
  const lines: ChargeLine[] = [];

  // Use the flight type as-is. Contract rates now use the canonical
  // SECURITY_FLIGHT_TYPES list: Arrival Security, Departure Security,
  // Maintenance Security, Turnaround. Overtime applies above included_hours.
  const effectiveType = flightType;

  // Primary lookup — NO fallback. If the rate is missing we surface an
  // explicit error line so the operator must define it in the contract.
  const baseRate = findRate(rates, airport, effectiveType);
  const currency = baseRate?.currency || "USD";

  if (!baseRate && !input.returnToRampWithLoadChange) {
    const location = `Contracts → Security Rates → ${airport} / ${effectiveType}`;
    lines.push({
      label: `⚠ Missing rate: ${effectiveType} – ${airport}`,
      qty: 0,
      unit: "—",
      rate: 0,
      amount: 0,
      notes: `No ${effectiveType} rate defined for ${airport} in this contract. Add it under: ${location}.`,
      missingDetail: { airport, flightType: effectiveType, location },
    });
  }

  // Maintenance Security: billed strictly per hour at the overtime rate.
  // Any partial hour counts as a full hour. No base/included-hours logic.
  if (baseRate && effectiveType === "Maintenance Security" && !input.returnToRampWithLoadChange) {
    const billedHours = Math.ceil(groundTimeHours || 0);
    const otRate = baseRate.overtime_rate || baseRate.rate || 0;
    const amount = Math.round(billedHours * otRate * 100) / 100;
    lines.push({
      label: `${effectiveType} – ${airport} (${billedHours}h)`,
      qty: billedHours,
      unit: "Per Hour",
      rate: otRate,
      amount,
      notes: baseRate.notes,
    });
  } else if (baseRate && !input.returnToRampWithLoadChange) {
    lines.push({
      label: `${effectiveType} – ${airport}`,
      qty: 1,
      unit: baseRate.unit || "Per Flight",
      rate: baseRate.rate,
      amount: baseRate.rate,
      notes: baseRate.notes,
    });

    // Overtime calculation — only when DURATION exceeds 3h.
    // Uses H.MM literal notation (e.g. 3h30m → 3.30, OT = 3.30 − 3 = 0.30 → 0.3h).
    // If duration ≤ 3h, OT is 0h and no overtime line is added.
    const included = Math.max(baseRate.included_hours || 0, 3);
    if (groundTimeHours > included && baseRate.overtime_rate > 0) {
      // H.MM literal: split whole hours and minutes, then round any fractional
      // hour UP to a full hour (e.g. 3h05m → 1h OT, 4h30m → 2h OT).
      const rawDelta = groundTimeHours - included;
      const wholeHours = Math.floor(rawDelta);
      const minutesPart = Math.round((rawDelta - wholeHours) * 100); // H.MM literal
      const billedHours = wholeHours + (minutesPart > 0 ? 1 : 0);
      const otAmount = Math.round(billedHours * baseRate.overtime_rate * 100) / 100;
      lines.push({
        label: `Overtime (${billedHours}h beyond ${included}h)`,
        qty: billedHours,
        unit: "Per Hour",
        rate: baseRate.overtime_rate,
        amount: otAmount,
      });
    }
  }

  // Return to Ramp with load change → 50% of turnaround
  if (input.returnToRampWithLoadChange) {
    const turnRate =
      findRate(rates, airport, "Turnaround Departure") ||
      findRate(rates, airport, "Turnaround Arrival");
    if (turnRate) {
      const amt = turnRate.rate * 0.5;
      lines.push({
        label: `Return to Ramp w/ Load Change (50% of ${turnRate.flight_type})`,
        qty: 1,
        unit: "Per Flight",
        rate: amt,
        amount: amt,
      });
    }
  }

  // Short notice ADHOC
  if (input.shortNotice && (flightType === "ADHOC" || effectiveType === "ADHOC")) {
    const sn = findRate(rates, airport, "Short Notice ADHOC");
    if (sn) lines.push({
      label: "Short Notice ADHOC Fee",
      qty: 1, unit: sn.unit, rate: sn.rate, amount: sn.rate, notes: sn.notes,
    });
  }

  // Additional Manpower
  if ((input.extraManpower || 0) > 0) {
    const am = findRate(rates, airport, "Additional Manpower");
    if (am) {
      const amt = am.rate * (input.extraManpower || 0);
      lines.push({
        label: `Additional Manpower (${input.extraManpower})`,
        qty: input.extraManpower || 0,
        unit: am.unit, rate: am.rate, amount: amt, notes: am.notes,
      });
    }
  }

  // Ramp Vehicle
  if ((input.rampVehicleTrips || 0) > 0) {
    const rv = findRate(rates, airport, "Ramp Vehicle");
    if (rv) {
      const amt = rv.rate * (input.rampVehicleTrips || 0);
      lines.push({
        label: `Ramp Vehicle (${input.rampVehicleTrips} trips)`,
        qty: input.rampVehicleTrips || 0,
        unit: rv.unit, rate: rv.rate, amount: amt, notes: rv.notes,
      });
    }
  }

  // ADHOC surcharge — when SKD type is ADHOC, add the contract's ADHOC fee on
  // top of the regular flight-type charge (e.g. flat $10 per flight).
  if (input.isAdhoc) {
    const ad = findRate(rates, airport, "ADHOC");
    if (ad && ad.rate > 0) {
      lines.push({
        label: `ADHOC Surcharge – ${airport}`,
        qty: 1,
        unit: ad.unit || "Per Flight",
        rate: ad.rate,
        amount: ad.rate,
        notes: ad.notes,
      });
    }
  }

  const total = lines.reduce((s, l) => s + l.amount, 0);
  return { currency, lines, total: Math.round(total * 100) / 100 };
}

/**
 * Compute ground time from "HH:MM" strings (supports midnight crossover).
 * Returns value in H.MM literal notation (e.g. 3h30m → 3.30, displayed as 3.3),
 * matching the airline ops convention where the decimal portion = literal minutes.
 */
export function groundTimeHours(start: string, end: string): number {
  if (!start || !end) return 0;
  const [h1, m1] = start.split(":").map(Number);
  const [h2, m2] = end.split(":").map(Number);
  if ([h1, m1, h2, m2].some(isNaN)) return 0;
  let mins = h2 * 60 + m2 - (h1 * 60 + m1);
  if (mins < 0) mins += 24 * 60;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  // H.MM literal: 3h30m → 3.30
  return Math.round((h + m / 100) * 100) / 100;
}
