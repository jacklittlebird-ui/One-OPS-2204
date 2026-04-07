
ALTER TABLE public.service_reports 
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS review_comment text DEFAULT '',
  ADD COLUMN IF NOT EXISTS reviewed_by text DEFAULT '',
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz DEFAULT NULL;
