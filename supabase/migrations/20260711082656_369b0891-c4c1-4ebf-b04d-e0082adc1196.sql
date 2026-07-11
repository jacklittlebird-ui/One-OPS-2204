
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_no TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT,
  national_id TEXT,
  department TEXT,
  position TEXT,
  hire_date DATE,
  termination_date DATE,
  base_salary NUMERIC(18,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EGP',
  bank_name TEXT,
  bank_account TEXT,
  iban TEXT,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  station_id UUID REFERENCES public.finance_stations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'Active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance manage employees" ON public.employees FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant'));
CREATE POLICY "Employees view own record" ON public.employees FOR SELECT TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE TABLE public.payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  period_year INT NOT NULL,
  period_month INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  currency TEXT NOT NULL DEFAULT 'EGP',
  status TEXT NOT NULL DEFAULT 'Draft',
  total_gross NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_allowances NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_deductions NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_tax NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_social NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_net NUMERIC(18,2) NOT NULL DEFAULT 0,
  journal_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  posted_at TIMESTAMPTZ,
  posted_by UUID,
  notes TEXT,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, period_year, period_month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_runs TO authenticated;
GRANT ALL ON public.payroll_runs TO service_role;
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance manage payroll runs" ON public.payroll_runs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant'));

CREATE TABLE public.payroll_run_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  gross_salary NUMERIC(18,2) NOT NULL DEFAULT 0,
  allowances NUMERIC(18,2) NOT NULL DEFAULT 0,
  overtime NUMERIC(18,2) NOT NULL DEFAULT 0,
  bonuses NUMERIC(18,2) NOT NULL DEFAULT 0,
  deductions NUMERIC(18,2) NOT NULL DEFAULT 0,
  income_tax NUMERIC(18,2) NOT NULL DEFAULT 0,
  social_insurance NUMERIC(18,2) NOT NULL DEFAULT 0,
  net_pay NUMERIC(18,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(run_id, employee_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_run_lines TO authenticated;
GRANT ALL ON public.payroll_run_lines TO service_role;
ALTER TABLE public.payroll_run_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance manage payroll lines" ON public.payroll_run_lines FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant'));

CREATE TABLE public.expense_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_no TEXT NOT NULL UNIQUE DEFAULT ('EXP-' || to_char(now(),'YYYYMMDDHH24MISS')),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  purpose TEXT,
  currency TEXT NOT NULL DEFAULT 'EGP',
  total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Draft',
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  rejected_at TIMESTAMPTZ,
  rejected_by UUID,
  rejection_reason TEXT,
  reimbursed_at TIMESTAMPTZ,
  reimbursement_payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_reports TO authenticated;
GRANT ALL ON public.expense_reports TO service_role;
ALTER TABLE public.expense_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance manage expense reports" ON public.expense_reports FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant'));
CREATE POLICY "Employees manage own expense reports" ON public.expense_reports FOR ALL TO authenticated
  USING (employee_id IN (SELECT id FROM public.employees WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())))
  WITH CHECK (employee_id IN (SELECT id FROM public.employees WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())));

CREATE TABLE public.expense_report_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.expense_reports(id) ON DELETE CASCADE,
  line_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EGP',
  receipt_url TEXT,
  cost_center TEXT,
  project TEXT,
  is_billable BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_report_lines TO authenticated;
GRANT ALL ON public.expense_report_lines TO service_role;
ALTER TABLE public.expense_report_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance manage expense lines" ON public.expense_report_lines FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant'));
CREATE POLICY "Employees manage own expense lines" ON public.expense_report_lines FOR ALL TO authenticated
  USING (report_id IN (
    SELECT er.id FROM public.expense_reports er
    JOIN public.employees e ON e.id = er.employee_id
    WHERE e.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  ))
  WITH CHECK (report_id IN (
    SELECT er.id FROM public.expense_reports er
    JOIN public.employees e ON e.id = er.employee_id
    WHERE e.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  ));

CREATE TRIGGER trg_employees_updated BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_payroll_runs_updated BEFORE UPDATE ON public.payroll_runs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_payroll_run_lines_updated BEFORE UPDATE ON public.payroll_run_lines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_expense_reports_updated BEFORE UPDATE ON public.expense_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_expense_report_lines_updated BEFORE UPDATE ON public.expense_report_lines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.recalc_payroll_run_totals()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _run UUID;
BEGIN
  _run := COALESCE(NEW.run_id, OLD.run_id);
  UPDATE public.payroll_runs SET
    total_gross = COALESCE((SELECT SUM(gross_salary + allowances + overtime + bonuses) FROM public.payroll_run_lines WHERE run_id = _run),0),
    total_allowances = COALESCE((SELECT SUM(allowances) FROM public.payroll_run_lines WHERE run_id = _run),0),
    total_deductions = COALESCE((SELECT SUM(deductions) FROM public.payroll_run_lines WHERE run_id = _run),0),
    total_tax = COALESCE((SELECT SUM(income_tax) FROM public.payroll_run_lines WHERE run_id = _run),0),
    total_social = COALESCE((SELECT SUM(social_insurance) FROM public.payroll_run_lines WHERE run_id = _run),0),
    total_net = COALESCE((SELECT SUM(net_pay) FROM public.payroll_run_lines WHERE run_id = _run),0),
    updated_at = now()
  WHERE id = _run;
  RETURN NULL;
END; $$;
CREATE TRIGGER trg_payroll_lines_recalc AFTER INSERT OR UPDATE OR DELETE ON public.payroll_run_lines
FOR EACH ROW EXECUTE FUNCTION public.recalc_payroll_run_totals();

CREATE OR REPLACE FUNCTION public.recalc_expense_report_totals()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _rep UUID;
BEGIN
  _rep := COALESCE(NEW.report_id, OLD.report_id);
  UPDATE public.expense_reports SET
    total_amount = COALESCE((SELECT SUM(amount) FROM public.expense_report_lines WHERE report_id = _rep),0),
    updated_at = now()
  WHERE id = _rep;
  RETURN NULL;
END; $$;
CREATE TRIGGER trg_expense_lines_recalc AFTER INSERT OR UPDATE OR DELETE ON public.expense_report_lines
FOR EACH ROW EXECUTE FUNCTION public.recalc_expense_report_totals();

CREATE OR REPLACE FUNCTION public.generate_payroll_run(_company UUID, _year INT, _month INT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _run UUID;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  INSERT INTO public.payroll_runs(company_id, period_year, period_month)
  VALUES (_company, _year, _month)
  ON CONFLICT (company_id, period_year, period_month) DO UPDATE SET updated_at = now()
  RETURNING id INTO _run;

  DELETE FROM public.payroll_run_lines WHERE run_id = _run;
  INSERT INTO public.payroll_run_lines(run_id, employee_id, gross_salary, income_tax, social_insurance, net_pay)
  SELECT _run, e.id, e.base_salary,
         ROUND(e.base_salary * 0.10, 2),
         ROUND(e.base_salary * 0.11, 2),
         ROUND(e.base_salary * 0.79, 2)
  FROM public.employees e
  WHERE e.status = 'Active'
    AND (_company IS NULL OR e.company_id = _company)
    AND (e.termination_date IS NULL OR e.termination_date > make_date(_year, _month, 1));

  RETURN _run;
END; $$;
