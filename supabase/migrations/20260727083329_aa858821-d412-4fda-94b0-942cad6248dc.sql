
DROP POLICY IF EXISTS "Ops can insert dispatch_assignments" ON public.dispatch_assignments;
CREATE POLICY "Ops can insert dispatch_assignments" ON public.dispatch_assignments
  FOR INSERT TO authenticated
  WITH CHECK (public.has_ops_access(auth.uid()));

DROP POLICY IF EXISTS "Ops can update dispatch_assignments" ON public.dispatch_assignments;
CREATE POLICY "Ops can update dispatch_assignments" ON public.dispatch_assignments
  FOR UPDATE TO authenticated
  USING (public.has_ops_access(auth.uid()))
  WITH CHECK (public.has_ops_access(auth.uid()));

DROP POLICY IF EXISTS "Finance can delete recurring JE" ON public.recurring_journal_entries;
CREATE POLICY "Finance can delete recurring JE" ON public.recurring_journal_entries
  FOR DELETE TO authenticated
  USING (public.has_finance_access(auth.uid()));
