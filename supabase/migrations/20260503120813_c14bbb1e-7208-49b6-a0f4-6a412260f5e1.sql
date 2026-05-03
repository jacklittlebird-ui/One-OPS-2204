
DROP POLICY IF EXISTS "Authenticated can receive realtime messages" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated can send realtime messages" ON realtime.messages;

-- Only allow subscribing to a topic that belongs to the current user
CREATE POLICY "Users can subscribe to own realtime topic"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'notifications:' || auth.uid()::text
  OR realtime.topic() LIKE auth.uid()::text || ':%'
);
