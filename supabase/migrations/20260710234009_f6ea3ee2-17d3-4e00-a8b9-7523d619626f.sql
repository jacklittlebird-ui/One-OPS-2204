
-- 1. accounting_periods
CREATE TABLE public.accounting_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_close','closed')),
  locked_by UUID REFERENCES auth.users(id),
  locked_at TIMESTAMPTZ,
  closed_by UUID REFERENCES auth.users(id),
  closed_at TIMESTAMPTZ,
  reopened BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(year, month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_periods TO authenticated;
GRANT ALL ON public.accounting_periods TO service_role;
ALTER TABLE public.accounting_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance manages periods" ON public.accounting_periods FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()));
CREATE TRIGGER trg_accounting_periods_updated BEFORE UPDATE ON public.accounting_periods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. checklist
CREATE TABLE public.period_close_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES public.accounting_periods(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_complete BOOLEAN NOT NULL DEFAULT FALSE,
  completed_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_checklist_period ON public.period_close_checklist_items(period_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.period_close_checklist_items TO authenticated;
GRANT ALL ON public.period_close_checklist_items TO service_role;
ALTER TABLE public.period_close_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance manages checklist" ON public.period_close_checklist_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()));
CREATE TRIGGER trg_checklist_updated BEFORE UPDATE ON public.period_close_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. audit
CREATE TABLE public.period_close_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES public.accounting_periods(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  performed_by UUID REFERENCES auth.users(id),
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_period_audit_period ON public.period_close_audit(period_id);
GRANT SELECT, INSERT ON public.period_close_audit TO authenticated;
GRANT ALL ON public.period_close_audit TO service_role;
ALTER TABLE public.period_close_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance reads audit" ON public.period_close_audit FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()));
CREATE POLICY "Finance inserts audit" ON public.period_close_audit FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_finance_access(auth.uid()));

-- 4. helper
CREATE OR REPLACE FUNCTION public.is_period_locked(_d DATE)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.accounting_periods
    WHERE status = 'closed' AND _d BETWEEN period_start AND period_end
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_period_locked(DATE) TO authenticated;

-- 5. guard trigger factory
CREATE OR REPLACE FUNCTION public.enforce_period_lock()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  d_new DATE;
  d_old DATE;
  col TEXT := TG_ARGV[0];
BEGIN
  -- Admins can override
  IF public.has_role(auth.uid(),'admin'::app_role) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP IN ('INSERT','UPDATE') THEN
    EXECUTE format('SELECT ($1).%I::date', col) INTO d_new USING NEW;
    IF d_new IS NOT NULL AND public.is_period_locked(d_new) THEN
      RAISE EXCEPTION 'Period containing % is closed. Reopen the period or ask an admin to post.', d_new;
    END IF;
  END IF;

  IF TG_OP IN ('UPDATE','DELETE') THEN
    EXECUTE format('SELECT ($1).%I::date', col) INTO d_old USING OLD;
    IF d_old IS NOT NULL AND public.is_period_locked(d_old) THEN
      RAISE EXCEPTION 'Cannot modify record dated % — period is closed.', d_old;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_period_lock_invoices
  BEFORE INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.enforce_period_lock('date');

CREATE TRIGGER trg_period_lock_journals
  BEFORE INSERT OR UPDATE OR DELETE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.enforce_period_lock('date');

CREATE TRIGGER trg_period_lock_receipts
  BEFORE INSERT OR UPDATE OR DELETE ON public.receipts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_period_lock('receipt_date');

CREATE TRIGGER trg_period_lock_payments
  BEFORE INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_period_lock('payment_date');
