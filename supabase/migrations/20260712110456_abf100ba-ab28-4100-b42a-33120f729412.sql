
CREATE TABLE public.timesheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  employee_name text NOT NULL,
  week_start date NOT NULL,
  week_end date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected','posted')),
  total_hours numeric(10,2) NOT NULL DEFAULT 0,
  billable_hours numeric(10,2) NOT NULL DEFAULT 0,
  total_cost numeric(18,2) NOT NULL DEFAULT 0,
  billable_amount numeric(18,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.timesheets TO authenticated;
GRANT ALL ON public.timesheets TO service_role;
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance manages timesheets" ON public.timesheets FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_finance_access(auth.uid()))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_finance_access(auth.uid()));

CREATE TABLE public.timesheet_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timesheet_id uuid NOT NULL REFERENCES public.timesheets(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  task_id uuid REFERENCES public.project_tasks(id) ON DELETE SET NULL,
  hours numeric(8,2) NOT NULL DEFAULT 0,
  is_billable boolean NOT NULL DEFAULT true,
  hourly_cost_rate numeric(12,4) NOT NULL DEFAULT 0,
  hourly_bill_rate numeric(12,4) NOT NULL DEFAULT 0,
  cost_amount numeric(18,2) NOT NULL DEFAULT 0,
  bill_amount numeric(18,2) NOT NULL DEFAULT 0,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.timesheet_entries TO authenticated;
GRANT ALL ON public.timesheet_entries TO service_role;
ALTER TABLE public.timesheet_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance manages timesheet entries" ON public.timesheet_entries FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_finance_access(auth.uid()))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_finance_access(auth.uid()));

CREATE INDEX idx_ts_entries_ts ON public.timesheet_entries(timesheet_id);
CREATE INDEX idx_ts_entries_project ON public.timesheet_entries(project_id);

CREATE TRIGGER trg_timesheets_upd BEFORE UPDATE ON public.timesheets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_timesheet_entries_upd BEFORE UPDATE ON public.timesheet_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.calc_timesheet_entry_amounts()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.cost_amount := ROUND(COALESCE(NEW.hours,0) * COALESCE(NEW.hourly_cost_rate,0), 2);
  NEW.bill_amount := CASE WHEN NEW.is_billable THEN ROUND(COALESCE(NEW.hours,0) * COALESCE(NEW.hourly_bill_rate,0), 2) ELSE 0 END;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_calc_ts_entry BEFORE INSERT OR UPDATE ON public.timesheet_entries
FOR EACH ROW EXECUTE FUNCTION public.calc_timesheet_entry_amounts();

CREATE OR REPLACE FUNCTION public.aggregate_timesheet_totals()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _ts uuid;
BEGIN
  _ts := COALESCE(NEW.timesheet_id, OLD.timesheet_id);
  UPDATE public.timesheets SET
    total_hours = COALESCE((SELECT SUM(hours) FROM public.timesheet_entries WHERE timesheet_id=_ts),0),
    billable_hours = COALESCE((SELECT SUM(hours) FROM public.timesheet_entries WHERE timesheet_id=_ts AND is_billable),0),
    total_cost = COALESCE((SELECT SUM(cost_amount) FROM public.timesheet_entries WHERE timesheet_id=_ts),0),
    billable_amount = COALESCE((SELECT SUM(bill_amount) FROM public.timesheet_entries WHERE timesheet_id=_ts),0),
    updated_at = now()
  WHERE id = _ts;
  RETURN COALESCE(NEW, OLD);
END; $$;
CREATE TRIGGER trg_agg_ts_totals AFTER INSERT OR UPDATE OR DELETE ON public.timesheet_entries
FOR EACH ROW EXECUTE FUNCTION public.aggregate_timesheet_totals();

CREATE OR REPLACE FUNCTION public.post_timesheet_to_project(_timesheet_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _ts record; _e record; _n integer := 0;
BEGIN
  SELECT * INTO _ts FROM public.timesheets WHERE id = _timesheet_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Timesheet not found'; END IF;
  IF _ts.status <> 'approved' THEN RAISE EXCEPTION 'Only approved timesheets can be posted (current: %)', _ts.status; END IF;

  FOR _e IN SELECT * FROM public.timesheet_entries WHERE timesheet_id = _timesheet_id AND project_id IS NOT NULL LOOP
    INSERT INTO public.project_transactions(project_id, task_id, txn_type, txn_date, description, amount, currency, reference_type, reference_id)
    VALUES (_e.project_id, _e.task_id, 'cost', _e.entry_date,
            'Labor: ' || _ts.employee_name || CASE WHEN _e.description IS NOT NULL THEN ' — ' || _e.description ELSE '' END,
            _e.cost_amount, _ts.currency, 'timesheet', _timesheet_id);
    IF _e.is_billable AND _e.bill_amount > 0 THEN
      INSERT INTO public.project_transactions(project_id, task_id, txn_type, txn_date, description, amount, currency, reference_type, reference_id)
      VALUES (_e.project_id, _e.task_id, 'revenue', _e.entry_date,
              'Billable labor: ' || _ts.employee_name, _e.bill_amount, _ts.currency, 'timesheet', _timesheet_id);
    END IF;
    _n := _n + 1;
  END LOOP;

  UPDATE public.timesheets SET status = 'posted', updated_at = now() WHERE id = _timesheet_id;
  RETURN _n;
END; $$;
