CREATE OR REPLACE FUNCTION public.sync_task_sheet_dates_to_flight()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_arr text; v_dep text;
BEGIN
  -- Skip when fired by another trigger (e.g. the flight_schedules -> dispatch refresh);
  -- otherwise several task sheets on one flight ping-pong dates forever.
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  IF NEW.flight_schedule_id IS NULL OR NEW.invoice_id IS NOT NULL THEN RETURN NEW; END IF;
  v_arr := left(trim(coalesce(NEW.task_sheet_data->>'arrival_date','')),10);
  v_dep := left(trim(coalesce(NEW.task_sheet_data->>'departure_date','')),10);
  IF v_arr !~ '^\d{4}-\d{2}-\d{2}$' THEN v_arr := NULL; END IF;
  IF v_dep !~ '^\d{4}-\d{2}-\d{2}$' THEN v_dep := NULL; END IF;
  IF v_arr IS NULL AND v_dep IS NULL THEN RETURN NEW; END IF;
  BEGIN
    UPDATE public.flight_schedules fs
       SET arrival_date = coalesce(v_arr, fs.arrival_date::text),
           departure_date = coalesce(v_dep, fs.departure_date::text)
     WHERE fs.id = NEW.flight_schedule_id
       AND ((v_arr IS NOT NULL AND fs.arrival_date::text IS DISTINCT FROM v_arr)
         OR (v_dep IS NOT NULL AND fs.departure_date::text IS DISTINCT FROM v_dep));
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.sync_flight_schedule_to_dispatch()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND
       NEW.skd_type IS NOT DISTINCT FROM OLD.skd_type AND
       NEW.aircraft_type IS NOT DISTINCT FROM OLD.aircraft_type AND
       NEW.registration IS NOT DISTINCT FROM OLD.registration AND
       NEW.route IS NOT DISTINCT FROM OLD.route AND
       NEW.sta IS NOT DISTINCT FROM OLD.sta AND
       NEW.std IS NOT DISTINCT FROM OLD.std AND
       NEW.flight_no IS NOT DISTINCT FROM OLD.flight_no AND
       NEW.arrival_date IS NOT DISTINCT FROM OLD.arrival_date AND
       NEW.departure_date IS NOT DISTINCT FROM OLD.departure_date AND
       NEW.authority IS NOT DISTINCT FROM OLD.authority AND
       NEW.clearance_type IS NOT DISTINCT FROM OLD.clearance_type
  THEN RETURN NEW; END IF;

  UPDATE public.dispatch_assignments d
  SET task_sheet_data = COALESCE(d.task_sheet_data, '{}'::jsonb)
      || jsonb_strip_nulls(jsonb_build_object(
           'flight_type', NULLIF(NEW.skd_type, ''),
           'skd_type', NULLIF(NEW.skd_type, ''),
           'aircraft_type', NULLIF(NEW.aircraft_type, ''),
           'registration', NULLIF(NEW.registration, ''),
           'route', NULLIF(NEW.route, ''),
           'sta', NULLIF(NEW.sta, ''),
           'std', NULLIF(NEW.std, ''),
           'arrival_date', NULLIF(NEW.arrival_date::text, ''),
           'departure_date', NULLIF(NEW.departure_date::text, ''))),
      updated_at = now()
  WHERE d.flight_schedule_id = NEW.id AND d.invoice_id IS NULL;
  RETURN NEW;
END $$;