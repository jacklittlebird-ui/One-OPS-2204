
CREATE OR REPLACE FUNCTION public.get_budget_variance(_year INTEGER, _month INTEGER DEFAULT NULL)
RETURNS TABLE (
  budget_id UUID, fiscal_year INTEGER, period_month INTEGER,
  account_code TEXT, account_name TEXT, cost_center TEXT, currency TEXT,
  budget_amount NUMERIC, actual_amount NUMERIC,
  variance_amount NUMERIC, variance_pct NUMERIC, alert_threshold_pct NUMERIC
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH actuals AS (
    SELECT coa.code AS acode,
           EXTRACT(YEAR FROM je.entry_date)::INT AS y,
           EXTRACT(MONTH FROM je.entry_date)::INT AS m,
           SUM(COALESCE(jel.debit,0) - COALESCE(jel.credit,0)) AS amt
    FROM public.journal_entry_lines jel
    JOIN public.journal_entries je ON je.id = jel.entry_id
    JOIN public.chart_of_accounts coa ON coa.id = jel.account_id
    WHERE LOWER(COALESCE(je.status::text,'')) IN ('posted','approved')
      AND EXTRACT(YEAR FROM je.entry_date)::INT = _year
      AND (_month IS NULL OR EXTRACT(MONTH FROM je.entry_date)::INT = _month)
    GROUP BY coa.code, y, m
  )
  SELECT b.id, b.fiscal_year, b.period_month,
         b.account_code, b.account_name, b.cost_center, b.currency,
         b.budget_amount,
         COALESCE(a.amt, 0) AS actual_amount,
         COALESCE(a.amt, 0) - b.budget_amount AS variance_amount,
         CASE WHEN b.budget_amount = 0 THEN NULL
              ELSE ROUND(((COALESCE(a.amt,0) - b.budget_amount) / NULLIF(b.budget_amount,0)) * 100, 2)
         END AS variance_pct,
         b.alert_threshold_pct
  FROM public.budget_entries b
  LEFT JOIN actuals a ON a.acode = b.account_code
                     AND a.y = b.fiscal_year AND a.m = b.period_month
  WHERE b.fiscal_year = _year
    AND (_month IS NULL OR b.period_month = _month)
    AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()));
$$;
GRANT EXECUTE ON FUNCTION public.get_budget_variance(INTEGER, INTEGER) TO authenticated;
