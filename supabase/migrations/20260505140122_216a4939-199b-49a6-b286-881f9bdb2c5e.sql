UPDATE dispatch_assignments
SET task_sheet_data = jsonb_set(
  COALESCE(task_sheet_data, '{}'::jsonb),
  '{registration}',
  to_jsonb(COALESCE((SELECT registration FROM flight_schedules fs WHERE fs.id = dispatch_assignments.flight_schedule_id), task_sheet_data->>'registration'))
)
WHERE flight_schedule_id IS NOT NULL
  AND COALESCE(task_sheet_data->>'registration','') IS DISTINCT FROM COALESCE((SELECT registration FROM flight_schedules fs WHERE fs.id = dispatch_assignments.flight_schedule_id), '');