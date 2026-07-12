
-- Customer Credit Profiles
CREATE TABLE public.customer_credit_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  airline_id uuid NOT NULL REFERENCES public.airlines(id) ON DELETE CASCADE,
  credit_limit numeric(18,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  payment_terms_days integer NOT NULL DEFAULT 30,
  credit_rating text NOT NULL DEFAULT 'B' CHECK (credit_rating IN ('A+','A','B','C','D')),
  risk_category text NOT NULL DEFAULT 'medium' CHECK (risk_category IN ('low','medium','high','blocked')),
  on_hold boolean NOT NULL DEFAULT false,
  hold_reason text,
  last_review_date date,
  next_review_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (airline_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_credit_profiles TO authenticated;
GRANT ALL ON public.customer_credit_profiles TO service_role;

ALTER TABLE public.customer_credit_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credit profiles readable by authenticated"
  ON public.customer_credit_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "credit profiles managed by admin/finance"
  ON public.customer_credit_profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant'));

-- Credit Events audit
CREATE TABLE public.customer_credit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.customer_credit_profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('limit_change','hold','release','review','rating_change','note')),
  previous_value text,
  new_value text,
  reason text,
  event_date timestamptz NOT NULL DEFAULT now(),
  performed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.customer_credit_events TO authenticated;
GRANT ALL ON public.customer_credit_events TO service_role;

ALTER TABLE public.customer_credit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credit events readable by authenticated"
  ON public.customer_credit_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "credit events insertable by admin/finance"
  ON public.customer_credit_events FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant'));

CREATE INDEX idx_credit_events_profile ON public.customer_credit_events(profile_id, event_date DESC);

-- updated_at trigger
CREATE TRIGGER trg_customer_credit_profiles_updated
  BEFORE UPDATE ON public.customer_credit_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Exposure RPC
CREATE OR REPLACE FUNCTION public.get_customer_credit_exposure(_airline_id uuid)
RETURNS TABLE(
  airline_id uuid,
  credit_limit numeric,
  currency text,
  outstanding numeric,
  overdue numeric,
  available numeric,
  utilization_pct numeric,
  on_hold boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_limit numeric := 0;
  v_currency text := 'USD';
  v_hold boolean := false;
  v_outstanding numeric := 0;
  v_overdue numeric := 0;
BEGIN
  SELECT COALESCE(p.credit_limit,0), COALESCE(p.currency,'USD'), COALESCE(p.on_hold,false)
    INTO v_limit, v_currency, v_hold
  FROM public.customer_credit_profiles p WHERE p.airline_id = _airline_id;

  SELECT COALESCE(SUM(COALESCE(i.total_amount,0) - COALESCE(i.paid_amount,0)),0)
    INTO v_outstanding
  FROM public.invoices i
  WHERE i.airline_id = _airline_id
    AND COALESCE(i.status,'') NOT IN ('paid','cancelled','void');

  SELECT COALESCE(SUM(COALESCE(i.total_amount,0) - COALESCE(i.paid_amount,0)),0)
    INTO v_overdue
  FROM public.invoices i
  WHERE i.airline_id = _airline_id
    AND COALESCE(i.status,'') NOT IN ('paid','cancelled','void')
    AND i.due_date IS NOT NULL
    AND i.due_date < CURRENT_DATE;

  RETURN QUERY SELECT
    _airline_id,
    v_limit,
    v_currency,
    v_outstanding,
    v_overdue,
    GREATEST(v_limit - v_outstanding, 0),
    CASE WHEN v_limit > 0 THEN ROUND((v_outstanding / v_limit) * 100, 2) ELSE 0 END,
    v_hold;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_customer_credit_exposure(uuid) TO authenticated;

-- Check credit before invoice
CREATE OR REPLACE FUNCTION public.check_credit_before_invoice(_airline_id uuid, _amount numeric)
RETURNS TABLE(allowed boolean, reason text, available numeric, credit_limit numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE r record;
BEGIN
  SELECT * INTO r FROM public.get_customer_credit_exposure(_airline_id);
  IF r.on_hold THEN
    RETURN QUERY SELECT false, 'Customer on credit hold'::text, r.available, r.credit_limit;
    RETURN;
  END IF;
  IF r.credit_limit <= 0 THEN
    RETURN QUERY SELECT true, 'No credit limit configured'::text, r.available, r.credit_limit;
    RETURN;
  END IF;
  IF _amount > r.available THEN
    RETURN QUERY SELECT false, 'Exceeds available credit'::text, r.available, r.credit_limit;
    RETURN;
  END IF;
  RETURN QUERY SELECT true, 'OK'::text, r.available, r.credit_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_credit_before_invoice(uuid, numeric) TO authenticated;
