
CREATE TABLE public.corporate_tax_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_year INTEGER NOT NULL,
  company_id UUID REFERENCES public.companies(id),
  accounting_profit NUMERIC(18,2) NOT NULL DEFAULT 0,
  non_deductible_expenses NUMERIC(18,2) NOT NULL DEFAULT 0,
  non_taxable_income NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_depreciation_adjustment NUMERIC(18,2) NOT NULL DEFAULT 0,
  other_adjustments NUMERIC(18,2) NOT NULL DEFAULT 0,
  taxable_income NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(6,4) NOT NULL DEFAULT 0.225,
  tax_liability NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_paid_installments NUMERIC(18,2) NOT NULL DEFAULT 0,
  withholding_credits NUMERIC(18,2) NOT NULL DEFAULT 0,
  net_tax_payable NUMERIC(18,2) NOT NULL DEFAULT 0,
  filing_date DATE,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.corporate_tax_returns TO authenticated;
GRANT ALL ON public.corporate_tax_returns TO service_role;
ALTER TABLE public.corporate_tax_returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Accountants manage CT returns" ON public.corporate_tax_returns
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant'));

CREATE TABLE public.corporate_tax_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID REFERENCES public.corporate_tax_returns(id) ON DELETE CASCADE,
  adjustment_type TEXT NOT NULL DEFAULT 'add_back',
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.corporate_tax_adjustments TO authenticated;
GRANT ALL ON public.corporate_tax_adjustments TO service_role;
ALTER TABLE public.corporate_tax_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Accountants manage CT adjustments" ON public.corporate_tax_adjustments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant'));

CREATE TRIGGER trg_ct_returns_upd BEFORE UPDATE ON public.corporate_tax_returns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.recompute_corporate_tax(p_return_id UUID)
RETURNS public.corporate_tax_returns
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.corporate_tax_returns; v_add NUMERIC(18,2); v_ded NUMERIC(18,2);
BEGIN
  SELECT * INTO r FROM public.corporate_tax_returns WHERE id = p_return_id;
  SELECT COALESCE(SUM(CASE WHEN adjustment_type='add_back' THEN amount ELSE 0 END),0),
         COALESCE(SUM(CASE WHEN adjustment_type='deduct' THEN amount ELSE 0 END),0)
    INTO v_add, v_ded FROM public.corporate_tax_adjustments WHERE return_id = p_return_id;
  UPDATE public.corporate_tax_returns SET
    non_deductible_expenses = v_add,
    non_taxable_income = v_ded,
    taxable_income = r.accounting_profit + v_add - v_ded + r.tax_depreciation_adjustment + r.other_adjustments,
    tax_liability = GREATEST(0, (r.accounting_profit + v_add - v_ded + r.tax_depreciation_adjustment + r.other_adjustments)) * r.tax_rate,
    net_tax_payable = GREATEST(0, (r.accounting_profit + v_add - v_ded + r.tax_depreciation_adjustment + r.other_adjustments)) * r.tax_rate - r.tax_paid_installments - r.withholding_credits
  WHERE id = p_return_id RETURNING * INTO r;
  RETURN r;
END $$;
