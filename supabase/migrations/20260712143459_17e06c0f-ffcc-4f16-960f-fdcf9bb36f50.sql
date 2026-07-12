
CREATE TABLE public.transfer_pricing_studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_year INTEGER NOT NULL,
  related_party_id UUID REFERENCES public.related_parties(id),
  transaction_type TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'TNMM',
  tested_party TEXT,
  functional_analysis TEXT,
  comparables_source TEXT,
  benchmarking_range_low NUMERIC(10,4),
  benchmarking_range_high NUMERIC(10,4),
  tested_margin NUMERIC(10,4),
  arms_length_conclusion TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transfer_pricing_studies TO authenticated;
GRANT ALL ON public.transfer_pricing_studies TO service_role;
ALTER TABLE public.transfer_pricing_studies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Accountants manage TP studies" ON public.transfer_pricing_studies
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant'));

CREATE TABLE public.transfer_pricing_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID REFERENCES public.transfer_pricing_studies(id) ON DELETE CASCADE,
  adjustment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  adjustment_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  direction TEXT NOT NULL DEFAULT 'increase',
  rationale TEXT,
  posted_journal_id UUID,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transfer_pricing_adjustments TO authenticated;
GRANT ALL ON public.transfer_pricing_adjustments TO service_role;
ALTER TABLE public.transfer_pricing_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Accountants manage TP adjustments" ON public.transfer_pricing_adjustments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'accountant'));

CREATE TRIGGER trg_tp_studies_upd BEFORE UPDATE ON public.transfer_pricing_studies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tp_adjustments_upd BEFORE UPDATE ON public.transfer_pricing_adjustments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
