CREATE OR REPLACE FUNCTION public.cleanup_service_reports_for_deleted_flight_schedule()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.service_reports sr
  WHERE sr.flight_schedule_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_service_reports_on_fs_delete ON public.flight_schedules;
CREATE TRIGGER trg_cleanup_service_reports_on_fs_delete
BEFORE DELETE ON public.flight_schedules
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_service_reports_for_deleted_flight_schedule();