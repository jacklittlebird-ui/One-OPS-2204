
-- ============ CONTRACTS module ============
DROP POLICY IF EXISTS "Authenticated users can insert contracts" ON public.contracts;
DROP POLICY IF EXISTS "Authenticated users can update contracts" ON public.contracts;
CREATE POLICY "Contracts can insert contracts" ON public.contracts FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'contracts'::app_role));
CREATE POLICY "Contracts can update contracts" ON public.contracts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'contracts'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'contracts'::app_role));

DROP POLICY IF EXISTS "Authenticated can insert contract_service_rates" ON public.contract_service_rates;
DROP POLICY IF EXISTS "Authenticated can update contract_service_rates" ON public.contract_service_rates;
CREATE POLICY "Contracts can insert contract_service_rates" ON public.contract_service_rates FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'contracts'::app_role));
CREATE POLICY "Contracts can update contract_service_rates" ON public.contract_service_rates FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'contracts'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'contracts'::app_role));

DROP POLICY IF EXISTS "Authenticated can insert airline_airport_services" ON public.airline_airport_services;
DROP POLICY IF EXISTS "Authenticated can update airline_airport_services" ON public.airline_airport_services;
CREATE POLICY "Contracts can insert airline_airport_services" ON public.airline_airport_services FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'contracts'::app_role));
CREATE POLICY "Contracts can update airline_airport_services" ON public.airline_airport_services FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'contracts'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'contracts'::app_role));

-- ============ AIRLINES & AIRCRAFTS ============
DROP POLICY IF EXISTS "Authenticated can insert airlines" ON public.airlines;
DROP POLICY IF EXISTS "Authenticated can update airlines" ON public.airlines;
CREATE POLICY "Privileged can insert airlines" ON public.airlines FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'contracts'::app_role) OR public.has_ops_access(auth.uid()));
CREATE POLICY "Privileged can update airlines" ON public.airlines FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'contracts'::app_role) OR public.has_ops_access(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'contracts'::app_role) OR public.has_ops_access(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can insert aircrafts" ON public.aircrafts;
DROP POLICY IF EXISTS "Authenticated can update aircrafts" ON public.aircrafts;
CREATE POLICY "Privileged can insert aircrafts" ON public.aircrafts FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'contracts'::app_role) OR public.has_ops_access(auth.uid()));
CREATE POLICY "Privileged can update aircrafts" ON public.aircrafts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'contracts'::app_role) OR public.has_ops_access(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'contracts'::app_role) OR public.has_ops_access(auth.uid()));

-- ============ FLIGHT SCHEDULES & OVERFLY ============
DROP POLICY IF EXISTS "Authenticated can insert flight_schedules" ON public.flight_schedules;
DROP POLICY IF EXISTS "Authenticated can update flight_schedules" ON public.flight_schedules;
CREATE POLICY "Clearance can insert flight_schedules" ON public.flight_schedules FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'clearance'::app_role) OR public.has_ops_access(auth.uid()));
CREATE POLICY "Clearance can update flight_schedules" ON public.flight_schedules FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'clearance'::app_role) OR public.has_ops_access(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'clearance'::app_role) OR public.has_ops_access(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can insert overfly_schedules" ON public.overfly_schedules;
DROP POLICY IF EXISTS "Authenticated can update overfly_schedules" ON public.overfly_schedules;
CREATE POLICY "Clearance can insert overfly_schedules" ON public.overfly_schedules FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'clearance'::app_role) OR public.has_ops_access(auth.uid()));
CREATE POLICY "Clearance can update overfly_schedules" ON public.overfly_schedules FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'clearance'::app_role) OR public.has_ops_access(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'clearance'::app_role) OR public.has_ops_access(auth.uid()));

-- ============ SERVICE REPORTS (parent + children) ============
DROP POLICY IF EXISTS "Authenticated can insert service_reports" ON public.service_reports;
DROP POLICY IF EXISTS "Authenticated can update service_reports" ON public.service_reports;
CREATE POLICY "Ops can insert service_reports" ON public.service_reports FOR INSERT TO authenticated
  WITH CHECK (public.has_ops_access(auth.uid()));
CREATE POLICY "Ops can update service_reports" ON public.service_reports FOR UPDATE TO authenticated
  USING (public.has_ops_access(auth.uid())) WITH CHECK (public.has_ops_access(auth.uid()));

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['service_report_catering','service_report_delays','service_report_fuel','service_report_hotac']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated can insert %1$s" ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated can update %1$s" ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated can delete %1$s" ON public.%1$s', t);
    EXECUTE format('CREATE POLICY "Ops can insert %1$s" ON public.%1$s FOR INSERT TO authenticated WITH CHECK (public.has_ops_access(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "Ops can update %1$s" ON public.%1$s FOR UPDATE TO authenticated USING (public.has_ops_access(auth.uid())) WITH CHECK (public.has_ops_access(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "Ops can delete %1$s" ON public.%1$s FOR DELETE TO authenticated USING (public.has_ops_access(auth.uid()))', t);
  END LOOP;
END $$;

-- ============ IRREGULARITY / BULLETINS / MANUALS ============
DROP POLICY IF EXISTS "Authenticated can insert irregularity_reports" ON public.irregularity_reports;
DROP POLICY IF EXISTS "Authenticated can update irregularity_reports" ON public.irregularity_reports;
CREATE POLICY "Ops can insert irregularity_reports" ON public.irregularity_reports FOR INSERT TO authenticated
  WITH CHECK (public.has_ops_access(auth.uid()));
CREATE POLICY "Ops can update irregularity_reports" ON public.irregularity_reports FOR UPDATE TO authenticated
  USING (public.has_ops_access(auth.uid())) WITH CHECK (public.has_ops_access(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can insert bulletins" ON public.bulletins;
DROP POLICY IF EXISTS "Authenticated can update bulletins" ON public.bulletins;
CREATE POLICY "Ops can insert bulletins" ON public.bulletins FOR INSERT TO authenticated
  WITH CHECK (public.has_ops_access(auth.uid()));
CREATE POLICY "Ops can update bulletins" ON public.bulletins FOR UPDATE TO authenticated
  USING (public.has_ops_access(auth.uid())) WITH CHECK (public.has_ops_access(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can insert manuals_forms" ON public.manuals_forms;
DROP POLICY IF EXISTS "Authenticated can update manuals_forms" ON public.manuals_forms;
CREATE POLICY "Ops can insert manuals_forms" ON public.manuals_forms FOR INSERT TO authenticated
  WITH CHECK (public.has_ops_access(auth.uid()));
CREATE POLICY "Ops can update manuals_forms" ON public.manuals_forms FOR UPDATE TO authenticated
  USING (public.has_ops_access(auth.uid())) WITH CHECK (public.has_ops_access(auth.uid()));

-- ============ VENDOR INVOICES ============
DROP POLICY IF EXISTS "Authenticated can insert vendor_invoices" ON public.vendor_invoices;
DROP POLICY IF EXISTS "Authenticated can update vendor_invoices" ON public.vendor_invoices;
CREATE POLICY "Finance can insert vendor_invoices" ON public.vendor_invoices FOR INSERT TO authenticated
  WITH CHECK (public.has_finance_access(auth.uid()));
CREATE POLICY "Finance can update vendor_invoices" ON public.vendor_invoices FOR UPDATE TO authenticated
  USING (public.has_finance_access(auth.uid())) WITH CHECK (public.has_finance_access(auth.uid()));

-- ============ NOTIFICATIONS: own only ============
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;
CREATE POLICY "Users insert own notifications" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- ============ DATA INTEGRITY constraints ============
CREATE UNIQUE INDEX IF NOT EXISTS invoices_invoice_no_uq
  ON public.invoices (invoice_no) WHERE invoice_no <> '';
CREATE UNIQUE INDEX IF NOT EXISTS journal_entries_entry_no_uq
  ON public.journal_entries (entry_no) WHERE entry_no <> '';
