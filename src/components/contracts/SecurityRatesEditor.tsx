import { useEffect, useState } from "react";
import { Shield, Plus, Trash2, Save } from "lucide-react";
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
  flight_type: "Turnaround Departure",
  rate: 0,
  included_hours: 3,
  overtime_rate: 10,
  currency,
  unit: "Per Flight",
  notes: "",
  service_type: "Security",
});

export function SecurityRatesEditor({ contractId, currency = "USD", readOnly = false }: Props) {
  const [rows, setRows] = useState<SecurityRateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("contract_service_rates")
        .select("*")
        .eq("contract_id", contractId)
        .order("sort_order", { ascending: true });
      if (!error && data) setRows(data as any);
      setLoading(false);
    })();
  }, [contractId]);

  const addRow = () => setRows(prev => [...prev, emptyRate(currency)]);
  const removeRow = (i: number) => setRows(prev => prev.filter((_, idx) => idx !== i));
  const updateRow = (i: number, patch: Partial<SecurityRateRow>) =>
    setRows(prev => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const handleSave = async () => {
    setSaving(true);
    try {
      // Strategy: delete existing, re-insert all (simpler, atomic enough for this volume)
      await supabase.from("contract_service_rates").delete().eq("contract_id", contractId);
      const payload = rows.map((r, idx) => ({
        contract_id: contractId,
        sort_order: idx + 1,
        service_type: "Security",
        airport: r.airport || "CAI",
        flight_type: r.flight_type || "",
        rate: r.rate || 0,
        included_hours: r.included_hours || 0,
        overtime_rate: r.overtime_rate || 0,
        currency: r.currency || currency,
        unit: r.unit || "Per Flight",
        notes: r.notes || "",
        staff_count: 0,
        duration_hours: 0,
      }));
      if (payload.length > 0) {
        const { error } = await supabase.from("contract_service_rates").insert(payload);
        if (error) throw error;
      }
      toast({ title: "Saved", description: "Security rates updated." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-sm text-muted-foreground py-4">Loading rates…</div>;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
          <Shield size={13} /> Security Service Rates
        </h4>
        {!readOnly && (
          <div className="flex gap-2">
            <button onClick={addRow} className="text-xs flex items-center gap-1 px-2 py-1 rounded border hover:bg-muted text-foreground">
              <Plus size={12} /> Add
            </button>
            <button onClick={handleSave} disabled={saving} className="text-xs flex items-center gap-1 px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              <Save size={12} /> {saving ? "Saving…" : "Save Rates"}
            </button>
          </div>
        )}
      </div>
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
                <td colSpan={8} className="text-center py-6 text-muted-foreground">
                  No security rates defined. Click "Add" to create rate rows.
                </td>
              </tr>
            ) : rows.map((r, i) => (
              <tr key={i} className="border-t">
                <td className="px-2 py-1">
                  {readOnly ? <span className="font-mono">{r.airport}</span> : (
                    <input className={inputCls} value={r.airport} onChange={e => updateRow(i, { airport: e.target.value.toUpperCase() })} placeholder="CAI" maxLength={4} />
                  )}
                </td>
                <td className="px-2 py-1">
                  {readOnly ? r.flight_type : (
                    <select className={selectCls} value={r.flight_type} onChange={e => updateRow(i, { flight_type: e.target.value })}>
                      {SECURITY_FLIGHT_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  )}
                </td>
                <td className="px-2 py-1 text-right">
                  {readOnly ? `${r.currency} ${r.rate}` : (
                    <input type="number" className={inputCls + " text-right"} value={r.rate} onChange={e => updateRow(i, { rate: +e.target.value })} />
                  )}
                </td>
                <td className="px-2 py-1 text-right">
                  {readOnly ? r.included_hours : (
                    <input type="number" className={inputCls + " text-right"} value={r.included_hours} onChange={e => updateRow(i, { included_hours: +e.target.value })} />
                  )}
                </td>
                <td className="px-2 py-1 text-right">
                  {readOnly ? r.overtime_rate : (
                    <input type="number" className={inputCls + " text-right"} value={r.overtime_rate} onChange={e => updateRow(i, { overtime_rate: +e.target.value })} />
                  )}
                </td>
                <td className="px-2 py-1">
                  {readOnly ? r.unit : (
                    <select className={selectCls} value={r.unit} onChange={e => updateRow(i, { unit: e.target.value })}>
                      {RATE_UNITS.map(u => <option key={u}>{u}</option>)}
                    </select>
                  )}
                </td>
                <td className="px-2 py-1">
                  {readOnly ? <span className="text-muted-foreground">{r.notes}</span> : (
                    <input className={inputCls} value={r.notes} onChange={e => updateRow(i, { notes: e.target.value })} placeholder="Clause notes" />
                  )}
                </td>
                {!readOnly && (
                  <td className="px-2 py-1 text-right">
                    <button onClick={() => removeRow(i)} className="text-destructive hover:text-destructive/80">
                      <Trash2 size={13} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
