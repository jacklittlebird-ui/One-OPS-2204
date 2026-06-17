/**
 * Canonical backend status values + UI mappings.
 *
 * Every column has a single allowed spelling (Title Case). The DB enforces
 * this via CHECK constraints for review_status. All UI mappings (colors,
 * comparisons, pipeline derivation) MUST go through this module so the
 * UI and backend never drift apart.
 */

// ---------- Canonical backend values ----------

export const FLIGHT_SCHEDULE_STATUSES = ["Pending", "Approved", "Rejected", "Completed"] as const;
export type FlightScheduleStatus = (typeof FLIGHT_SCHEDULE_STATUSES)[number];

export const DISPATCH_STATUSES = ["Pending", "Approved", "Completed", "Cancelled"] as const;
export type DispatchStatus = (typeof DISPATCH_STATUSES)[number];

export const REVIEW_STATUSES = [
  "Draft",
  "Pending Review",
  "Approved",
  "Modified",
  "Rejected",
  "Ready for Billing",
] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

// ---------- Normalization (defensive — DB now enforces, but legacy rows may slip in) ----------

const REVIEW_STATUS_NORMALIZE: Record<string, ReviewStatus> = {
  draft: "Draft",
  "pending review": "Pending Review",
  pending: "Pending Review",
  approved: "Approved",
  modified: "Modified",
  rejected: "Rejected",
  "ready for billing": "Ready for Billing",
  ready_for_billing: "Ready for Billing",
};

export function normalizeReviewStatus(raw?: string | null): ReviewStatus | "" {
  if (!raw) return "";
  const key = raw.trim().toLowerCase();
  return REVIEW_STATUS_NORMALIZE[key] || ("" as const);
}

const FLIGHT_STATUS_NORMALIZE: Record<string, FlightScheduleStatus> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  completed: "Completed",
};
export function normalizeFlightStatus(raw?: string | null): FlightScheduleStatus | "" {
  if (!raw) return "";
  return FLIGHT_STATUS_NORMALIZE[raw.trim().toLowerCase()] || ("" as const);
}

const DISPATCH_STATUS_NORMALIZE: Record<string, DispatchStatus> = {
  pending: "Pending",
  approved: "Approved",
  completed: "Completed",
  cancelled: "Cancelled",
  canceled: "Cancelled",
};
export function normalizeDispatchStatus(raw?: string | null): DispatchStatus | "" {
  if (!raw) return "";
  return DISPATCH_STATUS_NORMALIZE[raw.trim().toLowerCase()] || ("" as const);
}

// ---------- UI color tokens (semantic, design-system aligned) ----------

export const REVIEW_STATUS_COLORS: Record<ReviewStatus, string> = {
  Draft: "bg-muted text-muted-foreground border-border",
  "Pending Review": "bg-warning/15 text-warning border-warning/30",
  Approved: "bg-success/15 text-success border-success/30",
  Modified: "bg-info/15 text-info border-info/30",
  Rejected: "bg-destructive/15 text-destructive border-destructive/30",
  "Ready for Billing": "bg-violet/15 text-violet border-violet/30",
};

export const DISPATCH_STATUS_COLORS: Record<DispatchStatus, string> = {
  Pending: "bg-warning/15 text-warning border-warning/30",
  Approved: "bg-info/15 text-info border-info/30",
  Completed: "bg-success/15 text-success border-success/30",
  Cancelled: "bg-muted text-muted-foreground border-border",
};

export const FLIGHT_STATUS_COLORS: Record<FlightScheduleStatus, string> = {
  Pending: "bg-warning/15 text-warning border-warning/30",
  Approved: "bg-success/15 text-success border-success/30",
  Rejected: "bg-destructive/15 text-destructive border-destructive/30",
  Completed: "bg-success/15 text-success border-success/30",
};

export function reviewStatusClass(raw?: string | null): string {
  const v = normalizeReviewStatus(raw);
  return v ? REVIEW_STATUS_COLORS[v] : "bg-muted text-muted-foreground border-border";
}
export function dispatchStatusClass(raw?: string | null): string {
  const v = normalizeDispatchStatus(raw);
  return v ? DISPATCH_STATUS_COLORS[v] : "bg-muted text-muted-foreground border-border";
}
export function flightStatusClass(raw?: string | null): string {
  const v = normalizeFlightStatus(raw);
  return v ? FLIGHT_STATUS_COLORS[v] : "bg-muted text-muted-foreground border-border";
}

// ---------- Pipeline-stage semantics ----------

/** review_status values that mean "the station has submitted the task sheet" (step 2 done). */
export const REVIEW_STATUSES_AFTER_STATION: ReviewStatus[] = [
  "Pending Review",
  "Approved",
  "Modified",
  "Rejected",
  "Ready for Billing",
];

/** review_status values that mean "operations has approved" (step 3 done). */
export const REVIEW_STATUSES_AFTER_OPERATIONS: ReviewStatus[] = [
  "Approved",
  "Ready for Billing",
];
