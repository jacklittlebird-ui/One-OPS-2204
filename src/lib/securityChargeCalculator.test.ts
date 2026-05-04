import { describe, it, expect } from "vitest";
import { calculateSecurityCharges, groundTimeHours } from "./securityChargeCalculator";
import type { SecurityRateRow } from "@/components/contracts/ContractTypes";

const makeRate = (overrides: Partial<SecurityRateRow>): SecurityRateRow => ({
  airport: "CAI",
  flight_type: "Departure Security",
  rate: 20,
  included_hours: 3,
  overtime_rate: 10,
  currency: "USD",
  unit: "Per Flight",
  notes: "",
  service_type: "Security",
  ...overrides,
});

describe("securityChargeCalculator – missing rate behavior (no fallback)", () => {
  it("emits a Missing rate error line when Arrival Security is not defined", () => {
    const rates: SecurityRateRow[] = [
      makeRate({ airport: "CAI", flight_type: "Departure Security", rate: 20 }),
    ];
    const res = calculateSecurityCharges({
      airport: "CAI",
      flightType: "Arrival Security",
      groundTimeHours: 2,
      rates,
    });
    expect(res.lines.length).toBe(1);
    expect(res.lines[0].label).toMatch(/Missing rate.*Arrival Security.*CAI/);
    expect(res.lines[0].amount).toBe(0);
    expect(res.lines[0].notes || "").toMatch(/No Arrival Security rate defined for CAI/);
    expect(res.total).toBe(0);
  });

  it("emits a Missing rate error line when Departure Security is not defined", () => {
    const rates: SecurityRateRow[] = [
      makeRate({ airport: "HBE", flight_type: "Arrival Security", rate: 15 }),
    ];
    const res = calculateSecurityCharges({
      airport: "HBE",
      flightType: "Departure Security",
      groundTimeHours: 1,
      rates,
    });
    expect(res.lines[0].label).toMatch(/Missing rate.*Departure Security.*HBE/);
    expect(res.total).toBe(0);
  });

  it("charges normally when the exact rate exists", () => {
    const rates: SecurityRateRow[] = [
      makeRate({ airport: "CAI", flight_type: "Arrival Security", rate: 18, notes: "primary" }),
      makeRate({ airport: "CAI", flight_type: "Departure Security", rate: 20 }),
    ];
    const res = calculateSecurityCharges({
      airport: "CAI",
      flightType: "Arrival Security",
      groundTimeHours: 1,
      rates,
    });
    expect(res.lines[0].label).not.toMatch(/Missing/);
    expect(res.lines[0].notes).toBe("primary");
    expect(res.total).toBe(18);
  });

  it("emits Missing rate when neither type is defined", () => {
    const rates: SecurityRateRow[] = [];
    const res = calculateSecurityCharges({
      airport: "HBE",
      flightType: "Arrival Security",
      groundTimeHours: 2,
      rates,
    });
    expect(res.lines.length).toBe(1);
    expect(res.lines[0].label).toMatch(/Missing rate/);
    expect(res.total).toBe(0);
  });

  it("applies overtime correctly when the exact rate exists (3h30m → 1h OT)", () => {
    const rates: SecurityRateRow[] = [
      makeRate({ airport: "CAI", flight_type: "Arrival Security", rate: 20, included_hours: 3, overtime_rate: 10 }),
    ];
    const res = calculateSecurityCharges({
      airport: "CAI",
      flightType: "Arrival Security",
      groundTimeHours: 3.30,
      rates,
    });
    expect(res.lines.length).toBe(2);
    expect(res.lines[1].label).toMatch(/Overtime \(1h beyond 3h\)/);
    expect(res.total).toBe(30);
  });

  it("per-airport independence (CAI missing → error, HRG has rate → charged)", () => {
    const rates: SecurityRateRow[] = [
      makeRate({ airport: "HRG", flight_type: "Arrival Security", rate: 10 }),
      makeRate({ airport: "CAI", flight_type: "Departure Security", rate: 20 }),
    ];
    const cai = calculateSecurityCharges({
      airport: "CAI", flightType: "Arrival Security", groundTimeHours: 1, rates,
    });
    const hrg = calculateSecurityCharges({
      airport: "HRG", flightType: "Arrival Security", groundTimeHours: 1, rates,
    });
    expect(cai.lines[0].label).toMatch(/Missing rate/);
    expect(cai.total).toBe(0);
    expect(hrg.lines[0].label).not.toMatch(/Missing/);
    expect(hrg.total).toBe(10);
  });
});

describe("groundTimeHours", () => {
  it("computes H.MM literal for normal interval", () => {
    expect(groundTimeHours("10:00", "13:30")).toBe(3.30);
  });
  it("handles midnight crossover", () => {
    expect(groundTimeHours("23:30", "01:00")).toBe(1.30);
  });
  it("returns 0 for empty input", () => {
    expect(groundTimeHours("", "10:00")).toBe(0);
  });
});
