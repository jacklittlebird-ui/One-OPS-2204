ALTER TYPE public.finance_currency ADD VALUE IF NOT EXISTS 'CHF';

CREATE OR REPLACE FUNCTION public.treasury_daily_rate(_currency text, _date date)
RETURNS numeric
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT CASE WHEN _currency = 'EGP' THEN 1 ELSE (
    SELECT CASE WHEN r.base_currency::text = _currency THEN r.mid_rate
                WHEN r.mid_rate > 0 THEN 1 / r.mid_rate END
    FROM public.exchange_rates r
    WHERE r.rate_date <= _date
      AND ((r.base_currency::text = _currency AND r.quote_currency::text = 'EGP')
        OR (r.base_currency::text = 'EGP' AND r.quote_currency::text = _currency))
    ORDER BY r.rate_date DESC, r.created_at DESC
    LIMIT 1
  ) END;
$$;

INSERT INTO public.chart_of_accounts (code, name, name_ar, account_type, level, is_group, currency, description)
VALUES
  ('4900', 'FX Revaluation Gain', 'أرباح فروق تقييم عملة', 'Revenue', 2, false, 'EGP', 'Daily treasury FX revaluation gains (Treasury Spec v4)'),
  ('4910', 'FX Revaluation Loss', 'خسائر فروق تقييم عملة', 'Expense', 2, false, 'EGP', 'Daily treasury FX revaluation losses (Treasury Spec v4)')
ON CONFLICT (code) DO NOTHING;

CREATE OR REPLACE FUNCTION public.run_treasury_daily_revaluation(p_date date DEFAULT CURRENT_DATE)
RETURNS TABLE (rows_logged integer, total_difference numeric, journal_entry_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_je_id uuid;
  v_entry_no text;
  v_gain_acc uuid;
  v_loss_acc uuid;
  v_cash_acc uuid;
  v_total numeric := 0;
  v_rows integer := 0;
  v_sort integer := 0;
  r record;
BEGIN
  IF NOT public.has_finance_access(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorised to run treasury revaluation';
  END IF;

  -- idempotent per day
  IF EXISTS (SELECT 1 FROM public.treasury_fx_daily_log WHERE reval_date = p_date) THEN
    RETURN QUERY
      SELECT count(*)::int, COALESCE(sum(l.fx_difference), 0), max(l.journal_entry_id)
      FROM public.treasury_fx_daily_log l WHERE l.reval_date = p_date;
    RETURN;
  END IF;

  SELECT id INTO v_gain_acc FROM public.chart_of_accounts WHERE code = '4900';
  SELECT id INTO v_loss_acc FROM public.chart_of_accounts WHERE code = '4910';
  SELECT id INTO v_cash_acc FROM public.chart_of_accounts WHERE code = '12010000';

  CREATE TEMP TABLE _reval ON COMMIT DROP AS
  WITH bal AS (
    SELECT v.company_id, v.station_id, v.cash_account_id, v.bank_account_id,
           v.currency::text AS currency,
           SUM(CASE WHEN v.voucher_type = 'receipt' THEN v.amount
                    WHEN v.voucher_type = 'payment' THEN -v.amount ELSE 0 END) AS fx_balance
    FROM public.treasury_vouchers v
    WHERE v.status IN ('posted','settled')
      AND v.currency::text <> 'EGP'
      AND v.voucher_date <= p_date
    GROUP BY 1,2,3,4,5
  )
  SELECT b.*,
         public.treasury_daily_rate(b.currency, p_date - 1) AS rate_prev,
         public.treasury_daily_rate(b.currency, p_date)     AS rate_today
  FROM bal b
  WHERE b.fx_balance <> 0;

  DELETE FROM _reval
  WHERE rate_prev IS NULL OR rate_today IS NULL
     OR round(fx_balance * rate_today, 2) = round(fx_balance * rate_prev, 2);

  SELECT count(*), COALESCE(SUM(round(fx_balance * rate_today, 2) - round(fx_balance * rate_prev, 2)), 0)
    INTO v_rows, v_total FROM _reval;

  IF v_rows = 0 THEN
    RETURN QUERY SELECT 0, 0::numeric, NULL::uuid;
    RETURN;
  END IF;

  v_entry_no := 'FXREV-' || to_char(p_date, 'YYYYMMDD');
  INSERT INTO public.journal_entries
    (entry_no, entry_date, description, reference, reference_type, status, posted_at,
     total_debit, total_credit, created_by, base_currency)
  VALUES
    (v_entry_no, p_date, 'Treasury FX daily revaluation ' || p_date, v_entry_no,
     'treasury_fx_revaluation', 'Posted', now(),
     abs(v_total), abs(v_total), COALESCE(auth.uid()::text, 'system'), 'EGP')
  RETURNING id INTO v_je_id;

  FOR r IN SELECT * FROM _reval LOOP
    v_sort := v_sort + 1;
    -- cash/bank side (EGP equivalent adjustment only)
    INSERT INTO public.journal_entry_lines
      (entry_id, account_id, debit, credit, description, sort_order,
       company_id, station_id, transaction_currency, transaction_amount,
       exchange_rate, exchange_rate_date, base_currency, base_amount)
    VALUES
      (v_je_id, v_cash_acc,
       GREATEST(round(r.fx_balance * r.rate_today, 2) - round(r.fx_balance * r.rate_prev, 2), 0),
       GREATEST(round(r.fx_balance * r.rate_prev, 2) - round(r.fx_balance * r.rate_today, 2), 0),
       'FX revaluation ' || r.currency || ' balance ' || r.fx_balance, v_sort,
       r.company_id, r.station_id, r.currency::finance_currency, r.fx_balance,
       r.rate_today, p_date, 'EGP',
       round(r.fx_balance * r.rate_today, 2) - round(r.fx_balance * r.rate_prev, 2));

    v_sort := v_sort + 1;
    -- P&L side
    INSERT INTO public.journal_entry_lines
      (entry_id, account_id, debit, credit, description, sort_order,
       company_id, station_id, exchange_rate, exchange_rate_date, base_currency, base_amount)
    VALUES
      (v_je_id,
       CASE WHEN round(r.fx_balance * r.rate_today, 2) - round(r.fx_balance * r.rate_prev, 2) > 0
            THEN v_gain_acc ELSE v_loss_acc END,
       GREATEST(round(r.fx_balance * r.rate_prev, 2) - round(r.fx_balance * r.rate_today, 2), 0),
       GREATEST(round(r.fx_balance * r.rate_today, 2) - round(r.fx_balance * r.rate_prev, 2), 0),
       'FX revaluation ' || r.currency, v_sort,
       r.company_id, r.station_id, 1, p_date, 'EGP',
       abs(round(r.fx_balance * r.rate_today, 2) - round(r.fx_balance * r.rate_prev, 2)));

    INSERT INTO public.treasury_fx_daily_log
      (reval_date, company_id, station_id, cash_account_id, bank_account_id, currency,
       fx_balance, rate_prev, rate_today, base_value_prev, base_value_today, fx_difference,
       journal_entry_id)
    VALUES
      (p_date, r.company_id, r.station_id, r.cash_account_id, r.bank_account_id, r.currency,
       r.fx_balance, r.rate_prev, r.rate_today,
       round(r.fx_balance * r.rate_prev, 2), round(r.fx_balance * r.rate_today, 2),
       round(r.fx_balance * r.rate_today, 2) - round(r.fx_balance * r.rate_prev, 2),
       v_je_id);
  END LOOP;

  RETURN QUERY SELECT v_rows, v_total, v_je_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.run_treasury_daily_revaluation(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.run_treasury_daily_revaluation(date) TO authenticated, service_role;