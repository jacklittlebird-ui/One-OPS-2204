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

  SELECT EXISTS (
    SELECT 1
    FROM public.dispatch_assignments d
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

  -- Cast the enum to text before coalescing. Coalescing the enum directly with
  -- an empty string attempts to construct clearance_status '' and aborts DELETE.
  IF coalesce(OLD.status::text, '') = 'Rejected' THEN
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

CREATE OR REPLACE FUNCTION public.protect_ops_approved_dispatch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_rs text := lower(coalesce(OLD.review_status, ''));
  result_row public.dispatch_assignments;
BEGIN
  result_row := CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;

  IF old_rs NOT IN ('approved', 'ready for billing') THEN
    RETURN result_row;
  END IF;

  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN result_row;
  END IF;

  IF public.has_role(auth.uid(), 'clearance')
     OR public.has_role(auth.uid(), 'station_manager')
     OR public.has_role(auth.uid(), 'station_ops') THEN
    IF NOT (public.has_role(auth.uid(), 'operations')
            OR public.has_role(auth.uid(), 'receivables')
            OR public.has_role(auth.uid(), 'payables')
            OR public.has_role(auth.uid(), 'general_accounts')
            OR public.has_role(auth.uid(), 'accountant')) THEN
      RAISE EXCEPTION 'This report was approved by Operations (step 3). Only an administrator can amend it.';
    END IF;
  END IF;

  RETURN result_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_ops_approved_flight()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  locked boolean;
  result_row public.flight_schedules;
BEGIN
  result_row := CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;

  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN result_row;
  END IF;

  IF NOT (public.has_role(auth.uid(), 'clearance')
          OR public.has_role(auth.uid(), 'station_manager')
          OR public.has_role(auth.uid(), 'station_ops')) THEN
    RETURN result_row;
  END IF;

  IF public.has_role(auth.uid(), 'operations')
     OR public.has_role(auth.uid(), 'receivables')
     OR public.has_role(auth.uid(), 'payables')
     OR public.has_role(auth.uid(), 'general_accounts')
     OR public.has_role(auth.uid(), 'accountant') THEN
    RETURN result_row;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.dispatch_assignments d
    WHERE d.flight_schedule_id = OLD.id
      AND lower(coalesce(d.review_status, '')) IN ('approved', 'ready for billing')
  ) INTO locked;

  IF locked THEN
    RAISE EXCEPTION 'This flight was approved by Operations (step 3). Only an administrator can amend it.';
  END IF;

  RETURN result_row;
END;
$$;