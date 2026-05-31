import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function ensure(admin: any, list: any, email: string, password: string, fullName: string, station: string) {
  const log: any[] = [];
  let user = list?.users?.find((u: any) => u.email === email);
  if (user) {
    await admin.auth.admin.updateUserById(user.id, { password, email_confirm: true });
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
  await admin.from("profiles").upsert(
    { user_id: user.id, full_name: fullName, station },
    { onConflict: "user_id" }
  );
  log.push({ email, action: `assigned station_ops, station ${station}` });
  return log;
}

const ACCOUNTS: Array<[string, string, string]> = [
  ["aswstn@linkagency.com",  "aswsec12345",  "ASW"],
  ["caistn@linkagency.com",  "Caisec11445",  "CAI"],
  ["sshstn@linkagency.com",  "Sshsec55441",  "SSH"],
  ["hrgstn@linkagency.com",  "Hrgsec33551",  "HRG"],
  ["lxrstn@linkagency.com",  "Lxrsec99881",  "LXR"],
  ["absstn@linkagency.com",  "Abssec44661",  "ABS"],
  ["ccestn@linkagency.com",  "Ccesec77551",  "CCE"],
  ["dbbstn@linkagency.com",  "Dbbsec77661",  "DBB"],
  ["hegostn@linkagency.com", "Hegosec88441", "HEGO"],
  ["muhstn@linkagency.com",  "Muhsec88661",  "MUH"],
  ["spxstn@linkagency.com",  "Spxsec66442",  "SPX"],
  ["uvlstn@linkagency.com",  "Uvlsec99886",  "UVL"],
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: list } = await admin.auth.admin.listUsers();
  const results: any[] = [];

  for (const [email, password, station] of ACCOUNTS) {
    const fullName = `${station} Station`;
    results.push(...await ensure(admin, list, email, password, fullName, station));
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
