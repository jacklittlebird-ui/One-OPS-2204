/**
 * Reusable status-to-portal mapping.
 *
 * "Rejected" can originate from three different flows; each flow drives a
 * different portal tab and writes to a different column:
 *
 *  1. Operations review rejection
 *       → dispatch_assignments.review_status = "Rejected"
 *       → surfaces in Station › Rejected Service Reports
 *
 *  2. Station return-to-Clearance (re-work request)
 *       → flight_schedules.status = "Rejected"
 *       → surfaces in Clearance › Rejected
 *
 *  3. Operations "Request Deletion" (sent to Clearance)
 *       → flight_schedules.status = "Rejected"
 *       → remarks stamped with "[OPS DELETE REQUEST …] reason"
 *       → surfaces in Clearance › Rejected (with the Ops reason inline)
 *
 *  IMPORTANT: an Operations review rejection must NEVER set
 *  flight_schedules.status — that would leak the row into the Clearance
 *  Rejected tab.
 */

export type RejectionFlow =
  | "operations_review"
  | "station_return"
  | "ops_delete_request";

export type PortalTab =
  | "clearance.rejected"
  | "station.rejected_service_reports";

export const REJECTION_FLOW_TO_PORTAL: Record<RejectionFlow, PortalTab> = {
  operations_review: "station.rejected_service_reports",
  station_return: "clearance.rejected",
  ops_delete_request: "clearance.rejected",
};

export interface FlightLike {
  status?: string | null;
  remarks?: string | null;
}

export interface DispatchLike {
  review_status?: string | null;
}

const OPS_DELETE_TAG = /\[OPS DELETE REQUEST[^\]]*\][^\n]*/g;
const OPS_DELETE_ENTRY = /\[OPS DELETE REQUEST([^\]]*)\]\s*([^\n]*)/g;

export interface OpsDeleteEntry {
  /** Header text inside the brackets (typically a timestamp). */
  header: string;
  /** Reason/notes after the bracket on the same line. */
  reason: string;
}

/** All OPS delete requests embedded in a remarks string, in chronological order. */
export function parseOpsDeleteRequests(remarks?: string | null): OpsDeleteEntry[] {
  if (!remarks) return [];
  const out: OpsDeleteEntry[] = [];
  for (const m of remarks.matchAll(OPS_DELETE_ENTRY)) {
    out.push({ header: (m[1] || "").trim(), reason: (m[2] || "").trim() });
  }
  return out;
}

/** Latest "Ops delete reason" extracted from a flight's remarks, or "". */
export function extractOpsDeleteReason(remarks?: string | null): string {
  if (!remarks) return "";
  const matches = remarks.match(OPS_DELETE_TAG);
  if (!matches) return "";
  return matches[matches.length - 1]
    .replace(/^\[OPS DELETE REQUEST[^\]]*\]\s*/, "")
    .trim();
}

/**
 * Interleave "ops-delete" marker rows before any flight whose remarks contain
 * an OPS delete request. Used by the Station view to guarantee the reason
 * panel always renders immediately above its flight.
 */
export interface StationOrderRow {
  id: string;
  remarks?: string | null;
}
export type StationOrderFragment =
  | { kind: "ops_delete"; flightId: string }
  | { kind: "flight"; flightId: string };

export function assembleStationRowOrder(rows: StationOrderRow[]): StationOrderFragment[] {
  const out: StationOrderFragment[] = [];
  for (const r of rows) {
    if (parseOpsDeleteRequests(r.remarks).length > 0) {
      out.push({ kind: "ops_delete", flightId: r.id });
    }
    out.push({ kind: "flight", flightId: r.id });
  }
  return out;
}


/** True if the flight should render in the Clearance "Rejected" tab. */
export function belongsToClearanceRejected(flight: FlightLike): boolean {
  return (flight.status || "") === "Rejected";
}

/** True if the dispatch should render in Station "Rejected Service Reports". */
export function belongsToStationRejected(dispatch: DispatchLike): boolean {
  return (dispatch.review_status || "") === "Rejected";
}

/** Which portal tab a given rejection-flow event will route to. */
export function portalTabForRejection(flow: RejectionFlow): PortalTab {
  return REJECTION_FLOW_TO_PORTAL[flow];
}
