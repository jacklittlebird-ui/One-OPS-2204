
CREATE TABLE public.bank_statement_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  file_name TEXT,
  source_format TEXT DEFAULT 'csv',
  period_start DATE,
  period_end DATE,
  opening_balance NUMERIC DEFAULT 0,
  closing_balance NUMERIC DEFAULT 0,
  line_count INTEGER DEFAULT 0,
  matched_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  imported_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_statement_imports TO authenticated;
GRANT ALL ON public.bank_statement_imports TO service_role;
ALTER TABLE public.bank_statement_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance manage imports" ON public.bank_statement_imports FOR ALL
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()));
CREATE TRIGGER trg_bsi_updated BEFORE UPDATE ON public.bank_statement_imports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.bank_statement_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES public.bank_statement_imports(id) ON DELETE CASCADE,
  line_date DATE,
  description TEXT,
  reference TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  running_balance NUMERIC,
  matched_payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  matched_receipt_id UUID REFERENCES public.receipts(id) ON DELETE SET NULL,
  match_confidence NUMERIC,
  match_method TEXT,
  matched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_statement_lines TO authenticated;
GRANT ALL ON public.bank_statement_lines TO service_role;
ALTER TABLE public.bank_statement_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance manage lines" ON public.bank_statement_lines FOR ALL
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()));
CREATE INDEX idx_bsl_import ON public.bank_statement_lines(import_id);

CREATE TABLE public.bank_match_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  keyword TEXT,
  reference_pattern TEXT,
  party_name TEXT,
  amount_tolerance NUMERIC DEFAULT 0.01,
  date_window_days INTEGER DEFAULT 5,
  priority INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_match_rules TO authenticated;
GRANT ALL ON public.bank_match_rules TO service_role;
ALTER TABLE public.bank_match_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance manage rules" ON public.bank_match_rules FOR ALL
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()));
CREATE TRIGGER trg_bmr_updated BEFORE UPDATE ON public.bank_match_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.auto_match_statement_lines(_import UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  imp public.bank_statement_imports%ROWTYPE;
  ln public.bank_statement_lines%ROWTYPE;
  v_matched INTEGER := 0;
  v_pid UUID;
  v_rid UUID;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO imp FROM public.bank_statement_imports WHERE id = _import;
  IF NOT FOUND THEN RAISE EXCEPTION 'Import not found'; END IF;

  FOR ln IN SELECT * FROM public.bank_statement_lines
            WHERE import_id = _import AND matched_payment_id IS NULL AND matched_receipt_id IS NULL
  LOOP
    v_pid := NULL; v_rid := NULL;
    IF ln.amount < 0 THEN
      SELECT id INTO v_pid FROM public.payments p
       WHERE p.bank_account_id = imp.bank_account_id
         AND LOWER(COALESCE(p.status,'')) = 'posted'
         AND ABS(p.amount - ABS(ln.amount)) <= 0.01
         AND ABS(p.payment_date - ln.line_date) <= 5
         AND NOT EXISTS (SELECT 1 FROM public.bank_statement_lines b WHERE b.matched_payment_id = p.id)
       ORDER BY ABS(p.payment_date - ln.line_date) ASC LIMIT 1;
    ELSE
      SELECT id INTO v_rid FROM public.receipts r
       WHERE r.bank_account_id = imp.bank_account_id
         AND LOWER(COALESCE(r.status,'')) = 'posted'
         AND ABS(r.amount - ln.amount) <= 0.01
         AND ABS(r.receipt_date - ln.line_date) <= 5
         AND NOT EXISTS (SELECT 1 FROM public.bank_statement_lines b WHERE b.matched_receipt_id = r.id)
       ORDER BY ABS(r.receipt_date - ln.line_date) ASC LIMIT 1;
    END IF;

    IF v_pid IS NOT NULL OR v_rid IS NOT NULL THEN
      UPDATE public.bank_statement_lines
        SET matched_payment_id = v_pid,
            matched_receipt_id = v_rid,
            match_method = 'auto_amount_date',
            match_confidence = 0.9,
            matched_at = now()
        WHERE id = ln.id;
      v_matched := v_matched + 1;
    END IF;
  END LOOP;

  UPDATE public.bank_statement_imports
     SET matched_count = (SELECT COUNT(*) FROM public.bank_statement_lines
                          WHERE import_id = _import AND (matched_payment_id IS NOT NULL OR matched_receipt_id IS NOT NULL)),
         status = CASE WHEN v_matched > 0 THEN 'matched' ELSE status END,
         updated_at = now()
   WHERE id = _import;

  RETURN v_matched;
END; $$;
