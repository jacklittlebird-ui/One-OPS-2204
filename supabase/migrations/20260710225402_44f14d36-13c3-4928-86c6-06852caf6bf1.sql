
-- Phase 2i: AR/AP Aging with Collections Workflow
CREATE TABLE IF NOT EXISTS public.collection_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID,
  vendor_invoice_id UUID,
  case_type TEXT NOT NULL CHECK (case_type IN ('AR','AP')),
  counterparty_name TEXT NOT NULL,
  counterparty_id UUID,
  amount_outstanding NUMERIC(18,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EGP',
  due_date DATE,
  days_overdue INTEGER NOT NULL DEFAULT 0,
  aging_bucket TEXT NOT NULL DEFAULT 'current' CHECK (aging_bucket IN ('current','1_30','31_60','61_90','over_90')),
  dunning_stage TEXT NOT NULL DEFAULT 'none' CHECK (dunning_stage IN ('none','reminder_1','reminder_2','final_notice','legal','written_off')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','promised','partial','resolved','escalated','written_off')),
  promise_to_pay_date DATE,
  promise_to_pay_amount NUMERIC(18,2),
  assigned_to UUID,
  last_contact_date DATE,
  next_action_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_invoice_ref CHECK (
    (case_type = 'AR' AND invoice_id IS NOT NULL AND vendor_invoice_id IS NULL) OR
    (case_type = 'AP' AND vendor_invoice_id IS NOT NULL AND invoice_id IS NULL)
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.collection_cases TO authenticated;
GRANT ALL ON public.collection_cases TO service_role;
ALTER TABLE public.collection_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view collection cases" ON public.collection_cases
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert collection cases" ON public.collection_cases
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update collection cases" ON public.collection_cases
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete collection cases" ON public.collection_cases
  FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_collection_cases_updated_at
  BEFORE UPDATE ON public.collection_cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_collection_cases_invoice ON public.collection_cases(invoice_id);
CREATE INDEX IF NOT EXISTS idx_collection_cases_vendor_invoice ON public.collection_cases(vendor_invoice_id);
CREATE INDEX IF NOT EXISTS idx_collection_cases_status ON public.collection_cases(status);
CREATE INDEX IF NOT EXISTS idx_collection_cases_bucket ON public.collection_cases(aging_bucket);

-- Contact log
CREATE TABLE IF NOT EXISTS public.collection_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.collection_cases(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('call','email','letter','sms','meeting','note','payment_received','promise','escalation')),
  contact_person TEXT,
  outcome TEXT,
  notes TEXT,
  next_action_date DATE,
  performed_by UUID,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.collection_activities TO authenticated;
GRANT ALL ON public.collection_activities TO service_role;
ALTER TABLE public.collection_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view collection activities" ON public.collection_activities
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert collection activities" ON public.collection_activities
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update collection activities" ON public.collection_activities
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete collection activities" ON public.collection_activities
  FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_collection_activities_case ON public.collection_activities(case_id);

-- Aging computation helper
CREATE OR REPLACE FUNCTION public.compute_aging_bucket(_days_overdue INTEGER)
RETURNS TEXT LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN _days_overdue <= 0 THEN 'current'
    WHEN _days_overdue <= 30 THEN '1_30'
    WHEN _days_overdue <= 60 THEN '31_60'
    WHEN _days_overdue <= 90 THEN '61_90'
    ELSE 'over_90'
  END;
$$;

-- Refresh aging on all open cases
CREATE OR REPLACE FUNCTION public.refresh_collection_cases_aging()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _updated INTEGER := 0;
BEGIN
  UPDATE public.collection_cases
  SET
    days_overdue = GREATEST(0, (CURRENT_DATE - due_date)::INTEGER),
    aging_bucket = public.compute_aging_bucket(GREATEST(0, (CURRENT_DATE - due_date)::INTEGER))
  WHERE status NOT IN ('resolved','written_off') AND due_date IS NOT NULL;
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated;
END;
$$;
