
-- Cost allocation rules
CREATE TABLE public.cost_allocation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  source_company TEXT,
  source_account_code TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'percentage', -- percentage | headcount | revenue | flights | equal
  driver TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cost_allocation_rules TO authenticated;
GRANT ALL ON public.cost_allocation_rules TO service_role;
ALTER TABLE public.cost_allocation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "finance can view allocation rules" ON public.cost_allocation_rules FOR SELECT TO authenticated USING (public.has_finance_access(auth.uid()));
CREATE POLICY "finance can insert allocation rules" ON public.cost_allocation_rules FOR INSERT TO authenticated WITH CHECK (public.has_finance_access(auth.uid()));
CREATE POLICY "finance can update allocation rules" ON public.cost_allocation_rules FOR UPDATE TO authenticated USING (public.has_finance_access(auth.uid())) WITH CHECK (public.has_finance_access(auth.uid()));
CREATE POLICY "finance can delete allocation rules" ON public.cost_allocation_rules FOR DELETE TO authenticated USING (public.has_finance_access(auth.uid()));
CREATE TRIGGER trg_cost_allocation_rules_updated BEFORE UPDATE ON public.cost_allocation_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Rule lines: targets with weights/percentages
CREATE TABLE public.cost_allocation_rule_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES public.cost_allocation_rules(id) ON DELETE CASCADE,
  target_company TEXT NOT NULL,
  target_cost_center TEXT,
  target_account_code TEXT,
  weight NUMERIC NOT NULL DEFAULT 0,
  percentage NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cost_allocation_rule_lines TO authenticated;
GRANT ALL ON public.cost_allocation_rule_lines TO service_role;
ALTER TABLE public.cost_allocation_rule_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "finance can view rule lines" ON public.cost_allocation_rule_lines FOR SELECT TO authenticated USING (public.has_finance_access(auth.uid()));
CREATE POLICY "finance can insert rule lines" ON public.cost_allocation_rule_lines FOR INSERT TO authenticated WITH CHECK (public.has_finance_access(auth.uid()));
CREATE POLICY "finance can update rule lines" ON public.cost_allocation_rule_lines FOR UPDATE TO authenticated USING (public.has_finance_access(auth.uid())) WITH CHECK (public.has_finance_access(auth.uid()));
CREATE POLICY "finance can delete rule lines" ON public.cost_allocation_rule_lines FOR DELETE TO authenticated USING (public.has_finance_access(auth.uid()));

-- Runs: record of each posted distribution
CREATE TABLE public.cost_allocation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES public.cost_allocation_rules(id) ON DELETE RESTRICT,
  period DATE NOT NULL,
  source_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EGP',
  status TEXT NOT NULL DEFAULT 'Posted', -- Draft | Posted | Void
  journal_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  distribution JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cost_allocation_runs TO authenticated;
GRANT ALL ON public.cost_allocation_runs TO service_role;
ALTER TABLE public.cost_allocation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "finance can view allocation runs" ON public.cost_allocation_runs FOR SELECT TO authenticated USING (public.has_finance_access(auth.uid()));
CREATE POLICY "finance can insert allocation runs" ON public.cost_allocation_runs FOR INSERT TO authenticated WITH CHECK (public.has_finance_access(auth.uid()));
CREATE POLICY "finance can update allocation runs" ON public.cost_allocation_runs FOR UPDATE TO authenticated USING (public.has_finance_access(auth.uid())) WITH CHECK (public.has_finance_access(auth.uid()));
CREATE POLICY "finance can delete allocation runs" ON public.cost_allocation_runs FOR DELETE TO authenticated USING (public.has_finance_access(auth.uid()));
CREATE TRIGGER trg_cost_allocation_runs_updated BEFORE UPDATE ON public.cost_allocation_runs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_cost_alloc_lines_rule ON public.cost_allocation_rule_lines(rule_id);
CREATE INDEX idx_cost_alloc_runs_rule_period ON public.cost_allocation_runs(rule_id, period);
