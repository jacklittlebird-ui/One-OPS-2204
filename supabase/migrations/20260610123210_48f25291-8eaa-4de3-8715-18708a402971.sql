CREATE OR REPLACE FUNCTION public.sync_flight_schedule_to_dispatch()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  new_airline_name text;
  ref_date text;
BEGIN
  SELECT name INTO new_airline_name FROM public.airlines WHERE id = NEW.airline_id;
  ref_date := COALESCE(NEW.arrival_date, NEW.departure_date);

  UPDATE public.dispatch_assignments d
  SET
    airline = COALESCE(new_airline_name, d.airline),
    flight_no = COALESCE(NULLIF(NEW.flight_no, ''), d.flight_no),
    station = COALESCE(NULLIF(NEW.authority, ''), d.station),
    service_type = COALESCE(NULLIF(NEW.clearance_type, ''), d.service_type),
    task_sheet_data = COALESCE(d.task_sheet_data, '{}'::jsonb)
      || jsonb_strip_nulls(jsonb_build_object(
           'flight_type',   NULLIF(NEW.skd_type, ''),
           'skd_type',      NULLIF(NEW.skd_type, ''),
           'aircraft_type', NULLIF(NEW.aircraft_type, ''),
           'registration',  NULLIF(NEW.registration, ''),
           'route',         NULLIF(NEW.route, ''),
           'sta',           NULLIF(NEW.sta, ''),
           'std',           NULLIF(NEW.std, '')
         ))
  WHERE d.flight_schedule_id = NEW.id;

  UPDATE public.service_reports s
  SET
    aircraft_type = COALESCE(NULLIF(NEW.aircraft_type, ''), s.aircraft_type),
    handling_type = COALESCE(NULLIF(NEW.skd_type, ''), s.handling_type)
  WHERE TRIM(LOWER(s.flight_no)) = TRIM(LOWER(NEW.flight_no))
    AND ref_date IS NOT NULL
    AND s.flight_date::text = ref_date;

  RETURN NEW;
END;
$function$;