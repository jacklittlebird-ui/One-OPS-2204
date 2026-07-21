
CREATE INDEX IF NOT EXISTS idx_flight_schedules_arrival_date_id
  ON public.flight_schedules (arrival_date DESC NULLS LAST, id);

CREATE INDEX IF NOT EXISTS idx_flight_schedules_authority_arrival_id
  ON public.flight_schedules (authority, arrival_date DESC NULLS LAST, id);

CREATE INDEX IF NOT EXISTS idx_flight_schedules_clearance_type_arrival
  ON public.flight_schedules (clearance_type, arrival_date DESC NULLS LAST, id);

CREATE INDEX IF NOT EXISTS idx_flight_schedules_departure_date
  ON public.flight_schedules (departure_date DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_dispatch_assignments_flight_date_id
  ON public.dispatch_assignments (flight_date DESC NULLS LAST, id);

ANALYZE public.flight_schedules;
ANALYZE public.dispatch_assignments;
