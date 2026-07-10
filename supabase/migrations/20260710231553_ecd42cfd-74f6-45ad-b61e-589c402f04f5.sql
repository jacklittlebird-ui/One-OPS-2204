
CREATE TABLE public.recurring_invoice_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_no TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  customer_id UUID,
  customer_name TEXT,
  currency TEXT NOT NULL DEFAULT 'EGP',
  frequency TEXT NOT NULL DEFAULT 'monthly',
  day_of_month INTEGER DEFAULT 1,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  next_run_date DATE NOT NULL DEFAULT CURRENT_DATE,
  last_run_date DATE,
  vat_rate NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  auto_post BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_invoice_templates TO authenticated;
GRANT ALL ON public.recurring_invoice_templates TO service_role;
ALTER TABLE public.recurring_invoice_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read rit" ON public.recurring_invoice_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write rit" ON public.recurring_invoice_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_rit_updated BEFORE UPDATE ON public.recurring_invoice_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.recurring_invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.recurring_invoice_templates(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  amount NUMERIC GENERATED ALWAYS AS (COALESCE(quantity,0) * COALESCE(unit_price,0)) STORED,
  account_code TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_invoice_lines TO authenticated;
GRANT ALL ON public.recurring_invoice_lines TO service_role;
ALTER TABLE public.recurring_invoice_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read ril" ON public.recurring_invoice_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write ril" ON public.recurring_invoice_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_ril_updated BEFORE UPDATE ON public.recurring_invoice_lines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.recurring_invoice_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_no TEXT NOT NULL UNIQUE,
  run_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mode TEXT NOT NULL DEFAULT 'dry_run',
  status TEXT NOT NULL DEFAULT 'completed',
  templates_processed INTEGER NOT NULL DEFAULT 0,
  invoices_created INTEGER NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'EGP',
  details JSONB DEFAULT '[]'::jsonb,
  run_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_invoice_runs TO authenticated;
GRANT ALL ON public.recurring_invoice_runs TO service_role;
ALTER TABLE public.recurring_invoice_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read rir" ON public.recurring_invoice_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write rir" ON public.recurring_invoice_runs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_rir_updated BEFORE UPDATE ON public.recurring_invoice_runs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_rit_next_run ON public.recurring_invoice_templates(next_run_date) WHERE status = 'active';
CREATE INDEX idx_ril_template ON public.recurring_invoice_lines(template_id);
