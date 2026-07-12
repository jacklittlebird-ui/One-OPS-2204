
CREATE TABLE public.credit_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_no TEXT NOT NULL UNIQUE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  airline_iata TEXT,
  airline_id UUID,
  note_date DATE NOT NULL DEFAULT CURRENT_DATE,
  currency TEXT NOT NULL DEFAULT 'USD',
  amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax NUMERIC(18,2) NOT NULL DEFAULT 0,
  total NUMERIC(18,2) NOT NULL DEFAULT 0,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  applied_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_notes TO authenticated;
GRANT ALL ON public.credit_notes TO service_role;
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance manages credit notes" ON public.credit_notes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()));
CREATE POLICY "Customer reads own credit notes" ON public.credit_notes FOR SELECT TO authenticated
  USING (UPPER(COALESCE(airline_iata,'')) = UPPER(COALESCE(public.current_customer_airline_iata(),'')));
CREATE TRIGGER trg_credit_notes_updated_at BEFORE UPDATE ON public.credit_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.debit_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_no TEXT NOT NULL UNIQUE,
  vendor_invoice_id UUID REFERENCES public.vendor_invoices(id) ON DELETE SET NULL,
  vendor_id UUID,
  vendor_name TEXT,
  note_date DATE NOT NULL DEFAULT CURRENT_DATE,
  currency TEXT NOT NULL DEFAULT 'USD',
  amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax NUMERIC(18,2) NOT NULL DEFAULT 0,
  total NUMERIC(18,2) NOT NULL DEFAULT 0,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  applied_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.debit_notes TO authenticated;
GRANT ALL ON public.debit_notes TO service_role;
ALTER TABLE public.debit_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance manages debit notes" ON public.debit_notes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()));
CREATE POLICY "Vendor reads own debit notes" ON public.debit_notes FOR SELECT TO authenticated
  USING (vendor_id = public.current_vendor_id());
CREATE TRIGGER trg_debit_notes_updated_at BEFORE UPDATE ON public.debit_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.calc_note_total() RETURNS TRIGGER LANGUAGE plpgsql SET search_path=public AS $$
BEGIN NEW.total := ROUND(COALESCE(NEW.amount,0) + COALESCE(NEW.tax,0), 2); RETURN NEW; END; $$;
CREATE TRIGGER trg_credit_notes_total BEFORE INSERT OR UPDATE ON public.credit_notes FOR EACH ROW EXECUTE FUNCTION public.calc_note_total();
CREATE TRIGGER trg_debit_notes_total BEFORE INSERT OR UPDATE ON public.debit_notes FOR EACH ROW EXECUTE FUNCTION public.calc_note_total();

CREATE OR REPLACE FUNCTION public.apply_credit_note_to_invoice(_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n record;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid())) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO n FROM public.credit_notes WHERE id=_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Note not found'; END IF;
  IF n.status = 'applied' THEN RAISE EXCEPTION 'Already applied'; END IF;
  IF n.invoice_id IS NULL THEN RAISE EXCEPTION 'No invoice linked'; END IF;
  UPDATE public.invoices SET
    paid_amount = COALESCE(paid_amount,0) + n.total,
    status = CASE WHEN COALESCE(paid_amount,0) + n.total >= COALESCE(total_amount, total, 0) THEN 'paid' ELSE status END,
    updated_at = now()
  WHERE id = n.invoice_id;
  UPDATE public.credit_notes SET status='applied', applied_at=now(), updated_at=now() WHERE id=_id;
  RETURN 'applied';
END; $$;

CREATE OR REPLACE FUNCTION public.apply_debit_note_to_vendor_invoice(_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n record;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid())) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO n FROM public.debit_notes WHERE id=_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Note not found'; END IF;
  IF n.status = 'applied' THEN RAISE EXCEPTION 'Already applied'; END IF;
  IF n.vendor_invoice_id IS NULL THEN RAISE EXCEPTION 'No vendor invoice linked'; END IF;
  UPDATE public.vendor_invoices SET
    total = GREATEST(COALESCE(total,0) - n.total, 0),
    updated_at = now()
  WHERE id = n.vendor_invoice_id;
  UPDATE public.debit_notes SET status='applied', applied_at=now(), updated_at=now() WHERE id=_id;
  RETURN 'applied';
END; $$;
