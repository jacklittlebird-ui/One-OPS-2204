
CREATE TABLE IF NOT EXISTS public.asset_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.fixed_assets(id) ON DELETE CASCADE,
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  from_location TEXT,
  to_location TEXT NOT NULL,
  from_custodian TEXT,
  to_custodian TEXT,
  from_department TEXT,
  to_department TEXT,
  reason TEXT,
  reference_no TEXT,
  approved_by UUID,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','completed','cancelled')),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_transfers TO authenticated;
GRANT ALL ON public.asset_transfers TO service_role;
ALTER TABLE public.asset_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance can view transfers" ON public.asset_transfers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()));
CREATE POLICY "Finance can manage transfers" ON public.asset_transfers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()));
CREATE TRIGGER trg_asset_transfers_updated BEFORE UPDATE ON public.asset_transfers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_asset_transfers_asset ON public.asset_transfers(asset_id);


CREATE TABLE IF NOT EXISTS public.asset_disposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.fixed_assets(id) ON DELETE CASCADE,
  disposal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  disposal_type TEXT NOT NULL CHECK (disposal_type IN ('sale','scrap','donation','loss','trade_in')),
  disposal_amount NUMERIC(18,2) DEFAULT 0,
  buyer TEXT,
  book_value NUMERIC(18,2) DEFAULT 0,
  accumulated_depreciation NUMERIC(18,2) DEFAULT 0,
  gain_loss NUMERIC(18,2) DEFAULT 0,
  reason TEXT,
  reference_no TEXT,
  approved_by UUID,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','posted','cancelled')),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_disposals TO authenticated;
GRANT ALL ON public.asset_disposals TO service_role;
ALTER TABLE public.asset_disposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance can view disposals" ON public.asset_disposals FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()));
CREATE POLICY "Finance can manage disposals" ON public.asset_disposals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()));
CREATE TRIGGER trg_asset_disposals_updated BEFORE UPDATE ON public.asset_disposals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_asset_disposals_asset ON public.asset_disposals(asset_id);


CREATE TABLE IF NOT EXISTS public.asset_physical_counts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  count_no TEXT NOT NULL,
  count_date DATE NOT NULL DEFAULT CURRENT_DATE,
  location TEXT,
  department TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','cancelled')),
  notes TEXT,
  performed_by UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_physical_counts TO authenticated;
GRANT ALL ON public.asset_physical_counts TO service_role;
ALTER TABLE public.asset_physical_counts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance can view counts" ON public.asset_physical_counts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()));
CREATE POLICY "Finance can manage counts" ON public.asset_physical_counts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()));
CREATE TRIGGER trg_asset_counts_updated BEFORE UPDATE ON public.asset_physical_counts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE IF NOT EXISTS public.asset_physical_count_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  count_id UUID NOT NULL REFERENCES public.asset_physical_counts(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES public.fixed_assets(id) ON DELETE SET NULL,
  scanned_code TEXT,
  found BOOLEAN NOT NULL DEFAULT true,
  expected_location TEXT,
  actual_location TEXT,
  condition TEXT CHECK (condition IN ('good','fair','poor','damaged','missing')),
  variance TEXT CHECK (variance IN ('match','location_mismatch','condition_issue','not_in_register','missing')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_physical_count_lines TO authenticated;
GRANT ALL ON public.asset_physical_count_lines TO service_role;
ALTER TABLE public.asset_physical_count_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance can view count lines" ON public.asset_physical_count_lines FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()));
CREATE POLICY "Finance can manage count lines" ON public.asset_physical_count_lines FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_apcl_count ON public.asset_physical_count_lines(count_id);
CREATE INDEX IF NOT EXISTS idx_apcl_asset ON public.asset_physical_count_lines(asset_id);
