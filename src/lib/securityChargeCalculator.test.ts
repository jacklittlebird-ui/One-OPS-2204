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

describe("securityChargeCalculator – fallback behavior", () => {
  it("uses Departure Security as fallback when Arrival Security is missing for the airport", () => {
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
    const line = res.lines[0];
    expect(line.amount).toBe(20);
    expect(line.label).toMatch(/Arrival Security/);
    expect(line.label).toMatch(/using Departure Security as fallback/);
    expect(line.notes || "").toMatch(/falling back to Departure Security/);
    expect(res.total).toBe(20);
  });

  it("uses Arrival Security as fallback when Departure Security is missing", () => {
    const rates: SecurityRateRow[] = [
      makeRate({ airport: "HBE", flight_type: "Arrival Security", rate: 15 }),
    ];
    const res = calculateSecurityCharges({
      airport: "HBE",
      flightType: "Departure Security",
      groundTimeHours: 1,
      rates,
    });
    expect(res.lines[0].label).toMatch(/using Arrival Security as fallback/);
    expect(res.lines[0].notes || "").toMatch(/falling back to Arrival Security/);
    expect(res.total).toBe(15);
  });

  it("does NOT add fallback note when the exact rate exists", () => {
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
    expect(res.lines[0].label).not.toMatch(/fallback/);
    expect(res.lines[0].notes).toBe("primary");
    expect(res.total).toBe(18);
  });

  it("returns no lines when neither Arrival nor Departure Security is defined", () => {
    const rates: SecurityRateRow[] = [];
    const res = calculateSecurityCharges({
      airport: "HBE",
      flightType: "Arrival Security",
      groundTimeHours: 2,
      rates,
    });
    expect(res.lines.length).toBe(0);
    expect(res.total).toBe(0);
  });

  it("applies overtime correctly on the fallback rate (3h30m → 1h OT)", () => {
    const rates: SecurityRateRow[] = [
      makeRate({ airport: "CAI", flight_type: "Departure Security", rate: 20, included_hours: 3, overtime_rate: 10 }),
    ];
    const res = calculateSecurityCharges({
      airport: "CAI",
      flightType: "Arrival Security",
      groundTimeHours: 3.30, // H.MM literal: 3h30m
      rates,
    });
    expect(res.lines.length).toBe(2);
    expect(res.lines[0].label).toMatch(/fallback/);
    expect(res.lines[1].label).toMatch(/Overtime \(1h beyond 3h\)/);
    expect(res.total).toBe(30);
  });

  it("falls back per-airport independently (CAI missing Arrival, HRG has Arrival)", () => {
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
    expect(cai.lines[0].label).toMatch(/fallback/);
    expect(cai.total).toBe(20);
    expect(hrg.lines[0].label).not.toMatch(/fallback/);
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
