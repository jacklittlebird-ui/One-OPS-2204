
CREATE TABLE public.bank_guarantees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number TEXT NOT NULL UNIQUE,
  guarantee_type TEXT NOT NULL CHECK (guarantee_type IN ('LG','LC','SBLC','performance','bid_bond','advance_payment')),
  issuing_bank TEXT NOT NULL,
  beneficiary TEXT NOT NULL,
  applicant_company_id UUID REFERENCES public.companies(id),
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'EGP',
  issue_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  margin_held NUMERIC(18,2) NOT NULL DEFAULT 0,
  commission_rate NUMERIC(8,5) NOT NULL DEFAULT 0,
  purpose TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','called','released','cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_guarantees TO authenticated;
GRANT ALL ON public.bank_guarantees TO service_role;
ALTER TABLE public.bank_guarantees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance staff manage bank guarantees" ON public.bank_guarantees FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant') OR public.has_role(auth.uid(), 'general_accounts'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant') OR public.has_role(auth.uid(), 'general_accounts'));

CREATE TABLE public.bank_guarantee_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guarantee_id UUID NOT NULL REFERENCES public.bank_guarantees(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('issued','amended','extended','called','released','expired','commission_charged')),
  event_date DATE NOT NULL,
  amount_delta NUMERIC(18,2) NOT NULL DEFAULT 0,
  new_expiry_date DATE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_guarantee_events TO authenticated;
GRANT ALL ON public.bank_guarantee_events TO service_role;
ALTER TABLE public.bank_guarantee_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance staff manage bg events" ON public.bank_guarantee_events FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant') OR public.has_role(auth.uid(), 'general_accounts'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant') OR public.has_role(auth.uid(), 'general_accounts'));

CREATE TRIGGER update_bank_guarantees_updated_at BEFORE UPDATE ON public.bank_guarantees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.record_bg_event(
  p_guarantee_id UUID,
  p_event_type TEXT,
  p_event_date DATE,
  p_amount_delta NUMERIC DEFAULT 0,
  p_new_expiry_date DATE DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID; v_bg RECORD;
BEGIN
  SELECT * INTO v_bg FROM public.bank_guarantees WHERE id = p_guarantee_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Guarantee not found'; END IF;

  INSERT INTO public.bank_guarantee_events(
    guarantee_id, event_type, event_date, amount_delta, new_expiry_date, notes, created_by)
  VALUES (p_guarantee_id, p_event_type, p_event_date, p_amount_delta, p_new_expiry_date, p_notes, auth.uid())
  RETURNING id INTO v_id;

  IF p_event_type = 'amended' AND p_amount_delta <> 0 THEN
    UPDATE public.bank_guarantees SET amount = amount + p_amount_delta WHERE id = p_guarantee_id;
  ELSIF p_event_type = 'extended' AND p_new_expiry_date IS NOT NULL THEN
    UPDATE public.bank_guarantees SET expiry_date = p_new_expiry_date WHERE id = p_guarantee_id;
  ELSIF p_event_type = 'called' THEN
    UPDATE public.bank_guarantees SET status = 'called' WHERE id = p_guarantee_id;
  ELSIF p_event_type = 'released' THEN
    UPDATE public.bank_guarantees SET status = 'released' WHERE id = p_guarantee_id;
  ELSIF p_event_type = 'expired' THEN
    UPDATE public.bank_guarantees SET status = 'expired' WHERE id = p_guarantee_id;
  END IF;

  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.expire_bank_guarantees()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count INTEGER;
BEGIN
  UPDATE public.bank_guarantees
    SET status = 'expired'
    WHERE status = 'active' AND expiry_date < CURRENT_DATE;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END; $$;
