CREATE TABLE IF NOT EXISTS public._coa_parent_pairs (
  child_code text PRIMARY KEY,
  parent_code text NOT NULL
);
ALTER TABLE public._coa_parent_pairs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone authenticated can manage temp pairs" ON public._coa_parent_pairs FOR ALL TO authenticated USING (true) WITH CHECK (true);