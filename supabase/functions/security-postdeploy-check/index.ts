// Post-deployment security smoke check + persistence.
// Verifies the critical RLS hardening is still in place and stores the run.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Check = { id: string; ok: boolean; detail?: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceKey);
  const checks: Check[] = [];

  // 1) audit_logs INSERT policy
  const { data: pol } = await admin
    .from("pg_policies")
    .select("policyname, cmd, with_check")
    .eq("schemaname", "public")
    .eq("tablename", "audit_logs");
  const insertPol = (pol ?? []).find((p: any) => p.cmd === "INSERT");
  checks.push({
    id: "AUDIT_LOG_SPOOFING",
    ok: !!insertPol && /auth\.uid\(\)/.test(insertPol.with_check ?? ""),
    detail: insertPol?.with_check ?? "missing INSERT policy",
  });

  // 2) audit_logs trigger
  const { data: trg } = await admin
    .from("pg_trigger")
    .select("tgname")
    .eq("tgname", "trg_enforce_audit_log_user");
  checks.push({
    id: "AUDIT_LOG_TRIGGER",
    ok: (trg ?? []).length > 0,
    detail: (trg ?? []).length ? "trigger present" : "trigger missing",
  });

  // 3) realtime.messages topic-scoped policy
  const { data: rtPol } = await admin
    .from("pg_policies")
    .select("policyname, qual, cmd")
    .eq("schemaname", "realtime")
    .eq("tablename", "messages");
  const scoped = (rtPol ?? []).find((p: any) =>
    /realtime\.topic\(\)/.test(p.qual ?? "")
  );
  const permissive = (rtPol ?? []).find(
    (p: any) => (p.qual ?? "").trim() === "true"
  );
  checks.push({
    id: "REALTIME_UNAUTHORIZED_CHANNEL_SUBSCRIPTION",
    ok: !!scoped && !permissive,
    detail: permissive
      ? "permissive policy still present"
      : scoped?.qual ?? "no scoped policy",
  });

  const passed = checks.every((c) => c.ok);
  const source = req.headers.get("x-check-source") ?? "edge-function";

  // Persist run
  await admin.from("security_check_runs").insert({ passed, checks, source });

  return new Response(
    JSON.stringify(
      { passed, checks, scanned_at: new Date().toISOString() },
      null,
      2
    ),
    {
      status: passed ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
