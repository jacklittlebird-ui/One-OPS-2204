
-- Clean any pre-existing bad rows so constraints can be added
DELETE FROM public.audit_logs
WHERE user_id IS NULL OR user_id = '00000000-0000-0000-0000-000000000000';

ALTER TABLE public.audit_logs
  ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.audit_logs
  DROP CONSTRAINT IF EXISTS audit_logs_user_id_not_nil;
ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_user_id_not_nil
  CHECK (user_id <> '00000000-0000-0000-0000-000000000000');

CREATE OR REPLACE FUNCTION public.enforce_audit_log_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL OR NEW.user_id = '00000000-0000-0000-0000-000000000000' THEN
    RAISE EXCEPTION 'audit_logs.user_id must be a valid UUID';
  END IF;
  IF auth.uid() IS NULL OR NEW.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'audit_logs.user_id must match the authenticated user';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_audit_log_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_enforce_audit_log_user ON public.audit_logs;
CREATE TRIGGER trg_enforce_audit_log_user
  BEFORE INSERT ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.enforce_audit_log_user();
