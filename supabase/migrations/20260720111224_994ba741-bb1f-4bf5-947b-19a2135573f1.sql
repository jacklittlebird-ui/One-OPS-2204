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
  IF uid IS NULL THEN
    RETURN OLD;
  END IF;

  SELECT public.has_role(uid, 'admin') INTO is_admin_user;
  IF is_admin_user THEN
    RETURN OLD;
  END IF;

  -- Rejected flights (returned to Clearance) are always deletable by Clearance.
  IF lower(coalesce(OLD.status, '')) = 'rejected' THEN
    RETURN OLD;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.dispatch_assignments d
    WHERE d.flight_schedule_id = OLD.id
      AND lower(coalesce(d.review_status, '')) <> 'rejected'
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