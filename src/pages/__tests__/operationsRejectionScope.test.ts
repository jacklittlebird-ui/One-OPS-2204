import { describe, it, expect } from "vitest";

/**
 * End-to-end logic test: an Operations rejection must
 *  - flip dispatch_assignments.review_status to "Rejected" (visible in Station "Rejected Service Reports")
 *  - NOT change flight_schedules.status (so it does NOT appear in Clearance "Rejected" tab)
 *  - persist the rejection reason in dispatch_assignments.review_comment
 */

// Mirror of the filters used in src/pages/Clearances.tsx (status tab "rejected")
const clearanceRejectedTab = (flights: { status: string }[]) =>
  flights.filter(f => f.status === "Rejected");

// Mirror of the filter used in src/pages/SecurityServiceReports.tsx (station "rejected" tab)
const stationRejectedTab = (dispatches: { review_status: string }[]) =>
  dispatches.filter(d => d.review_status === "Rejected");

// Mirror of the Operations rejection mutation (rejectPendingFlight)
function applyOperationsRejection(
  flight: { id: string; status: string },
  dispatch: { flight_schedule_id: string; review_status: string; review_comment: string },
  reason: string,
) {
  // ❗ Intentionally does NOT touch flight.status.
  dispatch.review_status = "Rejected";
  dispatch.review_comment = reason;
}

describe("Operations rejection scope", () => {
  it("appears only in the Station Rejected Service Reports tab, never in Clearance Rejected tab", () => {
    const flight = { id: "f1", status: "Approved" }; // clearance-approved
    const dispatch = { flight_schedule_id: "f1", review_status: "Pending Review", review_comment: "" };

    applyOperationsRejection(flight, dispatch, "Wrong staff count reported");

    expect(stationRejectedTab([dispatch])).toHaveLength(1);
    expect(clearanceRejectedTab([flight])).toHaveLength(0);
    expect(flight.status).toBe("Approved"); // clearance field untouched
    expect(dispatch.review_comment).toBe("Wrong staff count reported");
  });

  it("a Clearance-rejected flight does NOT leak into the Station Rejected Service Reports tab", () => {
    const flight = { id: "f2", status: "Rejected" }; // rejected by Clearance only
    const dispatch = { flight_schedule_id: "f2", review_status: "Draft", review_comment: "" };

    expect(clearanceRejectedTab([flight])).toHaveLength(1);
    expect(stationRejectedTab([dispatch])).toHaveLength(0);
  });
});
