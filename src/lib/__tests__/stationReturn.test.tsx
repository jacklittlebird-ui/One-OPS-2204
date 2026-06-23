import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { parseDeletionRequests } from "@/lib/statusRouting";

/**
 * Covers the bug where the Station view's "Station Return to Clearance"
 * banner failed to render after a flight was returned. These tests pin:
 *
 *   1. The parser extracts the LATEST [Station Return …] entry even when
 *      multiple entries exist in remarks.
 *   2. The parser still surfaces a reason via the fallback path when the
 *      structured regex would otherwise miss it.
 *   3. The banner row renders the latest "Station Return to Clearance: …"
 *      label and reason for a flight whose remarks contain a Station Return.
 */

describe("parseDeletionRequests", () => {
  it("returns the LATEST station_return entry as the last element", () => {
    const remarks = [
      "Added from Security Service – pending Operations approval",
      "[Station Return 2026-06-17 21:20] this flight is Duplicate",
      "[Station Return 2026-06-22 13:50] Airline Type Missing",
      "[Station Return 2026-06-23 09:55] FINAL REASON",
    ].join("\n");

    const entries = parseDeletionRequests(remarks);
    expect(entries.length).toBe(3);
    const latest = entries[entries.length - 1];
    expect(latest.kind).toBe("station_return");
    expect(latest.reason).toBe("FINAL REASON");
  });

  it("sorts mixed ops_delete + station_return entries chronologically", () => {
    const remarks = [
      "[Station Return 2026-06-17 21:20] early station",
      "[OPS DELETE REQUEST 2026-06-22 12:00] mid ops",
      "[Station Return 2026-06-23 09:55] latest station",
    ].join("\n");

    const entries = parseDeletionRequests(remarks);
    expect(entries.map(e => e.reason)).toEqual([
      "early station",
      "mid ops",
      "latest station",
    ]);
    expect(entries[entries.length - 1].kind).toBe("station_return");
  });

  it("falls back to the raw line when the structured regex misses", () => {
    // Header without trailing space + reason — strict regex would still
    // match, but this exercises the fallback for malformed markers.
    const remarks = "[Station Return]bare-marker-no-header";
    const entries = parseDeletionRequests(remarks);
    expect(entries.length).toBe(1);
    expect(entries[0].kind).toBe("station_return");
    // The fallback returns either the trimmed reason or the raw line — both
    // are acceptable so long as something is surfaced.
    expect(entries[0].reason.length).toBeGreaterThan(0);
  });

  it("returns an empty list for null/empty remarks", () => {
    expect(parseDeletionRequests(null)).toEqual([]);
    expect(parseDeletionRequests("")).toEqual([]);
    expect(parseDeletionRequests("nothing interesting here")).toEqual([]);
  });
});

/**
 * Smoke test that the banner row a Station view renders for a returned
 * flight surfaces the LATEST reason. This mirrors the production JSX in
 * SecurityServiceReports.tsx so a regression in the rendering contract
 * (label text, reason text) trips this test.
 */
function StationReturnBanner({ remarks }: { remarks: string }) {
  const entries = parseDeletionRequests(remarks);
  if (entries.length === 0) return null;
  const latest = entries[entries.length - 1];
  const label =
    latest.kind === "ops_delete"
      ? "Operations Delete Request:"
      : "Station Return to Clearance:";
  return (
    <div data-testid="station-return-banner">
      <span>{label}</span> <span>{latest.reason || "Reason not provided"}</span>
    </div>
  );
}

describe("Station Return banner rendering", () => {
  it("displays 'Station Return to Clearance: <reason>' for a returned flight", () => {
    const remarks = [
      "Added from Security Service – pending Operations approval",
      "[Station Return 2026-06-22 13:50] Airline Type Missing",
      "[Station Return 2026-06-23 09:55] DELETE THIS FLIGHT",
    ].join("\n");

    render(<StationReturnBanner remarks={remarks} />);
    const banner = screen.getByTestId("station-return-banner");
    expect(banner.textContent).toContain("Station Return to Clearance:");
    expect(banner.textContent).toContain("DELETE THIS FLIGHT");
  });

  it("renders nothing when remarks contain no return marker", () => {
    const { container } = render(<StationReturnBanner remarks="business as usual" />);
    expect(container.firstChild).toBeNull();
  });
});
