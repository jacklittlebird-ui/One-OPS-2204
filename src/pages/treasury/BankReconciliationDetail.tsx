import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, RefreshCw, CheckCircle2 } from "lucide-react";
import { formatDateDMY } from "@/lib/utils";

type Rec = { id: string; bank_account_id: string; statement_date: string; statement_balance: number; system_balance: number; difference: number; status: string; notes: string };
type Movement = { id: string; kind: "receipt" | "payment"; date: string; ref: string; party: string; amount: number; currency: string; reconciliation_id: string | null };

export default function BankReconciliationDetailPage() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const [rec, setRec] = useState<Rec | null>(null);
  const [bank, setBank] = useState<any>(null);
  const [items, setItems] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: r } = await supabase.from("bank_reconciliations").select("*").eq("id", id).maybeSingle();
    setRec(r as any);
    if (r?.bank_account_id) {
      const { data: b } = await supabase.from("bank_accounts").select("*").eq("id", r.bank_account_id).maybeSingle();
      setBank(b);
      const [{ data: rcpts }, { data: pmts }] = await Promise.all([
        supabase.from("receipts").select("id,receipt_no,receipt_date,customer_name,amount,currency,reconciliation_id,status")
          .eq("bank_account_id", r.bank_account_id).eq("status", "Posted").lte("receipt_date", r.statement_date).order("receipt_date"),
        supabase.from("payments").select("id,payment_no,payment_date,vendor_name,amount,currency,reconciliation_id,status")
          .eq("bank_account_id", r.bank_account_id).eq("status", "Posted").lte("payment_date", r.statement_date).order("payment_date"),
      ]);
      const rows: Movement[] = [
        ...((rcpts || []) as any[]).map((x) => ({ id: x.id, kind: "receipt" as const, date: x.receipt_date, ref: x.receipt_no, party: x.customer_name, amount: Number(x.amount || 0), currency: x.currency, reconciliation_id: x.reconciliation_id })),
        ...((pmts || []) as any[]).map((x) => ({ id: x.id, kind: "payment" as const, date: x.payment_date, ref: x.payment_no, party: x.vendor_name, amount: -Number(x.amount || 0), currency: x.currency, reconciliation_id: x.reconciliation_id })),
      ].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
      setItems(rows);
    }
    setLoading(false);
  };

  useEffect(() => { if (id) load(); }, [id]);

  const clearedTotal = useMemo(
    () => items.filter((i) => i.reconciliation_id === id).reduce((s, i) => s + i.amount, 0),
    [items, id]
  );

  const toggle = async (m: Movement, checked: boolean) => {
    const table = m.kind === "receipt" ? "receipts" : "payments";
    const patch = checked
      ? { reconciliation_id: id, reconciled_at: new Date().toISOString() }
      : { reconciliation_id: null, reconciled_at: null };
    const { error } = await (supabase.from as any)(table).update(patch).eq("id", m.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setItems((prev) => prev.map((x) => (x.id === m.id && x.kind === m.kind ? { ...x, reconciliation_id: checked ? id : null } : x)));
  };

  const recalc = async () => {
    setSaving(true);
    const { data, error } = await supabase.rpc("recalc_bank_reconciliation" as any, { _id: id });
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setRec(data as any);
    toast({ title: "Recalculated", description: `System balance & difference refreshed.` });
  };

  const markReconciled = async () => {
    if (!rec) return;
    if (Math.abs(rec.difference || 0) > 0.009) {
      if (!confirm(`Difference is ${rec.difference}. Mark as Reconciled anyway?`)) return;
    }
    const { error } = await supabase.from("bank_reconciliations").update({ status: "Reconciled" }).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "✅ Reconciled" });
    load();
  };

  if (loading) return <div className="p-8">Loading…</div>;
  if (!rec) return <div className="p-8">Not found.</div>;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => nav("/treasury/bank-reconciliation")}><ArrowLeft size={16} /> Back</Button>
        <h1 className="text-2xl font-bold">Reconcile — {bank?.account_name || "Bank"}</h1>
        <Badge>{rec.status}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Statement Date</CardTitle></CardHeader><CardContent className="text-lg font-semibold">{formatDateDMY(rec.statement_date)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Statement Balance</CardTitle></CardHeader><CardContent className="text-lg font-semibold">{Number(rec.statement_balance || 0).toLocaleString()}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">System Balance</CardTitle></CardHeader><CardContent className="text-lg font-semibold">{Number(rec.system_balance || 0).toLocaleString()}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Difference</CardTitle></CardHeader><CardContent className={`text-lg font-bold ${Math.abs(rec.difference || 0) < 0.01 ? "text-success" : "text-destructive"}`}>{Number(rec.difference || 0).toLocaleString()}</CardContent></Card>
      </div>

      <div className="flex gap-2">
        <Button onClick={recalc} disabled={saving} variant="outline"><RefreshCw size={14} className="mr-1.5" /> Recalculate</Button>
        <Button onClick={markReconciled} disabled={rec.status === "Reconciled"}><CheckCircle2 size={14} className="mr-1.5" /> Mark Reconciled</Button>
        <div className="ml-auto text-sm text-muted-foreground self-center">Cleared total: <span className="font-semibold text-foreground">{clearedTotal.toLocaleString()}</span></div>
      </div>

      <Card>
        <CardHeader><CardTitle>Movements up to {formatDateDMY(rec.statement_date)}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">Clear</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Ref</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Party</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No posted movements on this account.</TableCell></TableRow>}
              {items.map((m) => {
                const cleared = m.reconciliation_id === id;
                const otherRecon = !!m.reconciliation_id && !cleared;
                return (
                  <TableRow key={`${m.kind}-${m.id}`} className={cleared ? "bg-success/5" : ""}>
                    <TableCell><Checkbox checked={cleared} disabled={otherRecon} onCheckedChange={(v) => toggle(m, !!v)} /></TableCell>
                    <TableCell>{formatDateDMY(m.date)}</TableCell>
                    <TableCell className="font-mono text-xs">{m.ref}</TableCell>
                    <TableCell><Badge variant={m.kind === "receipt" ? "default" : "secondary"}>{m.kind}</Badge></TableCell>
                    <TableCell>{m.party}</TableCell>
                    <TableCell className={`text-right font-semibold ${m.amount >= 0 ? "text-success" : "text-destructive"}`}>{m.currency} {m.amount.toLocaleString()}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
