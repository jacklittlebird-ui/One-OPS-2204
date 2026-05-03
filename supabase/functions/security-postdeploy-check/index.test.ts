// Extended integration tests for audit_logs and realtime.messages RLS.
// Skipped automatically when env vars are not present.

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const url =
  Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL");
const anon =
  Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY");
const testEmail = Deno.env.get("AUDIT_TEST_EMAIL");
const testPassword = Deno.env.get("AUDIT_TEST_PASSWORD");

const skip = !url || !anon || !testEmail || !testPassword;

Deno.test({
  name: "audit_logs: valid user_id is allowed; invalid UUID is rejected",
  ignore: skip,
  fn: async () => {
    const c = createClient(url!, anon!);
    const { data: auth, error: authErr } = await c.auth.signInWithPassword({
      email: testEmail!, password: testPassword!,
    });
    assert(!authErr && auth?.user, "auth required for test");
    const uid = auth!.user!.id;

    // ✅ valid insert
    const ok = await c.from("audit_logs").insert({
      user_id: uid,
      user_email: auth!.user!.email!,
      action: "test_valid",
      entity_type: "test",
    });
    assert(!ok.error, `valid insert should succeed, got: ${ok.error?.message}`);

    // ❌ nil UUID
    const nil = await c.from("audit_logs").insert({
      user_id: "00000000-0000-0000-0000-000000000000",
      user_email: "x", action: "test_nil", entity_type: "test",
    });
    assert(nil.error, "nil UUID must be rejected");

    // ❌ foreign UUID
    const foreign = await c.from("audit_logs").insert({
      user_id: "11111111-1111-1111-1111-111111111111",
      user_email: "x", action: "test_foreign", entity_type: "test",
    });
    assert(foreign.error, "foreign user_id must be rejected");

    await c.auth.signOut();
  },
});

Deno.test({
  name: "realtime.messages: cannot receive payloads from another user's topic",
  ignore: !url || !anon,
  fn: async () => {
    const c = createClient(url!, anon!);
    const otherTopic = "notifications:11111111-1111-1111-1111-111111111111";
    const channel = c.channel(otherTopic, { config: { private: true, broadcast: { self: false } } });

    let received = false;
    channel.on("broadcast", { event: "*" }, () => { received = true; });
    channel.on("postgres_changes", { event: "*", schema: "public" }, () => { received = true; });

    const status = await new Promise<string>((resolve) => {
      const t = setTimeout(() => resolve("TIMED_OUT"), 4000);
      channel.subscribe((s) => { clearTimeout(t); resolve(s); });
    });

    // Wait a brief moment to see if any messages leak in.
    await new Promise((r) => setTimeout(r, 1500));

    await c.removeChannel(channel);

    assert(status !== "SUBSCRIBED", `must not fully subscribe, got: ${status}`);
    assert(!received, "must not receive any messages from another user's topic");
  },
});
