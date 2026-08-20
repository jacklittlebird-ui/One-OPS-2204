-- 1. Restrict finance tables to finance/admin roles
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('amortization_schedules','Auth manage amortization_schedules'),
      ('amortization_entries','Auth manage amortization_entries'),
      ('authority_delegations','auth manage authority_delegations'),
      ('cash_flow_forecasts','Authenticated users manage cash flow forecasts'),
      ('cash_flow_forecast_lines','Authenticated users manage forecast lines'),
      ('cbcr_reports','auth manage cbcr_reports'),
      ('cbcr_jurisdiction_lines','auth manage cbcr_jurisdiction_lines'),
      ('cbcr_entity_lines','auth manage cbcr_entity_lines'),
      ('globe_reports','auth manage globe_reports'),
      ('globe_jurisdiction_lines','auth manage globe_lines'),
      ('commission_accruals','auth manage commission_accruals'),
      ('commission_payouts','auth manage commission_payouts'),
      ('commission_plans','auth manage commission_plans'),
      ('fx_revaluation_schedules','Authenticated can manage fx schedules'),
      ('lease_payment_schedule','Authenticated users manage lease schedule'),
      ('leases','Authenticated users manage leases'),
      ('supplier_price_list','supplier_price_list_authenticated_all'),
      ('vendor_scorecard_kpis','auth manage vendor_scorecard_kpis')
    ) AS t(tbl, pol)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.pol, r.tbl);
    EXECUTE format($f$CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.has_finance_access(auth.uid())) WITH CHECK (public.has_finance_access(auth.uid()))$f$,
      'Finance manage ' || r.tbl, r.tbl);
  END LOOP;
END $$;

-- 2. provision_movements: finance-only read and write
DROP POLICY IF EXISTS "auth read provision_movements" ON public.provision_movements;
DROP POLICY IF EXISTS "auth write provision_movements" ON public.provision_movements;
CREATE POLICY "Finance read provision_movements" ON public.provision_movements
  FOR SELECT TO authenticated USING (public.has_finance_access(auth.uid()));
CREATE POLICY "Finance manage provision_movements" ON public.provision_movements
  FOR ALL TO authenticated USING (public.has_finance_access(auth.uid())) WITH CHECK (public.has_finance_access(auth.uid()));

-- 3. documents / document_versions: internal staff or uploader only
DROP POLICY IF EXISTS "Auth read documents" ON public.documents;
CREATE POLICY "Internal read documents" ON public.documents
  FOR SELECT TO authenticated
  USING (public.has_internal_access(auth.uid()) OR uploaded_by = auth.uid());

DROP POLICY IF EXISTS "Auth read doc versions" ON public.document_versions;
CREATE POLICY "Internal read doc versions" ON public.document_versions
  FOR SELECT TO authenticated
  USING (public.has_internal_access(auth.uid()) OR uploaded_by = auth.uid());

-- 4. employees: link to user account instead of plain email equality
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS user_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS employees_user_id_key ON public.employees(user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS employees_email_unique_idx ON public.employees(lower(email)) WHERE email IS NOT NULL AND email <> '';

DROP POLICY IF EXISTS "Employees view own record" ON public.employees;
CREATE POLICY "Employees view own record" ON public.employees
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      user_id IS NULL
      AND email IS NOT NULL AND email <> ''
      AND EXISTS (
        SELECT 1 FROM auth.users u
        WHERE u.id = auth.uid()
          AND u.email_confirmed_at IS NOT NULL
          AND lower(u.email) = lower(public.employees.email)
      )
    )
  );

-- 5. Remove anon/public EXECUTE on SECURITY DEFINER routines
REVOKE ALL ON FUNCTION public.treasury_daily_rate(finance_currency, date) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.approve_treasury_advance(uuid) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.record_advance_recovery(uuid, numeric, text) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.settle_pending_custody(uuid, numeric, text) FROM anon, PUBLIC;
-- trigger-only functions: nobody needs direct EXECUTE
REVOKE ALL ON FUNCTION public.audit_treasury_voucher() FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.validate_treasury_voucher() FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.log_invoice_no_change() FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.archive_flight_before_delete() FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.archive_dispatch_before_delete() FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.archive_service_report_before_delete() FROM anon, authenticated, PUBLIC;