
-- Auto-link dispatch_assignments to the airline's unique active Security
-- contract when contract_id is left NULL by the caller. Mirrors the auto-pick
-- behaviour in SecurityTaskSheetDialog so the AMOUNT column is populated
-- from the moment a task sheet is saved (no need to open Edit).
CREATE OR REPLACE FUNCTION public.auto_link_dispatch_security_contract()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_airline text;
  v_contract_id uuid;
  v_count int;
BEGIN
  IF NEW.contract_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT a.name INTO v_airline
  FROM public.flight_schedules fs
  LEFT JOIN public.airlines a ON a.id = fs.airline_id
  WHERE fs.id = NEW.flight_schedule_id;

  IF v_airline IS NULL OR btrim(v_airline) = '' THEN
    RETURN NEW;
  END IF;

  SELECT c.id, count(*) OVER () INTO v_contract_id, v_count
  FROM public.contracts c
  WHERE c.status = 'Active'
    AND c.service_category IN ('Security','Both')
    AND lower(btrim(c.airline)) = lower(btrim(v_airline))
  LIMIT 1;

  IF v_count = 1 THEN
    NEW.contract_id := v_contract_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_link_dispatch_security_contract ON public.dispatch_assignments;
CREATE TRIGGER trg_auto_link_dispatch_security_contract
BEFORE INSERT OR UPDATE OF flight_schedule_id, contract_id
ON public.dispatch_assignments
FOR EACH ROW
EXECUTE FUNCTION public.auto_link_dispatch_security_contract();

-- Backfill existing rows: attach the unique active Security contract for the
-- flight's airline where contract_id is currently NULL.
WITH single_contract AS (
  SELECT lower(btrim(airline)) AS al,
         (array_agg(id))[1]     AS cid,
         count(*)               AS n
  FROM public.contracts
  WHERE status = 'Active'
    AND service_category IN ('Security','Both')
  GROUP BY lower(btrim(airline))
  HAVING count(*) = 1
)
UPDATE public.dispatch_assignments d
SET contract_id = sc.cid
FROM public.flight_schedules fs
LEFT JOIN public.airlines a ON a.id = fs.airline_id
JOIN single_contract sc ON sc.al = lower(btrim(a.name))
WHERE d.flight_schedule_id = fs.id
  AND d.contract_id IS NULL;
