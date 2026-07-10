
CREATE TABLE public.accruals_deferrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_no TEXT NOT NULL UNIQUE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('Accrued Expense','Accrued Revenue','Prepaid Expense','Deferred Revenue')),
  description TEXT NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  period_year INT NOT NULL,
  period_month INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  reverse_year INT NOT NULL,
  reverse_month INT NOT NULL CHECK (reverse_month BETWEEN 1 AND 12),
  debit_account_code TEXT,
  credit_account_code TEXT,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Posted','Reversed','Void')),
  journal_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  reversal_journal_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  posted_at TIMESTAMPTZ,
  reversed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.accruals_deferrals TO authenticated;
GRANT ALL ON public.accruals_deferrals TO service_role;

ALTER TABLE public.accruals_deferrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance can view accruals"
  ON public.accruals_deferrals FOR SELECT
  TO authenticated
  USING (public.has_finance_access(auth.uid()));

CREATE POLICY "Finance can insert accruals"
  ON public.accruals_deferrals FOR INSERT
  TO authenticated
  WITH CHECK (public.has_finance_access(auth.uid()));

CREATE POLICY "Finance can update accruals"
  ON public.accruals_deferrals FOR UPDATE
  TO authenticated
  USING (public.has_finance_access(auth.uid()))
  WITH CHECK (public.has_finance_access(auth.uid()));

CREATE POLICY "Finance can delete accruals"
  ON public.accruals_deferrals FOR DELETE
  TO authenticated
  USING (public.has_finance_access(auth.uid()));

CREATE TRIGGER update_accruals_deferrals_updated_at
  BEFORE UPDATE ON public.accruals_deferrals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_accruals_period ON public.accruals_deferrals(period_year, period_month);
CREATE INDEX idx_accruals_reverse ON public.accruals_deferrals(reverse_year, reverse_month);
CREATE INDEX idx_accruals_status ON public.accruals_deferrals(status);
