
ALTER TABLE public.clearances
  ADD COLUMN IF NOT EXISTS config integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS departure_flight text DEFAULT '',
  ADD COLUMN IF NOT EXISTS arrival_flight text DEFAULT '',
  ADD COLUMN IF NOT EXISTS departure_date text,
  ADD COLUMN IF NOT EXISTS arrival_date text,
  ADD COLUMN IF NOT EXISTS sta text DEFAULT '',
  ADD COLUMN IF NOT EXISTS std text DEFAULT '',
  ADD COLUMN IF NOT EXISTS skd_type text DEFAULT '',
  ADD COLUMN IF NOT EXISTS royalty boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS handling text DEFAULT '',
  ADD COLUMN IF NOT EXISTS week_days text DEFAULT '',
  ADD COLUMN IF NOT EXISTS period_from text,
  ADD COLUMN IF NOT EXISTS period_to text,
  ADD COLUMN IF NOT EXISTS no_of_flights integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ref_no text DEFAULT '',
  ADD COLUMN IF NOT EXISTS notes text DEFAULT '';
