CREATE OR REPLACE FUNCTION public.trg_air_france_defaults()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_af boolean;
  v_is_et boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.airlines a
    WHERE a.id = NEW.airline_id
      AND (a.name ILIKE 'Air France%' OR a.iata_code = 'AF' OR a.code = 'AF')
  ) INTO v_is_af;

  SELECT EXISTS (
    SELECT 1 FROM public.airlines a
    WHERE a.id = NEW.airline_id
      AND (a.name ILIKE 'Ethiopian%' OR a.iata_code = 'ET' OR a.code = 'ET')
  ) INTO v_is_et;

  IF v_is_af OR v_is_et THEN
    NEW.clearance_type := 'Turnaround Security';
    NEW.skd_type := 'Schedule';
  END IF;
  RETURN NEW;
END;
$$;