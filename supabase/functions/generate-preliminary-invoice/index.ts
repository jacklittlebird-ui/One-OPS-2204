// Generate a preliminary invoice for a contract over a billing period.
// Aggregates flight activity (dispatch_assignments + service_reports) for the
// contracted airline across the contract's stations, matches each row to a
// price in customer_price_list, and creates a Draft/Preliminary invoice row.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FINANCE_ROLES = new Set(["admin", "general_accounts", "receivables", "payables"]);

type PriceRow = {
  id: string;
  airline_iata: string | null;
  service_type: string | null;
  station_code: string | null;
  unit_price: number | null;
  currency: string | null;
  unit: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
};

function normalize(s: string | null | undefined) {
  return (s || "").trim().toUpperCase();
}

function pickPrice(
  prices: PriceRow[],
  airlineIata: string,
  station: string,
  serviceType: string,
  onDate: string,
): PriceRow | null {
  const a = normalize(airlineIata);
  const s = normalize(station);
  const t = normalize(serviceType);
  const candidates = prices.filter((p) => {
    if (normalize(p.airline_iata) !== a) return false;
    if (p.station_code && normalize(p.station_code) !== s) return false;
    if (p.service_type && normalize(p.service_type) !== t) return false;
    if (p.status && p.status.toLowerCase() !== "active") return false;
    if (p.start_date && p.start_date > onDate) return false;
    if (p.end_date && p.end_date < onDate) return false;
    return true;
  });
  // Prefer more specific matches (station-scoped over global)
  candidates.sort((a, b) => {
    const sa = (a.station_code ? 2 : 0) + (a.service_type ? 1 : 0);
    const sb = (b.station_code ? 2 : 0) + (b.service_type ? 1 : 0);
    return sb - sa;
  });
  return candidates[0] || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing auth token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const hasRole = (roles || []).some((r: any) => FINANCE_ROLES.has(r.role));
    if (!hasRole) {
      return new Response(JSON.stringify({ error: "Forbidden: finance role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const contractId: string | undefined = body?.contract_id;
    const fromDate: string | undefined = body?.from;
    const toDate: string | undefined = body?.to;
    const stationOverride: string | null = body?.station || null;
    const serviceCategory: string = (body?.service_category || "").toString();

    if (!contractId || !fromDate || !toDate) {
      return new Response(
        JSON.stringify({ error: "contract_id, from, to are required (YYYY-MM-DD)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Load contract
    const { data: contract, error: cErr } = await admin
      .from("contracts")
      .select("*")
      .eq("id", contractId)
      .single();
    if (cErr || !contract) {
      return new Response(JSON.stringify({ error: "Contract not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const airlineIata = normalize(contract.airline_iata);
    if (!airlineIata) {
      return new Response(JSON.stringify({ error: "Contract has no airline IATA code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contractStations = (contract.stations || "")
      .split(/[,;\s]+/)
      .map((s: string) => normalize(s))
      .filter(Boolean);
    const stationFilter = stationOverride ? [normalize(stationOverride)] : contractStations;

    // Load price list rows scoped to airline
    const { data: prices } = await admin
      .from("customer_price_list")
      .select("*")
      .eq("airline_iata", airlineIata);

    // Load activity: Handling (service_reports) + Security (dispatch_assignments)
    const wantHandling = !serviceCategory || /handling/i.test(serviceCategory);
    const wantSecurity = !serviceCategory || /security/i.test(serviceCategory);

    type Line = {
      date: string;
      flight_ref: string;
      station: string;
      service_type: string;
      unit_price: number;
      currency: string;
      qty: number;
      total: number;
      matched: boolean;
    };
    const lines: Line[] = [];

    if (wantHandling) {
      const { data: srs } = await admin
        .from("service_reports")
        .select("id, flight_no, station, service_date, arrival_date, departure_date, service_type")
        .gte("service_date", fromDate)
        .lte("service_date", toDate)
        .in("station", stationFilter.length ? stationFilter : ["__none__"]);
      for (const r of srs || []) {
        // Best-effort airline match via flight_no prefix
        if (!(r.flight_no || "").toUpperCase().startsWith(airlineIata)) continue;
        const date = r.service_date || r.arrival_date || r.departure_date || fromDate;
        const svc = r.service_type || "Handling";
        const price = pickPrice(prices || [], airlineIata, r.station || "", svc, date);
        lines.push({
          date,
          flight_ref: r.flight_no || "",
          station: r.station || "",
          service_type: svc,
          unit_price: Number(price?.unit_price || 0),
          currency: price?.currency || contract.currency || "USD",
          qty: 1,
          total: Number(price?.unit_price || 0),
          matched: !!price,
        });
      }
    }

    if (wantSecurity) {
      const { data: das } = await admin
        .from("dispatch_assignments")
        .select("id, flight_no, station, flight_date, service_type")
        .gte("flight_date", fromDate)
        .lte("flight_date", toDate)
        .in("station", stationFilter.length ? stationFilter : ["__none__"]);
      for (const r of das || []) {
        if (!(r.flight_no || "").toUpperCase().startsWith(airlineIata)) continue;
        const date = r.flight_date || fromDate;
        const svc = r.service_type || "Security";
        const price = pickPrice(prices || [], airlineIata, r.station || "", svc, date);
        lines.push({
          date,
          flight_ref: r.flight_no || "",
          station: r.station || "",
          service_type: svc,
          unit_price: Number(price?.unit_price || 0),
          currency: price?.currency || contract.currency || "USD",
          qty: 1,
          total: Number(price?.unit_price || 0),
          matched: !!price,
        });
      }
    }

    if (lines.length === 0) {
      return new Response(
        JSON.stringify({ error: "No billable flight activity found for this contract in the period" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Aggregate by currency + bucket (handling/other)
    const currency = lines[0].currency;
    const handling = lines
      .filter((l) => /handl/i.test(l.service_type))
      .reduce((s, l) => s + l.total, 0);
    const other = lines
      .filter((l) => !/handl/i.test(l.service_type))
      .reduce((s, l) => s + l.total, 0);
    const subtotal = handling + other;

    // Generate invoice number
    const invoiceNo = `PRE-${airlineIata}-${fromDate.slice(0, 7).replace("-", "")}-${Date.now()
      .toString()
      .slice(-4)}`;

    const notesLines = [
      `Preliminary invoice generated from contract ${contract.contract_no}.`,
      `Period: ${fromDate} → ${toDate}.`,
      `Line items (${lines.length}):`,
      ...lines.map(
        (l) =>
          `• ${l.date} ${l.flight_ref} @ ${l.station} — ${l.service_type} × ${l.qty} @ ${l.unit_price} ${l.currency}${l.matched ? "" : " (no price match)"}`,
      ),
    ].join("\n");

    const { data: inserted, error: insErr } = await admin
      .from("invoices")
      .insert({
        invoice_no: invoiceNo,
        date: toDate,
        due_date: toDate,
        operator: contract.airline,
        airline_iata: airlineIata,
        station: stationFilter[0] || null,
        currency,
        transaction_currency: currency,
        base_currency: currency,
        subtotal,
        vat: 0,
        total: subtotal,
        handling,
        other,
        civil_aviation: 0,
        airport_charges: 0,
        catering: 0,
        status: "Unpaid",
        invoice_type: "Preliminary",
        draft_status: "Draft",
        source: "contract-generator",
        billing_period: `${fromDate}..${toDate}`,
        company_id: contract.company_id || null,
        service_type: wantHandling && !wantSecurity ? "Handling" : wantSecurity && !wantHandling ? "Security" : null,
        notes: notesLines,
        invoice_direction: "OUT",
      })
      .select()
      .single();

    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        invoice: inserted,
        line_count: lines.length,
        unmatched: lines.filter((l) => !l.matched).length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
