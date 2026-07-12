
-- Phase 3z: Fixed Asset Impairment Testing
CREATE TABLE public.asset_impairment_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.fixed_assets(id) ON DELETE CASCADE,
  test_date DATE NOT NULL,
  carrying_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  fair_value_less_costs NUMERIC(18,2),
  value_in_use NUMERIC(18,2),
  recoverable_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  impairment_loss NUMERIC(18,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  method TEXT NOT NULL DEFAULT 'higher_of',
  triggering_event TEXT,
  notes TEXT,
  posted_journal_entry_id UUID REFERENCES public.journal_entries(id),
  tested_by UUID REFERENCES auth.users(id),
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_impairment_tests TO authenticated;
GRANT ALL ON public.asset_impairment_tests TO service_role;

ALTER TABLE public.asset_impairment_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and accountants manage impairment tests"
ON public.asset_impairment_tests
FOR ALL TO authenticated
USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'accountant'))
WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'accountant'));

CREATE TRIGGER trg_asset_impairment_tests_updated
BEFORE UPDATE ON public.asset_impairment_tests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RPC to compute recoverable amount and impairment
CREATE OR REPLACE FUNCTION public.compute_impairment(
  _fair_value NUMERIC,
  _value_in_use NUMERIC,
  _carrying NUMERIC
) RETURNS TABLE(recoverable NUMERIC, loss NUMERIC)
LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE r NUMERIC;
BEGIN
  r := GREATEST(COALESCE(_fair_value,0), COALESCE(_value_in_use,0));
  recoverable := r;
  loss := GREATEST(0, COALESCE(_carrying,0) - r);
  RETURN NEXT;
END;
$$;

-- RPC to post an impairment loss to GL and reduce asset carrying amount
CREATE OR REPLACE FUNCTION public.post_impairment_test(_test_id UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  t RECORD;
  je_id UUID;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'accountant')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO t FROM public.asset_impairment_tests WHERE id = _test_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Test not found'; END IF;
  IF t.status = 'posted' THEN RAISE EXCEPTION 'Already posted'; END IF;
  IF t.impairment_loss <= 0 THEN
    UPDATE public.asset_impairment_tests SET status='no_impairment', posted_at=now() WHERE id=_test_id;
    RETURN NULL;
  END IF;

  INSERT INTO public.journal_entries(entry_date, description, status, source_type, source_id, created_by)
  VALUES (t.test_date, 'Impairment loss on fixed asset ' || t.asset_id, 'posted', 'impairment', t.id, auth.uid())
  RETURNING id INTO je_id;

  UPDATE public.fixed_assets
     SET current_value = GREATEST(0, COALESCE(current_value,0) - t.impairment_loss),
         updated_at = now()
   WHERE id = t.asset_id;

  UPDATE public.asset_impairment_tests
     SET status='posted', posted_at=now(), posted_journal_entry_id=je_id
   WHERE id=_test_id;

  RETURN je_id;
END;
$$;
