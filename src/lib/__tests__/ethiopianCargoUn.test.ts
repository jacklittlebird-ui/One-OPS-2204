import { describe, it, expect } from "vitest";
import { ethiopianCargoUn } from "@/lib/securityRowCharges";
describe("Ethiopian Cargo/UN rate", () => {
  it("Cargo uses Cargo rate", () => expect(ethiopianCargoUn({ airline: "Ethiopian Airlines", task_sheet_data: { flight_type: "Cargo" } })).toBe("Cargo"));
  it("UN uses UN rate", () => expect(ethiopianCargoUn({ airline: "Ethiopian Airlines", task_sheet_data: { flight_type: "UN" } })).toBe("UN"));
  it("PAX keeps normal rate", () => expect(ethiopianCargoUn({ airline: "Ethiopian Airlines", task_sheet_data: { flight_type: "PAX" } })).toBeNull());
  it("other airlines unaffected", () => expect(ethiopianCargoUn({ airline: "Air Cairo", task_sheet_data: { flight_type: "Cargo" } })).toBeNull());
});
