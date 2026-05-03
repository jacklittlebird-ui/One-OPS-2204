// Integration test for post-deploy security check.
// Asserts:
//  - audit_logs INSERT with a foreign user_id is rejected (RLS / trigger)
//  - realtime.messages does NOT allow subscribing to another user's topic
// Skips automatically when the required env vars are not present.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const url = Deno.env.get("SUPABASE_URL");
const anon = Deno.env.get("SUPABASE_ANON_KEY");

Deno.test({
  name: "audit_logs rejects spoofed user_id",
  ignore: !url || !anon,
  fn: async () => {
    const client = createClient(url!, anon!);
    // Anonymous client (no session) — INSERT must be rejected by RLS.
    const { error } = await client.from("audit_logs").insert({
      user_id: "00000000-0000-0000-0000-000000000000",
      user_email: "spoof@test",
      action: "spoof",
      entity_type: "test",
    });
    assert(error, "Expected RLS/trigger to reject spoofed audit_logs insert");
  },
});

Deno.test({
  name: "realtime.messages blocks unauthorized topic subscription",
  ignore: !url || !anon,
  fn: async () => {
    const client = createClient(url!, anon!, { realtime: { params: { eventsPerSecond: 2 } } });
    const otherUserTopic = "notifications:11111111-1111-1111-1111-111111111111";
    const channel = client.channel(otherUserTopic, { config: { private: true } });

    const status = await new Promise<string>((resolve) => {
      const t = setTimeout(() => resolve("TIMED_OUT"), 5000);
      channel.subscribe((s) => {
        clearTimeout(t);
        resolve(s);
      });
    });

    await client.removeChannel(channel);
    // Must NOT be SUBSCRIBED — either CHANNEL_ERROR / CLOSED / TIMED_OUT is acceptable.
    assert(status !== "SUBSCRIBED", `Unauthorized subscribe should fail, got: ${status}`);
  },
});
