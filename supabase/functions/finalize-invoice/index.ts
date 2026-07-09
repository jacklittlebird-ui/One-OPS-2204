// Server-side invoice finalization. Verifies caller role, resolves FX rate,
// and posts a journal entry with 4D cost-center + multi-currency metadata.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FINANCE_ROLES = new Set(["admin", "general_accounts", "receivables", "payables"]);

// Resolve FX rate from exchange_rates for (base, quote, on_or_before(date)).
// Returns 1 if base == quote or no rate found.
async function resolveFxRate(admin: any, base: string, quote: string, onDate: string) {
  if (!base || !quote || base === quote) return { rate: 1, rate_date: onDate };
  const { data } = await admin
    .from("exchange_rates")
    .select("mid_rate, rate_date")
    .eq("base_currency", base)
    .eq("quote_currency", quote)
    .lte("rate_date", onDate)
    .order("rate_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (data?.mid_rate) return { rate: Number(data.mid_rate), rate_date: data.rate_date };
  // Try inverse
  const { data: inv } = await admin
    .from("exchange_rates")
    .select("mid_rate, rate_date")
    .eq("base_currency", quote)
    .eq("quote_currency", base)
    .lte("rate_date", onDate)
    .order("rate_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (inv?.mid_rate && Number(inv.mid_rate) > 0) {
    return { rate: 1 / Number(inv.mid_rate), rate_date: inv.rate_date };
  }
  return { rate: 1, rate_date: onDate };
}

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

    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

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

    // Resolve company base currency
    let baseCurrency: string = inv.base_currency || "USD";
    if (inv.company_id) {
      const { data: co } = await admin.from("companies").select("base_currency").eq("id", inv.company_id).maybeSingle();
      if (co?.base_currency) baseCurrency = co.base_currency;
    }
    const txnCurrency: string = inv.transaction_currency || inv.currency || baseCurrency;
    const { rate: fxRate, rate_date: fxDate } = await resolveFxRate(admin, txnCurrency, baseCurrency, inv.date);

    // Resolve airline_id from operator (best-effort)
    let airlineId: string | null = null;
    if (inv.operator) {
      const { data: al } = await admin
        .from("airlines")
        .select("id")
        .or(`name.eq.${inv.operator},iata_code.eq.${inv.operator},icao_code.eq.${inv.operator}`)
        .limit(1)
        .maybeSingle();
      airlineId = al?.id ?? null;
    }

    const { data: accounts } = await admin.from("chart_of_accounts").select("id,code").in("code", ["1210", "4100", "4200", "4300", "4400"]);
    const acctMap: Record<string, string> = {};
    (accounts || []).forEach((a: any) => { acctMap[a.code] = a.id; });
    const receivableId = acctMap["1210"];
    if (!receivableId) {
      return new Response(JSON.stringify({ error: "Receivable account (1210) missing" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const baseTotal = Number(inv.total) * fxRate;

    const entryNo = `JE-INV-${inv.invoice_no}`;
    const { data: je, error: jeErr } = await admin.from("journal_entries").insert({
      entry_no: entryNo, entry_date: inv.date, description: `Invoice ${inv.invoice_no} - ${inv.operator}`,
      reference: inv.invoice_no, reference_type: "Invoice", reference_id: inv.id,
      status: "Posted", total_debit: inv.total, total_credit: inv.total,
      company_id: inv.company_id ?? null,
      base_currency: baseCurrency,
      created_by: user.email || user.id, posted_at: new Date().toISOString(),
    }).select().single();
    if (jeErr) {
      return new Response(JSON.stringify({ error: jeErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const entryId = je.id;

    // 4D cost-center metadata attached to every line
    const dims = {
      company_id: inv.company_id ?? null,
      station_id: inv.station_id ?? null,
      airline_id: airlineId,
      service_type: inv.service_type ?? null,
      transaction_currency: txnCurrency,
      base_currency: baseCurrency,
      exchange_rate: fxRate,
      exchange_rate_date: fxDate,
    };

    const lines: any[] = [
      {
        entry_id: entryId, account_id: receivableId,
        debit: inv.total, credit: 0,
        transaction_amount: inv.total, base_amount: baseTotal,
        description: `A/R - ${inv.operator}`, sort_order: 0, ...dims,
      },
    ];
    let so = 1;
    const push = (code: string, amt: number, desc: string) => {
      if (amt > 0 && acctMap[code]) {
        lines.push({
          entry_id: entryId, account_id: acctMap[code],
          debit: 0, credit: amt,
          transaction_amount: amt, base_amount: amt * fxRate,
          description: desc, sort_order: so++, ...dims,
        });
      }
    };
    push("4200", Number(inv.civil_aviation || 0), "Civil Aviation Revenue");
    push("4100", Number(inv.handling || 0), "Handling Revenue");
    push("4300", Number(inv.airport_charges || 0), "Airport Charges Revenue");
    push("4400", Number(inv.catering || 0), "Catering Revenue");
    const creditTotal = lines.filter(l => l.credit > 0).reduce((s, l) => s + l.credit, 0);
    const remaining = Number(inv.total) - creditTotal;
    if (remaining > 0) {
      const fb = acctMap["4100"] || Object.values(acctMap).find(id => id !== receivableId);
      if (fb) lines.push({
        entry_id: entryId, account_id: fb, debit: 0, credit: remaining,
        transaction_amount: remaining, base_amount: remaining * fxRate,
        description: "Other Revenue", sort_order: so++, ...dims,
      });
    }
    await admin.from("journal_entry_lines").insert(lines);

    await admin.from("invoices").update({
      invoice_type: "Final", finalized_at: new Date().toISOString(),
      finalized_by: user.email || user.id, journal_entry_id: entryId, status: "Sent",
      base_currency: baseCurrency,
      transaction_currency: txnCurrency,
      exchange_rate: fxRate,
      exchange_rate_date: fxDate,
      base_total: baseTotal,
    }).eq("id", inv.id);

    await admin.from("audit_logs").insert({
      user_id: user.id, user_email: user.email || "", action: "approve",
      entity_type: "invoice", entity_id: inv.id,
      details: {
        invoice_no: inv.invoice_no, journal_entry: entryNo, total: inv.total,
        transaction_currency: txnCurrency, base_currency: baseCurrency,
        exchange_rate: fxRate, base_total: baseTotal,
      },
      ip_address: req.headers.get("x-forwarded-for") || "", user_agent: "edge:finalize-invoice",
    });

    return new Response(JSON.stringify({
      ok: true, entry_no: entryNo, entry_id: entryId,
      exchange_rate: fxRate, base_currency: baseCurrency, base_total: baseTotal,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
