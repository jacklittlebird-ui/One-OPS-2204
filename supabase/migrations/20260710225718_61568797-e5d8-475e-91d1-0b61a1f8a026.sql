
-- Phase 2j: Consolidation Workbench
CREATE TABLE IF NOT EXISTS public.consolidation_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_no TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  base_currency TEXT NOT NULL DEFAULT 'EGP',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','finalized')),
  total_elimination NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_minority_interest NUMERIC(18,2) NOT NULL DEFAULT 0,
  notes TEXT,
  finalized_at TIMESTAMPTZ,
  finalized_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consolidation_runs TO authenticated;
GRANT ALL ON public.consolidation_runs TO service_role;
ALTER TABLE public.consolidation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth view runs" ON public.consolidation_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert runs" ON public.consolidation_runs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update runs" ON public.consolidation_runs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth delete runs" ON public.consolidation_runs FOR DELETE TO authenticated USING (true);
CREATE TRIGGER trg_consolidation_runs_upd BEFORE UPDATE ON public.consolidation_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.elimination_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES public.consolidation_runs(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('ic_ar_ap','ic_revenue_expense','investment_equity','unrealized_profit','other')),
  from_company_id UUID,
  to_company_id UUID,
  from_account_id UUID,
  to_account_id UUID,
  amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EGP',
  ic_transaction_id UUID REFERENCES public.intercompany_transactions(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.elimination_entries TO authenticated;
GRANT ALL ON public.elimination_entries TO service_role;
ALTER TABLE public.elimination_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth view elim" ON public.elimination_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert elim" ON public.elimination_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update elim" ON public.elimination_entries FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth delete elim" ON public.elimination_entries FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_elim_run ON public.elimination_entries(run_id);
CREATE TRIGGER trg_elim_upd BEFORE UPDATE ON public.elimination_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.minority_interests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES public.consolidation_runs(id) ON DELETE CASCADE,
  subsidiary_company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  ownership_pct NUMERIC(6,3) NOT NULL DEFAULT 100,
  minority_pct NUMERIC(6,3) NOT NULL DEFAULT 0,
  subsidiary_net_income NUMERIC(18,2) NOT NULL DEFAULT 0,
  subsidiary_equity NUMERIC(18,2) NOT NULL DEFAULT 0,
  minority_interest_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (run_id, subsidiary_company_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.minority_interests TO authenticated;
GRANT ALL ON public.minority_interests TO service_role;
ALTER TABLE public.minority_interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth view mi" ON public.minority_interests FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert mi" ON public.minority_interests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update mi" ON public.minority_interests FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth delete mi" ON public.minority_interests FOR DELETE TO authenticated USING (true);
CREATE TRIGGER trg_mi_upd BEFORE UPDATE ON public.minority_interests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Suggest inter-company eliminations for a period
CREATE OR REPLACE FUNCTION public.suggest_ic_eliminations(_from DATE, _to DATE)
RETURNS TABLE (
  ic_id UUID,
  ic_no TEXT,
  transaction_date DATE,
  from_company_id UUID,
  to_company_id UUID,
  currency TEXT,
  amount NUMERIC,
  base_amount NUMERIC,
  reconciled BOOLEAN,
  description TEXT
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, ic_no, transaction_date, from_company_id, to_company_id,
         currency, amount, base_amount,
         (reconciled_at IS NOT NULL) AS reconciled,
         description
  FROM public.intercompany_transactions
  WHERE transaction_date BETWEEN _from AND _to
  ORDER BY transaction_date DESC;
$$;
