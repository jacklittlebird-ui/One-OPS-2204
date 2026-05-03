// Integration tests for finalize-invoice edge function.
// Verifies role-based access control and audit logging.
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") || Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const FN_URL = `${SUPABASE_URL}/functions/v1/finalize-invoice`;

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

async function call(token: string | null, body: unknown) {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function makeUser(role: string | null) {
  const email = `test_${role ?? "norole"}_${crypto.randomUUID().slice(0, 8)}@test.local`;
  const password = "Test1234!ZxCv";
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (error || !data.user) throw new Error(`createUser: ${error?.message}`);
  if (role) {
    await admin.from("user_roles").insert({ user_id: data.user.id, role });
  }
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: sess, error: sErr } = await userClient.auth.signInWithPassword({ email, password });
  if (sErr || !sess.session) throw new Error(`signIn: ${sErr?.message}`);
  return { id: data.user.id, email, token: sess.session.access_token };
}

async function makeInvoice(suffix = "") {
  const invoice_no = `TEST-${Date.now()}${suffix}-${crypto.randomUUID().slice(0, 4)}`;
  const { data, error } = await admin.from("invoices").insert({
    invoice_no, operator: "Test Air", airline_iata: "TA",
    handling: 100, civil_aviation: 50, vat: 15,
    invoice_type: "Preliminary", status: "Draft",
  }).select().single();
  if (error) throw new Error(`makeInvoice: ${error.message}`);
  return data;
}

async function ensureAccounts() {
  const codes = [
    { code: "1210", name: "Accounts Receivable", account_type: "Asset" },
    { code: "4100", name: "Handling Revenue", account_type: "Revenue" },
    { code: "4200", name: "Civil Aviation Revenue", account_type: "Revenue" },
  ];
  for (const c of codes) {
    const { data } = await admin.from("chart_of_accounts").select("id").eq("code", c.code).maybeSingle();
    if (!data) await admin.from("chart_of_accounts").insert(c);
  }
}

async function cleanup(userId: string, invoiceIds: string[]) {
  for (const id of invoiceIds) {
    const { data: inv } = await admin.from("invoices").select("journal_entry_id").eq("id", id).maybeSingle();
    if (inv?.journal_entry_id) {
      await admin.from("journal_entry_lines").delete().eq("entry_id", inv.journal_entry_id);
      await admin.from("journal_entries").delete().eq("id", inv.journal_entry_id);
    }
    await admin.from("audit_logs").delete().eq("entity_id", id);
    await admin.from("invoices").delete().eq("id", id);
  }
  await admin.from("user_roles").delete().eq("user_id", userId);
  await admin.auth.admin.deleteUser(userId);
}

Deno.test({ name: "rejects unauthenticated requests with 401", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const { status } = await call(null, { invoice_id: "00000000-0000-0000-0000-000000000000" });
  assertEquals(status, 401);
} });

Deno.test({ name: "rejects user without finance role with 403", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const user = await makeUser("station_ops");
  const inv = await makeInvoice("-noRole");
  try {
    const { status, json } = await call(user.token, { invoice_id: inv.id });
    assertEquals(status, 403);
    assert(String(json.error).toLowerCase().includes("forbidden"));
    // Invoice must remain Preliminary
    const { data } = await admin.from("invoices").select("invoice_type").eq("id", inv.id).single();
    assertEquals(data?.invoice_type, "Preliminary");
  } finally {
    await cleanup(user.id, [inv.id]);
  }
} });

Deno.test({ name: "finance role finalizes invoice and writes audit log", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  await ensureAccounts();
  const user = await makeUser("receivables");
  const inv = await makeInvoice("-ok");
  try {
    const { status, json } = await call(user.token, { invoice_id: inv.id });
    assertEquals(status, 200);
    assertEquals(json.ok, true);

    const { data: updated } = await admin.from("invoices")
      .select("invoice_type,status,journal_entry_id,finalized_by").eq("id", inv.id).single();
    assertEquals(updated?.invoice_type, "Final");
    assertEquals(updated?.status, "Sent");
    assert(updated?.journal_entry_id, "journal_entry_id must be set");

    const { data: audit } = await admin.from("audit_logs")
      .select("action,entity_type,user_id").eq("entity_id", inv.id).maybeSingle();
    assert(audit, "audit_logs entry must exist");
    assertEquals(audit?.action, "approve");
    assertEquals(audit?.entity_type, "invoice");
    assertEquals(audit?.user_id, user.id);
  } finally {
    await cleanup(user.id, [inv.id]);
  }
} });

Deno.test({ name: "rejects double-finalization with 409", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  await ensureAccounts();
  const user = await makeUser("admin");
  const inv = await makeInvoice("-dup");
  try {
    const first = await call(user.token, { invoice_id: inv.id });
    assertEquals(first.status, 200);
    const second = await call(user.token, { invoice_id: inv.id });
    assertEquals(second.status, 409);
  } finally {
    await cleanup(user.id, [inv.id]);
  }
} });

Deno.test({ name: "rejects missing invoice_id with 400", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const user = await makeUser("admin");
  try {
    const { status } = await call(user.token, {});
    assertEquals(status, 400);
  } finally {
    await cleanup(user.id, []);
  }
} });
