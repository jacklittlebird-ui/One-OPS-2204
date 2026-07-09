
CREATE TABLE public.budget_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fiscal_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  account_code TEXT NOT NULL,
  account_name TEXT,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  station_id UUID REFERENCES public.finance_stations(id) ON DELETE SET NULL,
  cost_center TEXT,
  budget_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (fiscal_year, period_month, account_code, company_id, station_id, cost_center)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_entries TO authenticated;
GRANT ALL ON public.budget_entries TO service_role;

ALTER TABLE public.budget_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance can view budgets"
  ON public.budget_entries FOR SELECT
  TO authenticated
  USING (public.has_finance_access(auth.uid()));

CREATE POLICY "Finance can insert budgets"
  ON public.budget_entries FOR INSERT
  TO authenticated
  WITH CHECK (public.has_finance_access(auth.uid()));

CREATE POLICY "Finance can update budgets"
  ON public.budget_entries FOR UPDATE
  TO authenticated
  USING (public.has_finance_access(auth.uid()))
  WITH CHECK (public.has_finance_access(auth.uid()));

CREATE POLICY "Finance can delete budgets"
  ON public.budget_entries FOR DELETE
  TO authenticated
  USING (public.has_finance_access(auth.uid()));

CREATE TRIGGER update_budget_entries_updated_at
  BEFORE UPDATE ON public.budget_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_budget_entries_period ON public.budget_entries (fiscal_year, period_month);
CREATE INDEX idx_budget_entries_account ON public.budget_entries (account_code);
CREATE INDEX idx_budget_entries_scope ON public.budget_entries (company_id, station_id);
