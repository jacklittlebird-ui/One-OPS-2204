import { describe, it, expect } from "vitest";
import { resolveBillingDate, shiftDateStr } from "@/lib/securityDispatchRows";

describe("resolveBillingDate", () => {
  it("prefers the flight_schedules date over a stale dispatch flight_date", () => {
    expect(
      resolveBillingDate({ fs_arrival_date: "2026-09-01", flight_date: "2026-08-31" }),
    ).toBe("2026-09-01");
  });
  it("uses the task-sheet ARR DATE shown in the list, even if the schedule was moved", () => {
    expect(
      resolveBillingDate({
        task_sheet_data: { arrival_date: "2026-08-31", departure_date: "2026-09-01" },
        fs_arrival_date: "2026-09-01",
        flight_date: "2026-08-31",
      }),
    ).toBe("2026-08-31");
  });
  it("falls back to fs departure then dispatch date", () => {
    expect(resolveBillingDate({ fs_departure_date: "2026-08-31" })).toBe("2026-08-31");
    expect(resolveBillingDate({ flight_date: "2026-08-31" })).toBe("2026-08-31");
    expect(resolveBillingDate({})).toBe("");
  });
});


describe("shiftDateStr", () => {
  it("buffers the fetch window across month boundaries", () => {
    expect(shiftDateStr("2026-09-01", -2)).toBe("2026-08-30");
    expect(shiftDateStr("2026-08-31", 2)).toBe("2026-09-02");
    expect(shiftDateStr("", -2)).toBe("");
  });
});
