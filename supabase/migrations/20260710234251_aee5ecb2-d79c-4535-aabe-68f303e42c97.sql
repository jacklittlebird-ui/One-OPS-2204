
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  entity_type TEXT,
  entity_id UUID,
  current_version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','pending_signature','signed','expired','archived')),
  expiry_date DATE,
  tags TEXT[],
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read documents" ON public.documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Finance manages documents" ON public.documents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()) OR uploaded_by = auth.uid())
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()) OR uploaded_by = auth.uid());
CREATE TRIGGER trg_documents_updated BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  notes TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(document_id, version_number)
);
CREATE INDEX idx_docver_doc ON public.document_versions(document_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_versions TO authenticated;
GRANT ALL ON public.document_versions TO service_role;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read doc versions" ON public.document_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Finance manages doc versions" ON public.document_versions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()) OR uploaded_by = auth.uid())
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()) OR uploaded_by = auth.uid());

CREATE TABLE public.document_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  version_id UUID REFERENCES public.document_versions(id) ON DELETE SET NULL,
  signer_user_id UUID REFERENCES auth.users(id),
  signer_name TEXT NOT NULL,
  signer_email TEXT,
  role_label TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','signed','declined','cancelled')),
  signed_at TIMESTAMPTZ,
  signature_data TEXT,
  ip_address TEXT,
  order_index INTEGER NOT NULL DEFAULT 1,
  requested_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_docsig_doc ON public.document_signatures(document_id);
CREATE INDEX idx_docsig_signer ON public.document_signatures(signer_user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_signatures TO authenticated;
GRANT ALL ON public.document_signatures TO service_role;
ALTER TABLE public.document_signatures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own or finance signatures" ON public.document_signatures FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid())
         OR signer_user_id = auth.uid() OR requested_by = auth.uid());
CREATE POLICY "Finance creates signatures" ON public.document_signatures FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()));
CREATE POLICY "Signer or finance updates signature" ON public.document_signatures FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()) OR signer_user_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()) OR signer_user_id = auth.uid());
CREATE POLICY "Finance deletes signatures" ON public.document_signatures FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()));
CREATE TRIGGER trg_docsig_updated BEFORE UPDATE ON public.document_signatures FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- storage policies for the document-uploads bucket (bucket created via API)
CREATE POLICY "Auth read document files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'document-uploads');
CREATE POLICY "Auth upload document files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'document-uploads');
CREATE POLICY "Uploader or finance updates files" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'document-uploads' AND (owner = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid())));
CREATE POLICY "Finance deletes files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'document-uploads' AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid())));
