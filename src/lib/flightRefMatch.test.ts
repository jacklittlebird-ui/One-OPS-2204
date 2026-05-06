import { describe, it, expect } from "vitest";
import { normalizeFlightKey, expandFlightRef } from "./flightRefMatch";

describe("normalizeFlightKey", () => {
  it("uppercases and removes spaces", () => {
    expect(normalizeFlightKey("sm 212")).toBe("SM212");
  });
  it("strips leading zeros after the airline code", () => {
    expect(normalizeFlightKey("SM 0212")).toBe("SM212");
    expect(normalizeFlightKey("SM0485")).toBe("SM485");
  });
  it("leaves non-flight tokens alone", () => {
    expect(normalizeFlightKey("AOG")).toBe("AOG");
  });
});

describe("expandFlightRef", () => {
  it("splits comma list and indexes each flight", () => {
    const keys = expandFlightRef("SM 0486, SM379");
    expect(keys).toContain("SM486");
    expect(keys).toContain("SM379");
  });

  it("expands paired flights joined by /", () => {
    const keys = expandFlightRef("SM212/1041");
    expect(keys).toContain("SM212");
    expect(keys).toContain("SM1041");
  });

  it("expands paired flights joined by - and carries airline prefix", () => {
    const keys = expandFlightRef("SM 0034-0035");
    expect(keys).toContain("SM34");
    expect(keys).toContain("SM35");
  });

  it("handles real-world mixed flight_ref string", () => {
    const keys = expandFlightRef(
      "SM 0452/485, AOG, SM 0486, SM 0034/0035, SM1042/451, SM212/1041, SM211"
    );
    expect(keys).toContain("SM452");
    expect(keys).toContain("SM485");
    expect(keys).toContain("SM486");
    expect(keys).toContain("SM34");
    expect(keys).toContain("SM35");
    expect(keys).toContain("SM1042");
    expect(keys).toContain("SM451");
    expect(keys).toContain("SM212");
    expect(keys).toContain("SM1041");
    expect(keys).toContain("SM211");
    expect(keys).toContain("AOG");
  });
});
