
-- 1) Fix AUDIT_LOG_SPOOFING: tighten INSERT policy
DROP POLICY IF EXISTS "Users can insert own audit_logs" ON public.audit_logs;

CREATE POLICY "Users can insert own audit_logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 2) Fix REALTIME_UNAUTHORIZED_CHANNEL_SUBSCRIPTION
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can receive realtime messages" ON realtime.messages;
CREATE POLICY "Authenticated can receive realtime messages"
ON realtime.messages
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated can send realtime messages" ON realtime.messages;
CREATE POLICY "Authenticated can send realtime messages"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (true);
