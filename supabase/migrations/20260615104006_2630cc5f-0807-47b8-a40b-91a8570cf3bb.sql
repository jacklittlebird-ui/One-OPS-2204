-- Lock down the Phase 3B Step 1 rollback snapshot.
-- No client roles need to read it; only service_role keeps full access.
REVOKE ALL ON public.snapshot_dispatch_assignments_pre_phase3b_step1 FROM PUBLIC;
REVOKE ALL ON public.snapshot_dispatch_assignments_pre_phase3b_step1 FROM anon, authenticated;
GRANT ALL ON public.snapshot_dispatch_assignments_pre_phase3b_step1 TO service_role;

ALTER TABLE public.snapshot_dispatch_assignments_pre_phase3b_step1
  ENABLE ROW LEVEL SECURITY;

-- No policies = no access for anon/authenticated. service_role bypasses RLS.
