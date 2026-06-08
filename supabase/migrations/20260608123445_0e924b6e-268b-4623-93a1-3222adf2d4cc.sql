
CREATE OR REPLACE FUNCTION public.sync_flight_schedule_to_dispatch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  WHERE d.flight_schedule_id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_flight_schedule_to_dispatch ON public.flight_schedules;
CREATE TRIGGER trg_sync_flight_schedule_to_dispatch
AFTER UPDATE ON public.flight_schedules
FOR EACH ROW
EXECUTE FUNCTION public.sync_flight_schedule_to_dispatch();

UPDATE public.dispatch_assignments d
SET airline = a.name
FROM public.flight_schedules f
JOIN public.airlines a ON a.id = f.airline_id
WHERE d.flight_schedule_id = f.id
  AND (d.airline IS NULL OR d.airline = '' OR d.airline IS DISTINCT FROM a.name);
