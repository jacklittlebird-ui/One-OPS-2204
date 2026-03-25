
-- =====================================================
-- PHASE 1: ENUMS, CORE TABLES, AUTH HELPERS
-- =====================================================

-- Role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'station_manager', 'station_ops', 'employee');

-- Handling type enum
CREATE TYPE public.handling_type AS ENUM (
  'Turn Around', 'Night Stop', 'Transit', 'Technical',
  'Ferry In', 'Ferry Out', 'VIP Hall', 'Overflying',
  'Diversion', 'Ambulance', 'Crew Change', 'Fuel Stop',
  'AVSEC Only', 'Full Handling', 'Ramp Only'
);

-- Flight status enum
CREATE TYPE public.flight_status AS ENUM ('Scheduled', 'Delayed', 'Cancelled', 'Completed');

-- Invoice status enum
CREATE TYPE public.invoice_status AS ENUM ('Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled');

-- Contract status enum
CREATE TYPE public.contract_status AS ENUM ('Active', 'Expired', 'Pending', 'Terminated');

-- Lost & found status enum
CREATE TYPE public.lost_found_status AS ENUM ('Reported', 'In Storage', 'Claimed', 'Forwarded', 'Disposed');

-- Staff status enum
CREATE TYPE public.staff_status AS ENUM ('Active', 'On Leave', 'Training', 'Suspended');

-- Shift type enum
CREATE TYPE public.shift_type AS ENUM ('Morning', 'Afternoon', 'Night', 'Split', 'Off');

-- Overfly status enum
CREATE TYPE public.overfly_status AS ENUM ('Approved', 'Pending', 'Rejected', 'Expired');

-- Currency enum
CREATE TYPE public.currency_type AS ENUM ('USD', 'EUR', 'EGP');

-- =====================================================
-- UTILITY: updated_at trigger function
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =====================================================
-- PROFILES + ROLES
-- =====================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  station TEXT DEFAULT 'CAI',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer helpers (avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  )
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Profiles RLS
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- User roles RLS (admin only write, users can read own)
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.is_admin(auth.uid()));

-- =====================================================
-- FLIGHT SCHEDULES
-- =====================================================
CREATE TABLE public.flight_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_no TEXT NOT NULL,
  airline TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  departure TEXT NOT NULL,
  arrival TEXT NOT NULL,
  aircraft TEXT NOT NULL DEFAULT '',
  days TEXT NOT NULL DEFAULT '',
  status public.flight_status NOT NULL DEFAULT 'Scheduled',
  terminal TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.flight_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read flights" ON public.flight_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage flights" ON public.flight_schedules FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Authenticated users can insert flights" ON public.flight_schedules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update flights" ON public.flight_schedules FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete flights" ON public.flight_schedules FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_flight_schedules_updated_at BEFORE UPDATE ON public.flight_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- SERVICE REPORTS
-- =====================================================
CREATE TABLE public.service_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator TEXT NOT NULL,
  handling_type public.handling_type NOT NULL DEFAULT 'Turn Around',
  station TEXT NOT NULL DEFAULT 'Cairo',
  aircraft_type TEXT NOT NULL DEFAULT '',
  registration TEXT NOT NULL DEFAULT '',
  flight_no TEXT NOT NULL,
  mtow TEXT NOT NULL DEFAULT '',
  route TEXT NOT NULL DEFAULT '',
  arrival_date DATE,
  departure_date DATE,
  day_night TEXT NOT NULL DEFAULT 'D',
  sta TEXT DEFAULT '',
  std TEXT DEFAULT '',
  td TEXT DEFAULT '',
  co TEXT DEFAULT '',
  ob TEXT DEFAULT '',
  "to" TEXT DEFAULT '',
  ground_time TEXT DEFAULT '',
  pax_in_adult_i INTEGER NOT NULL DEFAULT 0,
  pax_in_inf_i INTEGER NOT NULL DEFAULT 0,
  pax_in_adult_d INTEGER NOT NULL DEFAULT 0,
  pax_in_inf_d INTEGER NOT NULL DEFAULT 0,
  pax_transit INTEGER NOT NULL DEFAULT 0,
  project_tags TEXT DEFAULT '',
  check_in_system TEXT DEFAULT '',
  performed_by TEXT DEFAULT 'Link Egypt',
  civil_aviation_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  handling_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  airport_charge NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency public.currency_type NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.service_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read reports" ON public.service_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert reports" ON public.service_reports FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update reports" ON public.service_reports FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete reports" ON public.service_reports FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_service_reports_updated_at BEFORE UPDATE ON public.service_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Service report delays (child table)
CREATE TABLE public.service_report_delays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES public.service_reports(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL DEFAULT '',
  timing INTEGER NOT NULL DEFAULT 0,
  explanation TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.service_report_delays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read delays" ON public.service_report_delays FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert delays" ON public.service_report_delays FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update delays" ON public.service_report_delays FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete delays" ON public.service_report_delays FOR DELETE TO authenticated USING (true);

-- =====================================================
-- INVOICES
-- =====================================================
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  operator TEXT NOT NULL,
  airline_iata TEXT DEFAULT '',
  flight_ref TEXT DEFAULT '',
  description TEXT DEFAULT '',
  civil_aviation NUMERIC(12,2) NOT NULL DEFAULT 0,
  handling NUMERIC(12,2) NOT NULL DEFAULT 0,
  airport_charges NUMERIC(12,2) NOT NULL DEFAULT 0,
  catering NUMERIC(12,2) NOT NULL DEFAULT 0,
  other NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  vat NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency public.currency_type NOT NULL DEFAULT 'USD',
  status public.invoice_status NOT NULL DEFAULT 'Draft',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read invoices" ON public.invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert invoices" ON public.invoices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update invoices" ON public.invoices FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete invoices" ON public.invoices FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-calc invoice totals
CREATE OR REPLACE FUNCTION public.calc_invoice_totals()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  NEW.subtotal := COALESCE(NEW.civil_aviation, 0) + COALESCE(NEW.handling, 0) 
    + COALESCE(NEW.airport_charges, 0) + COALESCE(NEW.catering, 0) + COALESCE(NEW.other, 0);
  NEW.total := NEW.subtotal + COALESCE(NEW.vat, 0);
  RETURN NEW;
END;
$$;

CREATE TRIGGER calc_invoice_totals_trigger
  BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.calc_invoice_totals();

-- =====================================================
-- CONTRACTS
-- =====================================================
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_no TEXT NOT NULL,
  airline TEXT NOT NULL,
  airline_iata TEXT DEFAULT '',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  services TEXT DEFAULT '',
  stations TEXT DEFAULT '',
  currency public.currency_type NOT NULL DEFAULT 'USD',
  annual_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  status public.contract_status NOT NULL DEFAULT 'Pending',
  auto_renew BOOLEAN NOT NULL DEFAULT false,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read contracts" ON public.contracts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert contracts" ON public.contracts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update contracts" ON public.contracts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete contracts" ON public.contracts FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- LOST & FOUND
-- =====================================================
CREATE TABLE public.lost_found (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  flight_no TEXT NOT NULL DEFAULT '',
  airline TEXT NOT NULL DEFAULT '',
  station TEXT NOT NULL DEFAULT 'CAI',
  category TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  color TEXT DEFAULT '',
  brand TEXT DEFAULT '',
  owner_name TEXT DEFAULT '',
  owner_contact TEXT DEFAULT '',
  storage_location TEXT DEFAULT '',
  status public.lost_found_status NOT NULL DEFAULT 'Reported',
  claim_date DATE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lost_found ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read lost_found" ON public.lost_found FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert lost_found" ON public.lost_found FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update lost_found" ON public.lost_found FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete lost_found" ON public.lost_found FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_lost_found_updated_at BEFORE UPDATE ON public.lost_found
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- STAFF ROSTER
-- =====================================================
CREATE TABLE public.staff_roster (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Agent',
  department TEXT NOT NULL DEFAULT '',
  station TEXT NOT NULL DEFAULT 'CAI',
  shift public.shift_type NOT NULL DEFAULT 'Morning',
  shift_start TEXT DEFAULT '',
  shift_end TEXT DEFAULT '',
  status public.staff_status NOT NULL DEFAULT 'Active',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  join_date DATE,
  cert_expiry DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_roster ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read staff" ON public.staff_roster FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert staff" ON public.staff_roster FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update staff" ON public.staff_roster FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete staff" ON public.staff_roster FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_staff_roster_updated_at BEFORE UPDATE ON public.staff_roster
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- OVERFLY SCHEDULES
-- =====================================================
CREATE TABLE public.overfly_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_no TEXT NOT NULL,
  operator TEXT NOT NULL,
  registration TEXT DEFAULT '',
  aircraft_type TEXT DEFAULT '',
  route_from TEXT NOT NULL DEFAULT '',
  route_to TEXT NOT NULL DEFAULT '',
  entry_point TEXT DEFAULT '',
  exit_point TEXT DEFAULT '',
  altitude TEXT DEFAULT '',
  overfly_date DATE,
  entry_time TEXT DEFAULT '',
  exit_time TEXT DEFAULT '',
  mtow TEXT DEFAULT '',
  permit_no TEXT DEFAULT '',
  status public.overfly_status NOT NULL DEFAULT 'Pending',
  fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.overfly_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read overfly" ON public.overfly_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert overfly" ON public.overfly_schedules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update overfly" ON public.overfly_schedules FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete overfly" ON public.overfly_schedules FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_overfly_schedules_updated_at BEFORE UPDATE ON public.overfly_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_flight_schedules_airline ON public.flight_schedules(airline);
CREATE INDEX idx_flight_schedules_status ON public.flight_schedules(status);
CREATE INDEX idx_service_reports_operator ON public.service_reports(operator);
CREATE INDEX idx_service_reports_station ON public.service_reports(station);
CREATE INDEX idx_service_reports_arrival ON public.service_reports(arrival_date);
CREATE INDEX idx_invoices_operator ON public.invoices(operator);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_contracts_airline ON public.contracts(airline);
CREATE INDEX idx_contracts_status ON public.contracts(status);
CREATE INDEX idx_lost_found_status ON public.lost_found(status);
CREATE INDEX idx_staff_roster_station ON public.staff_roster(station);
CREATE INDEX idx_overfly_schedules_status ON public.overfly_schedules(status);
