
-- 1. customer_users
CREATE TABLE public.customer_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  airline_iata TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, airline_iata)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_users TO authenticated;
GRANT ALL ON public.customer_users TO service_role;

ALTER TABLE public.customer_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own customer mapping"
  ON public.customer_users FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()));

CREATE POLICY "Finance manages customer mappings"
  ON public.customer_users FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()));

CREATE TRIGGER trg_customer_users_updated
  BEFORE UPDATE ON public.customer_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. helper
CREATE OR REPLACE FUNCTION public.current_customer_airline_iata()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT airline_iata FROM public.customer_users
   WHERE user_id = auth.uid() AND is_active = TRUE
   LIMIT 1
$$;

-- 3. view of invoices for customers
CREATE OR REPLACE VIEW public.v_customer_invoices AS
SELECT i.*
FROM public.invoices i
WHERE COALESCE(i.invoice_direction::text,'outbound') = 'outbound'
  AND LOWER(COALESCE(i.status::text,'')) IN ('finalized','sent','paid','overdue')
  AND (
    public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_finance_access(auth.uid())
    OR UPPER(COALESCE(i.airline_iata,'')) = UPPER(COALESCE(public.current_customer_airline_iata(),''))
  );

GRANT SELECT ON public.v_customer_invoices TO authenticated;

-- 4. statement function
CREATE OR REPLACE FUNCTION public.get_customer_statement(_from DATE, _to DATE, _airline_iata TEXT DEFAULT NULL)
RETURNS TABLE(
  entry_date DATE,
  entry_type TEXT,
  reference TEXT,
  description TEXT,
  currency TEXT,
  debit NUMERIC,
  credit NUMERIC,
  running_balance NUMERIC
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_iata TEXT;
  v_opening NUMERIC := 0;
  v_run NUMERIC := 0;
BEGIN
  IF public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()) THEN
    v_iata := UPPER(COALESCE(_airline_iata, public.current_customer_airline_iata()));
  ELSE
    v_iata := UPPER(COALESCE(public.current_customer_airline_iata(),''));
  END IF;

  IF v_iata IS NULL OR v_iata = '' THEN
    RETURN;
  END IF;

  -- opening balance: invoices before _from minus receipts before _from
  SELECT COALESCE(SUM(i.total),0) - COALESCE((
    SELECT SUM(r.amount) FROM public.receipts r
    JOIN public.invoices ii ON ii.id = r.invoice_id
    WHERE UPPER(COALESCE(ii.airline_iata,'')) = v_iata
      AND r.receipt_date < _from AND LOWER(COALESCE(r.status,'')) = 'posted'
  ),0)
  INTO v_opening
  FROM public.invoices i
  WHERE UPPER(COALESCE(i.airline_iata,'')) = v_iata
    AND i.date < _from
    AND COALESCE(i.invoice_direction::text,'outbound') = 'outbound'
    AND LOWER(COALESCE(i.status::text,'')) IN ('finalized','sent','paid','overdue');

  v_run := v_opening;

  RETURN QUERY
  SELECT (_from - 1)::DATE, 'OPENING'::TEXT, NULL::TEXT, 'Opening balance'::TEXT,
         NULL::TEXT, 0::NUMERIC, 0::NUMERIC, v_opening;

  FOR entry_date, entry_type, reference, description, currency, debit, credit IN
    SELECT * FROM (
      SELECT i.date AS d, 'INVOICE'::TEXT AS t, i.invoice_no, COALESCE(i.description, i.flight_ref),
             i.currency::TEXT, i.total::NUMERIC, 0::NUMERIC
      FROM public.invoices i
      WHERE UPPER(COALESCE(i.airline_iata,'')) = v_iata
        AND i.date BETWEEN _from AND _to
        AND COALESCE(i.invoice_direction::text,'outbound') = 'outbound'
        AND LOWER(COALESCE(i.status::text,'')) IN ('finalized','sent','paid','overdue')
      UNION ALL
      SELECT r.receipt_date, 'PAYMENT'::TEXT, r.receipt_no,
             'Payment received' || COALESCE(' - ' || ii.invoice_no,''),
             r.currency::TEXT, 0::NUMERIC, r.amount::NUMERIC
      FROM public.receipts r
      LEFT JOIN public.invoices ii ON ii.id = r.invoice_id
      WHERE r.receipt_date BETWEEN _from AND _to
        AND LOWER(COALESCE(r.status,'')) = 'posted'
        AND UPPER(COALESCE(ii.airline_iata,'')) = v_iata
      ORDER BY d, t DESC
    ) sub
  LOOP
    v_run := v_run + COALESCE(debit,0) - COALESCE(credit,0);
    running_balance := v_run;
    RETURN NEXT;
  END LOOP;

  RETURN QUERY
  SELECT (_to + 1)::DATE, 'CLOSING'::TEXT, NULL::TEXT, 'Closing balance'::TEXT,
         NULL::TEXT, 0::NUMERIC, 0::NUMERIC, v_run;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_customer_statement(DATE, DATE, TEXT) TO authenticated;
