
CREATE TABLE public.loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_number TEXT NOT NULL UNIQUE,
  lender_name TEXT NOT NULL,
  company_id UUID REFERENCES public.companies(id),
  principal_amount NUMERIC(18,2) NOT NULL CHECK (principal_amount > 0),
  currency TEXT NOT NULL DEFAULT 'EGP',
  annual_interest_rate NUMERIC(8,5) NOT NULL CHECK (annual_interest_rate >= 0),
  term_months INTEGER NOT NULL CHECK (term_months > 0),
  payment_frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (payment_frequency IN ('monthly','quarterly','semi_annual','annual')),
  start_date DATE NOT NULL,
  first_payment_date DATE NOT NULL,
  outstanding_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed','defaulted')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loans TO authenticated;
GRANT ALL ON public.loans TO service_role;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance staff manage loans" ON public.loans FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant') OR public.has_role(auth.uid(), 'general_accounts'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant') OR public.has_role(auth.uid(), 'general_accounts'));

CREATE TABLE public.loan_payment_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  period_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  opening_balance NUMERIC(18,2) NOT NULL,
  payment_amount NUMERIC(18,2) NOT NULL,
  interest_amount NUMERIC(18,2) NOT NULL,
  principal_amount NUMERIC(18,2) NOT NULL,
  closing_balance NUMERIC(18,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','posted','paid')),
  posted_at TIMESTAMPTZ,
  posted_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(loan_id, period_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loan_payment_schedule TO authenticated;
GRANT ALL ON public.loan_payment_schedule TO service_role;
ALTER TABLE public.loan_payment_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance staff manage loan schedule" ON public.loan_payment_schedule FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant') OR public.has_role(auth.uid(), 'general_accounts'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant') OR public.has_role(auth.uid(), 'general_accounts'));

CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON public.loans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_loan_schedule_updated_at BEFORE UPDATE ON public.loan_payment_schedule
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.generate_loan_schedule(p_loan_id UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_loan RECORD; v_periods_per_year INTEGER; v_total_periods INTEGER;
  v_period_rate NUMERIC(18,10); v_payment NUMERIC(18,2); v_balance NUMERIC(18,2);
  v_interest NUMERIC(18,2); v_principal NUMERIC(18,2); v_due DATE;
  v_month_step INTEGER; i INTEGER;
BEGIN
  SELECT * INTO v_loan FROM public.loans WHERE id = p_loan_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Loan not found'; END IF;
  DELETE FROM public.loan_payment_schedule WHERE loan_id = p_loan_id;
  v_periods_per_year := CASE v_loan.payment_frequency
    WHEN 'monthly' THEN 12 WHEN 'quarterly' THEN 4
    WHEN 'semi_annual' THEN 2 ELSE 1 END;
  v_month_step := 12 / v_periods_per_year;
  v_total_periods := CEIL(v_loan.term_months::NUMERIC / v_month_step);
  v_period_rate := v_loan.annual_interest_rate / v_periods_per_year;
  IF v_period_rate = 0 THEN
    v_payment := ROUND(v_loan.principal_amount / v_total_periods, 2);
  ELSE
    v_payment := ROUND(v_loan.principal_amount * v_period_rate /
      (1 - POWER(1 + v_period_rate, -v_total_periods)), 2);
  END IF;
  v_balance := v_loan.principal_amount;
  v_due := v_loan.first_payment_date;
  FOR i IN 1..v_total_periods LOOP
    v_interest := ROUND(v_balance * v_period_rate, 2);
    v_principal := LEAST(v_payment - v_interest, v_balance);
    IF i = v_total_periods THEN
      v_principal := v_balance;
      v_payment := v_principal + v_interest;
    END IF;
    INSERT INTO public.loan_payment_schedule(
      loan_id, period_number, due_date, opening_balance, payment_amount,
      interest_amount, principal_amount, closing_balance)
    VALUES (p_loan_id, i, v_due, v_balance, v_payment, v_interest, v_principal, v_balance - v_principal);
    v_balance := v_balance - v_principal;
    v_due := v_due + (v_month_step || ' months')::INTERVAL;
  END LOOP;
  UPDATE public.loans SET outstanding_balance = v_loan.principal_amount WHERE id = p_loan_id;
  RETURN v_total_periods;
END; $$;

CREATE OR REPLACE FUNCTION public.post_loan_period(p_schedule_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row RECORD;
BEGIN
  SELECT s.*, l.loan_number INTO v_row
  FROM public.loan_payment_schedule s
  JOIN public.loans l ON l.id = s.loan_id WHERE s.id = p_schedule_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Schedule row not found'; END IF;
  IF v_row.status <> 'scheduled' THEN RAISE EXCEPTION 'Already posted'; END IF;
  UPDATE public.loan_payment_schedule
    SET status = 'posted', posted_at = now(), posted_by = auth.uid()
    WHERE id = p_schedule_id;
  UPDATE public.loans
    SET outstanding_balance = v_row.closing_balance,
        status = CASE WHEN v_row.closing_balance <= 0 THEN 'closed' ELSE status END
    WHERE id = v_row.loan_id;
  RETURN p_schedule_id;
END; $$;
