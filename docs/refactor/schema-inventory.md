# Schema Inventory — Master Flight Data Duplication

Captured during Phase 1 of the Single Source of Truth refactor. No columns are dropped or renamed; this document is the source for Phase 6 deprecation comments and the Phase 7 drop script.

## Master owner: `flight_schedules`
Authoritative columns for every flight: `flight_no`, `registration`, `aircraft_type`, `route`, `sta`, `std`, `arrival_date`, `departure_date`, `clearance_type`, `skd_type`, `status`, `airline_id`, `authority`, `purpose`, `remarks`.

## Mirrored on `dispatch_assignments`
Top-level columns: `flight_no`, `station` (mirrors `authority`), `airline`, `flight_date` (mirrors arrival/departure date), `service_type` (mirrors `clearance_type`).
Inside `task_sheet_data` JSON: `registration`, `route`, `aircraft_type`, `sta`, `std`, `skd_type`, `flight_type`, `arrival_date`, `departure_date`, `ata`, `atd`.

Operational data that stays in `dispatch_assignments` (not mirrored):
`scheduled_start`, `scheduled_end`, `actual_start`, `actual_end`, `staff_names`, `staff_count`, `overtime_hours`, `overtime_rate`, `base_fee`, `service_rate`, `total_charge`, `task_sheet_data` (operational keys), `review_status`, `status`, `notes`.

## Mirrored on `service_reports`
Top-level columns: `flight_no`, `aircraft_type`, `registration`, `route`, `sta`, `std`, `arrival_date`, `departure_date`, `station` (mirrors `authority`).

Billing/report data that stays in `service_reports`:
`handling_type`, `mtow`, all `pax_*` and `crew_count`, `parking_*`, `housing_*`, `landing_charge`, `parking_charge`, `housing_charge`, `fuel_charge`, `catering_charge`, `hotac_charge`, `civil_aviation_fee`, `handling_fee`, `airport_charge`, `total_cost`, `currency`, `review_status`, `reviewed_by`, `reviewed_at`, `ata`, `atd`, `confirmation_no`, `flight_status`, and the sub-tables (`service_report_delays`, `_fuel`, `_catering`, `_hotac`).

## Active triggers (kept enabled until Phase 5)
- `sync_flight_schedule_to_dispatch` — `flight_schedules` → `dispatch_assignments` and `service_reports`.
- `sync_security_dispatch_to_flight_schedule` — dispatch → `flight_schedules` (only `arrival_date`).
- `cleanup_dispatches_for_deleted_flight_schedule` — cascade cleanup.
- `guard_dispatch_status_vs_review` — prevents finalizing a dispatch while review is still Draft.
- `calc_invoice_totals`, `update_journal_totals` — billing/accounting; unrelated to mirror columns.

## Foreign keys
- `dispatch_assignments.flight_schedule_id → flight_schedules.id` (existing).
- `service_reports.flight_schedule_id → flight_schedules.id` (added in Phase 1, `ON DELETE SET NULL`, nullable until backfill).

## New read surfaces (Phase 1)
- `public.v_dispatch_with_flight` — `dispatch_assignments LEFT JOIN flight_schedules`.
- `public.v_service_report_with_flight` — `service_reports LEFT JOIN flight_schedules`.
- `public.security_pending_approval_view` — `flight_schedules LEFT JOIN dispatch_assignments LEFT JOIN service_reports`, filtered to `status = 'Pending'`.

All views are `security_invoker = true` so they inherit each caller's RLS.

## New write surface (Phase 1)
- `public.update_flight_master_from_station(_id uuid, _patch jsonb)` SECURITY DEFINER, allow-listed fields only, writes every change to `migration_audit_log`.
