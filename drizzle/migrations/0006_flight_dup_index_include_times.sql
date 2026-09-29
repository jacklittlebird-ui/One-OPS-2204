DROP INDEX IF EXISTS public.idx_flight_schedules_no_duplicates;
CREATE UNIQUE INDEX idx_flight_schedules_no_duplicates ON public.flight_schedules
  (flight_no, route, arrival_date, departure_date, clearance_type, coalesce(sta::text,''), coalesce(std::text,''))
  WHERE arrival_date IS NOT NULL AND departure_date IS NOT NULL;

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