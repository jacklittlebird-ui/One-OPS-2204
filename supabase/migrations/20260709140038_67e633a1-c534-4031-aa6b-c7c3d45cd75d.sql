
CREATE TABLE public.recurring_journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  frequency TEXT NOT NULL CHECK (frequency IN ('Monthly','Quarterly','Annual')) DEFAULT 'Monthly',
  day_of_month INT NOT NULL DEFAULT 1 CHECK (day_of_month BETWEEN 1 AND 28),
  start_date DATE NOT NULL,
  end_date DATE,
  next_run_date DATE NOT NULL,
  last_run_date DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  company_id UUID,
  station_id UUID,
  currency TEXT DEFAULT 'EGP',
  reference_prefix TEXT DEFAULT 'REC',
  template_lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  run_count INT NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_journal_entries TO authenticated;
GRANT ALL ON public.recurring_journal_entries TO service_role;

ALTER TABLE public.recurring_journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance can view recurring JE"
  ON public.recurring_journal_entries FOR SELECT
  TO authenticated
  USING (public.has_finance_access(auth.uid()));

CREATE POLICY "Finance can insert recurring JE"
  ON public.recurring_journal_entries FOR INSERT
  TO authenticated
  WITH CHECK (public.has_finance_access(auth.uid()));

CREATE POLICY "Finance can update recurring JE"
  ON public.recurring_journal_entries FOR UPDATE
  TO authenticated
  USING (public.has_finance_access(auth.uid()))
  WITH CHECK (public.has_finance_access(auth.uid()));

CREATE POLICY "Finance can delete recurring JE"
  ON public.recurring_journal_entries FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_recurring_je_updated_at
  BEFORE UPDATE ON public.recurring_journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_recurring_je_next_run ON public.recurring_journal_entries(next_run_date) WHERE active = true;
