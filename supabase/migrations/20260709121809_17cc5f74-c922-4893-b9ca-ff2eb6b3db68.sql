
-- Add bank_account_id if missing (already present on receipts/payments per schema), and reconciliation link
ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS reconciliation_id UUID REFERENCES public.bank_reconciliations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS reconciliation_id UUID REFERENCES public.bank_reconciliations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_receipts_bank_recon ON public.receipts(bank_account_id, reconciliation_id);
CREATE INDEX IF NOT EXISTS idx_payments_bank_recon ON public.payments(bank_account_id, reconciliation_id);

-- Function: recompute system balance & difference for a reconciliation
CREATE OR REPLACE FUNCTION public.recalc_bank_reconciliation(_id UUID)
RETURNS public.bank_reconciliations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rec public.bank_reconciliations%ROWTYPE;
  opening NUMERIC := 0;
  inflow NUMERIC := 0;
  outflow NUMERIC := 0;
BEGIN
  SELECT * INTO rec FROM public.bank_reconciliations WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'bank_reconciliations % not found', _id; END IF;

  SELECT COALESCE(opening_balance, 0) INTO opening
  FROM public.bank_accounts WHERE id = rec.bank_account_id;

  SELECT COALESCE(SUM(amount), 0) INTO inflow
  FROM public.receipts
  WHERE bank_account_id = rec.bank_account_id
    AND LOWER(COALESCE(status, '')) = 'posted'
    AND receipt_date <= rec.statement_date;

  SELECT COALESCE(SUM(amount), 0) INTO outflow
  FROM public.payments
  WHERE bank_account_id = rec.bank_account_id
    AND LOWER(COALESCE(status, '')) = 'posted'
    AND payment_date <= rec.statement_date;

  UPDATE public.bank_reconciliations
  SET system_balance = opening + inflow - outflow,
      difference = COALESCE(statement_balance, 0) - (opening + inflow - outflow),
      updated_at = now()
  WHERE id = _id
  RETURNING * INTO rec;

  RETURN rec;
END; $$;

GRANT EXECUTE ON FUNCTION public.recalc_bank_reconciliation(UUID) TO authenticated;
