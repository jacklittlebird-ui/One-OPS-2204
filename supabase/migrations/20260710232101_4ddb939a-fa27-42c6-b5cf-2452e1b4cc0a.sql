
CREATE TABLE public.fx_revaluation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_no TEXT NOT NULL UNIQUE,
  as_of_date DATE NOT NULL DEFAULT CURRENT_DATE,
  base_currency TEXT NOT NULL DEFAULT 'EGP',
  mode TEXT NOT NULL DEFAULT 'preview',
  status TEXT NOT NULL DEFAULT 'completed',
  total_gain NUMERIC NOT NULL DEFAULT 0,
  total_loss NUMERIC NOT NULL DEFAULT 0,
  net_impact NUMERIC NOT NULL DEFAULT 0,
  documents_evaluated INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  run_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fx_revaluation_runs TO authenticated;
GRANT ALL ON public.fx_revaluation_runs TO service_role;
ALTER TABLE public.fx_revaluation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read fxr" ON public.fx_revaluation_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write fxr" ON public.fx_revaluation_runs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_fxr_updated BEFORE UPDATE ON public.fx_revaluation_runs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.fx_revaluation_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.fx_revaluation_runs(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_id UUID,
  document_no TEXT,
  counterparty TEXT,
  currency TEXT NOT NULL,
  original_amount NUMERIC NOT NULL DEFAULT 0,
  booked_rate NUMERIC NOT NULL DEFAULT 1,
  current_rate NUMERIC NOT NULL DEFAULT 1,
  booked_base NUMERIC NOT NULL DEFAULT 0,
  current_base NUMERIC NOT NULL DEFAULT 0,
  gain_loss NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fx_revaluation_lines TO authenticated;
GRANT ALL ON public.fx_revaluation_lines TO service_role;
ALTER TABLE public.fx_revaluation_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read fxrl" ON public.fx_revaluation_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write fxrl" ON public.fx_revaluation_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.fx_realized_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_no TEXT NOT NULL UNIQUE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source_type TEXT NOT NULL,
  source_id UUID,
  source_no TEXT,
  counterparty TEXT,
  currency TEXT NOT NULL,
  original_amount NUMERIC NOT NULL DEFAULT 0,
  booked_rate NUMERIC NOT NULL DEFAULT 1,
  settlement_rate NUMERIC NOT NULL DEFAULT 1,
  base_currency TEXT NOT NULL DEFAULT 'EGP',
  gain_loss NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fx_realized_entries TO authenticated;
GRANT ALL ON public.fx_realized_entries TO service_role;
ALTER TABLE public.fx_realized_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read fxre" ON public.fx_realized_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write fxre" ON public.fx_realized_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_fxre_updated BEFORE UPDATE ON public.fx_realized_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_fxrl_run ON public.fx_revaluation_lines(run_id);
CREATE INDEX idx_fxre_date ON public.fx_realized_entries(entry_date);
