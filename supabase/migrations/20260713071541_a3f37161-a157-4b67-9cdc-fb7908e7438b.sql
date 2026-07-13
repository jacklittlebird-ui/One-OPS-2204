
CREATE TABLE public.cbcr_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_group TEXT NOT NULL,
  fiscal_year INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  ultimate_parent TEXT,
  reporting_entity TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  filing_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cbcr_reports TO authenticated;
GRANT ALL ON public.cbcr_reports TO service_role;
ALTER TABLE public.cbcr_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage cbcr_reports" ON public.cbcr_reports FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TABLE public.cbcr_jurisdiction_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.cbcr_reports(id) ON DELETE CASCADE,
  jurisdiction TEXT NOT NULL,
  revenue_unrelated NUMERIC(18,2) NOT NULL DEFAULT 0,
  revenue_related NUMERIC(18,2) NOT NULL DEFAULT 0,
  revenue_total NUMERIC(18,2) NOT NULL DEFAULT 0,
  profit_before_tax NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_paid_cash NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_accrued NUMERIC(18,2) NOT NULL DEFAULT 0,
  stated_capital NUMERIC(18,2) NOT NULL DEFAULT 0,
  accumulated_earnings NUMERIC(18,2) NOT NULL DEFAULT 0,
  employees INT NOT NULL DEFAULT 0,
  tangible_assets NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cbcr_jurisdiction_lines TO authenticated;
GRANT ALL ON public.cbcr_jurisdiction_lines TO service_role;
ALTER TABLE public.cbcr_jurisdiction_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage cbcr_jurisdiction_lines" ON public.cbcr_jurisdiction_lines FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TABLE public.cbcr_entity_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.cbcr_reports(id) ON DELETE CASCADE,
  jurisdiction TEXT NOT NULL,
  entity_name TEXT NOT NULL,
  tax_id TEXT,
  main_activities TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cbcr_entity_lines TO authenticated;
GRANT ALL ON public.cbcr_entity_lines TO service_role;
ALTER TABLE public.cbcr_entity_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage cbcr_entity_lines" ON public.cbcr_entity_lines FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX idx_cbcr_jl_report ON public.cbcr_jurisdiction_lines(report_id);
CREATE INDEX idx_cbcr_el_report ON public.cbcr_entity_lines(report_id);
