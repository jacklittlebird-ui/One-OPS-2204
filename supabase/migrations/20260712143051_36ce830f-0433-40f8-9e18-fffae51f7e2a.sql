
CREATE TABLE public.related_parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_name TEXT NOT NULL,
  relationship_type TEXT NOT NULL,
  related_company_id UUID REFERENCES public.companies(id),
  tax_id TEXT,
  country TEXT,
  contact_email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.related_parties TO authenticated;
GRANT ALL ON public.related_parties TO service_role;
ALTER TABLE public.related_parties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and accountants manage related parties"
ON public.related_parties FOR ALL TO authenticated
USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'accountant'))
WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'accountant'));
CREATE TRIGGER trg_related_parties_updated
BEFORE UPDATE ON public.related_parties
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.related_party_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  related_party_id UUID NOT NULL REFERENCES public.related_parties(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id),
  transaction_date DATE NOT NULL,
  transaction_type TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EGP',
  reference_document TEXT,
  arms_length BOOLEAN NOT NULL DEFAULT true,
  disclosure_period TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.related_party_transactions TO authenticated;
GRANT ALL ON public.related_party_transactions TO service_role;
ALTER TABLE public.related_party_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and accountants manage RPTs"
ON public.related_party_transactions FOR ALL TO authenticated
USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'accountant'))
WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'accountant'));
CREATE TRIGGER trg_rpt_updated
BEFORE UPDATE ON public.related_party_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_rpt_party ON public.related_party_transactions(related_party_id);
CREATE INDEX idx_rpt_date ON public.related_party_transactions(transaction_date);
