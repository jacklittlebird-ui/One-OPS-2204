
CREATE TABLE public.custom_report_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  source TEXT NOT NULL,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  filters JSONB NOT NULL DEFAULT '[]'::jsonb,
  group_by JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort JSONB NOT NULL DEFAULT '[]'::jsonb,
  chart_type TEXT DEFAULT 'table',
  chart_config JSONB DEFAULT '{}'::jsonb,
  is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  schedule_cron TEXT,
  schedule_recipients TEXT[],
  last_run_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_report_definitions TO authenticated;
GRANT ALL ON public.custom_report_definitions TO service_role;
ALTER TABLE public.custom_report_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read own, shared, or finance reports" ON public.custom_report_definitions FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR is_shared = TRUE
         OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()));
CREATE POLICY "Create own reports" ON public.custom_report_definitions FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "Update own or finance" ON public.custom_report_definitions FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()))
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()));
CREATE POLICY "Delete own or finance" ON public.custom_report_definitions FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()));

CREATE TRIGGER trg_crd_updated BEFORE UPDATE ON public.custom_report_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.custom_report_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.custom_report_definitions(id) ON DELETE CASCADE,
  row_count INTEGER,
  duration_ms INTEGER,
  export_path TEXT,
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  run_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_crr_report ON public.custom_report_runs(report_id);
GRANT SELECT, INSERT ON public.custom_report_runs TO authenticated;
GRANT ALL ON public.custom_report_runs TO service_role;
ALTER TABLE public.custom_report_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read runs of accessible reports" ON public.custom_report_runs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.custom_report_definitions d WHERE d.id = report_id
    AND (d.created_by = auth.uid() OR d.is_shared = TRUE
         OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()))));
CREATE POLICY "Insert runs" ON public.custom_report_runs FOR INSERT TO authenticated
  WITH CHECK (run_by = auth.uid());
