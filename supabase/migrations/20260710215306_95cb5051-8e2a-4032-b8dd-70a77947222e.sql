
CREATE TABLE public.cheque_books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  series_prefix TEXT,
  start_number INTEGER NOT NULL,
  end_number INTEGER NOT NULL,
  next_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cheque_books TO authenticated;
GRANT ALL ON public.cheque_books TO service_role;
ALTER TABLE public.cheque_books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance can manage cheque books" ON public.cheque_books FOR ALL
  USING (public.has_finance_access(auth.uid())) WITH CHECK (public.has_finance_access(auth.uid()));

CREATE TABLE public.cheques (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cheque_book_id UUID REFERENCES public.cheque_books(id) ON DELETE SET NULL,
  bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  cheque_number TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'issued', -- issued | received
  party_name TEXT NOT NULL,
  amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EGP',
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  cleared_date DATE,
  bounced_date DATE,
  bounce_reason TEXT,
  status TEXT NOT NULL DEFAULT 'Draft',
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  receipt_id UUID REFERENCES public.receipts(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cheques TO authenticated;
GRANT ALL ON public.cheques TO service_role;
ALTER TABLE public.cheques ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance can manage cheques" ON public.cheques FOR ALL
  USING (public.has_finance_access(auth.uid())) WITH CHECK (public.has_finance_access(auth.uid()));

CREATE UNIQUE INDEX ux_cheques_book_number ON public.cheques(cheque_book_id, cheque_number) WHERE cheque_book_id IS NOT NULL;
CREATE INDEX idx_cheques_bank ON public.cheques(bank_account_id);
CREATE INDEX idx_cheques_status ON public.cheques(status);
CREATE INDEX idx_cheques_due_date ON public.cheques(due_date);

CREATE TRIGGER trg_cheque_books_updated BEFORE UPDATE ON public.cheque_books
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cheques_updated BEFORE UPDATE ON public.cheques
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
