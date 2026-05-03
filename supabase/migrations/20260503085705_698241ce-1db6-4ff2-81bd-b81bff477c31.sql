CREATE OR REPLACE FUNCTION public.has_finance_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.has_role(_user_id, 'admin'::app_role)
      OR public.has_role(_user_id, 'general_accounts'::app_role)
      OR public.has_role(_user_id, 'receivables'::app_role)
      OR public.has_role(_user_id, 'payables'::app_role)
      OR public.has_role(_user_id, 'accountant'::app_role)
$function$;