CREATE OR REPLACE FUNCTION public.has_internal_access(_user_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id
    AND role IN ('admin','general_accounts','receivables','payables','accountant','station_manager','station_ops','operations','clearance','contracts'))
$$;
CREATE OR REPLACE FUNCTION public.has_finance_access(_user_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id
    AND role IN ('admin','general_accounts','receivables','payables','accountant'))
$$;
CREATE OR REPLACE FUNCTION public.has_ops_access(_user_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id
    AND role IN ('admin','station_manager','station_ops','operations'))
$$;