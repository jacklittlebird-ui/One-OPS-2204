ALTER TABLE public.dispatch_assignments 
ADD COLUMN IF NOT EXISTS task_sheet_data JSONB DEFAULT '{}'::jsonb;