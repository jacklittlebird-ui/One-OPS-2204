
-- =============================================
-- FULL MIGRATION: All remaining reference & operational tables
-- =============================================

-- 1. Airlines
CREATE TABLE public.airlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL DEFAULT '',
  name text NOT NULL,
  country text NOT NULL DEFAULT '',
  contact_person text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Aircrafts (registry)
CREATE TABLE public.aircrafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT '',
  airline text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '',
  mtow numeric NOT NULL DEFAULT 0,
  seats integer NOT NULL DEFAULT 0,
  certificate_no text NOT NULL DEFAULT '',
  issue_date date,
  status text NOT NULL DEFAULT 'Operational' CHECK (status IN ('Operational', 'Maintenance', 'Grounded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Delay Codes
CREATE TABLE public.delay_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  responsible text NOT NULL DEFAULT 'Other',
  impact_level text NOT NULL DEFAULT 'Low' CHECK (impact_level IN ('Low', 'Medium', 'High')),
  avg_minutes integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Abbreviations
CREATE TABLE public.abbreviations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  abbr text NOT NULL DEFAULT '',
  full_text text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Aircraft Types Reference
CREATE TABLE public.aircraft_types_ref (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  icao text NOT NULL DEFAULT '',
  iata text NOT NULL DEFAULT '',
  name text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  mtow integer NOT NULL DEFAULT 0,
  seats text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Traffic Rights
CREATE TABLE public.traffic_rights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  right_name text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7. Bulletins
CREATE TABLE public.bulletins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bulletin_id text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'Operations' CHECK (type IN ('Safety', 'Security', 'Operations', 'Quality', 'Regulatory')),
  issued_date date,
  effective_date date,
  expiry_date date,
  issued_by text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Active', 'Expired', 'Draft', 'Superseded')),
  priority text NOT NULL DEFAULT 'Medium' CHECK (priority IN ('High', 'Medium', 'Low')),
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 8. Manuals & Forms
CREATE TABLE public.manuals_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Manual' CHECK (category IN ('Manual', 'Form', 'Checklist', 'SOP')),
  version text NOT NULL DEFAULT '',
  last_updated date,
  department text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Current' CHECK (status IN ('Current', 'Under Review', 'Archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 9. Catering Items
CREATE TABLE public.catering_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item text NOT NULL DEFAULT '',
  unit text NOT NULL DEFAULT '',
  price text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 10. Tube Charges
CREATE TABLE public.tube_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service text NOT NULL DEFAULT '',
  unit text NOT NULL DEFAULT '',
  price text NOT NULL DEFAULT '',
  airport text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 11. Airport Tax
CREATE TABLE public.airport_tax (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tax text NOT NULL DEFAULT '',
  unit text NOT NULL DEFAULT '',
  amount text NOT NULL DEFAULT '',
  applicability text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 12. Basic Ramp Prices
CREATE TABLE public.basic_ramp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service text NOT NULL DEFAULT '',
  unit text NOT NULL DEFAULT '',
  price text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 13. Vendor Equipment
CREATE TABLE public.vendor_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment text NOT NULL DEFAULT '',
  vendor text NOT NULL DEFAULT '',
  rate text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Available',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 14. Hall & VVIP
CREATE TABLE public.hall_vvip (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service text NOT NULL DEFAULT '',
  unit text NOT NULL DEFAULT '',
  price text NOT NULL DEFAULT '',
  terminal text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- RLS: Reference tables readable by all authenticated, writable by admin
-- =============================================

ALTER TABLE public.airlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aircrafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delay_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abbreviations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aircraft_types_ref ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_rights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulletins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manuals_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catering_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tube_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.airport_tax ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.basic_ramp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hall_vvip ENABLE ROW LEVEL SECURITY;

-- SELECT policies (all authenticated can read)
CREATE POLICY "Authenticated can read airlines" ON public.airlines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read aircrafts" ON public.aircrafts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read delay_codes" ON public.delay_codes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read abbreviations" ON public.abbreviations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read aircraft_types_ref" ON public.aircraft_types_ref FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read traffic_rights" ON public.traffic_rights FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read bulletins" ON public.bulletins FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read manuals_forms" ON public.manuals_forms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read catering_items" ON public.catering_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read tube_charges" ON public.tube_charges FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read airport_tax" ON public.airport_tax FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read basic_ramp" ON public.basic_ramp FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read vendor_equipment" ON public.vendor_equipment FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read hall_vvip" ON public.hall_vvip FOR SELECT TO authenticated USING (true);

-- INSERT policies (all authenticated can insert for operational tables, admin for reference)
CREATE POLICY "Authenticated can insert airlines" ON public.airlines FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can insert aircrafts" ON public.aircrafts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin can insert delay_codes" ON public.delay_codes FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admin can insert abbreviations" ON public.abbreviations FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admin can insert aircraft_types_ref" ON public.aircraft_types_ref FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admin can insert traffic_rights" ON public.traffic_rights FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Authenticated can insert bulletins" ON public.bulletins FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can insert manuals_forms" ON public.manuals_forms FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin can insert catering_items" ON public.catering_items FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admin can insert tube_charges" ON public.tube_charges FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admin can insert airport_tax" ON public.airport_tax FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admin can insert basic_ramp" ON public.basic_ramp FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admin can insert vendor_equipment" ON public.vendor_equipment FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admin can insert hall_vvip" ON public.hall_vvip FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));

-- UPDATE policies
CREATE POLICY "Authenticated can update airlines" ON public.airlines FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can update aircrafts" ON public.aircrafts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admin can update delay_codes" ON public.delay_codes FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admin can update abbreviations" ON public.abbreviations FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admin can update aircraft_types_ref" ON public.aircraft_types_ref FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admin can update traffic_rights" ON public.traffic_rights FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Authenticated can update bulletins" ON public.bulletins FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can update manuals_forms" ON public.manuals_forms FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admin can update catering_items" ON public.catering_items FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admin can update tube_charges" ON public.tube_charges FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admin can update airport_tax" ON public.airport_tax FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admin can update basic_ramp" ON public.basic_ramp FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admin can update vendor_equipment" ON public.vendor_equipment FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admin can update hall_vvip" ON public.hall_vvip FOR UPDATE TO authenticated USING (is_admin(auth.uid()));

-- DELETE policies (admin only)
CREATE POLICY "Admin can delete airlines" ON public.airlines FOR DELETE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admin can delete aircrafts" ON public.aircrafts FOR DELETE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admin can delete delay_codes" ON public.delay_codes FOR DELETE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admin can delete abbreviations" ON public.abbreviations FOR DELETE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admin can delete aircraft_types_ref" ON public.aircraft_types_ref FOR DELETE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admin can delete traffic_rights" ON public.traffic_rights FOR DELETE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admin can delete bulletins" ON public.bulletins FOR DELETE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admin can delete manuals_forms" ON public.manuals_forms FOR DELETE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admin can delete catering_items" ON public.catering_items FOR DELETE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admin can delete tube_charges" ON public.tube_charges FOR DELETE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admin can delete airport_tax" ON public.airport_tax FOR DELETE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admin can delete basic_ramp" ON public.basic_ramp FOR DELETE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admin can delete vendor_equipment" ON public.vendor_equipment FOR DELETE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admin can delete hall_vvip" ON public.hall_vvip FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- =============================================
-- Triggers for updated_at
-- =============================================
CREATE TRIGGER set_airlines_updated_at BEFORE UPDATE ON public.airlines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_aircrafts_updated_at BEFORE UPDATE ON public.aircrafts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_delay_codes_updated_at BEFORE UPDATE ON public.delay_codes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_bulletins_updated_at BEFORE UPDATE ON public.bulletins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_manuals_forms_updated_at BEFORE UPDATE ON public.manuals_forms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
