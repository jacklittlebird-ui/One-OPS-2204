
CREATE TABLE public.dunning_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_date date NOT NULL DEFAULT CURRENT_DATE,
  policy_id uuid REFERENCES public.dunning_policies(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  invoices_scanned int NOT NULL DEFAULT 0,
  reminders_created int NOT NULL DEFAULT 0,
  notes text,
  executed_by uuid,
  executed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dunning_runs TO authenticated;
GRANT ALL ON public.dunning_runs TO service_role;
ALTER TABLE public.dunning_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance can manage dunning runs" ON public.dunning_runs FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'accountant'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'accountant'));

CREATE TABLE public.dunning_run_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.dunning_runs(id) ON DELETE CASCADE,
  invoice_id uuid,
  customer_name text,
  days_overdue int,
  stage int,
  reminder_id uuid,
  amount numeric(18,2),
  currency text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dunning_run_items TO authenticated;
GRANT ALL ON public.dunning_run_items TO service_role;
ALTER TABLE public.dunning_run_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance can manage dunning items" ON public.dunning_run_items FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'accountant'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'accountant'));

CREATE OR REPLACE FUNCTION public.execute_dunning_run(p_policy_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id uuid;
  v_scanned int := 0;
  v_created int := 0;
  r record;
  v_days int;
  v_stage int;
BEGIN
  INSERT INTO public.dunning_runs(policy_id, status, executed_by, executed_at)
  VALUES (p_policy_id, 'running', auth.uid(), now())
  RETURNING id INTO v_run_id;

  FOR r IN
    SELECT i.id, i.customer_name, i.due_date, i.total_amount, i.currency, i.outstanding_balance
    FROM public.invoices i
    WHERE COALESCE(i.outstanding_balance, i.total_amount) > 0
      AND i.due_date IS NOT NULL
      AND i.due_date < CURRENT_DATE
      AND i.status NOT IN ('paid','void','cancelled')
  LOOP
    v_scanned := v_scanned + 1;
    v_days := (CURRENT_DATE - r.due_date);
    v_stage := CASE
      WHEN v_days >= 60 THEN 3
      WHEN v_days >= 30 THEN 2
      WHEN v_days >= 7  THEN 1
      ELSE 0
    END;

    IF v_stage > 0 THEN
      INSERT INTO public.dunning_run_items(run_id, invoice_id, customer_name, days_overdue, stage, amount, currency)
      VALUES (v_run_id, r.id, r.customer_name, v_days, v_stage, COALESCE(r.outstanding_balance, r.total_amount), r.currency);
      v_created := v_created + 1;
    END IF;
  END LOOP;

  UPDATE public.dunning_runs
  SET status = 'completed', invoices_scanned = v_scanned, reminders_created = v_created, updated_at = now()
  WHERE id = v_run_id;

  RETURN v_run_id;
END;
$$;
