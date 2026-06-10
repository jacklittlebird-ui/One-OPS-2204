
-- dispatch_assignments: heaviest query — station + flight_date DESC
CREATE INDEX IF NOT EXISTS idx_dispatch_assignments_station_flight_date
  ON public.dispatch_assignments (station, flight_date DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_dispatch_assignments_flight_date
  ON public.dispatch_assignments (flight_date DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_dispatch_assignments_flight_schedule_id
  ON public.dispatch_assignments (flight_schedule_id)
  WHERE flight_schedule_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dispatch_assignments_status
  ON public.dispatch_assignments (status);

-- flight_schedules: second heaviest — authority + arrival_date DESC, status filters
CREATE INDEX IF NOT EXISTS idx_flight_schedules_authority_arrival_date
  ON public.flight_schedules (authority, arrival_date DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_flight_schedules_arrival_date
  ON public.flight_schedules (arrival_date DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_flight_schedules_status
  ON public.flight_schedules (status);

CREATE INDEX IF NOT EXISTS idx_flight_schedules_airline_id
  ON public.flight_schedules (airline_id)
  WHERE airline_id IS NOT NULL;

-- contract_service_rates: filtered by contract_id and ordered by sort_order
CREATE INDEX IF NOT EXISTS idx_contract_service_rates_contract_id_sort
  ON public.contract_service_rates (contract_id, sort_order);

-- contracts: filtered by service_category + status
CREATE INDEX IF NOT EXISTS idx_contracts_category_status
  ON public.contracts (service_category, status);

-- profiles: lookup by user_id is hit on every page render
CREATE INDEX IF NOT EXISTS idx_profiles_user_id
  ON public.profiles (user_id);

-- irregularity_reports: ordered by created_at DESC
CREATE INDEX IF NOT EXISTS idx_irregularity_reports_created_at
  ON public.irregularity_reports (created_at DESC);

-- notifications: hit hard by header polling (user_id + is_read)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, is_read)
  WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);

-- airports: status filter
CREATE INDEX IF NOT EXISTS idx_airports_status
  ON public.airports (status);

-- invoices: status filter (status <> 'X' pattern)
CREATE INDEX IF NOT EXISTS idx_invoices_flight_ref
  ON public.invoices (flight_ref)
  WHERE flight_ref IS NOT NULL;
