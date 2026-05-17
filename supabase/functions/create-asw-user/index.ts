import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const email = "aswstn@linkagency.com";
  const password = "aswsec12345";
  const fullName = "ASW Station - Aswan";
  const station = "ASW";

  const { data: list } = await admin.auth.admin.listUsers();
  let user = list?.users?.find((u: any) => u.email === email);
  const log: any[] = [];

  if (user) {
    await admin.auth.admin.updateUserById(user.id, { password });
    log.push({ action: "exists, password updated" });
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    user = data.user!;
    log.push({ action: "created" });
  }

  await admin.from("user_roles").upsert(
    { user_id: user!.id, role: "station_ops" },
    { onConflict: "user_id,role" }
  );
  await admin.from("profiles").upsert(
    { user_id: user!.id, full_name: fullName, station },
    { onConflict: "user_id" }
  );

  return new Response(JSON.stringify({ ok: true, log }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
