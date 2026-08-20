CREATE OR REPLACE FUNCTION public.protect_ops_approved_dispatch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_rs text := lower(coalesce(OLD.review_status, ''));
BEGIN
  IF old_rs NOT IN ('approved', 'ready for billing') THEN
    RETURN NEW;
  END IF;
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  -- Station and Clearance users cannot amend a report Operations already approved.
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
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_ops_approved_dispatch ON public.dispatch_assignments;
CREATE TRIGGER trg_protect_ops_approved_dispatch
BEFORE UPDATE OR DELETE ON public.dispatch_assignments
FOR EACH ROW EXECUTE FUNCTION public.protect_ops_approved_dispatch();

CREATE OR REPLACE FUNCTION public.protect_ops_approved_flight()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  locked boolean;
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NOT (public.has_role(auth.uid(), 'clearance')
          OR public.has_role(auth.uid(), 'station_manager')
          OR public.has_role(auth.uid(), 'station_ops')) THEN
    RETURN NEW;
  END IF;
  IF public.has_role(auth.uid(), 'operations')
     OR public.has_role(auth.uid(), 'receivables')
     OR public.has_role(auth.uid(), 'payables')
     OR public.has_role(auth.uid(), 'general_accounts')
     OR public.has_role(auth.uid(), 'accountant') THEN
    RETURN NEW;
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.dispatch_assignments d
     WHERE d.flight_schedule_id = OLD.id
       AND lower(coalesce(d.review_status, '')) IN ('approved', 'ready for billing')
  ) INTO locked;
  IF locked THEN
    RAISE EXCEPTION 'This flight was approved by Operations (step 3). Only an administrator can amend it.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_ops_approved_flight ON public.flight_schedules;
CREATE TRIGGER trg_protect_ops_approved_flight
BEFORE UPDATE OR DELETE ON public.flight_schedules
FOR EACH ROW EXECUTE FUNCTION public.protect_ops_approved_flight();

REVOKE EXECUTE ON FUNCTION public.protect_ops_approved_dispatch() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_ops_approved_flight() FROM PUBLIC, anon, authenticated;