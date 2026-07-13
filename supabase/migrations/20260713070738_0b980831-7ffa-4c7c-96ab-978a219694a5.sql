
CREATE TABLE public.provisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_code TEXT NOT NULL,
  provision_ref TEXT NOT NULL,
  provision_type TEXT NOT NULL,
  classification TEXT NOT NULL DEFAULT 'provision',
  probability TEXT NOT NULL DEFAULT 'probable',
  description TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  recognition_date DATE NOT NULL,
  expected_settlement_date DATE,
  discount_rate NUMERIC(6,2) DEFAULT 0,
  opening_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  additions NUMERIC(18,2) NOT NULL DEFAULT 0,
  utilizations NUMERIC(18,2) NOT NULL DEFAULT 0,
  reversals NUMERIC(18,2) NOT NULL DEFAULT 0,
  unwinding_of_discount NUMERIC(18,2) NOT NULL DEFAULT 0,
  closing_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provisions TO authenticated;
GRANT ALL ON public.provisions TO service_role;
ALTER TABLE public.provisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read provisions" ON public.provisions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write provisions" ON public.provisions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.provision_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provision_id UUID NOT NULL REFERENCES public.provisions(id) ON DELETE CASCADE,
  movement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  movement_type TEXT NOT NULL,
  amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provision_movements TO authenticated;
GRANT ALL ON public.provision_movements TO service_role;
ALTER TABLE public.provision_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read provision_movements" ON public.provision_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write provision_movements" ON public.provision_movements FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.recompute_provision(_provision_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_add NUMERIC(18,2) := 0;
  v_util NUMERIC(18,2) := 0;
  v_rev NUMERIC(18,2) := 0;
  v_unw NUMERIC(18,2) := 0;
  v_open NUMERIC(18,2) := 0;
BEGIN
  SELECT
    COALESCE(SUM(CASE WHEN movement_type = 'addition' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN movement_type = 'utilization' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN movement_type = 'reversal' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN movement_type = 'unwinding' THEN amount ELSE 0 END), 0)
  INTO v_add, v_util, v_rev, v_unw
  FROM public.provision_movements
  WHERE provision_id = _provision_id;

  SELECT opening_balance INTO v_open FROM public.provisions WHERE id = _provision_id;

  UPDATE public.provisions
  SET additions = v_add,
      utilizations = v_util,
      reversals = v_rev,
      unwinding_of_discount = v_unw,
      closing_balance = v_open + v_add - v_util - v_rev + v_unw,
      updated_at = now()
  WHERE id = _provision_id;
END;
$$;

CREATE TRIGGER trg_provisions_updated
BEFORE UPDATE ON public.provisions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
