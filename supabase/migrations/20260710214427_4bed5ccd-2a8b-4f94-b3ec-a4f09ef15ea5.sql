
-- Phase 1t: Approval Workflows
-- Rules: configurable per doc_type (journal_entry, payment, vendor_invoice, invoice)
--        threshold-based; ordered approval steps by approver_role.
-- Requests: one per document requiring approval; status flows Pending -> Approved/Rejected
-- Actions: audit trail of each approver step.

CREATE TABLE IF NOT EXISTS public.approval_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  doc_type TEXT NOT NULL, -- 'journal_entry' | 'payment' | 'vendor_invoice' | 'invoice'
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  min_amount NUMERIC NOT NULL DEFAULT 0,
  max_amount NUMERIC,
  currency TEXT DEFAULT 'USD',
  approver_roles TEXT[] NOT NULL DEFAULT '{}', -- ordered array of app_role names
  active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.approval_rules TO authenticated;
GRANT ALL ON public.approval_rules TO service_role;
ALTER TABLE public.approval_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance can manage approval rules"
  ON public.approval_rules FOR ALL
  USING (public.has_finance_access(auth.uid()))
  WITH CHECK (public.has_finance_access(auth.uid()));

CREATE TABLE IF NOT EXISTS public.approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_no TEXT NOT NULL UNIQUE,
  doc_type TEXT NOT NULL,
  doc_id UUID NOT NULL,
  doc_reference TEXT,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'Pending', -- Pending | Approved | Rejected | Cancelled
  current_step INT NOT NULL DEFAULT 1,
  total_steps INT NOT NULL DEFAULT 1,
  approver_roles TEXT[] NOT NULL DEFAULT '{}',
  rule_id UUID REFERENCES public.approval_rules(id) ON DELETE SET NULL,
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.approval_requests TO authenticated;
GRANT ALL ON public.approval_requests TO service_role;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance can manage approval requests"
  ON public.approval_requests FOR ALL
  USING (public.has_finance_access(auth.uid()))
  WITH CHECK (public.has_finance_access(auth.uid()));

CREATE TABLE IF NOT EXISTS public.approval_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.approval_requests(id) ON DELETE CASCADE,
  step INT NOT NULL,
  action TEXT NOT NULL, -- 'Approved' | 'Rejected'
  approver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approver_role TEXT,
  comment TEXT,
  acted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.approval_actions TO authenticated;
GRANT ALL ON public.approval_actions TO service_role;
ALTER TABLE public.approval_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance can manage approval actions"
  ON public.approval_actions FOR ALL
  USING (public.has_finance_access(auth.uid()))
  WITH CHECK (public.has_finance_access(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON public.approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_doc ON public.approval_requests(doc_type, doc_id);
CREATE INDEX IF NOT EXISTS idx_approval_actions_request ON public.approval_actions(request_id);

CREATE TRIGGER trg_approval_rules_updated
  BEFORE UPDATE ON public.approval_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_approval_requests_updated
  BEFORE UPDATE ON public.approval_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
