
CREATE TABLE public.amortization_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('deferred_revenue','prepaid_expense')),
  reference_no TEXT,
  description TEXT NOT NULL,
  total_amount NUMERIC(18,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EGP',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  method TEXT NOT NULL DEFAULT 'straight_line',
  status TEXT NOT NULL DEFAULT 'draft',
  balance_account_id UUID,
  recognition_account_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.amortization_schedules TO authenticated;
GRANT ALL ON public.amortization_schedules TO service_role;
ALTER TABLE public.amortization_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage amortization_schedules"
  ON public.amortization_schedules FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_amortization_schedules_updated_at
  BEFORE UPDATE ON public.amortization_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.amortization_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL REFERENCES public.amortization_schedules(id) ON DELETE CASCADE,
  period_date DATE NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  journal_entry_id UUID,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.amortization_entries TO authenticated;
GRANT ALL ON public.amortization_entries TO service_role;
ALTER TABLE public.amortization_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage amortization_entries"
  ON public.amortization_entries FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_amortization_entries_updated_at
  BEFORE UPDATE ON public.amortization_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.generate_amortization_entries(_schedule_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v public.amortization_schedules%ROWTYPE;
  v_months INTEGER;
  v_per NUMERIC(18,2);
  v_running NUMERIC(18,2) := 0;
  v_period DATE;
  v_i INTEGER := 0;
BEGIN
  SELECT * INTO v FROM public.amortization_schedules WHERE id = _schedule_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Schedule not found'; END IF;

  DELETE FROM public.amortization_entries WHERE schedule_id = _schedule_id AND status = 'pending';

  v_months := GREATEST(1, (EXTRACT(YEAR FROM age(v.end_date, v.start_date)) * 12
              + EXTRACT(MONTH FROM age(v.end_date, v.start_date)))::INT + 1);
  v_per := ROUND(v.total_amount / v_months, 2);
  v_period := date_trunc('month', v.start_date)::date;

  WHILE v_i < v_months LOOP
    IF v_i = v_months - 1 THEN
      INSERT INTO public.amortization_entries (schedule_id, period_date, amount)
        VALUES (_schedule_id, v_period, v.total_amount - v_running);
    ELSE
      INSERT INTO public.amortization_entries (schedule_id, period_date, amount)
        VALUES (_schedule_id, v_period, v_per);
      v_running := v_running + v_per;
    END IF;
    v_period := (v_period + INTERVAL '1 month')::date;
    v_i := v_i + 1;
  END LOOP;

  UPDATE public.amortization_schedules SET status = 'active' WHERE id = _schedule_id;
  RETURN v_months;
END;
$$;

CREATE OR REPLACE FUNCTION public.post_amortization_entry(_entry_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry public.amortization_entries%ROWTYPE;
BEGIN
  SELECT * INTO v_entry FROM public.amortization_entries WHERE id = _entry_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Entry not found'; END IF;
  IF v_entry.status = 'posted' THEN RETURN v_entry.id; END IF;

  UPDATE public.amortization_entries
     SET status = 'posted', posted_at = now()
   WHERE id = _entry_id;
  RETURN _entry_id;
END;
$$;
