
-- Phase 2z: Cash Flow Forecasting
-- RPC: rolling 13-week (or N-week) cash forecast
-- Sources:
--  * Opening cash: bank_accounts.opening_balance + cash_accounts.opening_balance
--    plus posted receipts/payments up to today
--  * Inflows: open AR (invoices finalized/sent/overdue, unpaid) bucketed by due_date
--            + active recurring outbound invoice templates projected weekly/monthly
--  * Outflows: open AP (vendor_invoices not Paid) bucketed by due_date

CREATE OR REPLACE FUNCTION public.get_cash_flow_forecast(_weeks INTEGER DEFAULT 13, _start DATE DEFAULT NULL)
RETURNS TABLE (
  week_index INTEGER,
  week_start DATE,
  week_end DATE,
  opening_balance NUMERIC,
  ar_inflow NUMERIC,
  recurring_inflow NUMERIC,
  ap_outflow NUMERIC,
  net_change NUMERIC,
  closing_balance NUMERIC
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start DATE := COALESCE(_start, date_trunc('week', CURRENT_DATE)::DATE);
  v_weeks INTEGER := GREATEST(1, LEAST(52, COALESCE(_weeks, 13)));
  v_open NUMERIC := 0;
  v_run NUMERIC := 0;
  i INTEGER;
  w_start DATE;
  w_end DATE;
  v_ar NUMERIC;
  v_ap NUMERIC;
  v_rec NUMERIC;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Opening cash = sum of bank + cash opening balances + posted receipts - posted payments up to v_start-1
  SELECT COALESCE((SELECT SUM(opening_balance) FROM public.bank_accounts),0)
       + COALESCE((SELECT SUM(opening_balance) FROM public.cash_accounts),0)
       + COALESCE((SELECT SUM(amount) FROM public.receipts
                   WHERE LOWER(COALESCE(status,''))='posted' AND receipt_date < v_start),0)
       - COALESCE((SELECT SUM(amount) FROM public.payments
                   WHERE LOWER(COALESCE(status,''))='posted' AND payment_date < v_start),0)
  INTO v_open;

  v_run := v_open;

  FOR i IN 0..v_weeks-1 LOOP
    w_start := v_start + (i * 7);
    w_end   := w_start + 6;

    -- AR expected in the week: open invoices (not paid) with due_date in window
    SELECT COALESCE(SUM(total - COALESCE((
      SELECT SUM(r.amount) FROM public.receipts r
      WHERE r.invoice_id = inv.id AND LOWER(COALESCE(r.status,''))='posted'
    ),0)), 0)
    INTO v_ar
    FROM public.invoices inv
    WHERE COALESCE(inv.invoice_direction::text,'outbound') = 'outbound'
      AND LOWER(COALESCE(inv.status::text,'')) IN ('finalized','sent','overdue')
      AND inv.due_date BETWEEN w_start AND w_end;

    -- AP expected in the week: vendor_invoices not paid with due_date in window
    SELECT COALESCE(SUM(total), 0)
    INTO v_ap
    FROM public.vendor_invoices vi
    WHERE LOWER(COALESCE(vi.status,'')) NOT IN ('paid','cancelled','void')
      AND vi.due_date BETWEEN w_start AND w_end;

    -- Recurring inflow: active outbound templates projected in-window
    SELECT COALESCE(SUM(
      CASE
        WHEN LOWER(COALESCE(t.frequency,'')) = 'weekly' THEN t.amount
        WHEN LOWER(COALESCE(t.frequency,'')) = 'biweekly' THEN t.amount / 2.0
        WHEN LOWER(COALESCE(t.frequency,'')) = 'monthly' THEN t.amount / 4.33
        WHEN LOWER(COALESCE(t.frequency,'')) = 'quarterly' THEN t.amount / 13.0
        WHEN LOWER(COALESCE(t.frequency,'')) = 'yearly' THEN t.amount / 52.0
        ELSE 0
      END
    ), 0)
    INTO v_rec
    FROM public.recurring_invoice_templates t
    WHERE COALESCE(t.is_active, TRUE) = TRUE
      AND (t.start_date IS NULL OR t.start_date <= w_end)
      AND (t.end_date IS NULL OR t.end_date >= w_start);

    week_index := i + 1;
    week_start := w_start;
    week_end := w_end;
    opening_balance := v_run;
    ar_inflow := v_ar;
    recurring_inflow := v_rec;
    ap_outflow := v_ap;
    net_change := v_ar + v_rec - v_ap;
    v_run := v_run + net_change;
    closing_balance := v_run;
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_cash_flow_forecast(INTEGER, DATE) TO authenticated;
