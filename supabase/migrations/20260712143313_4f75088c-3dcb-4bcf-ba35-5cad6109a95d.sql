
CREATE TABLE public.deferred_tax_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID REFERENCES public.accounting_periods(id),
  run_date DATE NOT NULL DEFAULT CURRENT_DATE,
  opening_dta NUMERIC(18,2) NOT NULL DEFAULT 0,
  opening_dtl NUMERIC(18,2) NOT NULL DEFAULT 0,
  closing_dta NUMERIC(18,2) NOT NULL DEFAULT 0,
  closing_dtl NUMERIC(18,2) NOT NULL DEFAULT 0,
  movement_pnl NUMERIC(18,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  posted_journal_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deferred_tax_runs TO authenticated;
GRANT ALL ON public.deferred_tax_runs TO service_role;
ALTER TABLE public.deferred_tax_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Accountants manage deferred tax runs" ON public.deferred_tax_runs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant'));

CREATE TABLE public.deferred_tax_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES public.deferred_tax_runs(id) ON DELETE CASCADE,
  period_id UUID REFERENCES public.accounting_periods(id),
  item_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'asset',
  accounting_base NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_base NUMERIC(18,2) NOT NULL DEFAULT 0,
  temporary_difference NUMERIC(18,2) GENERATED ALWAYS AS (accounting_base - tax_base) STORED,
  tax_rate NUMERIC(6,4) NOT NULL DEFAULT 0.225,
  deferred_tax_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  dt_type TEXT NOT NULL DEFAULT 'DTL',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deferred_tax_items TO authenticated;
GRANT ALL ON public.deferred_tax_items TO service_role;
ALTER TABLE public.deferred_tax_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Accountants manage deferred tax items" ON public.deferred_tax_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant'));

CREATE TRIGGER trg_deferred_tax_runs_upd BEFORE UPDATE ON public.deferred_tax_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_deferred_tax_items_upd BEFORE UPDATE ON public.deferred_tax_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.compute_deferred_tax_run(p_run_id UUID)
RETURNS public.deferred_tax_runs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.deferred_tax_runs; v_dta NUMERIC(18,2); v_dtl NUMERIC(18,2);
BEGIN
  SELECT * INTO r FROM public.deferred_tax_runs WHERE id = p_run_id;
  SELECT COALESCE(SUM(CASE WHEN dt_type='DTA' THEN deferred_tax_amount ELSE 0 END),0),
         COALESCE(SUM(CASE WHEN dt_type='DTL' THEN deferred_tax_amount ELSE 0 END),0)
    INTO v_dta, v_dtl FROM public.deferred_tax_items WHERE run_id = p_run_id;
  UPDATE public.deferred_tax_runs SET
    closing_dta = v_dta,
    closing_dtl = v_dtl,
    movement_pnl = (v_dtl - r.opening_dtl) - (v_dta - r.opening_dta)
  WHERE id = p_run_id RETURNING * INTO r;
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.post_deferred_tax_run(p_run_id UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.deferred_tax_runs;
BEGIN
  r := public.compute_deferred_tax_run(p_run_id);
  UPDATE public.deferred_tax_runs SET status='posted' WHERE id = p_run_id;
  RETURN p_run_id;
END $$;
