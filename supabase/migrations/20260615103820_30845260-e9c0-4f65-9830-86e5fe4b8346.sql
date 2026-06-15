-- ============================================================================
-- Phase 3B.0.7 + Step 1 — Atomic Dispatch Schema Cleanup
-- ----------------------------------------------------------------------------
-- 0) Trigger column-list patch (metadata only, function body unchanged)
-- 1) Snapshot dispatch_assignments (rollback safety)
-- 2) Rewrite v_dispatch_with_flight FS-only (no COALESCE fallbacks)
-- 3) Drop the four mirror columns from dispatch_assignments
-- ============================================================================

-- 0) TRIGGER METADATA PATCH ------------------------------------------------
-- Remove `service_type` from the UPDATE OF list. Function body untouched.
DROP TRIGGER IF EXISTS sync_security_dispatch_to_flight_schedule_trigger
  ON public.dispatch_assignments;

CREATE TRIGGER sync_security_dispatch_to_flight_schedule_trigger
AFTER INSERT OR UPDATE OF task_sheet_data, flight_date
ON public.dispatch_assignments
FOR EACH ROW EXECUTE FUNCTION public.sync_security_dispatch_to_flight_schedule();

-- 1) SNAPSHOT --------------------------------------------------------------
DROP TABLE IF EXISTS public.snapshot_dispatch_assignments_pre_phase3b_step1;
CREATE TABLE public.snapshot_dispatch_assignments_pre_phase3b_step1 AS
SELECT * FROM public.dispatch_assignments;

COMMENT ON TABLE public.snapshot_dispatch_assignments_pre_phase3b_step1
  IS 'Pre Phase 3B Step 1 snapshot of dispatch_assignments. Rollback source for the four dropped mirror columns (airline, flight_no, station, service_type).';

-- 2) VIEW FINALIZATION (FS-ONLY, no COALESCE fallback) ---------------------
CREATE OR REPLACE VIEW public.v_dispatch_with_flight AS
SELECT
    d.id,
    d.flight_schedule_id,
    d.contract_id,
    fs.authority      AS station,
    a.name            AS airline,
    fs.flight_no      AS flight_no,
    d.flight_date,
    fs.clearance_type AS service_type,
    d.staff_names,
    d.staff_count,
    d.scheduled_start,
    d.scheduled_end,
    d.actual_start,
    d.actual_end,
    d.contract_duration_hours,
    d.actual_duration_hours,
    d.overtime_hours,
    d.overtime_rate,
    d.base_fee,
    d.service_rate,
    d.overtime_charge,
    d.total_charge,
    d.status,
    d.notes,
    d.dispatched_by,
    d.created_at,
    d.updated_at,
    d.review_status,
    d.review_comment,
    d.reviewed_by,
    d.reviewed_at,
    d.irregularity_id,
    d.task_sheet_data,
    d.charges_breakdown,
    d.total_security_charges,
    d.short_notice,
    d.extra_manpower_count,
    d.ramp_vehicle_trips,
    d.return_to_ramp_with_load,
    d.charges_currency,
    d.created_via,
    fs.id              AS fs_id,
    fs.flight_no       AS fs_flight_no,
    fs.registration    AS fs_registration,
    fs.aircraft_type   AS fs_aircraft_type,
    fs.route           AS fs_route,
    fs.sta             AS fs_sta,
    fs.std             AS fs_std,
    fs.skd_type        AS fs_skd_type,
    fs.clearance_type  AS fs_clearance_type,
    fs.arrival_date    AS fs_arrival_date,
    fs.departure_date  AS fs_departure_date,
    fs.authority       AS fs_authority,
    fs.airline_id      AS fs_airline_id,
    fs.status          AS fs_status
FROM public.dispatch_assignments d
LEFT JOIN public.flight_schedules fs ON fs.id = d.flight_schedule_id
LEFT JOIN public.airlines a         ON a.id  = fs.airline_id;

ALTER VIEW public.v_dispatch_with_flight SET (security_invoker = true);

-- 3) SCHEMA CLEANUP --------------------------------------------------------
ALTER TABLE public.dispatch_assignments
  DROP COLUMN airline,
  DROP COLUMN flight_no,
  DROP COLUMN station,
  DROP COLUMN service_type;
