-- Batch 4 (retry): precomputed invoice monthly summary, sourced from the
-- FS-aware service-report view so post-Phase 3B station/operator resolve.

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_invoice_monthly_summary AS
SELECT
  date_trunc('month', v.arrival_date::date)::date    AS month,
  COALESCE(v.operator, '')                           AS operator,
  COALESCE(v.station, '')                            AS station,
  COALESCE(v.handling_type::text, '')                AS handling_type,
  COUNT(*)::bigint                                   AS flight_count,
  SUM(COALESCE(v.total_cost, 0))::numeric            AS total_cost,
  SUM(COALESCE(v.civil_aviation_fee, 0))::numeric    AS civil_aviation_fee,
  SUM(COALESCE(v.handling_fee, 0))::numeric          AS handling_fee,
  SUM(COALESCE(v.airport_charge, 0))::numeric        AS airport_charge,
  SUM(COALESCE(v.landing_charge, 0))::numeric        AS landing_charge,
  SUM(COALESCE(v.parking_charge, 0))::numeric        AS parking_charge,
  SUM(COALESCE(v.housing_charge, 0))::numeric        AS housing_charge,
  SUM(COALESCE(v.fuel_charge, 0))::numeric           AS fuel_charge,
  SUM(COALESCE(v.catering_charge, 0))::numeric       AS catering_charge,
  SUM(COALESCE(v.hotac_charge, 0))::numeric          AS hotac_charge
FROM public.v_service_report_with_flight v
WHERE v.arrival_date IS NOT NULL
  AND LOWER(COALESCE(v.review_status, '')) IN ('approved', 'ready for billing')
GROUP BY 1, 2, 3, 4;

CREATE UNIQUE INDEX IF NOT EXISTS mv_invoice_monthly_summary_pk
  ON public.mv_invoice_monthly_summary (month, operator, station, handling_type);

CREATE INDEX IF NOT EXISTS mv_invoice_monthly_summary_operator_month
  ON public.mv_invoice_monthly_summary (operator, month DESC);

GRANT SELECT ON public.mv_invoice_monthly_summary TO authenticated;
GRANT ALL    ON public.mv_invoice_monthly_summary TO service_role;

CREATE OR REPLACE FUNCTION public.refresh_invoice_monthly_summary()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT (
       public.has_role(auth.uid(), 'admin'::app_role)
       OR public.has_finance_access(auth.uid())
     )
  THEN
    RAISE EXCEPTION 'Not authorized to refresh invoice summary';
  END IF;

  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_invoice_monthly_summary;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_invoice_monthly_summary() TO authenticated;

REFRESH MATERIALIZED VIEW public.mv_invoice_monthly_summary;
