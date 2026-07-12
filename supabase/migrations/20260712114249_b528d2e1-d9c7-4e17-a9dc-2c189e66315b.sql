
CREATE TABLE public.vendor_scorecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  quality_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  delivery_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  price_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  compliance_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  communication_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  grade TEXT,
  notes TEXT,
  evaluator_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_scorecards TO authenticated;
GRANT ALL ON public.vendor_scorecards TO service_role;
ALTER TABLE public.vendor_scorecards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage vendor_scorecards" ON public.vendor_scorecards FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.vendor_scorecard_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  weight NUMERIC(5,2) NOT NULL DEFAULT 20,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_scorecard_kpis TO authenticated;
GRANT ALL ON public.vendor_scorecard_kpis TO service_role;
ALTER TABLE public.vendor_scorecard_kpis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage vendor_scorecard_kpis" ON public.vendor_scorecard_kpis FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER trg_vendor_scorecards_updated BEFORE UPDATE ON public.vendor_scorecards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_vendor_scorecard_kpis_updated BEFORE UPDATE ON public.vendor_scorecard_kpis FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.compute_vendor_scorecard(_id UUID)
RETURNS NUMERIC LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE total NUMERIC(5,2); g TEXT;
BEGIN
  SELECT ROUND((quality_score + delivery_score + price_score + compliance_score + communication_score) / 5.0, 2)
    INTO total FROM public.vendor_scorecards WHERE id = _id;
  g := CASE
    WHEN total >= 90 THEN 'A'
    WHEN total >= 75 THEN 'B'
    WHEN total >= 60 THEN 'C'
    WHEN total >= 40 THEN 'D'
    ELSE 'F' END;
  UPDATE public.vendor_scorecards SET total_score = total, grade = g WHERE id = _id;
  RETURN total;
END; $$;
