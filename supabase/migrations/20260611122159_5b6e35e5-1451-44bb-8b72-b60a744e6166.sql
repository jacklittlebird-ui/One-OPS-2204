CREATE INDEX IF NOT EXISTS idx_service_reports_station_arrival
  ON public.service_reports USING btree (station, arrival_date DESC NULLS LAST);