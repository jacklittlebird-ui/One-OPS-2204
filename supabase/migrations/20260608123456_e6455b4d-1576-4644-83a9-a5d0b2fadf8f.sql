
CREATE OR REPLACE FUNCTION public.sync_flight_schedule_to_dispatch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
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
