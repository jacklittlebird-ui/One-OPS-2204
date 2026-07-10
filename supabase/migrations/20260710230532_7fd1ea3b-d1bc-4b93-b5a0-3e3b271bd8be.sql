
CREATE TABLE IF NOT EXISTS public.tax_filings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  tax_type TEXT NOT NULL CHECK (tax_type IN ('VAT','WHT','Corporate','Payroll','Other')),
  period_from DATE NOT NULL,
  period_to DATE NOT NULL,
  due_date DATE NOT NULL,
  filing_date DATE,
  reference_no TEXT,
  taxable_base NUMERIC(18,2) DEFAULT 0,
  tax_amount NUMERIC(18,2) DEFAULT 0,
  paid_amount NUMERIC(18,2) DEFAULT 0,
  currency TEXT DEFAULT 'EGP',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','filed','paid','overdue','cancelled')),
  e_invoice_status TEXT DEFAULT 'n/a' CHECK (e_invoice_status IN ('n/a','pending','submitted','accepted','rejected')),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tax_filings TO authenticated;
GRANT ALL ON public.tax_filings TO service_role;
ALTER TABLE public.tax_filings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance can view tax filings" ON public.tax_filings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()));

CREATE POLICY "Finance can insert tax filings" ON public.tax_filings
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()));

CREATE POLICY "Finance can update tax filings" ON public.tax_filings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()));

CREATE POLICY "Admins can delete tax filings" ON public.tax_filings
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_tax_filings_updated
  BEFORE UPDATE ON public.tax_filings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_tax_filings_due ON public.tax_filings(due_date);
CREATE INDEX IF NOT EXISTS idx_tax_filings_company ON public.tax_filings(company_id);
CREATE INDEX IF NOT EXISTS idx_tax_filings_status ON public.tax_filings(status);


CREATE TABLE IF NOT EXISTS public.tax_calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  tax_type TEXT NOT NULL,
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  recurrence TEXT DEFAULT 'monthly' CHECK (recurrence IN ('once','monthly','quarterly','yearly')),
  reminder_days INTEGER NOT NULL DEFAULT 7,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tax_calendar_events TO authenticated;
GRANT ALL ON public.tax_calendar_events TO service_role;
ALTER TABLE public.tax_calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance can view tax events" ON public.tax_calendar_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()));

CREATE POLICY "Finance can manage tax events" ON public.tax_calendar_events
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()));

CREATE TRIGGER trg_tax_events_updated
  BEFORE UPDATE ON public.tax_calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_tax_events_date ON public.tax_calendar_events(event_date);
