import { describe, it, expect } from "vitest";
import { resolveDownloadFields } from "./securityDownloadFields";

describe("resolveDownloadFields — Security download field sourcing", () => {
  it("ATA stays empty when task_sheet_data.ata is blank (even if actual_start is set)", () => {
    const out = resolveDownloadFields(
      {
        actual_start: "08:45",
        actual_end: "09:30",
        task_sheet_data: { sta: "08:30", std: "09:15" /* no ata/atd */ },
      },
      { sta: "08:30", std: "09:15" },
    );
    expect(out.ata).toBe("");
    expect(out.atd).toBe("");
  });

  it("ATD stays empty when stored value is null/undefined/whitespace", () => {
    expect(resolveDownloadFields({ task_sheet_data: { atd: null } }).atd).toBe("");
    expect(resolveDownloadFields({ task_sheet_data: { atd: undefined } }).atd).toBe("");
    expect(resolveDownloadFields({ task_sheet_data: { atd: "   " } }).atd).toBe("");
    expect(resolveDownloadFields({}).atd).toBe("");
    expect(resolveDownloadFields(null).ata).toBe("");
  });

  it("ATA/ATD render the saved task_sheet_data values when present", () => {
    const out = resolveDownloadFields({
      task_sheet_data: { ata: "08:47", atd: "09:32" },
    });
    expect(out.ata).toBe("08:47");
    expect(out.atd).toBe("09:32");
  });

  it("Flight metadata prefers flight_schedules (SSoT), then task_sheet_data, then dispatch row", () => {
    const out = resolveDownloadFields(
      {
        flight_no: "SM 0486",
        registration: "SU-DISP",
        task_sheet_data: { flight_no: "SM 9999", registration: "SU-TS", route: "CAI-JED" },
      },
      { flight_no: "SM 0000", registration: "SU-FS", route: "CAI-DXB", sta: "10:00", std: "11:00" },
    );
    expect(out.flightNo).toBe("SM 0000");        // flight_schedules wins (Clearance amendment)
    expect(out.registration).toBe("SU-FS");      // flight_schedules wins
    expect(out.route).toBe("CAI-DXB");           // flight_schedules wins
    expect(out.sta).toBe("10:00");
    expect(out.std).toBe("11:00");
  });

  it("Falls through to task_sheet_data when flight_schedules is missing the field", () => {
    const out = resolveDownloadFields(
      {
        flight_no: "SM 0486",
        task_sheet_data: { registration: "SU-TS", route: "CAI-JED" },
      },
      { flight_no: "", registration: "", route: "", sta: "", std: "" },
    );
    expect(out.registration).toBe("SU-TS");
    expect(out.route).toBe("CAI-JED");
    expect(out.flightNo).toBe("SM 0486");
  });

  it("Falls through to flight_schedules when task_sheet_data is missing", () => {
    const out = resolveDownloadFields(
      { flight_no: "" },
      { flight_no: "SM 0123", registration: "SU-FS", route: "CAI-MED", sta: "06:00", std: "07:00", skd_type: "SKD" },
    );
    expect(out.flightNo).toBe("SM 0123");
    expect(out.registration).toBe("SU-FS");
    expect(out.route).toBe("CAI-MED");
    expect(out.sta).toBe("06:00");
    expect(out.std).toBe("07:00");
    expect(out.skdType).toBe("SKD");
  });

  it("Operational columns come from dispatch_assignments (not task_sheet_data)", () => {
    const out = resolveDownloadFields({
      staff_count: 4,
      staff_names: "Ahmed, Mona",
      scheduled_start: "08:00",
      scheduled_end: "10:00",
      actual_start: "08:05",
      actual_end: "10:10",
      contract_duration_hours: 2,
      actual_duration_hours: 2.08,
      overtime_hours: 0.08,
      base_fee: 100,
      service_rate: 50,
      overtime_charge: 4,
      total_charge: 154,
      status: "Completed",
      review_status: "Approved",
      notes: "ok",
      task_sheet_data: {},
    });
    expect(out.staffCount).toBe(4);
    expect(out.staffNames).toBe("Ahmed, Mona");
    expect(out.scheduledStart).toBe("08:00");
    expect(out.actualEnd).toBe("10:10");
    expect(out.totalCharge).toBe(154);
    expect(out.status).toBe("Completed");
    expect(out.reviewStatus).toBe("Approved");
    expect(out.remarks).toBe("ok");
  });

  it("Coerces non-numeric operational fields to 0", () => {
    const out = resolveDownloadFields({ staff_count: null, total_charge: undefined });
    expect(out.staffCount).toBe(0);
    expect(out.totalCharge).toBe(0);
  });

  it("Handles null/undefined inputs without throwing", () => {
    expect(() => resolveDownloadFields(null, null)).not.toThrow();
    expect(() => resolveDownloadFields(undefined)).not.toThrow();
    const out = resolveDownloadFields(null);
    expect(out.flightNo).toBe("");
    expect(out.ata).toBe("");
    expect(out.atd).toBe("");
  });
});
