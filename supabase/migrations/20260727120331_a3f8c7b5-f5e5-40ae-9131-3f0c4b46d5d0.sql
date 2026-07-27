UPDATE public.dispatch_assignments d
SET task_sheet_data = COALESCE(d.task_sheet_data, '{}'::jsonb)
  || jsonb_build_object('flight_type', fs.skd_type, 'skd_type', fs.skd_type)
FROM public.flight_schedules fs
WHERE d.flight_schedule_id = fs.id
  AND fs.skd_type IS NOT NULL
  AND fs.skd_type <> ''
  AND COALESCE(d.task_sheet_data->>'flight_type','') <> fs.skd_type;