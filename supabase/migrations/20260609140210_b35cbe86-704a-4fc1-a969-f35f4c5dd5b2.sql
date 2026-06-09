REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_dispatches_for_deleted_flight_schedule() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_security_dispatch_to_flight_schedule() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_audit_log_user() FROM PUBLIC, anon, authenticated;