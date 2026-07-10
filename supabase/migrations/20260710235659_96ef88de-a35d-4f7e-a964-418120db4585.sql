
CREATE TABLE public.eta_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  submission_uuid TEXT,
  long_id TEXT,
  internal_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  error_message TEXT,
  document_type TEXT NOT NULL DEFAULT 'invoice',
  payload JSONB,
  response JSONB,
  environment TEXT NOT NULL DEFAULT 'preprod',
  submitted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eta_submissions TO authenticated;
GRANT ALL ON public.eta_submissions TO service_role;
ALTER TABLE public.eta_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance manages ETA submissions" ON public.eta_submissions FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()))
WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()));
CREATE TRIGGER trg_eta_submissions_updated_at BEFORE UPDATE ON public.eta_submissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.vat_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_year INT NOT NULL,
  period_month INT NOT NULL,
  company_id UUID REFERENCES public.companies(id),
  output_vat NUMERIC NOT NULL DEFAULT 0,
  input_vat NUMERIC NOT NULL DEFAULT 0,
  net_vat NUMERIC NOT NULL DEFAULT 0,
  total_sales NUMERIC NOT NULL DEFAULT 0,
  total_purchases NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  filed_at TIMESTAMPTZ,
  filed_by UUID REFERENCES auth.users(id),
  reference_no TEXT,
  notes TEXT,
  breakdown JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (period_year, period_month, company_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vat_returns TO authenticated;
GRANT ALL ON public.vat_returns TO service_role;
ALTER TABLE public.vat_returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance manages VAT returns" ON public.vat_returns FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()))
WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()));
CREATE TRIGGER trg_vat_returns_updated_at BEFORE UPDATE ON public.vat_returns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.compute_vat_return(_year INT, _month INT, _company UUID DEFAULT NULL)
RETURNS TABLE (output_vat NUMERIC, input_vat NUMERIC, net_vat NUMERIC, total_sales NUMERIC, total_purchases NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH sales AS (
    SELECT COALESCE(SUM(subtotal),0) AS s, COALESCE(SUM(vat),0) AS v
    FROM public.invoices
    WHERE COALESCE(invoice_direction::text,'outbound')='outbound'
      AND LOWER(COALESCE(status::text,'')) IN ('finalized','sent','paid','overdue')
      AND EXTRACT(YEAR FROM date)::INT = _year AND EXTRACT(MONTH FROM date)::INT = _month
  ), purch AS (
    SELECT COALESCE(SUM(amount),0) AS s, COALESCE(SUM(vat),0) AS v
    FROM public.vendor_invoices
    WHERE LOWER(COALESCE(status,'')) NOT IN ('cancelled','void','draft')
      AND EXTRACT(YEAR FROM date)::INT = _year AND EXTRACT(MONTH FROM date)::INT = _month
  )
  SELECT (SELECT v FROM sales), (SELECT v FROM purch),
         (SELECT v FROM sales) - (SELECT v FROM purch),
         (SELECT s FROM sales), (SELECT s FROM purch);
$$;
GRANT EXECUTE ON FUNCTION public.compute_vat_return(INT, INT, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.wht_summary(_from DATE, _to DATE)
RETURNS TABLE (vendor_name TEXT, certificate_count BIGINT, gross_amount NUMERIC, wht_amount NUMERIC, currency TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.vendor_name, COUNT(*)::BIGINT,
         COALESCE(SUM(c.gross_amount),0), COALESCE(SUM(c.wht_amount),0), MAX(c.currency)
  FROM public.wht_certificates c
  WHERE c.issue_date BETWEEN _from AND _to
  GROUP BY c.vendor_name
  ORDER BY 4 DESC;
$$;
GRANT EXECUTE ON FUNCTION public.wht_summary(DATE, DATE) TO authenticated;
