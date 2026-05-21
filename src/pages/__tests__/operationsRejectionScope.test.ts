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

/**
 * Operations "Request Deletion" flow: must flip flight_schedules.status to "Rejected"
 * (Clearance Rejected tab) and stamp the reason into remarks, while leaving
 * dispatch_assignments.review_status untouched (no Station leak).
 */
function applyRequestDeletion(
  flight: { id: string; status: string; remarks: string },
  dispatch: { flight_schedule_id: string; review_status: string },
  reason: string,
) {
  const stamp = `[OPS DELETE REQUEST 2026-05-21 13:00] ${reason}`;
  flight.remarks = flight.remarks ? `${flight.remarks}\n${stamp}` : stamp;
  flight.status = "Rejected";
  // Station dispatch review status must NOT be touched.
}

function extractOpsReason(remarks: string): string {
  const matches = remarks.match(/\[OPS DELETE REQUEST[^\]]*\][^\n]*/g);
  return matches ? matches[matches.length - 1].replace(/^\[OPS DELETE REQUEST[^\]]*\]\s*/, "") : "";
}

describe("Operations Request Deletion scope", () => {
  it("routes the flight to the Clearance Rejected tab only, not the Station Rejected tab", () => {
    const flight = { id: "f3", status: "Approved", remarks: "" };
    const dispatch = { flight_schedule_id: "f3", review_status: "Pending Review" };

    applyRequestDeletion(flight, dispatch, "duplicate entry, please delete");

    expect(clearanceRejectedTab([flight])).toHaveLength(1);
    expect(stationRejectedTab([dispatch as any])).toHaveLength(0);
    expect(dispatch.review_status).toBe("Pending Review");
  });

  it("persists the deletion reason in remarks and exposes it for Clearance display", () => {
    const flight = { id: "f4", status: "Approved", remarks: "prior note" };
    const dispatch = { flight_schedule_id: "f4", review_status: "Draft" };

    applyRequestDeletion(flight, dispatch, "wrong registration");

    expect(flight.remarks).toContain("[OPS DELETE REQUEST");
    expect(extractOpsReason(flight.remarks)).toBe("wrong registration");
  });
});
