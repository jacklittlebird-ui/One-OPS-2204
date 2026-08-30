REVOKE ALL ON FUNCTION public.enforce_confirmed_flight_delete() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_confirmed_flight_delete() TO service_role;