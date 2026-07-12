
CREATE TABLE public.fx_revaluation_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'monthly',
  target_currency TEXT NOT NULL DEFAULT 'EGP',
  account_scope TEXT NOT NULL DEFAULT 'ar_ap_bank',
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fx_revaluation_schedules TO authenticated;
GRANT ALL ON public.fx_revaluation_schedules TO service_role;

ALTER TABLE public.fx_revaluation_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage fx schedules"
  ON public.fx_revaluation_schedules
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER update_fx_revaluation_schedules_updated_at
  BEFORE UPDATE ON public.fx_revaluation_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.run_scheduled_fx_revaluation(_schedule_id UUID, _as_of DATE DEFAULT CURRENT_DATE)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schedule public.fx_revaluation_schedules%ROWTYPE;
  v_run_id UUID;
BEGIN
  SELECT * INTO v_schedule FROM public.fx_revaluation_schedules WHERE id = _schedule_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Schedule not found';
  END IF;

  INSERT INTO public.fx_revaluation_runs (
    company_id, run_date, target_currency, status, created_by, notes
  ) VALUES (
    v_schedule.company_id, _as_of, v_schedule.target_currency, 'posted',
    auth.uid(), 'Automated run from schedule ' || v_schedule.name
  ) RETURNING id INTO v_run_id;

  UPDATE public.fx_revaluation_schedules
     SET last_run_at = now(),
         next_run_at = CASE frequency
           WHEN 'daily' THEN now() + INTERVAL '1 day'
           WHEN 'weekly' THEN now() + INTERVAL '7 days'
           WHEN 'monthly' THEN now() + INTERVAL '1 month'
           WHEN 'quarterly' THEN now() + INTERVAL '3 months'
           ELSE now() + INTERVAL '1 month'
         END
   WHERE id = _schedule_id;

  RETURN v_run_id;
END;
$$;
