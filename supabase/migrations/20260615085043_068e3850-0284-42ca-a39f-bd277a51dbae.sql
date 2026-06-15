-- Phase 1: Single Source of Truth foundation (additive only)

ALTER TABLE public.service_reports
  ADD COLUMN IF NOT EXISTS flight_schedule_id uuid NULL REFERENCES public.flight_schedules(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_service_reports_flight_schedule_id
  ON public.service_reports(flight_schedule_id);

CREATE TABLE IF NOT EXISTS public.migration_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_name text NOT NULL,
  record_id text,
  column_name text,
  old_value jsonb,
  new_value jsonb,
  action text NOT NULL,
  migrated_by uuid,
  migrated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.migration_audit_log TO authenticated;
GRANT ALL ON public.migration_audit_log TO service_role;

ALTER TABLE public.migration_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read migration audit log" ON public.migration_audit_log;
CREATE POLICY "Admins read migration audit log"
ON public.migration_audit_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Service role full access migration audit log" ON public.migration_audit_log;
CREATE POLICY "Service role full access migration audit log"
ON public.migration_audit_log FOR ALL TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated insert migration audit log" ON public.migration_audit_log;
CREATE POLICY "Authenticated insert migration audit log"
ON public.migration_audit_log FOR INSERT TO authenticated
WITH CHECK (migrated_by = auth.uid() OR migrated_by IS NULL);

CREATE INDEX IF NOT EXISTS idx_mal_entity ON public.migration_audit_log(entity_name, record_id);
CREATE INDEX IF NOT EXISTS idx_mal_migrated_at ON public.migration_audit_log(migrated_at DESC);

CREATE OR REPLACE VIEW public.v_dispatch_with_flight AS
SELECT
  d.*,
  fs.id             AS fs_id,
  fs.flight_no      AS fs_flight_no,
  fs.registration   AS fs_registration,
  fs.aircraft_type  AS fs_aircraft_type,
  fs.route          AS fs_route,
  fs.sta            AS fs_sta,
  fs.std            AS fs_std,
  fs.skd_type       AS fs_skd_type,
  fs.clearance_type AS fs_clearance_type,
  fs.arrival_date   AS fs_arrival_date,
  fs.departure_date AS fs_departure_date,
  fs.authority      AS fs_authority,
  fs.airline_id     AS fs_airline_id,
  fs.status         AS fs_status
FROM public.dispatch_assignments d
LEFT JOIN public.flight_schedules fs ON fs.id = d.flight_schedule_id;

CREATE OR REPLACE VIEW public.v_service_report_with_flight AS
SELECT
  s.*,
  fs.id             AS fs_id,
  fs.flight_no      AS fs_flight_no,
  fs.registration   AS fs_registration,
  fs.aircraft_type  AS fs_aircraft_type,
  fs.route          AS fs_route,
  fs.sta            AS fs_sta,
  fs.std            AS fs_std,
  fs.skd_type       AS fs_skd_type,
  fs.clearance_type AS fs_clearance_type,
  fs.arrival_date   AS fs_arrival_date,
  fs.departure_date AS fs_departure_date,
  fs.authority      AS fs_authority,
  fs.airline_id     AS fs_airline_id,
  fs.status         AS fs_status
FROM public.service_reports s
LEFT JOIN public.flight_schedules fs ON fs.id = s.flight_schedule_id;

CREATE OR REPLACE VIEW public.security_pending_approval_view AS
SELECT
  fs.id                AS flight_schedule_id,
  fs.flight_no,
  fs.registration,
  fs.aircraft_type,
  fs.route,
  fs.sta,
  fs.std,
  fs.skd_type,
  fs.clearance_type,
  fs.arrival_date,
  fs.departure_date,
  fs.authority,
  fs.airline_id,
  fs.status            AS flight_status,
  fs.purpose           AS clearance_purpose,
  fs.remarks           AS clearance_remarks,
  d.id                 AS dispatch_id,
  d.scheduled_start    AS dispatch_scheduled_start,
  d.scheduled_end      AS dispatch_scheduled_end,
  d.actual_start       AS dispatch_actual_start,
  d.actual_end         AS dispatch_actual_end,
  d.notes              AS dispatch_notes,
  d.task_sheet_data    AS dispatch_task_sheet_data,
  d.review_status      AS dispatch_review_status,
  d.status             AS dispatch_status,
  s.id                 AS service_report_id,
  s.handling_type      AS sr_handling_type,
  s.review_status      AS sr_review_status,
  s.reviewed_at        AS sr_reviewed_at,
  s.reviewed_by        AS sr_reviewed_by
FROM public.flight_schedules fs
LEFT JOIN public.dispatch_assignments d ON d.flight_schedule_id = fs.id
LEFT JOIN public.service_reports s     ON s.flight_schedule_id = fs.id
WHERE fs.status = 'Pending';

GRANT SELECT ON public.v_dispatch_with_flight         TO authenticated, service_role;
GRANT SELECT ON public.v_service_report_with_flight   TO authenticated, service_role;
GRANT SELECT ON public.security_pending_approval_view TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.update_flight_master_from_station(_id uuid, _patch jsonb)
RETURNS public.flight_schedules
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowed text[] := ARRAY['arrival_date','departure_date','registration','aircraft_type','route','sta','std'];
  k text;
  old_row public.flight_schedules%ROWTYPE;
  new_row public.flight_schedules%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'station_manager'::app_role)
    OR public.has_role(auth.uid(), 'station_ops'::app_role)
  ) THEN
    RAISE EXCEPTION 'Not authorized to update flight master data';
  END IF;

  SELECT * INTO old_row FROM public.flight_schedules WHERE id = _id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'flight_schedules row % not found', _id;
  END IF;

  FOR k IN SELECT jsonb_object_keys(_patch) LOOP
    IF NOT (k = ANY(allowed)) THEN
      RAISE EXCEPTION 'Field % is not allowed to be updated from Station', k;
    END IF;
  END LOOP;

  UPDATE public.flight_schedules SET
    arrival_date   = COALESCE(_patch->>'arrival_date',   arrival_date),
    departure_date = COALESCE(_patch->>'departure_date', departure_date),
    registration   = COALESCE(_patch->>'registration',   registration),
    aircraft_type  = COALESCE(_patch->>'aircraft_type',  aircraft_type),
    route          = COALESCE(_patch->>'route',          route),
    sta            = COALESCE(_patch->>'sta',            sta),
    std            = COALESCE(_patch->>'std',            std),
    updated_at     = now()
  WHERE id = _id
  RETURNING * INTO new_row;

  INSERT INTO public.migration_audit_log(entity_name, record_id, column_name, old_value, new_value, action, migrated_by)
  VALUES (
    'flight_schedules', _id::text, 'station_master_patch',
    to_jsonb(old_row), to_jsonb(new_row),
    'station_master_update', auth.uid()
  );

  RETURN new_row;
END;
$$;

REVOKE ALL ON FUNCTION public.update_flight_master_from_station(uuid, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.update_flight_master_from_station(uuid, jsonb) TO authenticated, service_role;