
-- ============================================================================
-- Phase 3B.0.5 — Decouple v_dispatch_with_flight from base mirror columns.
-- ============================================================================
-- FS becomes the primary source; base-table mirrors remain only as a fallback
-- for backward compatibility while data is still being backfilled. After the
-- next phase drops the mirror columns, this view will be rewritten one more
-- time to remove the COALESCE() fallback entirely.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_dispatch_with_flight AS
SELECT
  d.id,
  d.flight_schedule_id,
  d.contract_id,
  -- Mirror columns: FS-first with legacy fallback
  COALESCE(NULLIF(fs.authority, ''),      NULLIF(d.station, ''))      AS station,
  COALESCE(NULLIF(a.name, ''),            NULLIF(d.airline, ''))      AS airline,
  COALESCE(NULLIF(fs.flight_no, ''),      NULLIF(d.flight_no, ''))    AS flight_no,
  d.flight_date,
  COALESCE(NULLIF(fs.clearance_type, ''), NULLIF(d.service_type, '')) AS service_type,
  -- Operational + billing fields (untouched, owned by dispatch_assignments)
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
  -- FS audit columns (already exposed pre-refactor; preserved for callers
  -- that explicitly want to see the master row separately from the mirror).
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
LEFT JOIN public.airlines         a  ON a.id  = fs.airline_id;

GRANT SELECT ON public.v_dispatch_with_flight TO authenticated;
GRANT SELECT ON public.v_dispatch_with_flight TO service_role;
