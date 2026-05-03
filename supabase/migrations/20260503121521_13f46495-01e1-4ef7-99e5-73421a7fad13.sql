
CREATE TABLE IF NOT EXISTS public.security_check_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  passed boolean NOT NULL,
  checks jsonb NOT NULL DEFAULT '[]'::jsonb,
  source text NOT NULL DEFAULT 'edge-function',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.security_check_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read security_check_runs" ON public.security_check_runs;
CREATE POLICY "Admins can read security_check_runs"
ON public.security_check_runs
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_security_check_runs_created_at
  ON public.security_check_runs (created_at DESC);
