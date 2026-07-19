-- Block deletion of confirmed flight_schedules for non-admin users.
-- A flight is "confirmed" once Operations has approved the dispatch
-- (review_status = 'Approved') or Receivables has saved the charges
-- (review_status = 'Ready for Billing'), or the dispatch is Completed.
-- Only users with the 'admin' role may delete confirmed flights.

CREATE OR REPLACE FUNCTION public.enforce_confirmed_flight_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_confirmed boolean;
  uid uuid := auth.uid();
  is_admin_user boolean := false;
BEGIN
  -- Service role / no session (edge functions, migrations): allow.
  IF uid IS NULL THEN
    RETURN OLD;
  END IF;

  SELECT public.has_role(uid, 'admin') INTO is_admin_user;
  IF is_admin_user THEN
    RETURN OLD;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.dispatch_assignments d
    WHERE d.flight_schedule_id = OLD.id
      AND (
        lower(coalesce(d.review_status, '')) IN ('approved', 'ready for billing')
        OR lower(coalesce(d.status, '')) = 'completed'
      )
  ) INTO is_confirmed;

  IF is_confirmed THEN
    RAISE EXCEPTION 'Flight % has been confirmed by Operations or Receivables. Only an administrator can delete it.', OLD.id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_confirmed_flight_delete ON public.flight_schedules;
CREATE TRIGGER trg_enforce_confirmed_flight_delete
BEFORE DELETE ON public.flight_schedules
FOR EACH ROW EXECUTE FUNCTION public.enforce_confirmed_flight_delete();