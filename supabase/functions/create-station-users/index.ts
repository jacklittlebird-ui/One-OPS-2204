import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function ensure(admin: any, list: any, email: string, password: string, fullName: string, station: string) {
  const log: any[] = [];
  let user = list?.users?.find((u: any) => u.email === email);
  if (user) {
    await admin.auth.admin.updateUserById(user.id, { password });
    log.push({ email, action: "exists, password updated" });
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error) { log.push({ email, error: error.message }); return log; }
    user = data.user!;
    log.push({ email, action: "created" });
  }
  await admin.from("user_roles").upsert({ user_id: user.id, role: "station_ops" }, { onConflict: "user_id,role" });
  await admin.from("profiles").upsert({ user_id: user.id, full_name: fullName, station }, { onConflict: "user_id" });
  log.push({ email, action: `assigned station ${station}` });
  return log;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: list } = await admin.auth.admin.listUsers();
  const results: any[] = [];

  results.push(...await ensure(admin, list, "atzstn@linkagency.com", "Atzsec12345", "ATZ Station - Asyut", "ATZ"));
  results.push(...await ensure(admin, list, "hmbstn@linkagency.com", "hmbsec12345", "HMB Station - Sohag", "HMB"));

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
