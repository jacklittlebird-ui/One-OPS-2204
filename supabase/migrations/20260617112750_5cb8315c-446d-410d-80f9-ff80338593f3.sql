-- Keep approval status sources aligned across operations, reports, and flight schedules.

CREATE OR REPLACE FUNCTION public.sync_operations_approval_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF LOWER(COALESCE(NEW.review_status, '')) IN ('approved', 'ready for billing') THEN
    IF TG_TABLE_NAME = 'dispatch_assignments' THEN
      NEW.status := 'Completed';
    END IF;

    IF NEW.flight_schedule_id IS NOT NULL THEN
      UPDATE public.flight_schedules
      SET status = 'Completed',
          updated_at = now()
      WHERE id = NEW.flight_schedule_id
        AND status IS DISTINCT FROM 'Completed';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_dispatch_approval_completion ON public.dispatch_assignments;
CREATE TRIGGER trg_sync_dispatch_approval_completion
BEFORE INSERT OR UPDATE OF review_status, flight_schedule_id
ON public.dispatch_assignments
FOR EACH ROW
EXECUTE FUNCTION public.sync_operations_approval_completion();

DROP TRIGGER IF EXISTS trg_sync_service_report_approval_completion ON public.service_reports;
CREATE TRIGGER trg_sync_service_report_approval_completion
BEFORE INSERT OR UPDATE OF review_status, flight_schedule_id
ON public.service_reports
FOR EACH ROW
EXECUTE FUNCTION public.sync_operations_approval_completion();

UPDATE public.dispatch_assignments
SET status = 'Completed',
    updated_at = now()
WHERE LOWER(COALESCE(review_status, '')) IN ('approved', 'ready for billing')
  AND status IS DISTINCT FROM 'Completed';

UPDATE public.flight_schedules fs
SET status = 'Completed',
    updated_at = now()
WHERE EXISTS (
  SELECT 1
  FROM public.dispatch_assignments d
  WHERE d.flight_schedule_id = fs.id
    AND LOWER(COALESCE(d.review_status, '')) IN ('approved', 'ready for billing')
)
AND fs.status IS DISTINCT FROM 'Completed';

UPDATE public.flight_schedules fs
SET status = 'Completed',
    updated_at = now()
WHERE EXISTS (
  SELECT 1
  FROM public.service_reports sr
  WHERE sr.flight_schedule_id = fs.id
    AND LOWER(COALESCE(sr.review_status, '')) IN ('approved', 'ready for billing')
)
AND fs.status IS DISTINCT FROM 'Completed';