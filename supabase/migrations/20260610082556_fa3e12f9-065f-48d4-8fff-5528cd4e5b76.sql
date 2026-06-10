ALTER TABLE public.flight_schedules ADD COLUMN IF NOT EXISTS created_via text;
ALTER TABLE public.dispatch_assignments ADD COLUMN IF NOT EXISTS created_via text;

UPDATE public.flight_schedules
SET created_via = CASE
  WHEN COALESCE(purpose, '') ILIKE '%Station Dispatch%' THEN 'station'
  ELSE 'clearance'
END
WHERE created_via IS NULL;

UPDATE public.dispatch_assignments d
SET created_via = COALESCE(
  (SELECT fs.created_via FROM public.flight_schedules fs WHERE fs.id = d.flight_schedule_id),
  'station'
)
WHERE created_via IS NULL;

CREATE INDEX IF NOT EXISTS idx_flight_schedules_created_via ON public.flight_schedules(created_via);
CREATE INDEX IF NOT EXISTS idx_dispatch_assignments_created_via ON public.dispatch_assignments(created_via);