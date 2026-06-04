REVOKE ALL ON FUNCTION public.sync_security_dispatch_to_flight_schedule() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_security_dispatch_to_flight_schedule() FROM anon;
REVOKE ALL ON FUNCTION public.sync_security_dispatch_to_flight_schedule() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.sync_security_dispatch_to_flight_schedule() TO service_role;