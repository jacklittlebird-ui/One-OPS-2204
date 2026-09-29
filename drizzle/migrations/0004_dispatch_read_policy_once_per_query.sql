ALTER POLICY "Internal staff can read dispatch_assignments" ON public.dispatch_assignments
  USING ((SELECT public.has_internal_access((SELECT auth.uid()))));