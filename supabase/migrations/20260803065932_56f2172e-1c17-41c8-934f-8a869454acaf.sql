-- =========================================================
-- Treasury Vouchers — alignment with Treasury Spec AR v4
-- =========================================================

ALTER TABLE public.treasury_vouchers
  ADD COLUMN IF NOT EXISTS payment_subtype text,
  ADD COLUMN IF NOT EXISTS pending_kind text,
  ADD COLUMN IF NOT EXISTS expense_item text,
  ADD COLUMN IF NOT EXISTS settled_amount numeric,
  ADD COLUMN IF NOT EXISTS returned_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS repayment_plan text,
  ADD COLUMN IF NOT EXISTS recovered_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS finance_approved_by uuid,
  ADD COLUMN IF NOT EXISTS finance_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS print_unlocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS settlement_voucher_id uuid;

ALTER TABLE public.treasury_vouchers DROP CONSTRAINT IF EXISTS treasury_vouchers_payment_subtype_chk;
ALTER TABLE public.treasury_vouchers ADD CONSTRAINT treasury_vouchers_payment_subtype_chk
  CHECK (payment_subtype IS NULL OR payment_subtype IN ('general','pending_custody','advance','cost'));

ALTER TABLE public.treasury_vouchers DROP CONSTRAINT IF EXISTS treasury_vouchers_pending_kind_chk;
ALTER TABLE public.treasury_vouchers ADD CONSTRAINT treasury_vouchers_pending_kind_chk
  CHECK (pending_kind IS NULL OR pending_kind IN ('company','current'));

ALTER TABLE public.treasury_vouchers DROP CONSTRAINT IF EXISTS treasury_vouchers_repayment_plan_chk;
ALTER TABLE public.treasury_vouchers ADD CONSTRAINT treasury_vouchers_repayment_plan_chk
  CHECK (repayment_plan IS NULL OR repayment_plan IN ('full','2','3','4','6'));

CREATE INDEX IF NOT EXISTS idx_tv_subtype_status ON public.treasury_vouchers (payment_subtype, status, voucher_date);
CREATE INDEX IF NOT EXISTS idx_tv_scope ON public.treasury_vouchers (company_id, station_id, currency, voucher_date);

UPDATE public.treasury_vouchers SET payment_subtype = 'general'
 WHERE voucher_type = 'payment' AND payment_subtype IS NULL;
UPDATE public.treasury_vouchers SET payment_subtype = 'pending_custody', pending_kind = COALESCE(pending_kind,'company')
 WHERE voucher_type = 'pending' AND payment_subtype IS NULL;

CREATE OR REPLACE FUNCTION public.treasury_daily_rate(_currency finance_currency, _date date)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN _currency = 'EGP' THEN 1
         ELSE (SELECT mid_rate FROM public.exchange_rates
                WHERE quote_currency = _currency AND base_currency = 'EGP' AND rate_date <= _date
                ORDER BY rate_date DESC LIMIT 1)
         END;
$$;
REVOKE EXECUTE ON FUNCTION public.treasury_daily_rate(finance_currency, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.treasury_daily_rate(finance_currency, date) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.validate_treasury_voucher()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_code text; v_rate numeric;
BEGIN
  NEW.base_currency := 'EGP';

  IF NEW.currency = 'EGP' THEN
    NEW.exchange_rate := 1;
  ELSIF COALESCE(NEW.exchange_rate, 0) <= 0 THEN
    v_rate := public.treasury_daily_rate(NEW.currency, NEW.voucher_date);
    IF v_rate IS NULL THEN
      RAISE EXCEPTION 'No daily exchange rate found for % on % — enter the CBE rate first', NEW.currency, NEW.voucher_date;
    END IF;
    NEW.exchange_rate := v_rate;
  END IF;

  NEW.base_amount := ROUND(COALESCE(NEW.amount,0) * NEW.exchange_rate, 2);

  IF NEW.voucher_type = 'receipt' THEN
    NEW.payment_subtype := NULL;
    NEW.pending_kind := NULL;
    NEW.requires_approval := false;
    NEW.print_unlocked := true;
  ELSE
    IF NEW.payment_subtype IS NULL THEN
      RAISE EXCEPTION 'Payment vouchers must specify a subtype (general, pending_custody, advance, cost)';
    END IF;

    IF NEW.payment_subtype = 'pending_custody' THEN
      NEW.voucher_type := 'pending';
      IF NEW.pending_kind IS NULL THEN
        RAISE EXCEPTION 'Pending custody vouchers must specify the custody kind (company or current)';
      END IF;
      NEW.requires_approval := false;
      NEW.print_unlocked := true;
    ELSE
      NEW.voucher_type := 'payment';
      NEW.pending_kind := NULL;
      NEW.print_unlocked := true;
    END IF;

    IF NEW.payment_subtype = 'advance' THEN
      NEW.requires_approval := true;
      NEW.print_unlocked := (NEW.finance_approved_by IS NOT NULL);
      IF NEW.repayment_plan IS NULL THEN
        RAISE EXCEPTION 'Advance vouchers require a repayment plan (full, 2, 3, 4 or 6 months)';
      END IF;
    END IF;

    IF NEW.payment_subtype = 'cost' THEN
      IF NEW.airline_id IS NULL OR NEW.station_id IS NULL
         OR NEW.service_type IS NULL OR NEW.supplier_id IS NULL THEN
        RAISE EXCEPTION 'Cost vouchers require all four cost centres: airline/customer, airport/station, service type and supplier';
      END IF;
      IF NEW.account_id IS NOT NULL THEN
        SELECT code INTO v_code FROM public.chart_of_accounts WHERE id = NEW.account_id;
        IF v_code LIKE '8%' AND NEW.flight_schedule_id IS NULL THEN
          RAISE EXCEPTION 'Accounts starting with 8 must be linked to a flight schedule';
        END IF;
      END IF;
    END IF;
  END IF;

  IF NEW.status IN ('posted','settled') AND NEW.payment_subtype = 'advance'
     AND NEW.finance_approved_by IS NULL THEN
    RAISE EXCEPTION 'Advance vouchers require finance manager approval before posting or printing';
  END IF;

  IF NEW.status = 'posted' AND NEW.payment_subtype = 'pending_custody' THEN
    RAISE EXCEPTION 'Pending custody vouchers cannot be posted — settle them instead; the accounting entry is created at settlement';
  END IF;

  IF NEW.payment_subtype = 'pending_custody' AND NEW.journal_entry_id IS NOT NULL
     AND NEW.status <> 'settled' THEN
    RAISE EXCEPTION 'No accounting entry may exist for an outstanding custody voucher';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_treasury_voucher ON public.treasury_vouchers;
CREATE TRIGGER trg_validate_treasury_voucher
BEFORE INSERT OR UPDATE ON public.treasury_vouchers
FOR EACH ROW EXECUTE FUNCTION public.validate_treasury_voucher();

CREATE OR REPLACE FUNCTION public.audit_treasury_voucher()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.finance_audit_log (entity_type, entity_id, action, actor_id, before_data, after_data)
  VALUES ('treasury_voucher', COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'INSERT' THEN 'created'
         WHEN TG_OP = 'DELETE' THEN 'deleted'
         WHEN NEW.status IS DISTINCT FROM OLD.status THEN 'status_' || NEW.status::text
         ELSE 'updated' END,
    auth.uid(),
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_treasury_voucher ON public.treasury_vouchers;
CREATE TRIGGER trg_audit_treasury_voucher
AFTER INSERT OR UPDATE OR DELETE ON public.treasury_vouchers
FOR EACH ROW EXECUTE FUNCTION public.audit_treasury_voucher();

CREATE OR REPLACE FUNCTION public.approve_treasury_advance(_voucher_id uuid)
RETURNS public.treasury_vouchers LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.treasury_vouchers;
BEGIN
  IF NOT (public.is_admin(auth.uid()) OR public.has_finance_access(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorised to approve advances';
  END IF;
  UPDATE public.treasury_vouchers
     SET finance_approved_by = auth.uid(), finance_approved_at = now(),
         approved_by = auth.uid(), approved_at = now(), print_unlocked = true,
         status = CASE WHEN status IN ('draft','pending_approval') THEN 'approved'::voucher_status ELSE status END
   WHERE id = _voucher_id AND payment_subtype = 'advance'
   RETURNING * INTO v;
  IF v.id IS NULL THEN RAISE EXCEPTION 'Advance voucher not found'; END IF;
  RETURN v;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.approve_treasury_advance(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_treasury_advance(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.settle_pending_custody(_voucher_id uuid, _actual_amount numeric, _notes text DEFAULT NULL)
RETURNS public.treasury_vouchers LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.treasury_vouchers; s public.treasury_vouchers;
BEGIN
  IF NOT (public.is_admin(auth.uid()) OR public.has_finance_access(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorised to settle custody vouchers';
  END IF;

  SELECT * INTO v FROM public.treasury_vouchers
   WHERE id = _voucher_id AND payment_subtype = 'pending_custody';
  IF v.id IS NULL THEN RAISE EXCEPTION 'Pending custody voucher not found'; END IF;
  IF v.status = 'settled' THEN RAISE EXCEPTION 'This custody voucher is already settled'; END IF;
  IF _actual_amount IS NULL OR _actual_amount < 0 THEN RAISE EXCEPTION 'Actual settled amount must be zero or greater'; END IF;
  IF _actual_amount > v.amount THEN RAISE EXCEPTION 'Actual amount cannot exceed the custody amount'; END IF;

  INSERT INTO public.treasury_vouchers (
    voucher_no, voucher_type, payment_subtype, voucher_date, company_id, station_id,
    cash_account_id, bank_account_id, account_id, party_name, party_type,
    description, amount, currency, exchange_rate, status, parent_pending_id,
    reference, notes, created_by, posted_by, posted_at
  ) VALUES (
    v.voucher_no || '-STL', 'payment', 'general', CURRENT_DATE, v.company_id, v.station_id,
    v.cash_account_id, v.bank_account_id, v.account_id, v.party_name, v.party_type,
    'Settlement of custody voucher ' || v.voucher_no, _actual_amount, v.currency, 0,
    'posted', v.id, v.voucher_no, _notes, auth.uid(), auth.uid(), now()
  ) RETURNING * INTO s;

  UPDATE public.treasury_vouchers
     SET status = 'settled', settled_amount = _actual_amount,
         returned_amount = v.amount - _actual_amount,
         settled_at = now(), settled_by = auth.uid(),
         settlement_voucher_id = s.id, notes = COALESCE(_notes, notes)
   WHERE id = v.id RETURNING * INTO v;
  RETURN v;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.settle_pending_custody(uuid, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.settle_pending_custody(uuid, numeric, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.record_advance_recovery(_voucher_id uuid, _amount numeric, _notes text DEFAULT NULL)
RETURNS public.treasury_vouchers LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.treasury_vouchers;
BEGIN
  IF NOT (public.is_admin(auth.uid()) OR public.has_finance_access(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorised to record advance recoveries';
  END IF;
  IF COALESCE(_amount,0) <= 0 THEN RAISE EXCEPTION 'Recovery amount must be greater than zero'; END IF;

  UPDATE public.treasury_vouchers
     SET recovered_amount = LEAST(amount, recovered_amount + _amount),
         notes = COALESCE(_notes, notes),
         status = CASE WHEN recovered_amount + _amount >= amount THEN 'settled'::voucher_status ELSE status END,
         settled_at = CASE WHEN recovered_amount + _amount >= amount THEN now() ELSE settled_at END
   WHERE id = _voucher_id AND payment_subtype = 'advance'
   RETURNING * INTO v;
  IF v.id IS NULL THEN RAISE EXCEPTION 'Advance voucher not found'; END IF;
  RETURN v;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.record_advance_recovery(uuid, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_advance_recovery(uuid, numeric, text) TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.treasury_fx_daily_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reval_date date NOT NULL,
  company_id uuid,
  station_id uuid,
  cash_account_id uuid,
  bank_account_id uuid,
  currency finance_currency NOT NULL,
  fx_balance numeric NOT NULL DEFAULT 0,
  rate_prev numeric,
  rate_today numeric NOT NULL,
  base_value_prev numeric NOT NULL DEFAULT 0,
  base_value_today numeric NOT NULL DEFAULT 0,
  fx_difference numeric NOT NULL DEFAULT 0,
  journal_entry_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.treasury_fx_daily_log TO authenticated;
GRANT ALL ON public.treasury_fx_daily_log TO service_role;
ALTER TABLE public.treasury_fx_daily_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "treasury_fx_daily_log_read" ON public.treasury_fx_daily_log;
CREATE POLICY "treasury_fx_daily_log_read" ON public.treasury_fx_daily_log
  FOR SELECT TO authenticated
  USING (public.has_finance_access(auth.uid()) OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "treasury_fx_daily_log_write" ON public.treasury_fx_daily_log;
CREATE POLICY "treasury_fx_daily_log_write" ON public.treasury_fx_daily_log
  FOR ALL TO authenticated
  USING (public.has_finance_access(auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (public.has_finance_access(auth.uid()) OR public.is_admin(auth.uid()));

CREATE OR REPLACE VIEW public.v_treasury_balances
WITH (security_invoker = true) AS
WITH mv AS (
  SELECT company_id, station_id, cash_account_id, bank_account_id, currency,
    SUM(CASE WHEN voucher_type = 'receipt' AND status IN ('posted','settled') THEN amount ELSE 0 END) AS receipts,
    SUM(CASE WHEN voucher_type = 'payment' AND status IN ('posted','settled') THEN amount ELSE 0 END) AS payments,
    SUM(CASE WHEN payment_subtype = 'pending_custody' AND status NOT IN ('settled','void') THEN amount ELSE 0 END) AS custody_outstanding,
    SUM(CASE WHEN payment_subtype = 'advance' AND status <> 'void' THEN GREATEST(amount - recovered_amount, 0) ELSE 0 END) AS advances_outstanding
  FROM public.treasury_vouchers
  GROUP BY 1,2,3,4,5
)
SELECT mv.*,
  (mv.receipts - mv.payments) AS cash_balance,
  (mv.receipts - mv.payments - mv.custody_outstanding - mv.advances_outstanding) AS final_available_cash,
  public.treasury_daily_rate(mv.currency, CURRENT_DATE) AS rate_today,
  ROUND((mv.receipts - mv.payments) * COALESCE(public.treasury_daily_rate(mv.currency, CURRENT_DATE),0), 2) AS cash_balance_egp,
  ROUND((mv.receipts - mv.payments - mv.custody_outstanding - mv.advances_outstanding)
        * COALESCE(public.treasury_daily_rate(mv.currency, CURRENT_DATE),0), 2) AS final_available_cash_egp
FROM mv;

GRANT SELECT ON public.v_treasury_balances TO authenticated, service_role;

CREATE OR REPLACE VIEW public.v_treasury_daily_movement
WITH (security_invoker = true) AS
SELECT voucher_date, company_id, station_id, cash_account_id, bank_account_id, currency,
  SUM(CASE WHEN voucher_type = 'receipt' AND status IN ('posted','settled') THEN amount ELSE 0 END) AS credit_in,
  SUM(CASE WHEN payment_subtype = 'general' AND status IN ('posted','settled') THEN amount ELSE 0 END) AS debit_general,
  SUM(CASE WHEN payment_subtype = 'pending_custody' AND status IN ('posted','settled') THEN amount ELSE 0 END) AS debit_custody,
  SUM(CASE WHEN payment_subtype = 'advance' AND status IN ('posted','settled') THEN amount ELSE 0 END) AS debit_advance,
  SUM(CASE WHEN payment_subtype = 'cost' AND status IN ('posted','settled') THEN amount ELSE 0 END) AS debit_cost,
  SUM(CASE WHEN voucher_type <> 'receipt' AND status IN ('posted','settled') THEN amount ELSE 0 END) AS debit_total
FROM public.treasury_vouchers
GROUP BY 1,2,3,4,5,6;

GRANT SELECT ON public.v_treasury_daily_movement TO authenticated, service_role;
