
-- Collections: restrict to finance-role users
DROP POLICY IF EXISTS "Authenticated can view collection cases" ON public.collection_cases;
DROP POLICY IF EXISTS "Authenticated can insert collection cases" ON public.collection_cases;
DROP POLICY IF EXISTS "Authenticated can update collection cases" ON public.collection_cases;
DROP POLICY IF EXISTS "Authenticated can delete collection cases" ON public.collection_cases;
CREATE POLICY "Finance manage collection cases" ON public.collection_cases
  FOR ALL TO authenticated
  USING (public.has_finance_access(auth.uid()))
  WITH CHECK (public.has_finance_access(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can view collection activities" ON public.collection_activities;
DROP POLICY IF EXISTS "Authenticated can insert collection activities" ON public.collection_activities;
DROP POLICY IF EXISTS "Authenticated can update collection activities" ON public.collection_activities;
DROP POLICY IF EXISTS "Authenticated can delete collection activities" ON public.collection_activities;
CREATE POLICY "Finance manage collection activities" ON public.collection_activities
  FOR ALL TO authenticated
  USING (public.has_finance_access(auth.uid()))
  WITH CHECK (public.has_finance_access(auth.uid()));

-- Broad financial tables: restrict to finance-role users
DROP POLICY IF EXISTS cheques_under_collection_authenticated_all ON public.cheques_under_collection;
CREATE POLICY cheques_under_collection_finance_all ON public.cheques_under_collection
  FOR ALL TO authenticated USING (public.has_finance_access(auth.uid())) WITH CHECK (public.has_finance_access(auth.uid()));

DROP POLICY IF EXISTS companies_authenticated_all ON public.companies;
CREATE POLICY companies_finance_all ON public.companies
  FOR ALL TO authenticated USING (public.has_finance_access(auth.uid())) WITH CHECK (public.has_finance_access(auth.uid()));

DROP POLICY IF EXISTS cost_report_lines_authenticated_all ON public.cost_report_lines;
CREATE POLICY cost_report_lines_finance_all ON public.cost_report_lines
  FOR ALL TO authenticated USING (public.has_finance_access(auth.uid())) WITH CHECK (public.has_finance_access(auth.uid()));

DROP POLICY IF EXISTS cost_reports_authenticated_all ON public.cost_reports;
CREATE POLICY cost_reports_finance_all ON public.cost_reports
  FOR ALL TO authenticated USING (public.has_finance_access(auth.uid())) WITH CHECK (public.has_finance_access(auth.uid()));

DROP POLICY IF EXISTS customer_price_list_authenticated_all ON public.customer_price_list;
CREATE POLICY customer_price_list_finance_all ON public.customer_price_list
  FOR ALL TO authenticated USING (public.has_finance_access(auth.uid())) WITH CHECK (public.has_finance_access(auth.uid()));

DROP POLICY IF EXISTS exchange_rates_authenticated_all ON public.exchange_rates;
CREATE POLICY exchange_rates_finance_all ON public.exchange_rates
  FOR ALL TO authenticated USING (public.has_finance_access(auth.uid())) WITH CHECK (public.has_finance_access(auth.uid()));

DROP POLICY IF EXISTS finance_stations_authenticated_all ON public.finance_stations;
CREATE POLICY finance_stations_finance_all ON public.finance_stations
  FOR ALL TO authenticated USING (public.has_finance_access(auth.uid())) WITH CHECK (public.has_finance_access(auth.uid()));

DROP POLICY IF EXISTS variance_reports_authenticated_all ON public.invoice_variance_reports;
CREATE POLICY variance_reports_finance_all ON public.invoice_variance_reports
  FOR ALL TO authenticated USING (public.has_finance_access(auth.uid())) WITH CHECK (public.has_finance_access(auth.uid()));

DROP POLICY IF EXISTS notes_payable_authenticated_all ON public.notes_payable;
CREATE POLICY notes_payable_finance_all ON public.notes_payable
  FOR ALL TO authenticated USING (public.has_finance_access(auth.uid())) WITH CHECK (public.has_finance_access(auth.uid()));

DROP POLICY IF EXISTS objection_letters_authenticated_all ON public.objection_letters;
CREATE POLICY objection_letters_finance_all ON public.objection_letters
  FOR ALL TO authenticated USING (public.has_finance_access(auth.uid())) WITH CHECK (public.has_finance_access(auth.uid()));

DROP POLICY IF EXISTS "auth manage purchase_approval_matrix" ON public.purchase_approval_matrix;
CREATE POLICY purchase_approval_matrix_finance_all ON public.purchase_approval_matrix
  FOR ALL TO authenticated USING (public.has_finance_access(auth.uid())) WITH CHECK (public.has_finance_access(auth.uid()));

DROP POLICY IF EXISTS "auth write ril" ON public.recurring_invoice_lines;
DROP POLICY IF EXISTS "auth read ril" ON public.recurring_invoice_lines;
CREATE POLICY recurring_invoice_lines_finance_all ON public.recurring_invoice_lines
  FOR ALL TO authenticated USING (public.has_finance_access(auth.uid())) WITH CHECK (public.has_finance_access(auth.uid()));

DROP POLICY IF EXISTS "auth write rir" ON public.recurring_invoice_runs;
DROP POLICY IF EXISTS "auth read rir" ON public.recurring_invoice_runs;
CREATE POLICY recurring_invoice_runs_finance_all ON public.recurring_invoice_runs
  FOR ALL TO authenticated USING (public.has_finance_access(auth.uid())) WITH CHECK (public.has_finance_access(auth.uid()));

DROP POLICY IF EXISTS "auth write rit" ON public.recurring_invoice_templates;
DROP POLICY IF EXISTS "auth read rit" ON public.recurring_invoice_templates;
CREATE POLICY recurring_invoice_templates_finance_all ON public.recurring_invoice_templates
  FOR ALL TO authenticated USING (public.has_finance_access(auth.uid())) WITH CHECK (public.has_finance_access(auth.uid()));

DROP POLICY IF EXISTS short_term_loans_authenticated_all ON public.short_term_loans;
CREATE POLICY short_term_loans_finance_all ON public.short_term_loans
  FOR ALL TO authenticated USING (public.has_finance_access(auth.uid())) WITH CHECK (public.has_finance_access(auth.uid()));

DROP POLICY IF EXISTS supplier_bank_profiles_authenticated_all ON public.supplier_bank_profiles;
CREATE POLICY supplier_bank_profiles_finance_all ON public.supplier_bank_profiles
  FOR ALL TO authenticated USING (public.has_finance_access(auth.uid())) WITH CHECK (public.has_finance_access(auth.uid()));

DROP POLICY IF EXISTS treasury_vouchers_authenticated_all ON public.treasury_vouchers;
CREATE POLICY treasury_vouchers_finance_all ON public.treasury_vouchers
  FOR ALL TO authenticated USING (public.has_finance_access(auth.uid())) WITH CHECK (public.has_finance_access(auth.uid()));
