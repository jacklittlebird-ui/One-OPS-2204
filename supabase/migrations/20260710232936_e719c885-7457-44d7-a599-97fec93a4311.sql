
CREATE TABLE IF NOT EXISTS public.vendor_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  vendor_id UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_users TO authenticated;
GRANT ALL ON public.vendor_users TO service_role;
ALTER TABLE public.vendor_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendor users see their own link"
  ON public.vendor_users FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role) OR public.has_finance_access(auth.uid()));

CREATE POLICY "Admin and finance manage vendor users"
  ON public.vendor_users FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_finance_access(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_finance_access(auth.uid()));

CREATE TRIGGER trg_vendor_users_updated
  BEFORE UPDATE ON public.vendor_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.current_vendor_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT vendor_id FROM public.vendor_users
   WHERE user_id = auth.uid() AND is_active = TRUE
   LIMIT 1
$$;

CREATE TABLE IF NOT EXISTS public.vendor_invoice_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  submitted_by UUID,
  submission_no TEXT NOT NULL,
  invoice_no TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE,
  currency TEXT NOT NULL DEFAULT 'EGP',
  amount NUMERIC NOT NULL DEFAULT 0,
  vat NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  attachment_url TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  reviewer_notes TEXT,
  approved_vendor_invoice_id UUID REFERENCES public.vendor_invoices(id) ON DELETE SET NULL,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_invoice_submissions TO authenticated;
GRANT ALL ON public.vendor_invoice_submissions TO service_role;
ALTER TABLE public.vendor_invoice_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors see their own submissions"
  ON public.vendor_invoice_submissions FOR SELECT TO authenticated
  USING (vendor_id = public.current_vendor_id() OR public.has_role(auth.uid(), 'admin'::app_role) OR public.has_finance_access(auth.uid()));

CREATE POLICY "Vendors insert their own submissions"
  ON public.vendor_invoice_submissions FOR INSERT TO authenticated
  WITH CHECK (vendor_id = public.current_vendor_id() OR public.has_role(auth.uid(), 'admin'::app_role) OR public.has_finance_access(auth.uid()));

CREATE POLICY "Vendors update draft or finance updates any"
  ON public.vendor_invoice_submissions FOR UPDATE TO authenticated
  USING ((vendor_id = public.current_vendor_id() AND status IN ('submitted','draft')) OR public.has_role(auth.uid(), 'admin'::app_role) OR public.has_finance_access(auth.uid()))
  WITH CHECK ((vendor_id = public.current_vendor_id() AND status IN ('submitted','draft')) OR public.has_role(auth.uid(), 'admin'::app_role) OR public.has_finance_access(auth.uid()));

CREATE POLICY "Finance and admin delete submissions"
  ON public.vendor_invoice_submissions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_finance_access(auth.uid()));

CREATE TRIGGER trg_vendor_submissions_updated
  BEFORE UPDATE ON public.vendor_invoice_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.vendor_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  uploaded_by UUID,
  doc_type TEXT NOT NULL,
  doc_name TEXT NOT NULL,
  file_url TEXT,
  expiry_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_documents TO authenticated;
GRANT ALL ON public.vendor_documents TO service_role;
ALTER TABLE public.vendor_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors see their own documents"
  ON public.vendor_documents FOR SELECT TO authenticated
  USING (vendor_id = public.current_vendor_id() OR public.has_role(auth.uid(), 'admin'::app_role) OR public.has_finance_access(auth.uid()));

CREATE POLICY "Vendors upload their own documents"
  ON public.vendor_documents FOR INSERT TO authenticated
  WITH CHECK (vendor_id = public.current_vendor_id() OR public.has_role(auth.uid(), 'admin'::app_role) OR public.has_finance_access(auth.uid()));

CREATE POLICY "Vendors update own documents"
  ON public.vendor_documents FOR UPDATE TO authenticated
  USING (vendor_id = public.current_vendor_id() OR public.has_role(auth.uid(), 'admin'::app_role) OR public.has_finance_access(auth.uid()))
  WITH CHECK (vendor_id = public.current_vendor_id() OR public.has_role(auth.uid(), 'admin'::app_role) OR public.has_finance_access(auth.uid()));

CREATE POLICY "Vendors delete own documents"
  ON public.vendor_documents FOR DELETE TO authenticated
  USING (vendor_id = public.current_vendor_id() OR public.has_role(auth.uid(), 'admin'::app_role) OR public.has_finance_access(auth.uid()));

CREATE TRIGGER trg_vendor_documents_updated
  BEFORE UPDATE ON public.vendor_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
