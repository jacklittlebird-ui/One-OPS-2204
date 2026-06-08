
DROP TRIGGER IF EXISTS trg_sync_flight_schedule_to_dispatch ON public.flight_schedules;

CREATE OR REPLACE FUNCTION public.sync_flight_schedule_to_dispatch()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  new_airline_name text;
BEGIN
  SELECT name INTO new_airline_name FROM public.airlines WHERE id = NEW.airline_id;

  UPDATE public.dispatch_assignments d
  SET
    airline = COALESCE(new_airline_name, d.airline),
    flight_no = COALESCE(NULLIF(NEW.flight_no, ''), d.flight_no),
    station = COALESCE(NULLIF(NEW.authority, ''), d.station),
    service_type = COALESCE(NULLIF(NEW.clearance_type, ''), d.service_type)
  WHERE d.flight_schedule_id = NEW.id
    AND (
      d.airline IS DISTINCT FROM COALESCE(new_airline_name, d.airline)
      OR d.flight_no IS DISTINCT FROM COALESCE(NULLIF(NEW.flight_no, ''), d.flight_no)
      OR d.station IS DISTINCT FROM COALESCE(NULLIF(NEW.authority, ''), d.station)
      OR d.service_type IS DISTINCT FROM COALESCE(NULLIF(NEW.clearance_type, ''), d.service_type)
    );

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_sync_flight_schedule_to_dispatch
AFTER UPDATE OF airline_id, flight_no, authority, clearance_type
ON public.flight_schedules
FOR EACH ROW
WHEN (
  OLD.airline_id IS DISTINCT FROM NEW.airline_id
  OR OLD.flight_no IS DISTINCT FROM NEW.flight_no
  OR OLD.authority IS DISTINCT FROM NEW.authority
  OR OLD.clearance_type IS DISTINCT FROM NEW.clearance_type
)
EXECUTE FUNCTION public.sync_flight_schedule_to_dispatch();
