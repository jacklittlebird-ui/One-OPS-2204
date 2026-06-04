CREATE OR REPLACE FUNCTION public.sync_security_dispatch_to_flight_schedule()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  task_data jsonb;
BEGIN
  IF NEW.flight_schedule_id IS NULL THEN
    RETURN NEW;
  END IF;

  task_data := COALESCE(NEW.task_sheet_data, '{}'::jsonb);

  BEGIN
    UPDATE public.flight_schedules
    SET
      registration = CASE
        WHEN task_data ? 'registration' THEN UPPER(COALESCE(NULLIF(task_data->>'registration', ''), registration))
        ELSE registration
      END,
      route = CASE
        WHEN task_data ? 'route' THEN UPPER(COALESCE(NULLIF(task_data->>'route', ''), route))
        ELSE route
      END,
      aircraft_type = CASE
        WHEN task_data ? 'aircraft_type' THEN COALESCE(NULLIF(task_data->>'aircraft_type', ''), aircraft_type)
        ELSE aircraft_type
      END,
      sta = CASE
        WHEN task_data ? 'sta' THEN COALESCE(NULLIF(task_data->>'sta', ''), sta)
        ELSE sta
      END,
      std = CASE
        WHEN task_data ? 'std' THEN COALESCE(NULLIF(task_data->>'std', ''), std)
        ELSE std
      END,
      skd_type = CASE
        WHEN task_data ? 'flight_type' THEN COALESCE(NULLIF(task_data->>'flight_type', ''), skd_type)
        WHEN task_data ? 'skd_type' THEN COALESCE(NULLIF(task_data->>'skd_type', ''), skd_type)
        ELSE skd_type
      END,
      clearance_type = COALESCE(NULLIF(NEW.service_type, ''), clearance_type),
      arrival_date = COALESCE(NEW.flight_date::text, arrival_date),
      updated_at = now()
    WHERE id = NEW.flight_schedule_id;
  EXCEPTION WHEN unique_violation THEN
    UPDATE public.flight_schedules
    SET
      registration = CASE
        WHEN task_data ? 'registration' THEN UPPER(COALESCE(NULLIF(task_data->>'registration', ''), registration))
        ELSE registration
      END,
      aircraft_type = CASE
        WHEN task_data ? 'aircraft_type' THEN COALESCE(NULLIF(task_data->>'aircraft_type', ''), aircraft_type)
        ELSE aircraft_type
      END,
      sta = CASE
        WHEN task_data ? 'sta' THEN COALESCE(NULLIF(task_data->>'sta', ''), sta)
        ELSE sta
      END,
      std = CASE
        WHEN task_data ? 'std' THEN COALESCE(NULLIF(task_data->>'std', ''), std)
        ELSE std
      END,
      skd_type = CASE
        WHEN task_data ? 'flight_type' THEN COALESCE(NULLIF(task_data->>'flight_type', ''), skd_type)
        WHEN task_data ? 'skd_type' THEN COALESCE(NULLIF(task_data->>'skd_type', ''), skd_type)
        ELSE skd_type
      END,
      updated_at = now()
    WHERE id = NEW.flight_schedule_id;
  END;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_security_dispatch_to_flight_schedule() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_security_dispatch_to_flight_schedule() FROM anon;
REVOKE ALL ON FUNCTION public.sync_security_dispatch_to_flight_schedule() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.sync_security_dispatch_to_flight_schedule() TO service_role;