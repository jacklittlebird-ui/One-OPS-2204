-- Restrict SECURITY DEFINER functions from public/anon access
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_ops_access(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_finance_access(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_ops_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_finance_access(uuid) TO authenticated;