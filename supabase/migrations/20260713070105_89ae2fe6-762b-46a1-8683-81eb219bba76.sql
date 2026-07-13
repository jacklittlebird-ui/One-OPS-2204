
CREATE TABLE public.dividend_declarations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id),
  declaration_date DATE NOT NULL,
  record_date DATE,
  payment_date DATE,
  fiscal_year INTEGER NOT NULL,
  dividend_type TEXT NOT NULL DEFAULT 'cash' CHECK (dividend_type IN ('cash','stock','interim','final','special')),
  total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EGP',
  per_share_amount NUMERIC(18,6),
  wht_rate NUMERIC(6,4) DEFAULT 0,
  wht_amount NUMERIC(18,2) DEFAULT 0,
  net_amount NUMERIC(18,2) DEFAULT 0,
  board_resolution_ref TEXT,
  status TEXT NOT NULL DEFAULT 'declared' CHECK (status IN ('declared','approved','paid','cancelled')),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.dividend_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  declaration_id UUID NOT NULL REFERENCES public.dividend_declarations(id) ON DELETE CASCADE,
  shareholder_name TEXT NOT NULL,
  shareholding_pct NUMERIC(7,4),
  gross_amount NUMERIC(18,2) NOT NULL,
  wht_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(18,2) NOT NULL,
  payment_date DATE,
  payment_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','on_hold')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dividend_declarations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dividend_payments TO authenticated;
GRANT ALL ON public.dividend_declarations TO service_role;
GRANT ALL ON public.dividend_payments TO service_role;

ALTER TABLE public.dividend_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dividend_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Accounting can manage dividend declarations" ON public.dividend_declarations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant'));

CREATE POLICY "Accounting can manage dividend payments" ON public.dividend_payments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant'));

CREATE TRIGGER update_dividend_declarations_updated_at
  BEFORE UPDATE ON public.dividend_declarations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.recompute_dividend_totals(p_declaration_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gross NUMERIC(18,2);
  v_wht NUMERIC(18,2);
BEGIN
  SELECT COALESCE(SUM(gross_amount),0), COALESCE(SUM(wht_amount),0)
    INTO v_gross, v_wht
  FROM public.dividend_payments WHERE declaration_id = p_declaration_id;

  UPDATE public.dividend_declarations
     SET total_amount = v_gross,
         wht_amount = v_wht,
         net_amount = v_gross - v_wht,
         updated_at = now()
   WHERE id = p_declaration_id;
END;
$$;
