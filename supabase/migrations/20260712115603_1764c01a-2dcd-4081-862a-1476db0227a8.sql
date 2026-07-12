
CREATE TABLE public.cash_flow_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_no TEXT NOT NULL UNIQUE,
  as_of_date DATE NOT NULL DEFAULT CURRENT_DATE,
  horizon_weeks INTEGER NOT NULL DEFAULT 13,
  base_currency TEXT NOT NULL DEFAULT 'EGP',
  opening_cash NUMERIC(18,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','final','archived')),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_flow_forecasts TO authenticated;
GRANT ALL ON public.cash_flow_forecasts TO service_role;

ALTER TABLE public.cash_flow_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users manage cash flow forecasts"
  ON public.cash_flow_forecasts FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE TABLE public.cash_flow_forecast_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_id UUID NOT NULL REFERENCES public.cash_flow_forecasts(id) ON DELETE CASCADE,
  week_no INTEGER NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  ar_inflow NUMERIC(18,2) NOT NULL DEFAULT 0,
  other_inflow NUMERIC(18,2) NOT NULL DEFAULT 0,
  ap_outflow NUMERIC(18,2) NOT NULL DEFAULT 0,
  payroll_outflow NUMERIC(18,2) NOT NULL DEFAULT 0,
  loan_outflow NUMERIC(18,2) NOT NULL DEFAULT 0,
  other_outflow NUMERIC(18,2) NOT NULL DEFAULT 0,
  net_movement NUMERIC(18,2) NOT NULL DEFAULT 0,
  closing_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(forecast_id, week_no)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_flow_forecast_lines TO authenticated;
GRANT ALL ON public.cash_flow_forecast_lines TO service_role;

ALTER TABLE public.cash_flow_forecast_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users manage forecast lines"
  ON public.cash_flow_forecast_lines FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_cash_flow_forecasts_updated_at
  BEFORE UPDATE ON public.cash_flow_forecasts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.generate_cash_flow_forecast(p_forecast_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fc RECORD;
  v_running NUMERIC;
  v_week_start DATE;
  v_week_end DATE;
  v_ar NUMERIC;
  v_ap NUMERIC;
  v_net NUMERIC;
  i INTEGER;
BEGIN
  SELECT * INTO v_fc FROM public.cash_flow_forecasts WHERE id = p_forecast_id;
  IF v_fc IS NULL THEN RAISE EXCEPTION 'Forecast not found'; END IF;

  DELETE FROM public.cash_flow_forecast_lines WHERE forecast_id = p_forecast_id;

  v_running := v_fc.opening_cash;

  FOR i IN 1..v_fc.horizon_weeks LOOP
    v_week_start := v_fc.as_of_date + ((i-1) * 7)::INTEGER;
    v_week_end := v_week_start + 6;

    -- AR expected inflow: unpaid invoices due within this week
    SELECT COALESCE(SUM(
      COALESCE(total_amount, 0) - COALESCE(paid_amount, 0)
    ), 0) INTO v_ar
    FROM public.invoices
    WHERE COALESCE(status,'') NOT IN ('paid','cancelled','void')
      AND due_date BETWEEN v_week_start AND v_week_end;

    -- AP expected outflow: unpaid vendor invoices due within this week
    SELECT COALESCE(SUM(
      COALESCE(total_amount, 0) - COALESCE(paid_amount, 0)
    ), 0) INTO v_ap
    FROM public.vendor_invoices
    WHERE COALESCE(status,'') NOT IN ('paid','cancelled','void')
      AND due_date BETWEEN v_week_start AND v_week_end;

    v_net := v_ar - v_ap;
    v_running := v_running + v_net;

    INSERT INTO public.cash_flow_forecast_lines (
      forecast_id, week_no, week_start, week_end,
      ar_inflow, ap_outflow, net_movement, closing_balance
    ) VALUES (
      p_forecast_id, i, v_week_start, v_week_end,
      ROUND(v_ar,2), ROUND(v_ap,2), ROUND(v_net,2), ROUND(v_running,2)
    );
  END LOOP;

  RETURN v_fc.horizon_weeks;
END;
$$;
