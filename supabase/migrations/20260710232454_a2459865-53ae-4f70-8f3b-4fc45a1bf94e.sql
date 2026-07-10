
-- Phase 2p: Contracts & Renewals Center
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS renewal_notice_days INTEGER DEFAULT 60,
  ADD COLUMN IF NOT EXISTS sla_uptime_target NUMERIC,
  ADD COLUMN IF NOT EXISTS sla_response_hours NUMERIC,
  ADD COLUMN IF NOT EXISTS last_renewed_at DATE,
  ADD COLUMN IF NOT EXISTS renewal_status TEXT;

CREATE TABLE IF NOT EXISTS public.contract_sla_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  incident_date DATE NOT NULL DEFAULT CURRENT_DATE,
  incident_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  description TEXT,
  response_time_hours NUMERIC,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_sla_incidents TO authenticated;
GRANT ALL ON public.contract_sla_incidents TO service_role;

ALTER TABLE public.contract_sla_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance and admin can manage SLA incidents"
  ON public.contract_sla_incidents FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_finance_access(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_finance_access(auth.uid()));

CREATE POLICY "Authenticated read SLA incidents"
  ON public.contract_sla_incidents FOR SELECT
  TO authenticated
  USING (true);

CREATE TRIGGER trg_contract_sla_updated
  BEFORE UPDATE ON public.contract_sla_incidents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.contract_renewal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  previous_end_date DATE,
  new_end_date DATE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_renewal_events TO authenticated;
GRANT ALL ON public.contract_renewal_events TO service_role;

ALTER TABLE public.contract_renewal_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance and admin can manage renewal events"
  ON public.contract_renewal_events FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_finance_access(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_finance_access(auth.uid()));

CREATE POLICY "Authenticated read renewal events"
  ON public.contract_renewal_events FOR SELECT
  TO authenticated
  USING (true);
