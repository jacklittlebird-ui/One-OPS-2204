
-- 1) Internal staff helper covering all internal roles
CREATE OR REPLACE FUNCTION public.has_internal_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::app_role)
      OR public.has_role(_user_id, 'general_accounts'::app_role)
      OR public.has_role(_user_id, 'receivables'::app_role)
      OR public.has_role(_user_id, 'payables'::app_role)
      OR public.has_role(_user_id, 'accountant'::app_role)
      OR public.has_role(_user_id, 'station_manager'::app_role)
      OR public.has_role(_user_id, 'station_ops'::app_role)
      OR public.has_role(_user_id, 'operations'::app_role)
      OR public.has_role(_user_id, 'clearance'::app_role)
      OR public.has_role(_user_id, 'contracts'::app_role)
$$;

REVOKE EXECUTE ON FUNCTION public.has_internal_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_internal_access(uuid) TO authenticated, service_role;

-- 2) Tighten broad SELECT policies to internal staff only
DROP POLICY IF EXISTS "Authenticated users can read invoices" ON public.invoices;
CREATE POLICY "Internal staff can read invoices" ON public.invoices
  FOR SELECT TO authenticated USING (public.has_internal_access(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can read journal_entries" ON public.journal_entries;
CREATE POLICY "Internal staff can read journal_entries" ON public.journal_entries
  FOR SELECT TO authenticated USING (public.has_internal_access(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can read journal_entry_lines" ON public.journal_entry_lines;
CREATE POLICY "Internal staff can read journal_entry_lines" ON public.journal_entry_lines
  FOR SELECT TO authenticated USING (public.has_internal_access(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can read vendor_invoices" ON public.vendor_invoices;
CREATE POLICY "Internal staff can read vendor_invoices" ON public.vendor_invoices
  FOR SELECT TO authenticated USING (public.has_internal_access(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can read reports" ON public.service_reports;
CREATE POLICY "Internal staff can read service_reports" ON public.service_reports
  FOR SELECT TO authenticated USING (public.has_internal_access(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can read flight_schedules" ON public.flight_schedules;
CREATE POLICY "Internal staff can read flight_schedules" ON public.flight_schedules
  FOR SELECT TO authenticated USING (public.has_internal_access(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can read contracts" ON public.contracts;
CREATE POLICY "Internal staff can read contracts" ON public.contracts
  FOR SELECT TO authenticated USING (public.has_internal_access(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can read airlines" ON public.airlines;
CREATE POLICY "Internal staff can read airlines" ON public.airlines
  FOR SELECT TO authenticated USING (public.has_internal_access(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can read dispatch_assignments" ON public.dispatch_assignments;
CREATE POLICY "Internal staff can read dispatch_assignments" ON public.dispatch_assignments
  FOR SELECT TO authenticated USING (public.has_internal_access(auth.uid()));

-- 3) Employees: add an explicit RESTRICTIVE delete policy so only finance/admin can ever delete
DROP POLICY IF EXISTS "Only finance or admin can delete employees" ON public.employees;
CREATE POLICY "Only finance or admin can delete employees"
  ON public.employees
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'accountant'::app_role)
  );

-- 4) Revoke anon EXECUTE on public SECURITY DEFINER trigger helpers
REVOKE EXECUTE ON FUNCTION public.auto_link_dispatch_security_contract() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.enforce_confirmed_flight_delete() FROM PUBLIC, anon;
