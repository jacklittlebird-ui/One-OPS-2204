import { describe, it, expect } from "vitest";
import { resolveSecurityRowDisplay } from "./securityRowDisplay";

// Real-world unlinked SM 0486 dispatch_assignment captured from production:
// no flight_schedule_id link, but task_sheet_data carries the operational data.
const SM_0486_UNLINKED = {
  id: "67a8927a-e36a-4e53-881c-fba13012a2e0",
  flight_no: "SM 0486",
  flight_date: "2026-04-30",
  station: "HBE",
  airline: "Air Cairo",
  service_type: "Arrival Security",
  scheduled_start: "12:50",
  scheduled_end: "",
  actual_start: "12:35",
  actual_end: "13:35",
  staff_names: "Khaled Mokhtar",
  staff_count: 1,
  task_sheet_data: {
    registration: "BUU",
    route: "MED/HBE",
    flight_type: "Schedule",
    aircraft_type: "A220",
    sta: "12:50",
    ata: "12:35",
    atd: "13:35",
    shift_start_date: "2026-04-30",
    shift_end_date: "2026-04-30",
    remarks: "Smooth handling",
  },
};

describe("resolveSecurityRowDisplay (SM 0486 unlinked)", () => {
  it("renders every key column from task_sheet_data when no schedule is linked", () => {
    const d = resolveSecurityRowDisplay(SM_0486_UNLINKED, null, null);

    expect(d.flightNo).toBe("SM 0486");
    expect(d.station).toBe("HBE");
    expect(d.airline).toBe("Air Cairo");
    expect(d.serviceType).toBe("Arrival Security");
    expect(d.registration).toBe("BUU");
    expect(d.route).toBe("MED/HBE");
    expect(d.aircraftType).toBe("A220");
    expect(d.skdType).toBe("Schedule");
    expect(d.arrivalDate).toBe("2026-04-30");
    expect(d.departureDate).toBe("2026-04-30");
    expect(d.actualStart).toBe("12:35");
    expect(d.actualEnd).toBe("13:35");
    expect(d.staffNames).toBe("Khaled Mokhtar");
    expect(d.staffCount).toBe(1);
    expect(d.remarks).toBe("Smooth handling");
  });

  it("never returns blanks for SM 0486 critical columns", () => {
    const d = resolveSecurityRowDisplay(SM_0486_UNLINKED, null, null);
    const critical = [d.flightNo, d.registration, d.route, d.aircraftType, d.skdType, d.arrivalDate];
    critical.forEach(v => expect(v).not.toBe(""));
  });

  it("prefers flight_schedules data over task_sheet_data when both exist", () => {
    const d = resolveSecurityRowDisplay(
      SM_0486_UNLINKED,
      { registration: "SU-BWD", route: "MED-HBE", aircraft_type: "B737", skd_type: "Charter", arrival_date: "2026-05-10", departure_date: "2026-05-10" },
      null
    );
    expect(d.registration).toBe("SU-BWD");
    expect(d.route).toBe("MED-HBE");
    expect(d.aircraftType).toBe("B737");
    expect(d.skdType).toBe("Charter");
    expect(d.arrivalDate).toBe("2026-05-10");
  });

  it("uses the saved dispatch service date for departure-only Security even when the linked schedule arrival date is stale", () => {
    const d = resolveSecurityRowDisplay(
      {
        flight_no: "SM 0451",
        flight_date: "2026-05-25",
        service_type: "Departure Security",
        task_sheet_data: { shift_start_date: "2026-05-24", shift_end_date: "2026-05-25" },
      },
      { arrival_date: "2026-05-24", departure_date: "2026-05-25", std: "01:40" } as any,
      null
    );
    expect(d.arrivalDate).toBe("2026-05-25");
    expect(d.departureDate).toBe("2026-05-25");
  });

  it("never fabricates STD from dispatch shift end or actual end (SM 0452 HBE)", () => {
    // Arrival-only flight: schedule has no STD, task sheet std is blank, but
    // dispatch guard shift ends at 07:15 and actual movement ends 07:11. The
    // STD column MUST stay empty — those are not flight scheduled times.
    const row = {
      flight_no: "SM 0452",
      station: "HBE",
      scheduled_start: "06:15",
      scheduled_end: "07:15",
      actual_start: "06:11",
      actual_end: "07:11",
      task_sheet_data: { sta: "06:15", std: "", ata: "06:11", atd: "" },
    };
    const fd = { sta: "06:15", std: "" } as any;
    const d = resolveSecurityRowDisplay(row, fd, null);
    expect(d.sta).toBe("06:15");
    expect(d.std).toBe("");
  });


  it("falls back from flight_schedules → flightMeta → task_sheet_data", () => {
    const d = resolveSecurityRowDisplay(
      { flight_no: "SM 0486", task_sheet_data: { registration: "TS-REG", route: "TS-RT" } },
      { registration: "", route: "META-RT" } as any,
      null
    );
    expect(d.registration).toBe("TS-REG"); // schedule + meta empty → ts wins
    expect(d.route).toBe("META-RT");      // schedule empty → meta wins
  });

  it("handles null/undefined inputs without throwing", () => {
    const d = resolveSecurityRowDisplay(null, null, null);
    expect(d.flightNo).toBe("");
    expect(d.registration).toBe("");
  });
});
