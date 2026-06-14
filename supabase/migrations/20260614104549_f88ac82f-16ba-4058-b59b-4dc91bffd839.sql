CREATE OR REPLACE FUNCTION public.sync_security_dispatch_to_flight_schedule()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  task_data jsonb;
BEGIN
  -- Clearance portal (flight_schedules) is the AUTHORITATIVE source for:
  --   registration, route, aircraft_type, sta, std, skd_type, clearance_type
  -- The Security task sheet is only allowed to push operational fields
  -- (flight_date / arrival_date) back to the schedule. Any other field must
  -- stay under clearance control, so an amendment in the Clearance portal
  -- always wins and propagates everywhere.
  IF NEW.flight_schedule_id IS NULL THEN
    RETURN NEW;
  END IF;

  task_data := COALESCE(NEW.task_sheet_data, '{}'::jsonb);

  UPDATE public.flight_schedules
  SET
    arrival_date = COALESCE(NEW.flight_date::text, arrival_date),
    updated_at = now()
  WHERE id = NEW.flight_schedule_id;

  RETURN NEW;
END;
$function$;