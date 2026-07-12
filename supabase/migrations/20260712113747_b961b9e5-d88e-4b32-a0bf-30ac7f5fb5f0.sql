
CREATE TABLE public.purchase_approval_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  category TEXT,
  min_amount NUMERIC(18,4) NOT NULL DEFAULT 0,
  max_amount NUMERIC(18,4),
  currency TEXT NOT NULL DEFAULT 'EGP',
  approver_user_id UUID,
  approver_role TEXT,
  level INT NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_approval_matrix TO authenticated;
GRANT ALL ON public.purchase_approval_matrix TO service_role;
ALTER TABLE public.purchase_approval_matrix ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage purchase_approval_matrix" ON public.purchase_approval_matrix FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.authority_delegations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  scope TEXT NOT NULL DEFAULT 'purchase',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.authority_delegations TO authenticated;
GRANT ALL ON public.authority_delegations TO service_role;
ALTER TABLE public.authority_delegations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage authority_delegations" ON public.authority_delegations FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER trg_purchase_approval_matrix_updated BEFORE UPDATE ON public.purchase_approval_matrix FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_authority_delegations_updated BEFORE UPDATE ON public.authority_delegations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.resolve_purchase_approver(_amount NUMERIC, _currency TEXT DEFAULT 'EGP', _category TEXT DEFAULT NULL, _company_id UUID DEFAULT NULL)
RETURNS TABLE(approver_user_id UUID, approver_role TEXT, level INT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH matched AS (
    SELECT m.approver_user_id, m.approver_role, m.level
    FROM public.purchase_approval_matrix m
    WHERE m.active = TRUE
      AND m.currency = _currency
      AND (m.company_id IS NULL OR m.company_id = _company_id)
      AND (m.category IS NULL OR _category IS NULL OR m.category = _category)
      AND _amount >= m.min_amount
      AND (m.max_amount IS NULL OR _amount <= m.max_amount)
    ORDER BY m.level ASC
  )
  SELECT
    COALESCE((SELECT d.to_user_id FROM public.authority_delegations d
              WHERE d.active AND d.scope = 'purchase' AND d.from_user_id = matched.approver_user_id
                AND CURRENT_DATE BETWEEN d.start_date AND d.end_date
              ORDER BY d.created_at DESC LIMIT 1), matched.approver_user_id),
    matched.approver_role,
    matched.level
  FROM matched;
END; $$;
