CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plate_no text NOT NULL,
  make_model text,
  year integer,
  station text,
  status text NOT NULL DEFAULT 'Active',
  insured_driver_type text NOT NULL DEFAULT 'employee',
  insured_driver_employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  insured_driver_name text,
  insurance_company text,
  insurance_policy_no text,
  insurance_start_date date,
  insurance_end_date date,
  license_expiry_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX vehicles_plate_no_key ON public.vehicles (plate_no);
CREATE INDEX idx_vehicles_insurance_dates ON public.vehicles (insurance_end_date, insurance_start_date);
CREATE INDEX idx_vehicles_driver_emp ON public.vehicles (insured_driver_employee_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT ALL ON public.vehicles TO service_role;

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal staff can view vehicles" ON public.vehicles
  FOR SELECT TO authenticated USING (public.has_internal_access(auth.uid()));
CREATE POLICY "Managers can insert vehicles" ON public.vehicles
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()) OR public.has_finance_access(auth.uid()) OR public.has_role(auth.uid(), 'station_manager'));
CREATE POLICY "Managers can update vehicles" ON public.vehicles
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()) OR public.has_finance_access(auth.uid()) OR public.has_role(auth.uid(), 'station_manager'));
CREATE POLICY "Admins can delete vehicles" ON public.vehicles
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()) OR public.has_finance_access(auth.uid()));

CREATE OR REPLACE FUNCTION public.validate_vehicle()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.insured_driver_type NOT IN ('bastateen_insurance','employee') THEN
    RAISE EXCEPTION 'insured_driver_type must be bastateen_insurance or employee';
  END IF;

  IF NEW.insured_driver_type = 'bastateen_insurance' THEN
    NEW.insured_driver_employee_id := NULL;
    NEW.insured_driver_name := 'تأمينات البساتين';
  ELSE
    IF NEW.insured_driver_employee_id IS NULL THEN
      RAISE EXCEPTION 'An employee must be selected as the insured driver';
    END IF;
    SELECT full_name INTO NEW.insured_driver_name FROM public.employees WHERE id = NEW.insured_driver_employee_id;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_vehicle
BEFORE INSERT OR UPDATE ON public.vehicles
FOR EACH ROW EXECUTE FUNCTION public.validate_vehicle();