import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const results = [];

  // 1) Ensure admin@linkagency.com has the admin role
  const { data: adminList } = await supabaseAdmin.auth.admin.listUsers();
  const adminUser = adminList?.users?.find((u: any) => u.email === "admin@linkagency.com");
  if (adminUser) {
    await supabaseAdmin.from("user_roles").upsert(
      { user_id: adminUser.id, role: "admin" },
      { onConflict: "user_id,role" }
    );
    results.push({ email: "admin@linkagency.com", action: "ensured admin role" });
  }

  // 2) Create test@linkagency.com with ALL roles
  const testEmail = "test@linkagency.com";
  const testPassword = "Test12345";
  let testUserId: string | null = null;

  const existingTest = adminList?.users?.find((u: any) => u.email === testEmail);
  if (existingTest) {
    testUserId = existingTest.id;
    // Update password
    await supabaseAdmin.auth.admin.updateUserById(testUserId!, { password: testPassword });
    results.push({ email: testEmail, action: "already exists, password updated" });
  } else {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: "Test User" },
    });
    if (error) {
      results.push({ email: testEmail, error: error.message });
    } else {
      testUserId = data.user?.id || null;
      results.push({ email: testEmail, action: "created" });
    }
  }

  if (testUserId) {
    const allRoles = ["admin", "station_manager", "station_ops", "employee", "clearance", "contracts", "operations", "receivables", "payables"];
    for (const role of allRoles) {
      await supabaseAdmin.from("user_roles").upsert(
        { user_id: testUserId, role },
        { onConflict: "user_id,role" }
      );
    }
    // Also create profile
    await supabaseAdmin.from("profiles").upsert(
      { user_id: testUserId, full_name: "Test User", station: "CAI" },
      { onConflict: "user_id" }
    );
    results.push({ email: testEmail, action: "all roles assigned" });
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
