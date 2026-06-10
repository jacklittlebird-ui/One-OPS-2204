CREATE OR REPLACE FUNCTION public.sync_flight_schedule_to_dispatch()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  new_airline_name text;
BEGIN
  SELECT name INTO new_airline_name FROM public.airlines WHERE id = NEW.airline_id;

  -- Sync to dispatch_assignments (Station / Security portals)
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

  -- Sync to service_reports (Handling portal)
  UPDATE public.service_reports s
  SET
    aircraft_type = COALESCE(NULLIF(NEW.aircraft_type, ''), s.aircraft_type),
    handling_type = COALESCE(NULLIF(NEW.skd_type, ''), s.handling_type)
  WHERE s.flight_schedule_id = NEW.id;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_flight_schedule_to_dispatch ON public.flight_schedules;
CREATE TRIGGER trg_sync_flight_schedule_to_dispatch
AFTER UPDATE ON public.flight_schedules
FOR EACH ROW
EXECUTE FUNCTION public.sync_flight_schedule_to_dispatch();