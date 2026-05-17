import { describe, it, expect } from "vitest";
import { dedupeDispatchRows, buildSecurityFlightIdSet } from "./securityDispatchRows";

describe("dedupeDispatchRows", () => {
  it("keeps the most recently updated row per flight_schedule_id", () => {
    const rows = [
      { id: "a", flight_schedule_id: "F1", updated_at: "2026-01-01T00:00:00Z" },
      { id: "b", flight_schedule_id: "F1", updated_at: "2026-05-01T00:00:00Z" },
      { id: "c", flight_schedule_id: "F1", updated_at: "2026-03-01T00:00:00Z" },
    ];
    const out = dedupeDispatchRows(rows);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("b");
  });

  it("keeps rows that have no flight_schedule_id (orphans)", () => {
    const rows = [
      { id: "a", flight_schedule_id: null },
      { id: "b", flight_schedule_id: null },
      { id: "c", flight_schedule_id: "F1", updated_at: "2026-01-01" },
    ];
    const out = dedupeDispatchRows(rows);
    expect(out).toHaveLength(3);
  });

  it("falls back to created_at when updated_at is missing", () => {
    const rows = [
      { id: "a", flight_schedule_id: "F1", created_at: "2026-01-01" },
      { id: "b", flight_schedule_id: "F1", created_at: "2026-06-01" },
    ];
    const out = dedupeDispatchRows(rows);
    expect(out[0].id).toBe("b");
  });
});

describe("buildSecurityFlightIdSet → Handling tab exclusion", () => {
  it("emits every dispatch-assigned flight id so Handling can hide them", () => {
    const dispatches = [
      { flight_schedule_id: "F1" },
      { flight_schedule_id: "F2" },
      { flight_schedule_id: "F1" }, // duplicate
      { flight_schedule_id: null },
    ];
    const set = buildSecurityFlightIdSet(dispatches);
    expect(set.has("F1")).toBe(true);
    expect(set.has("F2")).toBe(true);
    expect(set.size).toBe(2);
  });

  it("simulates Handling exclusion for a station-scoped user", () => {
    const flightSchedules = [
      { id: "F1", authority: "ASW", purpose: "Scheduled" },   // dispatch-assigned -> Security only
      { id: "F2", authority: "ASW", purpose: "Scheduled" },   // pure handling
      { id: "F3", authority: "HBE", purpose: "Scheduled" },   // wrong station
    ];
    const dispatches = [{ flight_schedule_id: "F1" }];
    const securityIds = buildSecurityFlightIdSet(dispatches);

    const userStation = "ASW";
    const handlingRows = flightSchedules
      .filter((f) => f.authority === userStation)
      .filter((f) => !securityIds.has(f.id));

    expect(handlingRows.map((r) => r.id)).toEqual(["F2"]);

    // Security view = only flights with a dispatch_assignment, scoped to station
    const securityRows = flightSchedules
      .filter((f) => f.authority === userStation)
      .filter((f) => securityIds.has(f.id));

    expect(securityRows.map((r) => r.id)).toEqual(["F1"]);
  });
});
