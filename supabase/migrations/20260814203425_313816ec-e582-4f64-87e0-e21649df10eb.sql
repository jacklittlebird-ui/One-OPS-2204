ALTER TABLE public.dispatch_assignments
  ADD COLUMN IF NOT EXISTS charges_saved_at timestamptz,
  ADD COLUMN IF NOT EXISTS charges_saved_by text;

CREATE INDEX IF NOT EXISTS idx_dispatch_assignments_charges_saved_at
  ON public.dispatch_assignments (charges_saved_at)
  WHERE charges_saved_at IS NOT NULL;