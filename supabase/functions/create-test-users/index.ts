import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function ensureUser(
  supabaseAdmin: any,
  adminList: any,
  email: string,
  password: string,
  fullName: string,
  roles: string[],
  station: string = "CAI"
) {
  const results: any[] = [];
  let userId: string | null = null;

  const existing = adminList?.users?.find((u: any) => u.email === email);
  if (existing) {
    userId = existing.id;
    await supabaseAdmin.auth.admin.updateUserById(userId!, { password });
    results.push({ email, action: "already exists, password updated" });
  } else {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error) {
      results.push({ email, error: error.message });
      return results;
    }
    userId = data.user?.id || null;
    results.push({ email, action: "created" });
  }

  if (userId) {
    for (const role of roles) {
      await supabaseAdmin.from("user_roles").upsert(
        { user_id: userId, role },
        { onConflict: "user_id,role" }
      );
    }
    await supabaseAdmin.from("profiles").upsert(
      { user_id: userId, full_name: fullName, station },
      { onConflict: "user_id" }
    );
    results.push({ email, action: `roles assigned: ${roles.join(", ")}` });
  }

  return results;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: adminList } = await supabaseAdmin.auth.admin.listUsers();
  const results: any[] = [];

  // 1) Ensure admin@linkagency.com has the admin role
  const adminUser = adminList?.users?.find((u: any) => u.email === "admin@linkagency.com");
  if (adminUser) {
    await supabaseAdmin.from("user_roles").upsert(
      { user_id: adminUser.id, role: "admin" },
      { onConflict: "user_id,role" }
    );
    results.push({ email: "admin@linkagency.com", action: "ensured admin role" });
  }

  // 2) test@linkagency.com — ALL roles
  const testResults = await ensureUser(supabaseAdmin, adminList,
    "test@linkagency.com", "Test12345", "Test User",
    ["admin", "station_manager", "station_ops", "employee", "clearance", "contracts", "operations", "receivables", "payables"]
  );
  results.push(...testResults);

  // 3) clearance@one.com — clearance only
  const clearanceResults = await ensureUser(supabaseAdmin, adminList,
    "clearance@one.com", "Clear12345", "Clearance User",
    ["clearance"]
  );
  results.push(...clearanceResults);

  // 4) Clearance Portal: clearance@linkagency.com
  const clearancePortalResults = await ensureUser(supabaseAdmin, adminList,
    "clearance@linkagency.com", "Clear#54321", "Clearance Portal",
    ["clearance"]
  );
  results.push(...clearancePortalResults);

  // 5) Operations Portal: operations@linkagency.com
  const opsPortalResults = await ensureUser(supabaseAdmin, adminList,
    "operations@linkagency.com", "Ops#12345", "Operations Portal",
    ["operations"]
  );
  results.push(...opsPortalResults);

  // 6) Accounts Receivable Portal: accrec@linkagency.com
  const accrecPortalResults = await ensureUser(supabaseAdmin, adminList,
    "accrec@linkagency.com", "Accrec#12345", "Accounts Receivable Portal",
    ["receivables"]
  );
  results.push(...accrecPortalResults);

  // 7) Contracts Portal: contracts@linkagency.com
  const contractsPortalResults = await ensureUser(supabaseAdmin, adminList,
    "contracts@linkagency.com", "Condep12345", "Contracts Portal",
    ["contracts"]
  );
  results.push(...contractsPortalResults);

  // 8) HBE Station Portal: hbestn@linkagency.com (Borg El Arab)
  const hbeStationResults = await ensureUser(supabaseAdmin, adminList,
    "hbestn@linkagency.com", "Hbesec12345", "HBE Station - Borg El Arab",
    ["station_ops"], "HBE"
  );
  results.push(...hbeStationResults);

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
