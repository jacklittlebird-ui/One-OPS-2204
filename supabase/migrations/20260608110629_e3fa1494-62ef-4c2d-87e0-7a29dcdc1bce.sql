
-- Backfill: fix existing invalid combinations
UPDATE public.dispatch_assignments
SET status = 'Pending'
WHERE LOWER(COALESCE(status, '')) = 'completed'
  AND (review_status IS NULL OR review_status = '' OR LOWER(review_status) = 'draft');

-- Validation trigger: prevent dispatch.status='Completed' while review_status is still Draft/empty.
-- Coerces status back to 'Pending' rather than rejecting, so existing flows keep working.
CREATE OR REPLACE FUNCTION public.guard_dispatch_status_vs_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF LOWER(COALESCE(NEW.status, '')) = 'completed'
     AND (NEW.review_status IS NULL OR NEW.review_status = '' OR LOWER(NEW.review_status) = 'draft')
  THEN
    NEW.status := 'Pending';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_dispatch_status_vs_review ON public.dispatch_assignments;
CREATE TRIGGER trg_guard_dispatch_status_vs_review
BEFORE INSERT OR UPDATE OF status, review_status ON public.dispatch_assignments
FOR EACH ROW EXECUTE FUNCTION public.guard_dispatch_status_vs_review();
