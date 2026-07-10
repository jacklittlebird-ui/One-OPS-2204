
CREATE TABLE IF NOT EXISTS public.intercompany_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ic_no text NOT NULL UNIQUE,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  from_company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  to_company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  from_station_id uuid REFERENCES public.finance_stations(id) ON DELETE SET NULL,
  to_station_id uuid REFERENCES public.finance_stations(id) ON DELETE SET NULL,
  description text,
  currency text NOT NULL DEFAULT 'USD',
  amount numeric(18,2) NOT NULL CHECK (amount >= 0),
  exchange_rate numeric(18,6) NOT NULL DEFAULT 1,
  base_amount numeric(18,2) GENERATED ALWAYS AS (amount * exchange_rate) STORED,
  status text NOT NULL DEFAULT 'Draft',
  from_journal_id uuid REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  to_journal_id uuid REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  reconciled_at timestamptz,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ic_diff_companies CHECK (from_company_id <> to_company_id)
);

CREATE INDEX IF NOT EXISTS idx_ic_from_company ON public.intercompany_transactions(from_company_id);
CREATE INDEX IF NOT EXISTS idx_ic_to_company ON public.intercompany_transactions(to_company_id);
CREATE INDEX IF NOT EXISTS idx_ic_date ON public.intercompany_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_ic_status ON public.intercompany_transactions(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.intercompany_transactions TO authenticated;
GRANT ALL ON public.intercompany_transactions TO service_role;

ALTER TABLE public.intercompany_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance can view IC transactions"
  ON public.intercompany_transactions FOR SELECT TO authenticated
  USING (public.has_finance_access(auth.uid()));

CREATE POLICY "Finance can insert IC transactions"
  ON public.intercompany_transactions FOR INSERT TO authenticated
  WITH CHECK (public.has_finance_access(auth.uid()));

CREATE POLICY "Finance can update IC transactions"
  ON public.intercompany_transactions FOR UPDATE TO authenticated
  USING (public.has_finance_access(auth.uid()))
  WITH CHECK (public.has_finance_access(auth.uid()));

CREATE POLICY "Admins can delete IC transactions"
  ON public.intercompany_transactions FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_ic_updated_at
  BEFORE UPDATE ON public.intercompany_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
