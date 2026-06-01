UPDATE public.dispatch_assignments
SET flight_schedule_id = '463bd4d4-95d2-443c-83be-0d4e0be5a6e2'::uuid,
    updated_at = now()
WHERE id = '9f5129f3-1cda-4c2c-8e5a-79fb61152c01'::uuid
  AND flight_schedule_id IS NULL;

UPDATE public.flight_schedules
SET status = 'Rejected'::clearance_status,
    remarks = CASE
      WHEN COALESCE(remarks, '') = '' THEN '[Station Return 2026-06-01 12:37] delete d/t duplicate'
      WHEN remarks ILIKE '%delete d/t duplicate%' THEN remarks
      ELSE remarks || E'\n[Station Return 2026-06-01 12:37] delete d/t duplicate'
    END,
    updated_at = now()
WHERE id = '463bd4d4-95d2-443c-83be-0d4e0be5a6e2'::uuid;