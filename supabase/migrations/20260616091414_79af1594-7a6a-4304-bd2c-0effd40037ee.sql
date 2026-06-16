CREATE OR REPLACE FUNCTION public.sync_security_dispatch_to_flight_schedule()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Security service report dates are saved explicitly by the application to
  -- their matching flight_schedules fields. Do NOT copy dispatch_assignments.flight_date
  -- into flight_schedules.arrival_date; for departure-only reports that moves the
  -- user's Departure Date into Arrival Date.
  RETURN NEW;
END;
$function$;