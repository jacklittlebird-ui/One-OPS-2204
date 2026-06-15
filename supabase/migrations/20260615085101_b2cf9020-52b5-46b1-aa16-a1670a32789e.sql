ALTER VIEW public.v_dispatch_with_flight         SET (security_invoker = true);
ALTER VIEW public.v_service_report_with_flight   SET (security_invoker = true);
ALTER VIEW public.security_pending_approval_view SET (security_invoker = true);