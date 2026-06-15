ALTER VIEW public.v_dispatch_with_flight SET (security_invoker = true);
-- Apply the same hardening to sibling views for consistency, if they were
-- created without the option set explicitly.
ALTER VIEW public.v_service_report_with_flight SET (security_invoker = true);
ALTER VIEW public.security_pending_approval_view SET (security_invoker = true);
