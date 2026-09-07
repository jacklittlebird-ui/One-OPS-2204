import { describe, it, expect } from "vitest";
import {
  buildRatesByContract,
  computeLiveSecurityCharge,
  resolveEffectiveSecurityCharge,
} from "@/lib/securityRowCharges";

/**
 * Regression lock: the Service Report list and the Invoice generator MUST bill
 * the same amount for the same dispatch row.
 *
 * Historic bug: the invoice path resolved SKD type from a separately fetched
 * flight list keyed on a non-existent `flight_date` column, so ADHOC flights
 * lost their ADHOC surcharge (August 2026 Air Cairo: 7 flights, USD 215 short).
 * The dispatch view already carries `fs_skd_type` — that is the only source.
 */
const CONTRACT_ID = "contract-1";
const ratesByContractId = buildRatesByContract([
  { contract_id: CONTRACT_ID, airport: "CAI", flight_type: "Arrival Security", rate: 40, overtime_rate: 10, included_hours: 3, currency: "USD", unit: "Per Flight" },
  { contract_id: CONTRACT_ID, airport: "CAI", flight_type: "ADHOC", rate: 30, overtime_rate: 0, included_hours: 0, currency: "USD", unit: "Per Flight" },
]);

const row = {
  contract_id: CONTRACT_ID,
  station: "CAI",
  service_type: "Arrival Security",
  actual_start: "12:35",
  actual_end: "13:45",
  fs_skd_type: "ADHOC",
  total_security_charges: 40,
};

/** Mirrors Invoices.tsx lookupFlightInfo: view fs_* fields are authoritative. */
const skdOf = (d: any, joined?: any) =>
  (d?.fs_skd_type ?? "").toString().trim() || (joined?.skd_type ?? "").toString().trim();

describe("invoice ↔ service report charge parity", () => {
  it("adds the ADHOC surcharge from fs_skd_type on both paths", () => {
    const serviceReportAmount = computeLiveSecurityCharge(row, {
      ratesByContractId,
      skdType: row.fs_skd_type,
    }).amount;
    const invoiceAmount = resolveEffectiveSecurityCharge(row, {
      ratesByContractId,
      skdType: skdOf(row),
    }).amount;
    expect(serviceReportAmount).toBe(70);
    expect(invoiceAmount).toBe(serviceReportAmount);
  });

  it("does not depend on a separately fetched flight list", () => {
    // No joined flight row available at all — the surcharge must still apply.
    const amount = resolveEffectiveSecurityCharge(row, {
      ratesByContractId,
      skdType: skdOf(row, undefined),
    }).amount;
    expect(amount).toBe(70);
  });

  it("skips the surcharge for non-ADHOC flights", () => {
    const amount = resolveEffectiveSecurityCharge(
      { ...row, fs_skd_type: "SKD" },
      { ratesByContractId, skdType: skdOf({ ...row, fs_skd_type: "SKD" }) },
    ).amount;
    expect(amount).toBe(40);
  });
});
