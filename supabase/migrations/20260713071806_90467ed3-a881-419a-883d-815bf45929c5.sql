
CREATE TABLE public.globe_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_name text NOT NULL,
  fiscal_year integer NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  ultimate_parent text,
  minimum_rate numeric NOT NULL DEFAULT 15.00,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  filed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.globe_reports TO authenticated;
GRANT ALL ON public.globe_reports TO service_role;
ALTER TABLE public.globe_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage globe_reports" ON public.globe_reports FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TABLE public.globe_jurisdiction_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.globe_reports(id) ON DELETE CASCADE,
  jurisdiction text NOT NULL,
  globe_income numeric NOT NULL DEFAULT 0,
  covered_taxes numeric NOT NULL DEFAULT 0,
  payroll_carveout numeric NOT NULL DEFAULT 0,
  tangible_carveout numeric NOT NULL DEFAULT 0,
  effective_tax_rate numeric GENERATED ALWAYS AS (
    CASE WHEN globe_income > 0 THEN (covered_taxes / globe_income) * 100 ELSE 0 END
  ) STORED,
  top_up_tax numeric GENERATED ALWAYS AS (
    GREATEST(0, (globe_income - payroll_carveout - tangible_carveout) * (0.15 - CASE WHEN globe_income > 0 THEN covered_taxes / globe_income ELSE 0 END))
  ) STORED,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.globe_jurisdiction_lines TO authenticated;
GRANT ALL ON public.globe_jurisdiction_lines TO service_role;
ALTER TABLE public.globe_jurisdiction_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage globe_lines" ON public.globe_jurisdiction_lines FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TRIGGER trg_globe_reports_updated BEFORE UPDATE ON public.globe_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_globe_lines_updated BEFORE UPDATE ON public.globe_jurisdiction_lines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
