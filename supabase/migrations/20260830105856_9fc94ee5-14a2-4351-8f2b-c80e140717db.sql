CREATE OR REPLACE FUNCTION public.enforce_confirmed_flight_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  is_admin_user boolean := false;
  has_work boolean := false;
  is_locked boolean := false;
BEGIN
  IF uid IS NOT NULL THEN
    SELECT public.has_role(uid, 'admin') INTO is_admin_user;
  END IF;

  IF is_admin_user THEN
    RETURN OLD;
  END IF;

  -- Locked = approved by Operations (step 3) or billed/reviewed by Receivables (step 4)
  SELECT EXISTS (
    SELECT 1 FROM public.dispatch_assignments d
     WHERE d.flight_schedule_id = OLD.id
       AND (
         lower(coalesce(d.review_status, '')) IN ('approved', 'ready for billing')
         OR d.charges_saved_at IS NOT NULL
         OR d.invoiced_at IS NOT NULL
       )
  ) INTO is_locked;

  IF is_locked THEN
    RAISE EXCEPTION 'Flight % was completed by Operations or Accounts Receivable and cannot be deleted. Only an administrator can delete it.', OLD.id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Rejected flights (returned to Clearance) are always deletable.
  IF coalesce(OLD.status, '') = 'Rejected' THEN
    RETURN OLD;
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.dispatch_assignments d WHERE d.flight_schedule_id = OLD.id)
      OR EXISTS (SELECT 1 FROM public.service_reports s WHERE s.flight_schedule_id = OLD.id)
    INTO has_work;

  IF has_work THEN
    RAISE EXCEPTION 'Flight % already has an operational report recorded against it. Only an administrator can delete it.', OLD.id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN OLD;
END;
$$;