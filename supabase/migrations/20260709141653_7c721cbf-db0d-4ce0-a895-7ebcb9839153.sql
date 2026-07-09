
CREATE TABLE public.fixed_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_code TEXT NOT NULL UNIQUE,
  asset_name TEXT NOT NULL,
  category TEXT,
  company_id UUID REFERENCES public.companies(id),
  station_id UUID REFERENCES public.finance_stations(id),
  cost_center TEXT,
  purchase_date DATE NOT NULL,
  in_service_date DATE,
  purchase_cost NUMERIC NOT NULL DEFAULT 0,
  salvage_value NUMERIC NOT NULL DEFAULT 0,
  useful_life_months INTEGER NOT NULL DEFAULT 60,
  depreciation_method TEXT NOT NULL DEFAULT 'straight_line',
  accumulated_depreciation NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Active',
  disposal_date DATE,
  disposal_amount NUMERIC,
  currency TEXT NOT NULL DEFAULT 'USD',
  asset_account_code TEXT,
  depreciation_account_code TEXT,
  accumulated_depr_account_code TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fixed_assets TO authenticated;
GRANT ALL ON public.fixed_assets TO service_role;
ALTER TABLE public.fixed_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance can view fixed assets" ON public.fixed_assets FOR SELECT TO authenticated USING (public.has_finance_access(auth.uid()));
CREATE POLICY "Finance can insert fixed assets" ON public.fixed_assets FOR INSERT TO authenticated WITH CHECK (public.has_finance_access(auth.uid()));
CREATE POLICY "Finance can update fixed assets" ON public.fixed_assets FOR UPDATE TO authenticated USING (public.has_finance_access(auth.uid())) WITH CHECK (public.has_finance_access(auth.uid()));
CREATE POLICY "Finance can delete fixed assets" ON public.fixed_assets FOR DELETE TO authenticated USING (public.has_finance_access(auth.uid()));

CREATE TRIGGER update_fixed_assets_updated_at BEFORE UPDATE ON public.fixed_assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.depreciation_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.fixed_assets(id) ON DELETE CASCADE,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  depreciation_amount NUMERIC NOT NULL DEFAULT 0,
  journal_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  posted_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (asset_id, period_year, period_month)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.depreciation_entries TO authenticated;
GRANT ALL ON public.depreciation_entries TO service_role;
ALTER TABLE public.depreciation_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance can view depreciation" ON public.depreciation_entries FOR SELECT TO authenticated USING (public.has_finance_access(auth.uid()));
CREATE POLICY "Finance can insert depreciation" ON public.depreciation_entries FOR INSERT TO authenticated WITH CHECK (public.has_finance_access(auth.uid()));
CREATE POLICY "Finance can update depreciation" ON public.depreciation_entries FOR UPDATE TO authenticated USING (public.has_finance_access(auth.uid())) WITH CHECK (public.has_finance_access(auth.uid()));
CREATE POLICY "Finance can delete depreciation" ON public.depreciation_entries FOR DELETE TO authenticated USING (public.has_finance_access(auth.uid()));

CREATE TRIGGER update_depreciation_entries_updated_at BEFORE UPDATE ON public.depreciation_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
