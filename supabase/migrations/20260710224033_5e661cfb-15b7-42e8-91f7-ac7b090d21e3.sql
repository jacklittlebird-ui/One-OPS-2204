
ALTER TABLE public.budget_entries
  ADD COLUMN IF NOT EXISTS alert_threshold_pct NUMERIC DEFAULT 100;

CREATE TABLE public.budget_variance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  cost_center TEXT,
  account_code TEXT NOT NULL,
  account_name TEXT,
  budget_amount NUMERIC NOT NULL DEFAULT 0,
  actual_amount NUMERIC NOT NULL DEFAULT 0,
  variance_amount NUMERIC NOT NULL DEFAULT 0,
  variance_pct NUMERIC NOT NULL DEFAULT 0,
  threshold_pct NUMERIC NOT NULL DEFAULT 100,
  severity TEXT NOT NULL DEFAULT 'warning',
  status TEXT NOT NULL DEFAULT 'Open',
  acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_variance_alerts TO authenticated;
GRANT ALL ON public.budget_variance_alerts TO service_role;
ALTER TABLE public.budget_variance_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "finance can view variance alerts" ON public.budget_variance_alerts FOR SELECT TO authenticated USING (public.has_finance_access(auth.uid()));
CREATE POLICY "finance can insert variance alerts" ON public.budget_variance_alerts FOR INSERT TO authenticated WITH CHECK (public.has_finance_access(auth.uid()));
CREATE POLICY "finance can update variance alerts" ON public.budget_variance_alerts FOR UPDATE TO authenticated USING (public.has_finance_access(auth.uid())) WITH CHECK (public.has_finance_access(auth.uid()));
CREATE POLICY "finance can delete variance alerts" ON public.budget_variance_alerts FOR DELETE TO authenticated USING (public.has_finance_access(auth.uid()));
CREATE TRIGGER trg_budget_variance_alerts_updated BEFORE UPDATE ON public.budget_variance_alerts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_budget_variance_period ON public.budget_variance_alerts(fiscal_year, period_month);
CREATE INDEX idx_budget_variance_status ON public.budget_variance_alerts(status);
