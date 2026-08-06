// One-off importer: replaces the whole chart of accounts with the client's
// official 2025 chart (TSV posted in the request body).
// TSV columns: code, name_ar, account_type, level, is_group, parent_code
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const tsv = await req.text();
    const rows = tsv.split("\n").map((l) => l.replace(/\r$/, "")).filter(Boolean).map((l) => {
      const [code, name_ar, account_type, level, is_group, parent_code] = l.split("\t");
      return {
        code,
        name: name_ar,
        name_ar,
        account_type,
        level: Number(level),
        is_group: is_group === "1",
        parent_code: parent_code || null,
        currency: "EGP",
        status: "Active",
      };
    });
    if (!rows.length) throw new Error("empty payload");

    // Clear existing data (journal lines referencing accounts are test rows).
    await admin.from("journal_entry_lines").delete().not("id", "is", null);
    await admin.from("journal_entries").delete().not("id", "is", null);
    await admin.from("treasury_vouchers").update({ account_id: null }).not("account_id", "is", null);
    await admin.from("chart_of_accounts").update({ parent_id: null }).not("parent_id", "is", null);
    const del = await admin.from("chart_of_accounts").delete().not("id", "is", null);
    if (del.error) throw del.error;

    // Insert level by level so parents exist before children.
    const idByCode = new Map<string, string>();
    let inserted = 0;
    const levels = [...new Set(rows.map((r) => r.level))].sort((a, b) => a - b);
    for (const lvl of levels) {
      const batch = rows.filter((r) => r.level === lvl).map(({ parent_code, ...r }) => ({
        ...r,
        parent_id: parent_code ? idByCode.get(parent_code) ?? null : null,
      }));
      for (let i = 0; i < batch.length; i += 500) {
        const { data, error } = await admin
          .from("chart_of_accounts")
          .insert(batch.slice(i, i + 500))
          .select("id,code");
        if (error) throw error;
        for (const a of data ?? []) idByCode.set(a.code, a.id);
        inserted += (data ?? []).length;
      }
    }
    return new Response(JSON.stringify({ inserted }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
