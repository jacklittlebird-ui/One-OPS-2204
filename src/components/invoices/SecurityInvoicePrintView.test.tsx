import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SecurityInvoicePrintView, { type SecurityPrintInvoice } from "./SecurityInvoicePrintView";
import {
  SECURITY_INVOICE_COLUMNS,
  serializeSecurityDetail,
  parseSecurityDetail,
  backfillSecurityDetail,
} from "@/lib/securityInvoiceDetail";

const baseInvoice = (notesDetail: any[]): SecurityPrintInvoice => ({
  invoiceNo: "LNK-2026-TEST-SEC",
  date: "2026-05-01",
  dueDate: "2026-05-31",
  operator: "Test Air",
  airlineIATA: "TA",
  flightRef: "TA100",
  description: "Security invoice",
  station: "CAI",
  billingPeriod: "2026-05",
  handling: 100,
  other: 25,
  subtotal: 125,
  vat: 0,
  total: 125,
  currency: "USD",
  status: "Draft",
  notes: serializeSecurityDetail("Header note", notesDetail),
});

const sampleRow = {
  date: "2026-05-02",
  flight: "TA100",
  reg: "SU-ABC",
  route: "CAI-DXB",
  station: "CAI",
  serviceType: "Ramp Security",
  aircraftType: "A320",
  skdType: "INT",
  actualStart: "10:00",
  actualEnd: "12:30",
  durationHours: 2.5,
  overtimeHours: 0.5,
  staffCount: 4,
  handling: 100,
  other: 25,
  total: 125,
};

describe("SecurityInvoicePrintView", () => {
  it("renders ALL canonical column headers (and never the legacy 'Service / Notes')", () => {
    render(<SecurityInvoicePrintView invoice={baseInvoice([sampleRow])} onClose={() => {}} />);

    // Every canonical column must be present in a <th>
    const headers = screen.getAllByRole("columnheader").map(h => h.textContent?.trim());
    for (const col of SECURITY_INVOICE_COLUMNS) {
      expect(headers).toContain(col);
    }

    // The deprecated "Service / Notes" column must NEVER appear again
    expect(headers).not.toContain("Service / Notes");
    expect(screen.queryByText("Service / Notes")).toBeNull();
    expect(screen.queryByText(/^Service\s*\/\s*Notes$/i)).toBeNull();
  });

  it("renders per-flight data fields from the parsed detail row", () => {
    render(<SecurityInvoicePrintView invoice={baseInvoice([sampleRow])} onClose={() => {}} />);
    for (const v of ["TA100", "SU-ABC", "A320", "CAI-DXB", "INT", "Ramp Security", "10:00", "12:30"]) {
      expect(screen.getAllByText(v).length).toBeGreaterThan(0);
    }
  });
});

describe("securityInvoiceDetail backfill", () => {
  it("fills in missing fields from dispatch + flight schedule lookups", () => {
    const sparse = [{ date: "2026-05-02", flight: "TA100", handling: 100, other: 25, total: 125 }];
    const { rows, filledCount } = backfillSecurityDetail(sparse, {
      dispatches: [{ flight_no: "TA100", flight_date: "2026-05-02", service_type: "Ramp Security", actual_start: "10:00", actual_end: "12:30", actual_duration_hours: 2.5, overtime_hours: 0.5, staff_count: 4, registration: "SU-ABC", route: "CAI-DXB", station: "CAI" }],
      flightSchedules: [{ flight_no: "TA100", flight_date: "2026-05-02", aircraft_type: "A320", skd_type: "INT" }],
    });
    expect(filledCount).toBeGreaterThan(0);
    expect(rows[0].serviceType).toBe("Ramp Security");
    expect(rows[0].aircraftType).toBe("A320");
    expect(rows[0].skdType).toBe("INT");
    expect(rows[0].staffCount).toBe(4);
    expect(rows[0].reg).toBe("SU-ABC");
  });

  it("parse + serialize round trip preserves rows", () => {
    const notes = serializeSecurityDetail("hello", [sampleRow]);
    const { detail, cleanNotes } = parseSecurityDetail(notes);
    expect(cleanNotes).toBe("hello");
    expect(detail).toHaveLength(1);
    expect(detail[0].flight).toBe("TA100");
    expect(detail[0].aircraftType).toBe("A320");
  });
});
