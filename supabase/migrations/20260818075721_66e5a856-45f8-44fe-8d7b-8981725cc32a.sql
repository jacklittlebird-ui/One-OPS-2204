CREATE OR REPLACE FUNCTION public.safe_parse_flight_date(txt text)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE t text := nullif(btrim(coalesce(txt,'')), '');
BEGIN
  IF t IS NULL THEN RETURN NULL; END IF;
  BEGIN
    IF t ~ '^\d{4}-\d{2}-\d{2}' THEN RETURN t::date; END IF;
    IF t ~ '^\d{1,2}[/-]\d{1,2}[/-]\d{4}$' THEN RETURN to_date(replace(t,'-','/'), 'DD/MM/YYYY'); END IF;
    RETURN t::date;
  EXCEPTION WHEN others THEN RETURN NULL;
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.safe_parse_flight_date(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.safe_parse_flight_date(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.archive_flight_before_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  em text;
BEGIN
  SELECT email INTO em FROM auth.users WHERE id = uid;
  INSERT INTO public.deleted_records_archive (entity, record_id, station, flight_no, service_date, payload, related, deleted_by, deleted_by_email)
  VALUES (
    'flight_schedules', OLD.id, OLD.authority, OLD.flight_no,
    public.safe_parse_flight_date(COALESCE(OLD.arrival_date, OLD.departure_date)),
    to_jsonb(OLD),
    jsonb_build_object(
      'dispatch_assignments', COALESCE((SELECT jsonb_agg(to_jsonb(d)) FROM public.dispatch_assignments d WHERE d.flight_schedule_id = OLD.id), '[]'::jsonb),
      'service_reports', COALESCE((SELECT jsonb_agg(to_jsonb(s)) FROM public.service_reports s WHERE s.flight_schedule_id = OLD.id), '[]'::jsonb)
    ),
    uid, em
  );
  RETURN OLD;
END;
$function$;

CREATE OR REPLACE FUNCTION public.archive_service_report_before_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  em text;
  fs record;
BEGIN
  SELECT email INTO em FROM auth.users WHERE id = uid;
  SELECT authority, flight_no, arrival_date, departure_date INTO fs FROM public.flight_schedules WHERE id = OLD.flight_schedule_id;
  INSERT INTO public.deleted_records_archive (entity, record_id, station, flight_no, service_date, payload, deleted_by, deleted_by_email)
  VALUES ('service_reports', OLD.id, fs.authority, fs.flight_no, public.safe_parse_flight_date(COALESCE(fs.arrival_date, fs.departure_date)), to_jsonb(OLD), uid, em);
  RETURN OLD;
END;
$function$;