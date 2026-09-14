import { describe, it, expect } from "vitest";
import { buildFlightMasterPatch, toStationCode } from "@/lib/syncFlightMasterFromReport";

describe("toStationCode", () => {
  it("maps station names to IATA and passes codes through", () => {
    expect(toStationCode("Cairo")).toBe("CAI");
    expect(toStationCode("Sharm El Sheikh")).toBe("SSH");
    expect(toStationCode("hrg")).toBe("HRG");
    expect(toStationCode("")).toBe("");
  });
});

describe("buildFlightMasterPatch", () => {
  const current = {
    flight_no: "MS123/4",
    registration: "SU-ABC",
    route: "CAI/JFK/CAI",
    aircraft_type: "A320",
    authority: "CAI",
    arrival_date: "2026-08-31",
    departure_date: "2026-08-31",
    sta: "10:00",
    std: "12:00",
  };

  it("returns only changed fields", () => {
    const patch = buildFlightMasterPatch(
      { ...{ flightNo: "MS123/4", registration: "SU-XYZ", route: "CAI/JFK/CAI", aircraftType: "A320", station: "Cairo", arrivalDate: "2026-09-01", departureDate: "2026-08-31", sta: "10:00", std: "12:00" } },
      current,
    );
    expect(patch).toEqual({ registration: "SU-XYZ", arrival_date: "2026-09-01" });
  });

  it("never blanks existing master values", () => {
    const patch = buildFlightMasterPatch({ flightNo: "", registration: "", route: "", station: "" }, current);
    expect(patch).toEqual({});
  });

  it("writes every field when no master row exists yet", () => {
    const patch = buildFlightMasterPatch({ flightNo: "ms999", station: "Luxor" }, null);
    expect(patch).toEqual({ flight_no: "MS999", authority: "LXR" });
  });

  it("ignores case-only differences", () => {
    const patch = buildFlightMasterPatch({ registration: "su-abc" }, current);
    expect(patch).toEqual({});
  });
});
