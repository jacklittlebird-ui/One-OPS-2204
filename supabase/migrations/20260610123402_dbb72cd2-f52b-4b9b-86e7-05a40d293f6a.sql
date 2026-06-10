CREATE OR REPLACE FUNCTION public.sync_flight_schedule_to_dispatch()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  new_airline_name text;
  ref_date text;
BEGIN
  IF TG_OP = 'UPDATE' AND
       NEW.airline_id IS NOT DISTINCT FROM OLD.airline_id AND
       NEW.flight_no IS NOT DISTINCT FROM OLD.flight_no AND
       NEW.authority IS NOT DISTINCT FROM OLD.authority AND
       NEW.clearance_type IS NOT DISTINCT FROM OLD.clearance_type AND
       NEW.skd_type IS NOT DISTINCT FROM OLD.skd_type AND
       NEW.aircraft_type IS NOT DISTINCT FROM OLD.aircraft_type AND
       NEW.registration IS NOT DISTINCT FROM OLD.registration AND
       NEW.route IS NOT DISTINCT FROM OLD.route AND
       NEW.sta IS NOT DISTINCT FROM OLD.sta AND
       NEW.std IS NOT DISTINCT FROM OLD.std AND
       NEW.arrival_date IS NOT DISTINCT FROM OLD.arrival_date AND
       NEW.departure_date IS NOT DISTINCT FROM OLD.departure_date
  THEN
    RETURN NEW;
  END IF;

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
  WHERE d.flight_schedule_id = NEW.id
    AND (
      d.airline IS DISTINCT FROM COALESCE(new_airline_name, d.airline)
      OR d.flight_no IS DISTINCT FROM COALESCE(NULLIF(NEW.flight_no, ''), d.flight_no)
      OR d.station IS DISTINCT FROM COALESCE(NULLIF(NEW.authority, ''), d.station)
      OR d.service_type IS DISTINCT FROM COALESCE(NULLIF(NEW.clearance_type, ''), d.service_type)
      OR COALESCE(d.task_sheet_data->>'skd_type','') IS DISTINCT FROM COALESCE(NULLIF(NEW.skd_type, ''), COALESCE(d.task_sheet_data->>'skd_type',''))
      OR COALESCE(d.task_sheet_data->>'aircraft_type','') IS DISTINCT FROM COALESCE(NULLIF(NEW.aircraft_type, ''), COALESCE(d.task_sheet_data->>'aircraft_type',''))
    );

  UPDATE public.service_reports s
  SET
    aircraft_type = COALESCE(NULLIF(NEW.aircraft_type, ''), s.aircraft_type),
    handling_type = COALESCE(NULLIF(NEW.skd_type, ''), s.handling_type)
  WHERE TRIM(LOWER(s.flight_no)) = TRIM(LOWER(NEW.flight_no))
    AND ref_date IS NOT NULL
    AND (s.arrival_date = ref_date OR s.departure_date = ref_date);

  RETURN NEW;
END;
$function$;