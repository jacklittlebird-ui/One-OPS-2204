
-- =====================================================
-- PHASE 1: Operations Infrastructure Tables
-- =====================================================

-- 1. Countries
CREATE TABLE public.countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_ar text NOT NULL DEFAULT '',
  code text NOT NULL DEFAULT '',
  region text NOT NULL DEFAULT 'Middle East',
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read countries" ON public.countries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can insert countries" ON public.countries FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admin can update countries" ON public.countries FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admin can delete countries" ON public.countries FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- 2. Airports
CREATE TABLE public.airports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id uuid REFERENCES public.countries(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  iata_code text NOT NULL DEFAULT '',
  icao_code text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  terminal_count integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.airports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read airports" ON public.airports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can insert airports" ON public.airports FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admin can update airports" ON public.airports FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admin can delete airports" ON public.airports FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- 3. Services Catalog
CREATE TYPE public.service_category AS ENUM (
  'Civil Aviation', 'Ground Handling', 'Catering', 'Hotac',
  'Fuel', 'Security', 'Special Services', 'Transport', 'VIP'
);

CREATE TABLE public.services_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category service_category NOT NULL DEFAULT 'Ground Handling',
  description text NOT NULL DEFAULT '',
  related_reports text NOT NULL DEFAULT '',
  related_documents text NOT NULL DEFAULT '',
  report_template text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.services_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read services_catalog" ON public.services_catalog FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can insert services_catalog" ON public.services_catalog FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admin can update services_catalog" ON public.services_catalog FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admin can delete services_catalog" ON public.services_catalog FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- 4. Service Providers (Suppliers)
CREATE TABLE public.service_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country_id uuid REFERENCES public.countries(id) ON DELETE SET NULL,
  airport_id uuid REFERENCES public.airports(id) ON DELETE SET NULL,
  service_category service_category NOT NULL DEFAULT 'Ground Handling',
  contact_person text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  contract_ref text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read service_providers" ON public.service_providers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can insert service_providers" ON public.service_providers FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admin can update service_providers" ON public.service_providers FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admin can delete service_providers" ON public.service_providers FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- 5. Airline Airport Services (linking airlines to services per airport with pricing)
CREATE TABLE public.airline_airport_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  airline_id uuid REFERENCES public.airlines(id) ON DELETE CASCADE NOT NULL,
  airport_id uuid REFERENCES public.airports(id) ON DELETE CASCADE NOT NULL,
  service_id uuid REFERENCES public.services_catalog(id) ON DELETE CASCADE NOT NULL,
  provider_id uuid REFERENCES public.service_providers(id) ON DELETE SET NULL,
  sell_price numeric NOT NULL DEFAULT 0,
  buy_price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  unit text NOT NULL DEFAULT 'Per Flight',
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.airline_airport_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read airline_airport_services" ON public.airline_airport_services FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert airline_airport_services" ON public.airline_airport_services FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update airline_airport_services" ON public.airline_airport_services FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admin can delete airline_airport_services" ON public.airline_airport_services FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- 6. Clearances (Flight Permits)
CREATE TYPE public.clearance_status AS ENUM ('Pending', 'Approved', 'Rejected', 'Expired', 'Cancelled');

CREATE TABLE public.clearances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_schedule_id uuid REFERENCES public.flight_schedules(id) ON DELETE SET NULL,
  airline_id uuid REFERENCES public.airlines(id) ON DELETE SET NULL,
  permit_no text NOT NULL DEFAULT '',
  flight_no text NOT NULL DEFAULT '',
  aircraft_type text NOT NULL DEFAULT '',
  registration text NOT NULL DEFAULT '',
  route text NOT NULL DEFAULT '',
  clearance_type text NOT NULL DEFAULT 'Landing',
  requested_date date DEFAULT CURRENT_DATE,
  valid_from date,
  valid_to date,
  status clearance_status NOT NULL DEFAULT 'Pending',
  authority text NOT NULL DEFAULT '',
  remarks text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.clearances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read clearances" ON public.clearances FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert clearances" ON public.clearances FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update clearances" ON public.clearances FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admin can delete clearances" ON public.clearances FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- Seed initial countries
INSERT INTO public.countries (name, name_ar, code, region) VALUES
  ('Egypt', 'مصر', 'EG', 'Middle East'),
  ('Jordan', 'الأردن', 'JO', 'Middle East'),
  ('UAE', 'الإمارات', 'AE', 'Middle East'),
  ('Morocco', 'المغرب', 'MA', 'North Africa'),
  ('Global', 'دولي', 'INTL', 'International');

-- Seed key Egyptian airports
INSERT INTO public.airports (country_id, name, iata_code, icao_code, city, terminal_count)
SELECT c.id, a.name, a.iata, a.icao, a.city, a.terminals
FROM public.countries c,
(VALUES 
  ('Cairo International Airport', 'CAI', 'HECA', 'Cairo', 4),
  ('Borg El Arab Airport', 'HBE', 'HEBA', 'Alexandria', 1),
  ('Hurghada International Airport', 'HRG', 'HEGN', 'Hurghada', 2),
  ('Sharm El Sheikh International Airport', 'SSH', 'HESH', 'Sharm El Sheikh', 2),
  ('Luxor International Airport', 'LXR', 'HELX', 'Luxor', 1),
  ('Aswan International Airport', 'ASW', 'HESN', 'Aswan', 1),
  ('Sphinx International Airport', 'SPX', 'HESX', 'Giza', 1),
  ('Marsa Alam International Airport', 'RMF', 'HEMA', 'Marsa Alam', 1)
) AS a(name, iata, icao, city, terminals)
WHERE c.code = 'EG';

-- Seed services catalog
INSERT INTO public.services_catalog (name, category, description) VALUES
  ('Landing & Parking Fees', 'Civil Aviation', 'Civil aviation authority landing and parking charges'),
  ('Ground Handling', 'Ground Handling', 'Full ground handling services including ramp, passenger, and baggage handling'),
  ('Aircraft Cleaning', 'Ground Handling', 'Interior and exterior aircraft cleaning services'),
  ('Passenger Handling', 'Ground Handling', 'Check-in, boarding, and arrival services'),
  ('Baggage Handling', 'Ground Handling', 'Baggage loading, unloading, and transfer'),
  ('Ramp Services', 'Ground Handling', 'Pushback, towing, GPU, ASU, and ramp equipment'),
  ('Catering Supply', 'Catering', 'In-flight catering and meal provisioning'),
  ('Catering Equipment', 'Catering', 'Catering hi-loaders, trolleys, and equipment'),
  ('Crew Hotel', 'Hotac', 'Hotel accommodation for flight crew'),
  ('Passenger Hotel', 'Hotac', 'Hotel accommodation for disrupted passengers'),
  ('VIP Hotel', 'Hotac', 'VIP/CIP hotel accommodation'),
  ('Crew Transport', 'Transport', 'Ground transportation for crew'),
  ('Passenger Transport', 'Transport', 'Ground transportation for passengers'),
  ('Aircraft Fueling', 'Fuel', 'Jet fuel supply and into-plane fueling'),
  ('Aircraft Security', 'Security', 'On-board security and screening services'),
  ('Airport Security', 'Security', 'Airport security and AVSEC services'),
  ('VIP/CIP Lounge', 'VIP', 'VIP and CIP lounge access services'),
  ('Meet & Assist', 'Special Services', 'Meet and assist services for passengers'),
  ('Wheelchair Service', 'Special Services', 'Wheelchair and PRM assistance'),
  ('Unaccompanied Minor', 'Special Services', 'UMNR handling services');
