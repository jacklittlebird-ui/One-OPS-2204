
-- 1) Enable RLS (deny-all: no policies) on legacy snapshot tables
ALTER TABLE public.snapshot_dispatch_assignments_pre_phase3 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snapshot_flight_schedules_pre_phase3 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snapshot_service_reports_pre_phase3 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snapshot_service_reports_pre_phase3b_step2_3 ENABLE ROW LEVEL SECURITY;

-- 2) Remove materialized view from the Data API by revoking access from API roles
REVOKE ALL ON public.mv_invoice_monthly_summary FROM anon, authenticated;

-- 3) Ensure views run with the caller's permissions
ALTER VIEW public.v_customer_invoices SET (security_invoker = true);
ALTER VIEW public.v_service_report_with_flight SET (security_invoker = true);

-- 4) Replace permissive USING(true)/WITH CHECK(true) policies on non-SELECT commands
DO $$
DECLARE
  r RECORD;
  new_qual TEXT;
  new_check TEXT;
  roles_csv TEXT;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check
    FROM pg_policies
    WHERE schemaname='public'
      AND cmd <> 'SELECT'
      AND (qual = 'true' OR with_check = 'true')
  LOOP
    -- Drop the offending policy
    EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);

    -- If it was a service_role blanket policy, don't recreate — service_role bypasses RLS.
    IF r.roles::text ILIKE '%service_role%' AND array_length(r.roles,1) = 1 THEN
      CONTINUE;
    END IF;

    roles_csv := array_to_string(r.roles, ', ');

    new_qual := CASE WHEN r.qual IS NULL THEN NULL
                     WHEN r.qual = 'true' THEN '(auth.uid() IS NOT NULL)'
                     ELSE r.qual END;
    new_check := CASE WHEN r.with_check IS NULL THEN NULL
                      WHEN r.with_check = 'true' THEN '(auth.uid() IS NOT NULL)'
                      ELSE r.with_check END;

    IF r.cmd = 'ALL' THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I AS PERMISSIVE FOR ALL TO %s USING (%s) WITH CHECK (%s)',
        r.policyname, r.schemaname, r.tablename, roles_csv,
        COALESCE(new_qual, 'true'), COALESCE(new_check, new_qual, 'true'));
    ELSIF r.cmd = 'INSERT' THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I AS PERMISSIVE FOR INSERT TO %s WITH CHECK (%s)',
        r.policyname, r.schemaname, r.tablename, roles_csv,
        COALESCE(new_check, 'true'));
    ELSIF r.cmd = 'UPDATE' THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I AS PERMISSIVE FOR UPDATE TO %s USING (%s) WITH CHECK (%s)',
        r.policyname, r.schemaname, r.tablename, roles_csv,
        COALESCE(new_qual, 'true'), COALESCE(new_check, new_qual, 'true'));
    ELSIF r.cmd = 'DELETE' THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I AS PERMISSIVE FOR DELETE TO %s USING (%s)',
        r.policyname, r.schemaname, r.tablename, roles_csv,
        COALESCE(new_qual, 'true'));
    END IF;
  END LOOP;
END $$;

-- 5) Revoke EXECUTE on public SECURITY DEFINER functions from anon
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND has_function_privilege('anon', p.oid, 'EXECUTE')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM anon, PUBLIC',
                   r.nspname, r.proname, r.args);
  END LOOP;
END $$;
