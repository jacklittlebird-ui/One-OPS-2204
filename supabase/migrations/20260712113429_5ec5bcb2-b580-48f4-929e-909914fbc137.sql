
-- Commission plans
CREATE TABLE public.commission_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  name TEXT NOT NULL,
  basis TEXT NOT NULL DEFAULT 'invoice', -- invoice | payment
  rate_percent NUMERIC(6,3) NOT NULL DEFAULT 0,
  salesperson_id UUID,
  currency TEXT NOT NULL DEFAULT 'EGP',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  effective_from DATE,
  effective_to DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commission_plans TO authenticated;
GRANT ALL ON public.commission_plans TO service_role;
ALTER TABLE public.commission_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage commission_plans" ON public.commission_plans FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Commission accruals
CREATE TABLE public.commission_accruals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES public.commission_plans(id) ON DELETE SET NULL,
  salesperson_id UUID,
  invoice_id UUID,
  payment_id UUID,
  basis_amount NUMERIC(18,4) NOT NULL DEFAULT 0,
  rate_percent NUMERIC(6,3) NOT NULL DEFAULT 0,
  commission_amount NUMERIC(18,4) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EGP',
  accrual_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'accrued', -- accrued | paid | cancelled
  payout_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commission_accruals TO authenticated;
GRANT ALL ON public.commission_accruals TO service_role;
ALTER TABLE public.commission_accruals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage commission_accruals" ON public.commission_accruals FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Commission payouts
CREATE TABLE public.commission_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salesperson_id UUID,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EGP',
  total_amount NUMERIC(18,4) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft', -- draft | approved | paid
  paid_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commission_payouts TO authenticated;
GRANT ALL ON public.commission_payouts TO service_role;
ALTER TABLE public.commission_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage commission_payouts" ON public.commission_payouts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Timestamps
CREATE TRIGGER trg_commission_plans_updated BEFORE UPDATE ON public.commission_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_commission_accruals_updated BEFORE UPDATE ON public.commission_accruals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_commission_payouts_updated BEFORE UPDATE ON public.commission_payouts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Accrue commissions for an invoice
CREATE OR REPLACE FUNCTION public.accrue_commissions_for_invoice(_invoice_id UUID, _salesperson_id UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; inv RECORD; inserted_count INT := 0;
BEGIN
  SELECT id, total_amount, currency, invoice_date INTO inv FROM public.invoices WHERE id = _invoice_id;
  IF inv.id IS NULL THEN RETURN 0; END IF;
  FOR r IN SELECT * FROM public.commission_plans
    WHERE active = TRUE AND basis = 'invoice'
      AND (salesperson_id IS NULL OR salesperson_id = _salesperson_id)
      AND (effective_from IS NULL OR effective_from <= inv.invoice_date)
      AND (effective_to IS NULL OR effective_to >= inv.invoice_date)
  LOOP
    INSERT INTO public.commission_accruals(plan_id, salesperson_id, invoice_id, basis_amount, rate_percent, commission_amount, currency, accrual_date)
    VALUES (r.id, _salesperson_id, inv.id, COALESCE(inv.total_amount,0), r.rate_percent,
            ROUND(COALESCE(inv.total_amount,0) * r.rate_percent / 100.0, 4), inv.currency, inv.invoice_date);
    inserted_count := inserted_count + 1;
  END LOOP;
  RETURN inserted_count;
END; $$;

-- Create payout from accrued rows
CREATE OR REPLACE FUNCTION public.create_commission_payout(_salesperson_id UUID, _period_start DATE, _period_end DATE, _currency TEXT DEFAULT 'EGP')
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE payout_id UUID; total NUMERIC(18,4);
BEGIN
  INSERT INTO public.commission_payouts(salesperson_id, period_start, period_end, currency, status)
  VALUES (_salesperson_id, _period_start, _period_end, _currency, 'draft')
  RETURNING id INTO payout_id;

  UPDATE public.commission_accruals
     SET payout_id = payout_id
   WHERE salesperson_id = _salesperson_id
     AND status = 'accrued'
     AND currency = _currency
     AND accrual_date BETWEEN _period_start AND _period_end
     AND payout_id IS NULL;

  SELECT COALESCE(SUM(commission_amount),0) INTO total FROM public.commission_accruals WHERE payout_id = payout_id;
  UPDATE public.commission_payouts SET total_amount = total WHERE id = payout_id;
  RETURN payout_id;
END; $$;

-- Mark payout paid
CREATE OR REPLACE FUNCTION public.mark_commission_payout_paid(_payout_id UUID, _paid_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.commission_payouts SET status = 'paid', paid_date = _paid_date WHERE id = _payout_id;
  UPDATE public.commission_accruals SET status = 'paid' WHERE payout_id = _payout_id;
END; $$;
