
-- Flight Schedule: Add IATA SSIM-standard fields
ALTER TABLE public.flight_schedules
  ADD COLUMN IF NOT EXISTS season text NOT NULL DEFAULT 'S',
  ADD COLUMN IF NOT EXISTS flight_type text NOT NULL DEFAULT 'Passenger',
  ADD COLUMN IF NOT EXISTS effective_from date,
  ADD COLUMN IF NOT EXISTS effective_to date,
  ADD COLUMN IF NOT EXISTS frequency text NOT NULL DEFAULT 'Weekly',
  ADD COLUMN IF NOT EXISTS codeshare text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS handling_agent text NOT NULL DEFAULT '';

-- Invoices: Add payment tracking & billing period (industry best practice)
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS payment_date date,
  ADD COLUMN IF NOT EXISTS payment_ref text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS billing_period text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS credit_note_ref text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS station text NOT NULL DEFAULT 'CAI';

-- Staff Roster: Add qualification & training tracking
ALTER TABLE public.staff_roster
  ADD COLUMN IF NOT EXISTS qualification text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS training_status text NOT NULL DEFAULT 'Current',
  ADD COLUMN IF NOT EXISTS license_no text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS emergency_contact text NOT NULL DEFAULT '';

-- Airlines: Add commercial terms
ALTER TABLE public.airlines
  ADD COLUMN IF NOT EXISTS credit_terms text NOT NULL DEFAULT 'Net 30',
  ADD COLUMN IF NOT EXISTS billing_currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS iata_code text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS icao_code text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS alliance text NOT NULL DEFAULT '';

-- Lost & Found: Add tracking improvement
ALTER TABLE public.lost_found
  ADD COLUMN IF NOT EXISTS item_id text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS weight text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS terminal text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS found_by text NOT NULL DEFAULT '';

-- Clearances: Add permit tracking
ALTER TABLE public.clearances
  ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS passengers integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cargo_kg numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS handling_agent text NOT NULL DEFAULT '';

-- Overfly Schedules: Add tracking
ALTER TABLE public.overfly_schedules
  ADD COLUMN IF NOT EXISTS fir_zones text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS distance_nm numeric NOT NULL DEFAULT 0;

-- Bulletins: Add distribution tracking
ALTER TABLE public.bulletins
  ADD COLUMN IF NOT EXISTS recipients text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS acknowledged_by text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS category_code text NOT NULL DEFAULT '';
