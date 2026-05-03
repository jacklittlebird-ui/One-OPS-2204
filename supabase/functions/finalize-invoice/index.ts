// Server-side invoice finalization. Verifies caller role and posts journal entry.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FINANCE_ROLES = new Set(["admin", "general_accounts", "receivables", "payables"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing auth token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validate JWT and identify the user
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Check role
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const hasRole = (roles || []).some((r: any) => FINANCE_ROLES.has(r.role));
    if (!hasRole) {
      return new Response(JSON.stringify({ error: "Forbidden: finance role required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const invoiceId = body?.invoice_id;
    if (!invoiceId || typeof invoiceId !== "string") {
      return new Response(JSON.stringify({ error: "invoice_id is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: inv, error: invErr } = await admin.from("invoices").select("*").eq("id", invoiceId).single();
    if (invErr || !inv) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (inv.invoice_type === "Final") {
      return new Response(JSON.stringify({ error: "Invoice already finalized" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: accounts } = await admin.from("chart_of_accounts").select("id,code").in("code", ["1210", "4100", "4200", "4300", "4400"]);
    const acctMap: Record<string, string> = {};
    (accounts || []).forEach((a: any) => { acctMap[a.code] = a.id; });
    const receivableId = acctMap["1210"];
    if (!receivableId) {
      return new Response(JSON.stringify({ error: "Receivable account (1210) missing" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const entryNo = `JE-INV-${inv.invoice_no}`;
    const { data: je, error: jeErr } = await admin.from("journal_entries").insert({
      entry_no: entryNo, entry_date: inv.date, description: `Invoice ${inv.invoice_no} - ${inv.operator}`,
      reference: inv.invoice_no, reference_type: "Invoice", reference_id: inv.id,
      status: "Posted", total_debit: inv.total, total_credit: inv.total,
      created_by: user.email || user.id, posted_at: new Date().toISOString(),
    }).select().single();
    if (jeErr) {
      return new Response(JSON.stringify({ error: jeErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const entryId = je.id;

    const lines: any[] = [
      { entry_id: entryId, account_id: receivableId, debit: inv.total, credit: 0, description: `A/R - ${inv.operator}`, sort_order: 0 },
    ];
    let so = 1;
    const push = (code: string, amt: number, desc: string) => {
      if (amt > 0 && acctMap[code]) lines.push({ entry_id: entryId, account_id: acctMap[code], debit: 0, credit: amt, description: desc, sort_order: so++ });
    };
    push("4200", Number(inv.civil_aviation || 0), "Civil Aviation Revenue");
    push("4100", Number(inv.handling || 0), "Handling Revenue");
    push("4300", Number(inv.airport_charges || 0), "Airport Charges Revenue");
    push("4400", Number(inv.catering || 0), "Catering Revenue");
    const creditTotal = lines.filter(l => l.credit > 0).reduce((s, l) => s + l.credit, 0);
    const remaining = Number(inv.total) - creditTotal;
    if (remaining > 0) {
      const fb = acctMap["4100"] || Object.values(acctMap).find(id => id !== receivableId);
      if (fb) lines.push({ entry_id: entryId, account_id: fb, debit: 0, credit: remaining, description: "Other Revenue", sort_order: so++ });
    }
    await admin.from("journal_entry_lines").insert(lines);

    await admin.from("invoices").update({
      invoice_type: "Final", finalized_at: new Date().toISOString(),
      finalized_by: user.email || user.id, journal_entry_id: entryId, status: "Sent",
    }).eq("id", inv.id);

    await admin.from("audit_logs").insert({
      user_id: user.id, user_email: user.email || "", action: "approve",
      entity_type: "invoice", entity_id: inv.id,
      details: { invoice_no: inv.invoice_no, journal_entry: entryNo, total: inv.total },
      ip_address: req.headers.get("x-forwarded-for") || "", user_agent: "edge:finalize-invoice",
    });

    return new Response(JSON.stringify({ ok: true, entry_no: entryNo, entry_id: entryId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
