CREATE OR REPLACE FUNCTION public.approve_security_service_report(
  _dispatch_id uuid DEFAULT NULL,
  _flight_schedule_id uuid DEFAULT NULL,
  _review_comment text DEFAULT '',
  _reviewed_by text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_dispatch public.dispatch_assignments%ROWTYPE;
  v_flight public.flight_schedules%ROWTYPE;
  v_dispatch_id uuid := _dispatch_id;
  v_flight_id uuid := _flight_schedule_id;
  v_reviewer text := COALESCE(NULLIF(_reviewed_by, ''), 'Operations');
  v_reviewed_at timestamptz := now();
BEGIN
  IF NOT public.has_ops_access(auth.uid()) THEN
    RAISE EXCEPTION 'Not allowed to approve security service reports'
      USING ERRCODE = '42501';
  END IF;

  IF v_dispatch_id IS NULL AND v_flight_id IS NULL THEN
    RAISE EXCEPTION 'Dispatch or flight id is required'
      USING ERRCODE = '22023';
  END IF;

  IF v_dispatch_id IS NULL THEN
    SELECT *
      INTO v_dispatch
    FROM public.dispatch_assignments
    WHERE flight_schedule_id = v_flight_id
    ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    LIMIT 1;

    IF FOUND THEN
      v_dispatch_id := v_dispatch.id;
    END IF;
  ELSE
    SELECT *
      INTO v_dispatch
    FROM public.dispatch_assignments
    WHERE id = v_dispatch_id;

    IF FOUND AND v_flight_id IS NULL THEN
      v_flight_id := v_dispatch.flight_schedule_id;
    END IF;
  END IF;

  IF v_flight_id IS NOT NULL THEN
    SELECT *
      INTO v_flight
    FROM public.flight_schedules
    WHERE id = v_flight_id;
  END IF;

  IF v_dispatch_id IS NOT NULL THEN
    UPDATE public.dispatch_assignments
    SET status = 'Completed',
        review_status = 'Approved',
        review_comment = COALESCE(_review_comment, ''),
        reviewed_by = v_reviewer,
        reviewed_at = v_reviewed_at,
        updated_at = now()
    WHERE id = v_dispatch_id
    RETURNING * INTO v_dispatch;
  ELSE
    IF v_flight_id IS NULL OR v_flight.id IS NULL THEN
      RAISE EXCEPTION 'Flight not found'
        USING ERRCODE = 'P0002';
    END IF;

    INSERT INTO public.dispatch_assignments (
      flight_schedule_id,
      flight_date,
      scheduled_start,
      scheduled_end,
      status,
      review_status,
      review_comment,
      reviewed_by,
      reviewed_at,
      dispatched_by,
      notes
    ) VALUES (
      v_flight_id,
      COALESCE(NULLIF(v_flight.arrival_date, '')::date, NULLIF(v_flight.departure_date, '')::date, CURRENT_DATE),
      COALESCE(v_flight.sta, v_flight.std, ''),
      COALESCE(v_flight.std, v_flight.sta, ''),
      'Completed',
      'Approved',
      COALESCE(_review_comment, ''),
      v_reviewer,
      v_reviewed_at,
      v_reviewer,
      COALESCE(v_flight.remarks, '')
    )
    RETURNING * INTO v_dispatch;

    v_dispatch_id := v_dispatch.id;
  END IF;

  IF v_flight_id IS NOT NULL THEN
    UPDATE public.flight_schedules
    SET status = 'Completed',
        updated_at = now()
    WHERE id = v_flight_id
      AND status IS DISTINCT FROM 'Completed'
    RETURNING * INTO v_flight;

    IF NOT FOUND THEN
      SELECT * INTO v_flight FROM public.flight_schedules WHERE id = v_flight_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'dispatch', to_jsonb(v_dispatch),
    'flight', to_jsonb(v_flight)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.approve_security_service_report(uuid, uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_security_service_report(uuid, uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.approve_security_service_report(uuid, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_security_service_report(uuid, uuid, text, text) TO service_role;