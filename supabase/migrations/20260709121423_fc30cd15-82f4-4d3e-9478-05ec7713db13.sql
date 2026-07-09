
-- Receipts multi-currency
ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC DEFAULT 1,
  ADD COLUMN IF NOT EXISTS exchange_rate_date DATE,
  ADD COLUMN IF NOT EXISTS base_currency TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS base_amount NUMERIC;

-- Payments multi-currency
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC DEFAULT 1,
  ADD COLUMN IF NOT EXISTS exchange_rate_date DATE,
  ADD COLUMN IF NOT EXISTS base_currency TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS base_amount NUMERIC;

-- Trigger: keep base_amount in sync
CREATE OR REPLACE FUNCTION public.calc_receipt_base_amount()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.base_amount := COALESCE(NEW.amount, 0) * COALESCE(NEW.exchange_rate, 1);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_calc_receipt_base ON public.receipts;
CREATE TRIGGER trg_calc_receipt_base
BEFORE INSERT OR UPDATE ON public.receipts
FOR EACH ROW EXECUTE FUNCTION public.calc_receipt_base_amount();

CREATE OR REPLACE FUNCTION public.calc_payment_base_amount()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.base_amount := COALESCE(NEW.amount, 0) * COALESCE(NEW.exchange_rate, 1);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_calc_payment_base ON public.payments;
CREATE TRIGGER trg_calc_payment_base
BEFORE INSERT OR UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.calc_payment_base_amount();

-- Trigger: mark invoice as Paid when receipt is Posted
CREATE OR REPLACE FUNCTION public.sync_invoice_status_from_receipt()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.invoice_id IS NOT NULL AND LOWER(COALESCE(NEW.status, '')) = 'posted' THEN
    UPDATE public.invoices
    SET status = 'Paid',
        payment_date = COALESCE(payment_date, NEW.receipt_date),
        payment_ref = COALESCE(payment_ref, NEW.receipt_no),
        updated_at = now()
    WHERE id = NEW.invoice_id
      AND status IS DISTINCT FROM 'Paid';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_sync_invoice_from_receipt ON public.receipts;
CREATE TRIGGER trg_sync_invoice_from_receipt
AFTER INSERT OR UPDATE ON public.receipts
FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_status_from_receipt();

-- Trigger: mark vendor invoice as Paid when payment is Posted
CREATE OR REPLACE FUNCTION public.sync_vendor_invoice_status_from_payment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.vendor_invoice_id IS NOT NULL AND LOWER(COALESCE(NEW.status, '')) = 'posted' THEN
    UPDATE public.vendor_invoices
    SET status = 'Paid',
        updated_at = now()
    WHERE id = NEW.vendor_invoice_id
      AND status IS DISTINCT FROM 'Paid';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_sync_vendor_invoice_from_payment ON public.payments;
CREATE TRIGGER trg_sync_vendor_invoice_from_payment
AFTER INSERT OR UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.sync_vendor_invoice_status_from_payment();
