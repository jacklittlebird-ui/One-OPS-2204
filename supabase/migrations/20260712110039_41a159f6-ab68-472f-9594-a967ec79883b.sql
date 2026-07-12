
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  customer_name text,
  manager text,
  currency text NOT NULL DEFAULT 'USD',
  budget_amount numeric(18,2) NOT NULL DEFAULT 0,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','active','on_hold','completed','cancelled')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance manages projects" ON public.projects FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'general_accounts') OR public.has_role(auth.uid(),'payables'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'general_accounts') OR public.has_role(auth.uid(),'payables'));

CREATE TABLE public.project_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  code text,
  name text NOT NULL,
  budget_amount numeric(18,2) NOT NULL DEFAULT 0,
  progress_pct numeric(5,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','completed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_tasks TO authenticated;
GRANT ALL ON public.project_tasks TO service_role;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance manages tasks" ON public.project_tasks FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'general_accounts') OR public.has_role(auth.uid(),'payables'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'general_accounts') OR public.has_role(auth.uid(),'payables'));

CREATE TABLE public.project_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.project_tasks(id) ON DELETE SET NULL,
  txn_type text NOT NULL CHECK (txn_type IN ('cost','revenue','billed','wip')),
  txn_date date NOT NULL DEFAULT CURRENT_DATE,
  description text,
  amount numeric(18,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  reference_type text,
  reference_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_transactions TO authenticated;
GRANT ALL ON public.project_transactions TO service_role;
ALTER TABLE public.project_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance manages project txns" ON public.project_transactions FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'general_accounts') OR public.has_role(auth.uid(),'payables'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'general_accounts') OR public.has_role(auth.uid(),'payables'));

CREATE INDEX idx_prj_txn_prj ON public.project_transactions(project_id, txn_date DESC);

CREATE TRIGGER trg_projects_upd BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_project_tasks_upd BEFORE UPDATE ON public.project_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.get_project_pnl(_project_id uuid DEFAULT NULL)
RETURNS TABLE (
  project_id uuid,
  code text,
  name text,
  status text,
  currency text,
  budget_amount numeric,
  actual_cost numeric,
  revenue numeric,
  billed numeric,
  wip numeric,
  margin numeric,
  margin_pct numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.code, p.name, p.status, p.currency,
    p.budget_amount,
    COALESCE(SUM(CASE WHEN t.txn_type = 'cost' THEN t.amount END),0) AS actual_cost,
    COALESCE(SUM(CASE WHEN t.txn_type = 'revenue' THEN t.amount END),0) AS revenue,
    COALESCE(SUM(CASE WHEN t.txn_type = 'billed' THEN t.amount END),0) AS billed,
    COALESCE(SUM(CASE WHEN t.txn_type = 'revenue' THEN t.amount END),0)
      - COALESCE(SUM(CASE WHEN t.txn_type = 'billed' THEN t.amount END),0) AS wip,
    COALESCE(SUM(CASE WHEN t.txn_type = 'revenue' THEN t.amount END),0)
      - COALESCE(SUM(CASE WHEN t.txn_type = 'cost' THEN t.amount END),0) AS margin,
    CASE WHEN COALESCE(SUM(CASE WHEN t.txn_type = 'revenue' THEN t.amount END),0) = 0 THEN 0
      ELSE ROUND(100.0 * (COALESCE(SUM(CASE WHEN t.txn_type = 'revenue' THEN t.amount END),0)
        - COALESCE(SUM(CASE WHEN t.txn_type = 'cost' THEN t.amount END),0))
        / NULLIF(SUM(CASE WHEN t.txn_type = 'revenue' THEN t.amount END),0), 2) END AS margin_pct
  FROM public.projects p
  LEFT JOIN public.project_transactions t ON t.project_id = p.id
  WHERE (_project_id IS NULL OR p.id = _project_id)
  GROUP BY p.id
  ORDER BY p.code;
$$;
