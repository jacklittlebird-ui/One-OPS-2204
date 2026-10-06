import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import AirFranceTaskSheet, { AIR_FRANCE_SECTIONS, emptyAirFranceData, isAirFranceAirline, buildAirFrancePrintHtml } from "./AirFranceTaskSheet";

describe("Air France staff distribution", () => {
  it("detects Air France and keeps all 19 arrival/departure fields distinct and blank", () => {
    expect(isAirFranceAirline("AIR FRANCE")).toBe(true);
    expect(isAirFranceAirline("AirFrance")).toBe(true);
    expect(isAirFranceAirline("Ethiopian Airlines")).toBe(false);
    const fields = AIR_FRANCE_SECTIONS.flatMap(section => [...section.fields].map(field => field[0]));
    expect(new Set(fields).size).toBe(19);
    expect(Object.values(emptyAirFranceData()).every(value => value === "")).toBe(true);
  });
  it("boxes every editable staff field and uses separate saved keys for repeated positions", () => {
    const update = vi.fn();
    render(<AirFranceTaskSheet sheet={{ ...emptyAirFranceData(), remarks: "", security_supervisor: "" }} flight={{}} update={update} updateFlight={vi.fn()} dateDisplay={v => v} dateInput={v => v} timeInput={v => v} dualTimeInput={v => v} />);
    fireEvent.change(screen.getByLabelText("L1 Observer (FWD Galley Seals)"), { target: { value: "Arrival staff" } });
    fireEvent.change(screen.getByLabelText("L1 Observer"), { target: { value: "Departure staff" } });
    expect(update).toHaveBeenCalledWith("af_arr_l1", "Arrival staff");
    expect(update).toHaveBeenCalledWith("af_dep_l1", "Departure staff");
    expect(screen.getByLabelText("AIRFRANCE Representative")).toHaveClass("border");
    expect(screen.queryByText("Security Observers")).toBeNull();
    expect(screen.queryByText("Start Shift Time")).toBeNull();
    cleanup();
  });
  it("prints all persisted fields with logos, portrait format and safe text", () => {
    const data = Object.fromEntries(Object.keys(emptyAirFranceData()).map(key => [key, `Saved ${key}`]));
    const html = buildAirFrancePrintHtml({ ...data, flight_no: "AF 570/571", security_supervisor: "Rep <name>" }, "", "http://localhost:8080");
    Object.values(data).forEach(value => expect(html).toContain(value));
    expect(html).toContain("A4 portrait");
    expect(html).toContain("Air France Security Services");
    expect(html).toContain("Rep &lt;name&gt;");
    expect(html).not.toContain("SHIFT START");
  });
});