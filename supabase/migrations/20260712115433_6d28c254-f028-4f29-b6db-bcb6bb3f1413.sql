
CREATE TABLE public.leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_no TEXT NOT NULL UNIQUE,
  company_id UUID,
  lessor_name TEXT NOT NULL,
  asset_description TEXT NOT NULL,
  classification TEXT NOT NULL DEFAULT 'operating' CHECK (classification IN ('finance','operating')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  term_months INTEGER NOT NULL,
  payment_amount NUMERIC(18,2) NOT NULL,
  payment_frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (payment_frequency IN ('monthly','quarterly','annually')),
  discount_rate_pct NUMERIC(8,4) NOT NULL DEFAULT 5.0,
  currency TEXT NOT NULL DEFAULT 'EGP',
  initial_liability NUMERIC(18,2) NOT NULL DEFAULT 0,
  rou_asset_value NUMERIC(18,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','terminated','expired')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leases TO authenticated;
GRANT ALL ON public.leases TO service_role;

ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users manage leases"
  ON public.leases FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE TABLE public.lease_payment_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  period_no INTEGER NOT NULL,
  period_date DATE NOT NULL,
  opening_liability NUMERIC(18,2) NOT NULL DEFAULT 0,
  payment_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  interest_expense NUMERIC(18,2) NOT NULL DEFAULT 0,
  principal NUMERIC(18,2) NOT NULL DEFAULT 0,
  closing_liability NUMERIC(18,2) NOT NULL DEFAULT 0,
  rou_depreciation NUMERIC(18,2) NOT NULL DEFAULT 0,
  posted BOOLEAN NOT NULL DEFAULT false,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lease_id, period_no)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lease_payment_schedule TO authenticated;
GRANT ALL ON public.lease_payment_schedule TO service_role;

ALTER TABLE public.lease_payment_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users manage lease schedule"
  ON public.lease_payment_schedule FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_leases_updated_at
  BEFORE UPDATE ON public.leases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.generate_lease_schedule(p_lease_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lease RECORD;
  v_periodic_rate NUMERIC;
  v_periods INTEGER;
  v_pv NUMERIC := 0;
  v_liability NUMERIC;
  v_interest NUMERIC;
  v_principal NUMERIC;
  v_rou_dep NUMERIC;
  v_period_date DATE;
  v_step_months INTEGER;
  i INTEGER;
BEGIN
  SELECT * INTO v_lease FROM public.leases WHERE id = p_lease_id;
  IF v_lease IS NULL THEN RAISE EXCEPTION 'Lease not found'; END IF;

  v_step_months := CASE v_lease.payment_frequency
    WHEN 'monthly' THEN 1 WHEN 'quarterly' THEN 3 ELSE 12 END;
  v_periods := v_lease.term_months / v_step_months;
  v_periodic_rate := (v_lease.discount_rate_pct / 100.0) * v_step_months / 12.0;

  -- PV of annuity
  IF v_periodic_rate > 0 THEN
    v_pv := v_lease.payment_amount * (1 - power(1 + v_periodic_rate, -v_periods)) / v_periodic_rate;
  ELSE
    v_pv := v_lease.payment_amount * v_periods;
  END IF;

  DELETE FROM public.lease_payment_schedule WHERE lease_id = p_lease_id;

  UPDATE public.leases
    SET initial_liability = ROUND(v_pv, 2),
        rou_asset_value = ROUND(v_pv, 2)
    WHERE id = p_lease_id;

  v_liability := v_pv;
  v_rou_dep := ROUND(v_pv / v_periods, 2);

  FOR i IN 1..v_periods LOOP
    v_period_date := v_lease.start_date + (i * v_step_months || ' months')::INTERVAL;
    v_interest := ROUND(v_liability * v_periodic_rate, 2);
    v_principal := v_lease.payment_amount - v_interest;
    INSERT INTO public.lease_payment_schedule (
      lease_id, period_no, period_date, opening_liability,
      payment_amount, interest_expense, principal, closing_liability, rou_depreciation
    ) VALUES (
      p_lease_id, i, v_period_date, ROUND(v_liability,2),
      v_lease.payment_amount, v_interest, ROUND(v_principal,2),
      ROUND(v_liability - v_principal, 2), v_rou_dep
    );
    v_liability := v_liability - v_principal;
  END LOOP;

  RETURN v_periods;
END;
$$;

CREATE OR REPLACE FUNCTION public.post_lease_period(p_schedule_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
BEGIN
  SELECT * INTO v_row FROM public.lease_payment_schedule WHERE id = p_schedule_id;
  IF v_row IS NULL THEN RAISE EXCEPTION 'Schedule row not found'; END IF;
  IF v_row.posted THEN RAISE EXCEPTION 'Already posted'; END IF;

  UPDATE public.lease_payment_schedule
    SET posted = true, posted_at = now()
    WHERE id = p_schedule_id;

  RETURN p_schedule_id;
END;
$$;
