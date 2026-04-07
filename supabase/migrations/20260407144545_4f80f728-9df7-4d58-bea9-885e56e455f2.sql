
-- Add new fields to service_reports
ALTER TABLE public.service_reports
  ADD COLUMN IF NOT EXISTS foreign_pax_in integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS foreign_pax_out integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS egyptian_pax_in integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS egyptian_pax_out integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS infant_in integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS infant_out integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS crew_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_departing_pax integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_foreign_bill numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_local_bill numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fire_cart_qty integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS follow_me_qty integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS jetway_qty integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS met_folder_qty integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS file_flt_plan_qty integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS print_ops_flt_plan_qty integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ata text DEFAULT '',
  ADD COLUMN IF NOT EXISTS atd text DEFAULT '',
  ADD COLUMN IF NOT EXISTS confirmation_no text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS flight_status text NOT NULL DEFAULT 'Scheduled',
  ADD COLUMN IF NOT EXISTS parking_day_hours numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parking_night_hours numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_parking_hours numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS housing_days numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS landing_charge numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parking_charge numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS housing_charge numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fuel_charge numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS catering_charge numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hotac_charge numeric NOT NULL DEFAULT 0;

-- Service report catering line items
CREATE TABLE public.service_report_catering (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id uuid NOT NULL REFERENCES public.service_reports(id) ON DELETE CASCADE,
  catering_item text NOT NULL DEFAULT '',
  supplier text NOT NULL DEFAULT '',
  quantity integer NOT NULL DEFAULT 0,
  price_per_unit numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.service_report_catering ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read service_report_catering" ON public.service_report_catering FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert service_report_catering" ON public.service_report_catering FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update service_report_catering" ON public.service_report_catering FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete service_report_catering" ON public.service_report_catering FOR DELETE TO authenticated USING (true);

-- Service report HOTAC line items
CREATE TABLE public.service_report_hotac (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id uuid NOT NULL REFERENCES public.service_reports(id) ON DELETE CASCADE,
  hotel_name text NOT NULL DEFAULT '',
  room_classification text NOT NULL DEFAULT '',
  type_of_service text NOT NULL DEFAULT '',
  quantity integer NOT NULL DEFAULT 0,
  price_per_night numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.service_report_hotac ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read service_report_hotac" ON public.service_report_hotac FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert service_report_hotac" ON public.service_report_hotac FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update service_report_hotac" ON public.service_report_hotac FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete service_report_hotac" ON public.service_report_hotac FOR DELETE TO authenticated USING (true);

-- Service report fuel line items
CREATE TABLE public.service_report_fuel (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id uuid NOT NULL REFERENCES public.service_reports(id) ON DELETE CASCADE,
  fuel_type text NOT NULL DEFAULT '',
  supplier text NOT NULL DEFAULT '',
  quantity numeric NOT NULL DEFAULT 0,
  price_per_unit numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.service_report_fuel ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read service_report_fuel" ON public.service_report_fuel FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert service_report_fuel" ON public.service_report_fuel FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update service_report_fuel" ON public.service_report_fuel FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete service_report_fuel" ON public.service_report_fuel FOR DELETE TO authenticated USING (true);
