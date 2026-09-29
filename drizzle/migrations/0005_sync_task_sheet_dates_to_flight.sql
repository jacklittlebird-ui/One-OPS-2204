CREATE OR REPLACE FUNCTION public.sync_task_sheet_dates_to_flight()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_arr text; v_dep text;
BEGIN
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
    NULL; -- a separate schedule row already exists for that date; leave as is
  END;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.sync_task_sheet_dates_to_flight() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_task_sheet_dates_to_flight ON public.dispatch_assignments;
CREATE TRIGGER trg_sync_task_sheet_dates_to_flight
AFTER INSERT OR UPDATE OF task_sheet_data ON public.dispatch_assignments
FOR EACH ROW EXECUTE FUNCTION public.sync_task_sheet_dates_to_flight();

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT DISTINCT ON (d.flight_schedule_id) d.flight_schedule_id id,
      CASE WHEN d.task_sheet_data->>'arrival_date' ~ '^\d{4}-\d{2}-\d{2}' THEN left(d.task_sheet_data->>'arrival_date',10) END a,
      CASE WHEN d.task_sheet_data->>'departure_date' ~ '^\d{4}-\d{2}-\d{2}' THEN left(d.task_sheet_data->>'departure_date',10) END dp
    FROM public.dispatch_assignments d
    WHERE d.flight_schedule_id IS NOT NULL AND d.invoice_id IS NULL
    ORDER BY d.flight_schedule_id, d.updated_at DESC NULLS LAST
  LOOP
    BEGIN
      UPDATE public.flight_schedules fs
         SET arrival_date = coalesce(r.a, fs.arrival_date::text),
             departure_date = coalesce(r.dp, fs.departure_date::text)
       WHERE fs.id = r.id
         AND ((r.a IS NOT NULL AND fs.arrival_date::text IS DISTINCT FROM r.a)
           OR (r.dp IS NOT NULL AND fs.departure_date::text IS DISTINCT FROM r.dp));
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
  END LOOP;
END $$;