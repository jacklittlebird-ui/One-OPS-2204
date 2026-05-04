import { useEffect, useState } from "react";
import { Shield, Plus, Trash2, Save, AlertTriangle, CheckCircle2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { SecurityRateRow } from "./ContractTypes";
import { SECURITY_FLIGHT_TYPES, RATE_UNITS } from "./ContractTypes";

interface Props {
  contractId: string;
  currency?: string;
  readOnly?: boolean;
}

const inputCls = "text-sm border rounded px-2 py-1 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground w-full";
const selectCls = "text-sm border rounded px-2 py-1 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full";

const emptyRate = (currency = "USD"): SecurityRateRow => ({
  airport: "CAI",
  flight_type: "Arrival Security",
  rate: 0,
  included_hours: 3,
  overtime_rate: 10,
  currency,
  unit: "Per Flight",
  notes: "",
  service_type: "Security",
});

type RowWithMeta = SecurityRateRow & { _localKey: string; _dirty?: boolean };

const makeKey = () => `tmp-${Math.random().toString(36).slice(2, 10)}`;

/**
 * Audit existing rows: report which (airport, flight_type) combos exist in
 * the backend so the user can immediately see if Arrival Security is missing
 * for any airport that already has Departure Security.
 */
function buildCoverageReport(rows: SecurityRateRow[]) {
  const byAirport: Record<string, Set<string>> = {};
  rows.forEach(r => {
    const ap = (r.airport || "").toUpperCase().trim();
    if (!ap) return;
    if (!byAirport[ap]) byAirport[ap] = new Set();
    byAirport[ap].add((r.flight_type || "").trim());
  });
  const missing: { airport: string; missing: string[] }[] = [];
  Object.entries(byAirport).forEach(([ap, types]) => {
    const need: string[] = [];
    if (types.has("Departure Security") && !types.has("Arrival Security")) need.push("Arrival Security");
    if (types.has("Arrival Security") && !types.has("Departure Security")) need.push("Departure Security");
    if (need.length) missing.push({ airport: ap, missing: need });
  });
  return { byAirport, missing };
}

export function SecurityRatesEditor({ contractId, currency = "USD", readOnly = false }: Props) {
  const [rows, setRows] = useState<RowWithMeta[]>([]);
  const [originalRows, setOriginalRows] = useState<RowWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contract_service_rates")
      .select("*")
      .eq("contract_id", contractId)
      .order("sort_order", { ascending: true });
    if (error) {
      toast({ title: "Failed to load rates", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const mapped: RowWithMeta[] = (data || []).map((r: any) => ({ ...r, _localKey: r.id || makeKey() }));
    setRows(mapped);
    setOriginalRows(mapped);
    setLoading(false);
  };

  useEffect(() => { reload(); }, [contractId]);

  const addRow = () =>
    setRows(prev => [...prev, { ...emptyRate(currency), _localKey: makeKey(), _dirty: true }]);

  const removeRow = (key: string) =>
    setRows(prev => prev.filter(r => r._localKey !== key));

  const updateRow = (key: string, patch: Partial<SecurityRateRow>) =>
    setRows(prev => prev.map(r => (r._localKey === key ? { ...r, ...patch, _dirty: true } : r)));

  const handleSave = async (force = false) => {
    // Block save when coverage gaps exist for any airport (Arrival/Departure
    // pair incomplete) — receivables for those flights would otherwise emit
    // Missing-rate errors. The user can override with the explicit "Save anyway"
    // action.
    const preCoverage = buildCoverageReport(rows);
    if (!force && preCoverage.missing.length > 0) {
      const summary = preCoverage.missing
        .map(m => `${m.airport}: ${m.missing.join(", ")}`)
        .join(" • ");
      toast({
        title: "Cannot save — missing security rates",
        description: `Add the missing Arrival/Departure pairs before saving: ${summary}. Use "Save anyway" to bypass.`,
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      // 1) Determine deletes (rows that existed before but are no longer in state)
      const presentIds = new Set(rows.map(r => r.id).filter(Boolean) as string[]);
      const deleteIds = originalRows
        .map(r => r.id)
        .filter((id): id is string => !!id && !presentIds.has(id));

      // 2) Split into update (existing id) vs insert (new)
      const toUpdate = rows.filter(r => r.id);
      const toInsert = rows.filter(r => !r.id);

      // 3) Apply deletes only when there are actual deletions, so a Save with
      // no changes does NOT wipe everything.
      if (deleteIds.length > 0) {
        const { error } = await supabase
          .from("contract_service_rates")
          .delete()
          .in("id", deleteIds);
        if (error) throw new Error(`Delete failed: ${error.message}`);
      }

      // 4) Per-row update (preserves IDs, no risk of mass loss)
      for (let i = 0; i < toUpdate.length; i++) {
        const r = toUpdate[i];
        const { error } = await supabase
          .from("contract_service_rates")
          .update({
            sort_order: i + 1,
            service_type: "Security",
            airport: (r.airport || "CAI").toUpperCase(),
            flight_type: r.flight_type || "",
            rate: Number(r.rate) || 0,
            included_hours: Number(r.included_hours) || 0,
            overtime_rate: Number(r.overtime_rate) || 0,
            currency: r.currency || currency,
            unit: r.unit || "Per Flight",
            notes: r.notes || "",
          })
          .eq("id", r.id!);
        if (error) throw new Error(`Update failed for row ${i + 1}: ${error.message}`);
      }

      // 5) Insert new rows
      if (toInsert.length > 0) {
        const baseSort = toUpdate.length;
        const payload = toInsert.map((r, idx) => ({
          contract_id: contractId,
          sort_order: baseSort + idx + 1,
          service_type: "Security",
          airport: (r.airport || "CAI").toUpperCase(),
          flight_type: r.flight_type || "",
          rate: Number(r.rate) || 0,
          included_hours: Number(r.included_hours) || 0,
          overtime_rate: Number(r.overtime_rate) || 0,
          currency: r.currency || currency,
          unit: r.unit || "Per Flight",
          notes: r.notes || "",
          staff_count: 0,
          duration_hours: 0,
        }));
        const { error } = await supabase.from("contract_service_rates").insert(payload);
        if (error) throw new Error(`Insert failed: ${error.message}`);
      }

      toast({ title: "Saved", description: `Security rates updated (${rows.length} row${rows.length === 1 ? "" : "s"}).` });

      // 6) Re-fetch to confirm what's actually in the backend (post-save audit)
      await reload();
    } catch (e: any) {
      const msg = String(e?.message || e);
      const isRls = /row-?level security|permission denied|not authorized/i.test(msg);
      toast({
        title: isRls ? "Permission denied (RLS)" : "Save failed",
        description: isRls
          ? `${msg}. You may not have the 'admin' or 'contracts' role required to modify rates.`
          : msg,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-sm text-muted-foreground py-4">Loading rates…</div>;

  const coverage = buildCoverageReport(rows);
  const colSpan = readOnly ? 7 : 8;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
          <Shield size={13} /> Security Service Rates
        </h4>
        {!readOnly && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => exportCoverageCsv(rows, contractId)} className="text-xs flex items-center gap-1 px-2 py-1 rounded border hover:bg-muted text-foreground">
              <Download size={12} /> Export CSV
            </button>
            <button onClick={addRow} className="text-xs flex items-center gap-1 px-2 py-1 rounded border hover:bg-muted text-foreground">
              <Plus size={12} /> Add
            </button>
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="text-xs flex items-center gap-1 px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Save size={12} /> {saving ? "Saving…" : "Save Rates"}
            </button>
            {coverage.missing.length > 0 && (
              <button
                onClick={() => handleSave(true)}
                disabled={saving}
                className="text-xs flex items-center gap-1 px-2 py-1 rounded border border-destructive/50 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                title="Save even though Arrival/Departure security pairs are incomplete"
              >
                Save anyway
              </button>
            )}
          </div>
        )}
      </div>

      {/* Coverage audit panel — surfaces missing Arrival/Departure pairs */}
      {coverage.missing.length > 0 ? (
        <div className="px-3 py-2 border-b bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold">Coverage gap detected:</div>
            <ul className="list-disc ml-4 mt-0.5">
              {coverage.missing.map(m => (
                <li key={m.airport}>
                  <span className="font-mono font-semibold">{m.airport}</span> is missing: {m.missing.join(", ")}
                </li>
              ))}
            </ul>
            <div className="mt-1 text-[11px] opacity-80">
              Charges for the missing service type will be flagged as an error
              in the receivables module until a rate is defined here.
            </div>
          </div>
        </div>
      ) : Object.keys(coverage.byAirport).length > 0 ? (
        <div className="px-3 py-1.5 border-b bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 text-[11px] flex items-center gap-2">
          <CheckCircle2 size={12} /> All airports have both Arrival &amp; Departure Security defined.
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/30">
            <tr className="text-muted-foreground">
              <th className="text-left px-2 py-1.5 font-semibold">Airport</th>
              <th className="text-left px-2 py-1.5 font-semibold">Flight / Service Type</th>
              <th className="text-right px-2 py-1.5 font-semibold">Rate</th>
              <th className="text-right px-2 py-1.5 font-semibold">Incl. Hrs</th>
              <th className="text-right px-2 py-1.5 font-semibold">OT/hr</th>
              <th className="text-left px-2 py-1.5 font-semibold">Unit</th>
              <th className="text-left px-2 py-1.5 font-semibold">Notes</th>
              {!readOnly && <th className="px-2 py-1.5 w-8" />}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="text-center py-6 text-muted-foreground">
                  No security rates defined. Click "Add" to create rate rows.
                </td>
              </tr>
            ) : rows.map((r) => {
              const ap = (r.airport || "").toUpperCase().trim();
              const gap = coverage.missing.find(m => m.airport === ap);
              // Highlight rows whose airport has a gap; mark the row whose
              // counterpart is missing (e.g. if Departure exists but Arrival
              // is missing, the Departure row is highlighted as the partner
              // that needs a sibling).
              const isPartnerOfGap = !!gap && /security/i.test(r.flight_type || "");
              const rowCls = isPartnerOfGap
                ? "border-t bg-amber-500/10"
                : "border-t";
              return (
              <tr key={r._localKey} className={rowCls} title={isPartnerOfGap ? `${ap} is missing: ${gap!.missing.join(", ")}` : undefined}>
                <td className="px-2 py-1">
                  {readOnly ? <span className="font-mono">{r.airport}</span> : (
                    <input className={inputCls} value={r.airport} onChange={e => updateRow(r._localKey, { airport: e.target.value.toUpperCase() })} maxLength={4} />
                  )}
                </td>
                <td className="px-2 py-1">
                  {readOnly ? r.flight_type : (
                    <select className={selectCls} value={r.flight_type} onChange={e => updateRow(r._localKey, { flight_type: e.target.value })}>
                      {SECURITY_FLIGHT_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  )}
                </td>
                <td className="px-2 py-1 text-right">
                  {readOnly ? `${r.currency} ${r.rate}` : (
                    <input type="number" className={inputCls + " text-right"} value={r.rate} onChange={e => updateRow(r._localKey, { rate: +e.target.value })} />
                  )}
                </td>
                <td className="px-2 py-1 text-right">
                  {readOnly ? r.included_hours : (
                    <input type="number" className={inputCls + " text-right"} value={r.included_hours} onChange={e => updateRow(r._localKey, { included_hours: +e.target.value })} />
                  )}
                </td>
                <td className="px-2 py-1 text-right">
                  {readOnly ? r.overtime_rate : (
                    <input type="number" className={inputCls + " text-right"} value={r.overtime_rate} onChange={e => updateRow(r._localKey, { overtime_rate: +e.target.value })} />
                  )}
                </td>
                <td className="px-2 py-1">
                  {readOnly ? r.unit : (
                    <select className={selectCls} value={r.unit} onChange={e => updateRow(r._localKey, { unit: e.target.value })}>
                      {RATE_UNITS.map(u => <option key={u}>{u}</option>)}
                    </select>
                  )}
                </td>
                <td className="px-2 py-1">
                  {readOnly ? <span className="text-muted-foreground">{r.notes}</span> : (
                    <input className={inputCls} value={r.notes} onChange={e => updateRow(r._localKey, { notes: e.target.value })} />
                  )}
                </td>
                {!readOnly && (
                  <td className="px-2 py-1 text-right">
                    <button onClick={() => removeRow(r._localKey)} className="text-destructive hover:text-destructive/80">
                      <Trash2 size={13} />
                    </button>
                  </td>
                )}
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
