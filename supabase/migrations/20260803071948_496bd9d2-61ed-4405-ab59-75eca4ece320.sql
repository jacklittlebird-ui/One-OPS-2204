-- 1) Finance-only reads
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'bank_accounts','bank_reconciliations','bank_transfers','cash_accounts',
    'payments','receipts','consolidation_runs','fx_revaluation_runs',
    'fx_revaluation_lines','fx_realized_entries','provisions',
    'minority_interests','elimination_entries','chart_of_accounts',
    'contract_service_rates','sales_quotations','sales_quotation_lines',
    'sales_orders','sales_order_lines'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'auth read ' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Authenticated can read ' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'auth read ' || replace(t,'_',' '), t);
    -- drop any remaining permissive SELECT policies
    FOR t IN SELECT t LOOP END LOOP;
  END LOOP;
END $$;

-- drop every remaining fully-permissive SELECT/ALL policy on the target tables
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tablename, policyname, cmd, qual
    FROM pg_policies
    WHERE schemaname='public'
      AND tablename IN (
        'bank_accounts','bank_reconciliations','bank_transfers','cash_accounts',
        'payments','receipts','consolidation_runs','fx_revaluation_runs',
        'fx_revaluation_lines','fx_realized_entries','provisions',
        'minority_interests','elimination_entries','chart_of_accounts',
        'contract_service_rates','sales_quotations','sales_quotation_lines',
        'sales_orders','sales_order_lines',
        'aircrafts','airline_airport_services','irregularity_reports','manuals_forms',
        'bulletins','staff_roster','service_report_catering','service_report_delays',
        'service_report_fuel','service_report_hotac'
      )
      AND cmd IN ('SELECT','ALL','DELETE','INSERT','UPDATE')
      AND (
        btrim(coalesce(qual,'')) = 'true'
        OR btrim(coalesce(qual,'')) = '(auth.uid() IS NOT NULL)'
        OR btrim(coalesce(with_check,'')) = 'true'
        OR btrim(coalesce(with_check,'')) = '(auth.uid() IS NOT NULL)'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- 2) Recreate finance-scoped access
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'bank_accounts','bank_reconciliations','bank_transfers','cash_accounts',
    'payments','receipts','consolidation_runs','fx_revaluation_runs',
    'fx_revaluation_lines','fx_realized_entries','provisions',
    'minority_interests','elimination_entries','chart_of_accounts',
    'contract_service_rates','sales_quotations','sales_quotation_lines',
    'sales_orders','sales_order_lines'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.has_finance_access(auth.uid()))',
      'finance read ' || t, t);
  END LOOP;

  -- restore write access (finance) for tables whose permissive ALL policies were dropped
  FOREACH t IN ARRAY ARRAY[
    'consolidation_runs','fx_revaluation_runs','fx_revaluation_lines',
    'fx_realized_entries','provisions','minority_interests','elimination_entries',
    'sales_quotations','sales_quotation_lines','sales_orders','sales_order_lines'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.has_finance_access(auth.uid())) WITH CHECK (public.has_finance_access(auth.uid()))',
      'finance write ' || t, t);
  END LOOP;
END $$;

-- 3) Internal-staff reads for operational tables
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'aircrafts','airline_airport_services','irregularity_reports','manuals_forms',
    'bulletins','staff_roster','service_report_catering','service_report_delays',
    'service_report_fuel','service_report_hotac'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.has_internal_access(auth.uid()))',
      'internal read ' || t, t);
  END LOOP;
END $$;
