
CREATE TABLE public.expense_approval_chains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  min_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  max_amount NUMERIC(18,2),
  level INTEGER NOT NULL,
  approver_role TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_approval_chains TO authenticated;
GRANT ALL ON public.expense_approval_chains TO service_role;
ALTER TABLE public.expense_approval_chains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance can manage approval chains" ON public.expense_approval_chains
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()));
CREATE TRIGGER trg_expense_approval_chains_updated_at BEFORE UPDATE ON public.expense_approval_chains
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.expense_approval_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.expense_reports(id) ON DELETE CASCADE,
  level INTEGER NOT NULL,
  approver_role TEXT NOT NULL,
  approver_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  comments TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_approval_steps TO authenticated;
GRANT ALL ON public.expense_approval_steps TO service_role;
ALTER TABLE public.expense_approval_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance can manage approval steps" ON public.expense_approval_steps
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()));
CREATE TRIGGER trg_expense_approval_steps_updated_at BEFORE UPDATE ON public.expense_approval_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_expense_approval_steps_report ON public.expense_approval_steps(report_id, level);

CREATE OR REPLACE FUNCTION public.submit_expense_report_for_approval(_report_id UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _r record; _first record; _n integer := 0;
BEGIN
  SELECT * INTO _r FROM public.expense_reports WHERE id = _report_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Expense report not found'; END IF;

  DELETE FROM public.expense_approval_steps WHERE report_id = _report_id;

  FOR _first IN
    SELECT * FROM public.expense_approval_chains
    WHERE is_active
      AND COALESCE(currency,'USD') = COALESCE(_r.currency,'USD')
      AND _r.total_amount >= min_amount
      AND (max_amount IS NULL OR _r.total_amount <= max_amount)
    ORDER BY level ASC
  LOOP
    INSERT INTO public.expense_approval_steps(report_id, level, approver_role, status)
    VALUES (_report_id, _first.level, _first.approver_role,
            CASE WHEN _n = 0 THEN 'pending' ELSE 'waiting' END);
    _n := _n + 1;
  END LOOP;

  IF _n = 0 THEN
    INSERT INTO public.expense_approval_steps(report_id, level, approver_role, status)
    VALUES (_report_id, 1, 'accountant', 'pending');
    _n := 1;
  END IF;

  UPDATE public.expense_reports SET status = 'submitted', updated_at = now() WHERE id = _report_id;
  RETURN _n;
END; $$;

CREATE OR REPLACE FUNCTION public.approve_expense_step(_step_id UUID, _comments TEXT DEFAULT NULL)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _s record; _next record;
BEGIN
  SELECT * INTO _s FROM public.expense_approval_steps WHERE id = _step_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Step not found'; END IF;
  IF _s.status <> 'pending' THEN RAISE EXCEPTION 'Step is not pending (%)', _s.status; END IF;

  UPDATE public.expense_approval_steps
    SET status='approved', approver_id=auth.uid(), comments=_comments, decided_at=now(), updated_at=now()
    WHERE id=_step_id;

  SELECT * INTO _next FROM public.expense_approval_steps
    WHERE report_id=_s.report_id AND status='waiting'
    ORDER BY level ASC LIMIT 1;

  IF FOUND THEN
    UPDATE public.expense_approval_steps SET status='pending', updated_at=now() WHERE id=_next.id;
    RETURN 'advanced';
  ELSE
    UPDATE public.expense_reports SET status='approved', updated_at=now() WHERE id=_s.report_id;
    RETURN 'approved';
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.reject_expense_step(_step_id UUID, _comments TEXT DEFAULT NULL)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _s record;
BEGIN
  SELECT * INTO _s FROM public.expense_approval_steps WHERE id = _step_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Step not found'; END IF;
  UPDATE public.expense_approval_steps
    SET status='rejected', approver_id=auth.uid(), comments=_comments, decided_at=now(), updated_at=now()
    WHERE id=_step_id;
  UPDATE public.expense_approval_steps
    SET status='cancelled', updated_at=now()
    WHERE report_id=_s.report_id AND status IN ('waiting','pending') AND id<>_step_id;
  UPDATE public.expense_reports SET status='rejected', updated_at=now() WHERE id=_s.report_id;
  RETURN 'rejected';
END; $$;
