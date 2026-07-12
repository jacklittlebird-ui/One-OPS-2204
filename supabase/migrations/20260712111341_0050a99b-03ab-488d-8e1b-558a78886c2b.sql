
ALTER TABLE public.cost_allocation_runs
  ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reversed_by UUID,
  ADD COLUMN IF NOT EXISTS reversal_of UUID REFERENCES public.cost_allocation_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS journal_entry_id UUID;

CREATE TABLE public.cost_allocation_drivers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  unit TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cost_allocation_drivers TO authenticated;
GRANT ALL ON public.cost_allocation_drivers TO service_role;
ALTER TABLE public.cost_allocation_drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance manages drivers" ON public.cost_allocation_drivers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()));
CREATE TRIGGER trg_cost_allocation_drivers_updated_at BEFORE UPDATE ON public.cost_allocation_drivers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.cost_allocation_driver_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES public.cost_allocation_drivers(id) ON DELETE CASCADE,
  cost_center TEXT NOT NULL,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  weight NUMERIC(18,4) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (driver_id, cost_center, period_year, period_month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cost_allocation_driver_values TO authenticated;
GRANT ALL ON public.cost_allocation_driver_values TO service_role;
ALTER TABLE public.cost_allocation_driver_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance manages driver values" ON public.cost_allocation_driver_values FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()));
CREATE TRIGGER trg_cost_allocation_driver_values_updated_at BEFORE UPDATE ON public.cost_allocation_driver_values
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.reverse_allocation_run(_run_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _r record; _new UUID;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT * INTO _r FROM public.cost_allocation_runs WHERE id=_run_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Run not found'; END IF;
  IF _r.reversed_at IS NOT NULL THEN RAISE EXCEPTION 'Run already reversed'; END IF;

  INSERT INTO public.cost_allocation_runs(rule_id, period_year, period_month, total_allocated, notes, reversal_of, reversed_at, reversed_by)
  VALUES (_r.rule_id, _r.period_year, _r.period_month, -COALESCE(_r.total_allocated,0),
          'Reversal of run ' || _run_id::text, _run_id, now(), auth.uid())
  RETURNING id INTO _new;

  UPDATE public.cost_allocation_runs SET reversed_at=now(), reversed_by=auth.uid(), updated_at=now() WHERE id=_run_id;
  RETURN _new;
END; $$;

CREATE OR REPLACE FUNCTION public.run_cost_allocation(_rule_id UUID, _year INTEGER, _month INTEGER, _amount NUMERIC)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _run UUID; _line record; _total_wt NUMERIC := 0; _share NUMERIC;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT COALESCE(SUM(percentage),0) INTO _total_wt
    FROM public.cost_allocation_rule_lines WHERE rule_id=_rule_id;
  IF _total_wt = 0 THEN RAISE EXCEPTION 'Rule has no allocation lines'; END IF;

  INSERT INTO public.cost_allocation_runs(rule_id, period_year, period_month, total_allocated, notes)
  VALUES (_rule_id, _year, _month, _amount, 'Auto-run')
  RETURNING id INTO _run;

  RETURN _run;
END; $$;
