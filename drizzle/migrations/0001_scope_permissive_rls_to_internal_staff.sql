-- 1) Reference/operational tables: restrict reads to internal staff instead of any signed-in user
DROP POLICY IF EXISTS "Authenticated can read abbreviations" ON public.abbreviations;
CREATE POLICY "Internal staff read abbreviations" ON public.abbreviations FOR SELECT TO authenticated USING (public.has_internal_access(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can read aircraft_types_ref" ON public.aircraft_types_ref;
CREATE POLICY "Internal staff read aircraft_types_ref" ON public.aircraft_types_ref FOR SELECT TO authenticated USING (public.has_internal_access(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can read airline_incentives" ON public.airline_incentives;
CREATE POLICY "Internal staff read airline_incentives" ON public.airline_incentives FOR SELECT TO authenticated USING (public.has_internal_access(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view airport_charges" ON public.airport_charges;
CREATE POLICY "Internal staff read airport_charges" ON public.airport_charges FOR SELECT TO authenticated USING (public.has_internal_access(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can read airport_tax" ON public.airport_tax;
CREATE POLICY "Internal staff read airport_tax" ON public.airport_tax FOR SELECT TO authenticated USING (public.has_internal_access(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can read airports" ON public.airports;
CREATE POLICY "Internal staff read airports" ON public.airports FOR SELECT TO authenticated USING (public.has_internal_access(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can read basic_ramp" ON public.basic_ramp;
CREATE POLICY "Internal staff read basic_ramp" ON public.basic_ramp FOR SELECT TO authenticated USING (public.has_internal_access(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can read catering_items" ON public.catering_items;
CREATE POLICY "Internal staff read catering_items" ON public.catering_items FOR SELECT TO authenticated USING (public.has_internal_access(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can read countries" ON public.countries;
CREATE POLICY "Internal staff read countries" ON public.countries FOR SELECT TO authenticated USING (public.has_internal_access(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can read delay_codes" ON public.delay_codes;
CREATE POLICY "Internal staff read delay_codes" ON public.delay_codes FOR SELECT TO authenticated USING (public.has_internal_access(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can read hall_vvip" ON public.hall_vvip;
CREATE POLICY "Internal staff read hall_vvip" ON public.hall_vvip FOR SELECT TO authenticated USING (public.has_internal_access(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can read overfly" ON public.overfly_schedules;
CREATE POLICY "Internal staff read overfly" ON public.overfly_schedules FOR SELECT TO authenticated USING (public.has_internal_access(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can read service_providers" ON public.service_providers;
CREATE POLICY "Internal staff read service_providers" ON public.service_providers FOR SELECT TO authenticated USING (public.has_internal_access(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can read services_catalog" ON public.services_catalog;
CREATE POLICY "Internal staff read services_catalog" ON public.services_catalog FOR SELECT TO authenticated USING (public.has_internal_access(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can read traffic_rights" ON public.traffic_rights;
CREATE POLICY "Internal staff read traffic_rights" ON public.traffic_rights FOR SELECT TO authenticated USING (public.has_internal_access(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can read tube_charges" ON public.tube_charges;
CREATE POLICY "Internal staff read tube_charges" ON public.tube_charges FOR SELECT TO authenticated USING (public.has_internal_access(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can read vendor_equipment" ON public.vendor_equipment;
CREATE POLICY "Internal staff read vendor_equipment" ON public.vendor_equipment FOR SELECT TO authenticated USING (public.has_internal_access(auth.uid()));

-- 2) Finance/commercial-sensitive tables: restrict to finance roles
DROP POLICY IF EXISTS "credit profiles readable by authenticated" ON public.customer_credit_profiles;
CREATE POLICY "Finance reads credit profiles" ON public.customer_credit_profiles FOR SELECT TO authenticated USING (public.has_finance_access(auth.uid()));

DROP POLICY IF EXISTS "credit events readable by authenticated" ON public.customer_credit_events;
CREATE POLICY "Finance reads credit events" ON public.customer_credit_events FOR SELECT TO authenticated USING (public.has_finance_access(auth.uid()));

DROP POLICY IF EXISTS "Authenticated read renewal events" ON public.contract_renewal_events;
CREATE POLICY "Contracts staff read renewal events" ON public.contract_renewal_events FOR SELECT TO authenticated USING (public.has_finance_access(auth.uid()) OR public.has_role(auth.uid(), 'contracts'::app_role));

DROP POLICY IF EXISTS "Authenticated read SLA incidents" ON public.contract_sla_incidents;
CREATE POLICY "Contracts staff read SLA incidents" ON public.contract_sla_incidents FOR SELECT TO authenticated USING (public.has_finance_access(auth.uid()) OR public.has_role(auth.uid(), 'contracts'::app_role) OR public.has_role(auth.uid(), 'operations'::app_role));

DROP POLICY IF EXISTS "finance_audit_log_read" ON public.finance_audit_log;
CREATE POLICY "Finance reads finance_audit_log" ON public.finance_audit_log FOR SELECT TO authenticated USING (public.has_finance_access(auth.uid()));

DROP POLICY IF EXISTS "finance_audit_log_insert" ON public.finance_audit_log;
CREATE POLICY "Finance writes own finance_audit_log" ON public.finance_audit_log FOR INSERT TO authenticated WITH CHECK (public.has_finance_access(auth.uid()) AND actor_id = auth.uid());

DROP POLICY IF EXISTS "auth manage vendor_scorecards" ON public.vendor_scorecards;
CREATE POLICY "Finance reads vendor_scorecards" ON public.vendor_scorecards FOR SELECT TO authenticated USING (public.has_finance_access(auth.uid()));
CREATE POLICY "Finance inserts vendor_scorecards" ON public.vendor_scorecards FOR INSERT TO authenticated WITH CHECK (public.has_finance_access(auth.uid()));
CREATE POLICY "Finance updates vendor_scorecards" ON public.vendor_scorecards FOR UPDATE TO authenticated USING (public.has_finance_access(auth.uid())) WITH CHECK (public.has_finance_access(auth.uid()));
CREATE POLICY "Admins delete vendor_scorecards" ON public.vendor_scorecards FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- 3) Storage: bind document-uploads reads/writes to the uploader (finance/admin keep full access)
DROP POLICY IF EXISTS "Auth read document files" ON storage.objects;
CREATE POLICY "Uploader or finance reads document files" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'document-uploads' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role) OR public.has_finance_access(auth.uid())));

DROP POLICY IF EXISTS "Auth upload document files" ON storage.objects;
CREATE POLICY "Uploader adds own document files" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'document-uploads' AND owner = auth.uid());