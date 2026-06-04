CREATE OR REPLACE FUNCTION public.cleanup_dispatches_for_deleted_flight_schedule()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  date_candidates text[];
  old_registration text;
  old_route text;
BEGIN
  date_candidates := array_remove(ARRAY[
    OLD.arrival_date::text,
    OLD.departure_date::text,
    OLD.requested_date::text
  ], NULL);

  old_registration := lower(regexp_replace(coalesce(OLD.registration, ''), '\s+', '', 'g'));
  old_route := lower(regexp_replace(coalesce(OLD.route, ''), '\s+', '', 'g'));

  DELETE FROM public.dispatch_assignments d
  WHERE d.flight_schedule_id = OLD.id
     OR (
       d.flight_schedule_id IS NULL
       AND lower(trim(coalesce(d.flight_no, ''))) = lower(trim(coalesce(OLD.flight_no, '')))
       AND lower(trim(coalesce(d.station, ''))) = lower(trim(coalesce(OLD.authority, '')))
       AND lower(trim(coalesce(d.service_type, ''))) = lower(trim(coalesce(OLD.clearance_type, '')))
       AND (
         cardinality(date_candidates) = 0
         OR d.flight_date::text = ANY(date_candidates)
         OR coalesce(d.task_sheet_data->>'shift_start_date', '') = ANY(date_candidates)
         OR coalesce(d.task_sheet_data->>'shift_end_date', '') = ANY(date_candidates)
         OR coalesce(d.task_sheet_data->>'arrival_date', '') = ANY(date_candidates)
         OR coalesce(d.task_sheet_data->>'departure_date', '') = ANY(date_candidates)
       )
       AND (
         old_registration = ''
         OR coalesce(d.task_sheet_data->>'registration', '') = ''
         OR lower(regexp_replace(coalesce(d.task_sheet_data->>'registration', ''), '\s+', '', 'g')) = old_registration
       )
       AND (
         old_route = ''
         OR coalesce(d.task_sheet_data->>'route', '') = ''
         OR lower(regexp_replace(coalesce(d.task_sheet_data->>'route', ''), '\s+', '', 'g')) = old_route
       )
     );

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS cleanup_dispatches_on_flight_schedule_delete ON public.flight_schedules;
CREATE TRIGGER cleanup_dispatches_on_flight_schedule_delete
BEFORE DELETE ON public.flight_schedules
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_dispatches_for_deleted_flight_schedule();