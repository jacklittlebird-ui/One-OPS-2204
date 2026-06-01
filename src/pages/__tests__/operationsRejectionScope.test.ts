import { describe, it, expect } from "vitest";
import {
  assembleStationRowOrder,
  belongsToClearanceRejected,
  belongsToStationRejected,
  extractOpsDeleteReason,
  parseOpsDeleteRequests,
  portalTabForRejection,
} from "@/lib/statusRouting";


/**
 * End-to-end logic test for the shared status-to-portal mapping
 * (`src/lib/statusRouting.ts`). Three different "Rejected" flows must each
 * route to the correct portal tab:
 *
 *   - operations_review     → Station › Rejected Service Reports
 *   - station_return        → Clearance › Rejected
 *   - ops_delete_request    → Clearance › Rejected (with Ops reason)
 */

// --- Flow simulators (mirrors of production mutations) ---

function applyOperationsRejection(
  flight: { status: string },
  dispatch: { review_status: string; review_comment: string },
  reason: string,
) {
  // Intentionally does NOT touch flight.status — would leak into Clearance.
  dispatch.review_status = "Rejected";
  dispatch.review_comment = reason;
}

function applyRequestDeletion(
  flight: { status: string; remarks: string },
  _dispatch: { review_status: string },
  reason: string,
) {
  const stamp = `[OPS DELETE REQUEST 2026-05-21 13:00] ${reason}`;
  flight.remarks = flight.remarks ? `${flight.remarks}\n${stamp}` : stamp;
  flight.status = "Rejected";
  // dispatch.review_status intentionally untouched.
}

describe("portalTabForRejection mapping", () => {
  it("routes each flow to the documented tab", () => {
    expect(portalTabForRejection("operations_review")).toBe("station.rejected_service_reports");
    expect(portalTabForRejection("station_return")).toBe("clearance.rejected");
    expect(portalTabForRejection("ops_delete_request")).toBe("clearance.rejected");
  });
});

describe("Operations rejection scope", () => {
  it("appears only in Station Rejected Service Reports, never in Clearance Rejected", () => {
    const flight = { status: "Approved" };
    const dispatch = { review_status: "Pending Review", review_comment: "" };

    applyOperationsRejection(flight, dispatch, "Wrong staff count reported");

    expect(belongsToStationRejected(dispatch)).toBe(true);
    expect(belongsToClearanceRejected(flight)).toBe(false);
    expect(flight.status).toBe("Approved");
    expect(dispatch.review_comment).toBe("Wrong staff count reported");
  });

  it("a Clearance-rejected flight does NOT leak into Station Rejected Service Reports", () => {
    const flight = { status: "Rejected" };
    const dispatch = { review_status: "Draft" };

    expect(belongsToClearanceRejected(flight)).toBe(true);
    expect(belongsToStationRejected(dispatch)).toBe(false);
  });
});

describe("Operations Request Deletion scope", () => {
  it("routes the flight to Clearance Rejected only, not Station", () => {
    const flight = { status: "Approved", remarks: "" };
    const dispatch = { review_status: "Pending Review" };

    applyRequestDeletion(flight, dispatch, "duplicate entry, please delete");

    expect(belongsToClearanceRejected(flight)).toBe(true);
    expect(belongsToStationRejected(dispatch)).toBe(false);
    expect(dispatch.review_status).toBe("Pending Review");
  });

  it("persists the deletion reason and exposes it for Clearance display", () => {
    const flight = { status: "Approved", remarks: "prior note" };
    const dispatch = { review_status: "Draft" };

    applyRequestDeletion(flight, dispatch, "wrong registration");

    expect(flight.remarks).toContain("[OPS DELETE REQUEST");
    expect(extractOpsDeleteReason(flight.remarks)).toBe("wrong registration");
  });

  it("returns empty reason when no Ops delete marker is present", () => {
    expect(extractOpsDeleteReason("")).toBe("");
    expect(extractOpsDeleteReason("[Station Return 2026-05-20 10:00] re-check time")).toBe("");
  });
});

describe("Station view: deletion-request row placement", () => {
  it("places the ops-delete marker row immediately above its flight", () => {
    const rows = [
      { id: "f1", remarks: "" },
      { id: "f2", remarks: "[OPS DELETE REQUEST 2026-05-21 13:00] duplicate entry" },
      { id: "f3", remarks: "" },
    ];
    const fragments = assembleStationRowOrder(rows);

    expect(fragments).toEqual([
      { kind: "flight", flightId: "f1" },
      { kind: "ops_delete", flightId: "f2" },
      { kind: "flight", flightId: "f2" },
      { kind: "flight", flightId: "f3" },
    ]);

    // Regression guard: ops-delete index must be exactly one before its flight.
    const deleteIdx = fragments.findIndex(f => f.kind === "ops_delete" && f.flightId === "f2");
    const flightIdx = fragments.findIndex(f => f.kind === "flight" && f.flightId === "f2");
    expect(deleteIdx).toBeGreaterThanOrEqual(0);
    expect(flightIdx - deleteIdx).toBe(1);
  });

  it("never inserts an ops-delete row in front of an unrelated flight", () => {
    const rows = [
      { id: "a", remarks: "[OPS DELETE REQUEST t1] reason A" },
      { id: "b", remarks: "[OPS DELETE REQUEST t2] reason B" },
    ];
    const fragments = assembleStationRowOrder(rows);

    // Each ops_delete fragment must reference the SAME flightId as the
    // flight row that immediately follows it.
    for (let i = 0; i < fragments.length - 1; i++) {
      if (fragments[i].kind === "ops_delete") {
        expect(fragments[i + 1].kind).toBe("flight");
        expect(fragments[i + 1].flightId).toBe(fragments[i].flightId);
      }
    }
  });

  it("does not emit an ops-delete row when remarks lack the marker", () => {
    const fragments = assembleStationRowOrder([
      { id: "x", remarks: "just a regular note" },
      { id: "y", remarks: null },
    ]);
    expect(fragments.every(f => f.kind === "flight")).toBe(true);
  });

  it("parses all entries in chronological order and preserves empty reasons", () => {
    const remarks = [
      "[OPS DELETE REQUEST 2026-05-21 13:00] first reason",
      "[OPS DELETE REQUEST 2026-05-22 09:30] ",
      "[OPS DELETE REQUEST 2026-05-23 11:15] third reason",
    ].join("\n");
    const entries = parseOpsDeleteRequests(remarks);
    expect(entries).toHaveLength(3);
    expect(entries[0].reason).toBe("first reason");
    expect(entries[1].reason).toBe(""); // empty → UI renders "Reason not provided"
    expect(entries[2].reason).toBe("third reason");
  });
});

