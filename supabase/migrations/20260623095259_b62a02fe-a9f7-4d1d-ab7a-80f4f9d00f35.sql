CREATE OR REPLACE FUNCTION public.return_flight_to_clearance(_id uuid, _stamp text)
RETURNS public.flight_schedules
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_row public.flight_schedules%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF _stamp IS NULL OR length(btrim(_stamp)) = 0 THEN
    RAISE EXCEPTION 'A return reason is required';
  END IF;

  UPDATE public.flight_schedules
  SET status = 'Rejected',
      remarks = CASE
        WHEN remarks IS NULL OR length(btrim(remarks)) = 0 THEN _stamp
        ELSE remarks || E'\n' || _stamp
      END,
      updated_at = now()
  WHERE id = _id
  RETURNING * INTO new_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'flight_schedules row % not found', _id;
  END IF;

  RETURN new_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.return_flight_to_clearance(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.return_flight_to_clearance(uuid, text) TO service_role;