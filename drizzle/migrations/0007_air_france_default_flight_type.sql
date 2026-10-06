CREATE OR REPLACE FUNCTION public.trg_air_france_defaults()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_af boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.airlines a
    WHERE a.id = NEW.airline_id
      AND (a.name ILIKE 'Air France%' OR a.iata_code = 'AF' OR a.code = 'AF')
  ) INTO v_is_af;

  IF v_is_af THEN
    NEW.clearance_type := 'Turnaround Security';
    NEW.skd_type := 'Schedule';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_air_france_defaults ON public.flight_schedules;
CREATE TRIGGER trg_air_france_defaults
BEFORE INSERT ON public.flight_schedules
FOR EACH ROW
EXECUTE FUNCTION public.trg_air_france_defaults();