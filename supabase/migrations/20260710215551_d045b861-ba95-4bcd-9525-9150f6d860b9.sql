
CREATE TABLE public.petty_cash_funds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fund_code TEXT NOT NULL UNIQUE,
  custodian_name TEXT NOT NULL,
  station TEXT,
  company_id UUID REFERENCES public.companies(id),
  currency TEXT NOT NULL DEFAULT 'EGP',
  float_limit NUMERIC NOT NULL DEFAULT 0,
  current_balance NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.petty_cash_funds TO authenticated;
GRANT ALL ON public.petty_cash_funds TO service_role;
ALTER TABLE public.petty_cash_funds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance users manage petty cash funds"
ON public.petty_cash_funds FOR ALL TO authenticated
USING (public.has_finance_access(auth.uid()))
WITH CHECK (public.has_finance_access(auth.uid()));

CREATE TRIGGER trg_petty_cash_funds_updated
BEFORE UPDATE ON public.petty_cash_funds
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.petty_cash_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fund_id UUID NOT NULL REFERENCES public.petty_cash_funds(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL DEFAULT 'Expense',
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EGP',
  receipt_ref TEXT,
  gl_account_id UUID REFERENCES public.chart_of_accounts(id),
  status TEXT NOT NULL DEFAULT 'Draft',
  submitted_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.petty_cash_expenses TO authenticated;
GRANT ALL ON public.petty_cash_expenses TO service_role;
ALTER TABLE public.petty_cash_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance users manage petty cash expenses"
ON public.petty_cash_expenses FOR ALL TO authenticated
USING (public.has_finance_access(auth.uid()))
WITH CHECK (public.has_finance_access(auth.uid()));

CREATE TRIGGER trg_petty_cash_expenses_updated
BEFORE UPDATE ON public.petty_cash_expenses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_petty_cash_expenses_fund ON public.petty_cash_expenses(fund_id);
CREATE INDEX idx_petty_cash_expenses_date ON public.petty_cash_expenses(expense_date DESC);
