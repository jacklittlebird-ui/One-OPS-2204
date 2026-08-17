-- 1) Recycle-bin archive for anything deleted from the flight/security chain
CREATE TABLE IF NOT EXISTS public.deleted_records_archive (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity text NOT NULL,
  record_id uuid NOT NULL,
  station text,
  flight_no text,
  service_date date,
  payload jsonb NOT NULL,
  related jsonb NOT NULL DEFAULT '{}'::jsonb,
  deleted_by uuid,
  deleted_by_email text,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  restored_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_deleted_records_archive_entity ON public.deleted_records_archive(entity, deleted_at DESC);
CREATE INDEX IF NOT EXISTS idx_deleted_records_archive_record ON public.deleted_records_archive(record_id);

GRANT SELECT ON public.deleted_records_archive TO authenticated;
GRANT ALL ON public.deleted_records_archive TO service_role;
ALTER TABLE public.deleted_records_archive ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Internal staff can read deleted archive" ON public.deleted_records_archive;
CREATE POLICY "Internal staff can read deleted archive"
ON public.deleted_records_archive FOR SELECT TO authenticated
USING (public.has_internal_access(auth.uid()));

-- 2) Archive triggers: capture the row (plus children) BEFORE it disappears
CREATE OR REPLACE FUNCTION public.archive_flight_before_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  em text;
BEGIN
  SELECT email INTO em FROM auth.users WHERE id = uid;
  INSERT INTO public.deleted_records_archive (entity, record_id, station, flight_no, service_date, payload, related, deleted_by, deleted_by_email)
  VALUES (
    'flight_schedules', OLD.id, OLD.authority, OLD.flight_no,
    COALESCE(OLD.arrival_date, OLD.departure_date),
    to_jsonb(OLD),
    jsonb_build_object(
      'dispatch_assignments', COALESCE((SELECT jsonb_agg(to_jsonb(d)) FROM public.dispatch_assignments d WHERE d.flight_schedule_id = OLD.id), '[]'::jsonb),
      'service_reports', COALESCE((SELECT jsonb_agg(to_jsonb(s)) FROM public.service_reports s WHERE s.flight_schedule_id = OLD.id), '[]'::jsonb)
    ),
    uid, em
  );
  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.archive_flight_before_delete() FROM PUBLIC;

DROP TRIGGER IF EXISTS a_archive_flight_before_delete ON public.flight_schedules;
CREATE TRIGGER a_archive_flight_before_delete
BEFORE DELETE ON public.flight_schedules
FOR EACH ROW EXECUTE FUNCTION public.archive_flight_before_delete();

CREATE OR REPLACE FUNCTION public.archive_dispatch_before_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  em text;
  fs record;
BEGIN
  SELECT email INTO em FROM auth.users WHERE id = uid;
  SELECT authority, flight_no INTO fs FROM public.flight_schedules WHERE id = OLD.flight_schedule_id;
  INSERT INTO public.deleted_records_archive (entity, record_id, station, flight_no, service_date, payload, deleted_by, deleted_by_email)
  VALUES ('dispatch_assignments', OLD.id, fs.authority, fs.flight_no, OLD.flight_date, to_jsonb(OLD), uid, em);
  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.archive_dispatch_before_delete() FROM PUBLIC;

DROP TRIGGER IF EXISTS a_archive_dispatch_before_delete ON public.dispatch_assignments;
CREATE TRIGGER a_archive_dispatch_before_delete
BEFORE DELETE ON public.dispatch_assignments
FOR EACH ROW EXECUTE FUNCTION public.archive_dispatch_before_delete();

CREATE OR REPLACE FUNCTION public.archive_service_report_before_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  em text;
  fs record;
BEGIN
  SELECT email INTO em FROM auth.users WHERE id = uid;
  SELECT authority, flight_no, arrival_date, departure_date INTO fs FROM public.flight_schedules WHERE id = OLD.flight_schedule_id;
  INSERT INTO public.deleted_records_archive (entity, record_id, station, flight_no, service_date, payload, deleted_by, deleted_by_email)
  VALUES ('service_reports', OLD.id, fs.authority, fs.flight_no, COALESCE(fs.arrival_date, fs.departure_date), to_jsonb(OLD), uid, em);
  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.archive_service_report_before_delete() FROM PUBLIC;

DROP TRIGGER IF EXISTS a_archive_service_report_before_delete ON public.service_reports;
CREATE TRIGGER a_archive_service_report_before_delete
BEFORE DELETE ON public.service_reports
FOR EACH ROW EXECUTE FUNCTION public.archive_service_report_before_delete();

-- 3) Harden the delete guard: any flight that already carries recorded work
--    (a security task sheet or a handling service report) can only be removed
--    by an administrator, whatever its review status.
CREATE OR REPLACE FUNCTION public.enforce_confirmed_flight_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  is_admin_user boolean := false;
  has_work boolean := false;
  has_charges boolean := false;
BEGIN
  IF uid IS NOT NULL THEN
    SELECT public.has_role(uid, 'admin') INTO is_admin_user;
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.dispatch_assignments d WHERE d.flight_schedule_id = OLD.id
                   AND (d.charges_saved_at IS NOT NULL OR d.total_charge > 0 OR d.total_security_charges > 0))
    INTO has_charges;

  -- Billed / charge-bearing work is never deletable through the app.
  IF has_charges THEN
    RAISE EXCEPTION 'Flight % carries saved security charges and cannot be deleted. Cancel it instead.', OLD.id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF is_admin_user THEN
    RETURN OLD;
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.dispatch_assignments d WHERE d.flight_schedule_id = OLD.id)
      OR EXISTS (SELECT 1 FROM public.service_reports s WHERE s.flight_schedule_id = OLD.id)
    INTO has_work;

  IF has_work THEN
    RAISE EXCEPTION 'Flight % already has an operational report recorded against it. Only an administrator can delete it.', OLD.id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_confirmed_flight_delete() FROM PUBLIC;