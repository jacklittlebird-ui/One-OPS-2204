CREATE INDEX IF NOT EXISTS idx_dispatch_flight_schedule_id_flight_date
  ON public.dispatch_assignments (flight_schedule_id, flight_date DESC);

CREATE INDEX IF NOT EXISTS idx_dispatch_flight_date
  ON public.dispatch_assignments (flight_date DESC);

CREATE INDEX IF NOT EXISTS idx_flight_schedules_authority_arrival
  ON public.flight_schedules (authority, arrival_date DESC);

ANALYZE public.dispatch_assignments;
ANALYZE public.flight_schedules;