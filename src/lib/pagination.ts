// Centralized list pagination contract (Batch 2).
//
// Why: dispatch_assignments, service_reports, and flight_schedules list
// endpoints must use a single page-size so cache keys align across screens
// and the LIMIT/OFFSET planner pattern stays predictable. Override only
// for non-list contexts (CSV export, etc.).
export const LIST_PAGE_SIZE = 50;
