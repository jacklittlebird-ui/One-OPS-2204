
CREATE TABLE public.dispatch_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flight_schedule_id uuid REFERENCES public.flight_schedules(id) ON DELETE SET NULL,
  contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  station text NOT NULL DEFAULT 'CAI',
  airline text NOT NULL DEFAULT '',
  flight_no text NOT NULL DEFAULT '',
  flight_date date NOT NULL DEFAULT CURRENT_DATE,
  service_type text NOT NULL DEFAULT 'Arrival',
  staff_names text NOT NULL DEFAULT '',
  staff_count integer NOT NULL DEFAULT 0,
  scheduled_start text NOT NULL DEFAULT '',
  scheduled_end text NOT NULL DEFAULT '',
  actual_start text NOT NULL DEFAULT '',
  actual_end text NOT NULL DEFAULT '',
  contract_duration_hours numeric NOT NULL DEFAULT 0,
  actual_duration_hours numeric NOT NULL DEFAULT 0,
  overtime_hours numeric NOT NULL DEFAULT 0,
  overtime_rate numeric NOT NULL DEFAULT 0,
  base_fee numeric NOT NULL DEFAULT 0,
  service_rate numeric NOT NULL DEFAULT 0,
  overtime_charge numeric NOT NULL DEFAULT 0,
  total_charge numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Pending',
  notes text NOT NULL DEFAULT '',
  dispatched_by text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.dispatch_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read dispatch_assignments"
  ON public.dispatch_assignments FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert dispatch_assignments"
  ON public.dispatch_assignments FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update dispatch_assignments"
  ON public.dispatch_assignments FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Admin can delete dispatch_assignments"
  ON public.dispatch_assignments FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

CREATE TRIGGER update_dispatch_assignments_updated_at
  BEFORE UPDATE ON public.dispatch_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
