
-- Phase 1u: Tax Withholding Management
CREATE TABLE public.wht_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  rate NUMERIC(6,3) NOT NULL DEFAULT 0,
  applies_to TEXT NOT NULL DEFAULT 'vendor_payment',
  service_category TEXT,
  min_amount NUMERIC(18,2) DEFAULT 0,
  liability_account_id UUID REFERENCES public.chart_of_accounts(id),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wht_rules TO authenticated;
GRANT ALL ON public.wht_rules TO service_role;
ALTER TABLE public.wht_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance can manage wht rules" ON public.wht_rules FOR ALL
  USING (public.has_finance_access(auth.uid())) WITH CHECK (public.has_finance_access(auth.uid()));

CREATE TABLE public.wht_certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  certificate_no TEXT NOT NULL UNIQUE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  wht_rule_id UUID REFERENCES public.wht_rules(id) ON DELETE SET NULL,
  vendor_name TEXT NOT NULL,
  vendor_tax_id TEXT,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  vendor_invoice_id UUID REFERENCES public.vendor_invoices(id) ON DELETE SET NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  period_start DATE,
  period_end DATE,
  gross_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  wht_rate NUMERIC(6,3) NOT NULL DEFAULT 0,
  wht_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EGP',
  status TEXT NOT NULL DEFAULT 'Issued',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wht_certificates TO authenticated;
GRANT ALL ON public.wht_certificates TO service_role;
ALTER TABLE public.wht_certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance can manage wht certificates" ON public.wht_certificates FOR ALL
  USING (public.has_finance_access(auth.uid())) WITH CHECK (public.has_finance_access(auth.uid()));

CREATE TRIGGER trg_wht_rules_updated BEFORE UPDATE ON public.wht_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_wht_certs_updated BEFORE UPDATE ON public.wht_certificates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_wht_certs_payment ON public.wht_certificates(payment_id);
CREATE INDEX idx_wht_certs_vendor_invoice ON public.wht_certificates(vendor_invoice_id);
CREATE INDEX idx_wht_certs_issue_date ON public.wht_certificates(issue_date);
