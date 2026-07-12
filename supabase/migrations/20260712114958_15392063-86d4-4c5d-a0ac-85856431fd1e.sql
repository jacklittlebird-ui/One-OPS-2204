
CREATE OR REPLACE FUNCTION public.scan_contract_renewals()
RETURNS TABLE(contract_id uuid, contract_no text, end_date date, days_remaining int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT c.id, c.contract_no, c.end_date,
           (c.end_date - CURRENT_DATE)::int AS days_remaining,
           COALESCE(c.renewal_notice_days, 60) AS notice_days
    FROM public.contracts c
    WHERE c.end_date IS NOT NULL
      AND c.end_date >= CURRENT_DATE
      AND (c.end_date - CURRENT_DATE) <= COALESCE(c.renewal_notice_days, 60)
      AND c.status = 'Active'
  ),
  logged AS (
    INSERT INTO public.contract_renewal_events (contract_id, event_type, event_date, previous_end_date, new_end_date, notes)
    SELECT c.id, 'notice_due', CURRENT_DATE, c.end_date, NULL,
           format('Auto-detected: %s days remaining', c.days_remaining)
    FROM candidates c
    WHERE NOT EXISTS (
      SELECT 1 FROM public.contract_renewal_events e
      WHERE e.contract_id = c.id
        AND e.event_type = 'notice_due'
        AND e.previous_end_date = c.end_date
    )
    RETURNING contract_id
  )
  SELECT c.id, c.contract_no, c.end_date, c.days_remaining
  FROM candidates c;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_renew_contracts()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
  r record;
  v_term_days int;
  v_new_end date;
BEGIN
  FOR r IN
    SELECT id, contract_no, start_date, end_date
    FROM public.contracts
    WHERE auto_renew = true
      AND end_date IS NOT NULL
      AND end_date < CURRENT_DATE
      AND status = 'Active'
  LOOP
    v_term_days := GREATEST(COALESCE((r.end_date - r.start_date)::int, 365), 30);
    v_new_end := r.end_date + v_term_days;

    UPDATE public.contracts
       SET end_date = v_new_end,
           last_renewed_at = CURRENT_DATE,
           renewal_status = 'auto_renewed',
           updated_at = now()
     WHERE id = r.id;

    INSERT INTO public.contract_renewal_events (contract_id, event_type, event_date, previous_end_date, new_end_date, notes)
    VALUES (r.id, 'auto_renewed', CURRENT_DATE, r.end_date, v_new_end,
            format('Auto-renewed for %s days', v_term_days));

    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.scan_contract_renewals() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_renew_contracts() TO authenticated;
