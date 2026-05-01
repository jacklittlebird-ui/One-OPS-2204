
-- Bank accounts
CREATE TABLE public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT,
  iban TEXT,
  swift TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  opening_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  current_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.cash_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name TEXT NOT NULL,
  location TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  opening_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  current_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  custodian TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_no TEXT NOT NULL UNIQUE,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vendor_name TEXT NOT NULL,
  bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  cash_account_id UUID REFERENCES public.cash_accounts(id) ON DELETE SET NULL,
  amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  method TEXT NOT NULL DEFAULT 'Bank Transfer',
  reference TEXT,
  vendor_invoice_id UUID REFERENCES public.vendor_invoices(id) ON DELETE SET NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Posted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_no TEXT NOT NULL UNIQUE,
  receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_name TEXT NOT NULL,
  bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  cash_account_id UUID REFERENCES public.cash_accounts(id) ON DELETE SET NULL,
  amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  method TEXT NOT NULL DEFAULT 'Bank Transfer',
  reference TEXT,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Posted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.bank_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_no TEXT NOT NULL UNIQUE,
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  from_bank_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  from_cash_id UUID REFERENCES public.cash_accounts(id) ON DELETE SET NULL,
  to_bank_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  to_cash_id UUID REFERENCES public.cash_accounts(id) ON DELETE SET NULL,
  amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  fees NUMERIC(18,2) NOT NULL DEFAULT 0,
  reference TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Posted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.bank_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  statement_date DATE NOT NULL,
  statement_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  system_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  difference NUMERIC(18,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Open',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_reconciliations ENABLE ROW LEVEL SECURITY;

-- Read for any authenticated user
CREATE POLICY "auth read bank_accounts" ON public.bank_accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read cash_accounts" ON public.cash_accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read payments" ON public.payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read receipts" ON public.receipts FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read bank_transfers" ON public.bank_transfers FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read bank_reconciliations" ON public.bank_reconciliations FOR SELECT TO authenticated USING (true);

-- Write only for finance/admin roles
DO $$ BEGIN
  PERFORM 1;
END $$;

CREATE POLICY "finance write bank_accounts" ON public.bank_accounts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'receivables') OR public.has_role(auth.uid(),'payables') OR public.has_role(auth.uid(),'general_accounts'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'receivables') OR public.has_role(auth.uid(),'payables') OR public.has_role(auth.uid(),'general_accounts'));

CREATE POLICY "finance write cash_accounts" ON public.cash_accounts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'receivables') OR public.has_role(auth.uid(),'payables') OR public.has_role(auth.uid(),'general_accounts'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'receivables') OR public.has_role(auth.uid(),'payables') OR public.has_role(auth.uid(),'general_accounts'));

CREATE POLICY "finance write payments" ON public.payments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'payables') OR public.has_role(auth.uid(),'general_accounts'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'payables') OR public.has_role(auth.uid(),'general_accounts'));

CREATE POLICY "finance write receipts" ON public.receipts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'receivables') OR public.has_role(auth.uid(),'general_accounts'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'receivables') OR public.has_role(auth.uid(),'general_accounts'));

CREATE POLICY "finance write bank_transfers" ON public.bank_transfers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'general_accounts'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'general_accounts'));

CREATE POLICY "finance write bank_reconciliations" ON public.bank_reconciliations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'general_accounts'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'general_accounts'));

CREATE INDEX idx_payments_date ON public.payments(payment_date DESC);
CREATE INDEX idx_receipts_date ON public.receipts(receipt_date DESC);
CREATE INDEX idx_bank_transfers_date ON public.bank_transfers(transfer_date DESC);
CREATE INDEX idx_bank_recs_date ON public.bank_reconciliations(statement_date DESC);
