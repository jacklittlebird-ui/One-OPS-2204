
-- ============ AUDIT LOGS: tighten insert ============
DROP POLICY IF EXISTS "Authenticated can insert audit_logs" ON public.audit_logs;
CREATE POLICY "Users can insert own audit_logs"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR user_id = '00000000-0000-0000-0000-000000000000'::uuid
);

-- ============ Helper: finance role check ============
CREATE OR REPLACE FUNCTION public.has_finance_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::app_role)
      OR public.has_role(_user_id, 'general_accounts'::app_role)
      OR public.has_role(_user_id, 'receivables'::app_role)
      OR public.has_role(_user_id, 'payables'::app_role)
$$;

CREATE OR REPLACE FUNCTION public.has_ops_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::app_role)
      OR public.has_role(_user_id, 'station_manager'::app_role)
      OR public.has_role(_user_id, 'station_ops'::app_role)
      OR public.has_role(_user_id, 'operations'::app_role)
$$;

-- ============ INVOICES ============
DROP POLICY IF EXISTS "Authenticated users can insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated users can update invoices" ON public.invoices;
CREATE POLICY "Finance can insert invoices"
ON public.invoices FOR INSERT TO authenticated
WITH CHECK (public.has_finance_access(auth.uid()));
CREATE POLICY "Finance can update invoices"
ON public.invoices FOR UPDATE TO authenticated
USING (public.has_finance_access(auth.uid()))
WITH CHECK (public.has_finance_access(auth.uid()));

-- ============ JOURNAL ENTRIES ============
DROP POLICY IF EXISTS "Authenticated can insert journal_entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Authenticated can update journal_entries" ON public.journal_entries;
CREATE POLICY "Finance can insert journal_entries"
ON public.journal_entries FOR INSERT TO authenticated
WITH CHECK (public.has_finance_access(auth.uid()));
CREATE POLICY "Finance can update journal_entries"
ON public.journal_entries FOR UPDATE TO authenticated
USING (public.has_finance_access(auth.uid()))
WITH CHECK (public.has_finance_access(auth.uid()));

-- ============ JOURNAL ENTRY LINES ============
DROP POLICY IF EXISTS "Authenticated can insert journal_entry_lines" ON public.journal_entry_lines;
DROP POLICY IF EXISTS "Authenticated can update journal_entry_lines" ON public.journal_entry_lines;
CREATE POLICY "Finance can insert journal_entry_lines"
ON public.journal_entry_lines FOR INSERT TO authenticated
WITH CHECK (public.has_finance_access(auth.uid()));
CREATE POLICY "Finance can update journal_entry_lines"
ON public.journal_entry_lines FOR UPDATE TO authenticated
USING (public.has_finance_access(auth.uid()))
WITH CHECK (public.has_finance_access(auth.uid()));

-- ============ DISPATCH ASSIGNMENTS ============
DROP POLICY IF EXISTS "Authenticated can insert dispatch_assignments" ON public.dispatch_assignments;
DROP POLICY IF EXISTS "Authenticated can update dispatch_assignments" ON public.dispatch_assignments;
CREATE POLICY "Ops can insert dispatch_assignments"
ON public.dispatch_assignments FOR INSERT TO authenticated
WITH CHECK (public.has_ops_access(auth.uid()) OR public.has_finance_access(auth.uid()));
CREATE POLICY "Ops can update dispatch_assignments"
ON public.dispatch_assignments FOR UPDATE TO authenticated
USING (public.has_ops_access(auth.uid()) OR public.has_finance_access(auth.uid()))
WITH CHECK (public.has_ops_access(auth.uid()) OR public.has_finance_access(auth.uid()));

-- ============ STAFF ROSTER (PII) ============
DROP POLICY IF EXISTS "Authenticated users can read staff" ON public.staff_roster;
DROP POLICY IF EXISTS "Authenticated users can insert staff" ON public.staff_roster;
DROP POLICY IF EXISTS "Authenticated users can update staff" ON public.staff_roster;
CREATE POLICY "Ops can read staff_roster"
ON public.staff_roster FOR SELECT TO authenticated
USING (public.has_ops_access(auth.uid()));
CREATE POLICY "Ops can insert staff_roster"
ON public.staff_roster FOR INSERT TO authenticated
WITH CHECK (public.has_ops_access(auth.uid()));
CREATE POLICY "Ops can update staff_roster"
ON public.staff_roster FOR UPDATE TO authenticated
USING (public.has_ops_access(auth.uid()))
WITH CHECK (public.has_ops_access(auth.uid()));

-- ============ LOST & FOUND (PII: owner_contact) ============
DROP POLICY IF EXISTS "Authenticated users can read lost_found" ON public.lost_found;
DROP POLICY IF EXISTS "Authenticated users can insert lost_found" ON public.lost_found;
DROP POLICY IF EXISTS "Authenticated users can update lost_found" ON public.lost_found;
CREATE POLICY "Ops can read lost_found"
ON public.lost_found FOR SELECT TO authenticated
USING (public.has_ops_access(auth.uid()));
CREATE POLICY "Ops can insert lost_found"
ON public.lost_found FOR INSERT TO authenticated
WITH CHECK (public.has_ops_access(auth.uid()));
CREATE POLICY "Ops can update lost_found"
ON public.lost_found FOR UPDATE TO authenticated
USING (public.has_ops_access(auth.uid()))
WITH CHECK (public.has_ops_access(auth.uid()));

-- ============ AIRPORT CHARGES ============
DROP POLICY IF EXISTS "Authenticated users can insert airport_charges" ON public.airport_charges;
DROP POLICY IF EXISTS "Authenticated users can update airport_charges" ON public.airport_charges;
DROP POLICY IF EXISTS "Authenticated users can delete airport_charges" ON public.airport_charges;
CREATE POLICY "Admin/contracts can insert airport_charges"
ON public.airport_charges FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'contracts'::app_role));
CREATE POLICY "Admin/contracts can update airport_charges"
ON public.airport_charges FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'contracts'::app_role))
WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'contracts'::app_role));
CREATE POLICY "Admin can delete airport_charges"
ON public.airport_charges FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));
