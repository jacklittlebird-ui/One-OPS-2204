import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, TrendingUp, TrendingDown, AlertTriangle, Trash2, Copy, Wallet } from "lucide-react";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const CURRENT_YEAR = new Date().getFullYear();

interface BudgetDraft {
  id?: string;
  fiscal_year: number;
  period_month: number;
  account_code: string;
  account_name: string;
  cost_center: string;
  currency: string;
  budget_amount: number;
  alert_threshold_pct: number;
  notes: string;
}

const emptyDraft: BudgetDraft = {
  fiscal_year: CURRENT_YEAR, period_month: 1, account_code: "", account_name: "",
  cost_center: "", currency: "USD", budget_amount: 0, alert_threshold_pct: 10, notes: "",
};

export default function BudgetManagement() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [year, setYear] = useState(CURRENT_YEAR);
  const [month, setMonth] = useState<string>("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<BudgetDraft>(emptyDraft);
  const [copyDialog, setCopyDialog] = useState(false);
  const [copyFromYear, setCopyFromYear] = useState(CURRENT_YEAR - 1);

  const { data: coa = [] } = useQuery({
    queryKey: ["coa_expense"],
    queryFn: async () => {
      const { data } = await supabase.from("chart_of_accounts").select("code,name,account_type").order("code");
      return data ?? [];
    },
  });

  const { data: variance = [], isLoading } = useQuery({
    queryKey: ["budget_variance", year, month],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_budget_variance", {
        _year: year,
        _month: month === "all" ? null : parseInt(month),
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  const saveMut = useMutation({
    mutationFn: async (d: BudgetDraft) => {
      const payload = { ...d, created_by: user?.id };
      if (d.id) {
        const { error } = await supabase.from("budget_entries").update(payload).eq("id", d.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("budget_entries").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["budget_variance"] }); toast.success("Budget saved"); setEditorOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("budget_entries").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["budget_variance"] }); toast.success("Deleted"); },
  });

  const copyMut = useMutation({
    mutationFn: async () => {
      const { data: src, error } = await supabase.from("budget_entries").select("*").eq("fiscal_year", copyFromYear);
      if (error) throw error;
      if (!src?.length) throw new Error("No entries to copy from " + copyFromYear);
      const rows = src.map((r: any) => ({
        fiscal_year: year, period_month: r.period_month, account_code: r.account_code,
        account_name: r.account_name, cost_center: r.cost_center, currency: r.currency,
        budget_amount: r.budget_amount, alert_threshold_pct: r.alert_threshold_pct,
        notes: `Copied from ${copyFromYear}`, created_by: user?.id,
      }));
      const { error: ie } = await supabase.from("budget_entries").insert(rows);
      if (ie) throw ie;
      return rows.length;
    },
    onSuccess: (n) => { qc.invalidateQueries({ queryKey: ["budget_variance"] }); toast.success(`Copied ${n} entries`); setCopyDialog(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const kpis = useMemo(() => {
    const totalBudget = variance.reduce((s: number, r: any) => s + Number(r.budget_amount || 0), 0);
    const totalActual = variance.reduce((s: number, r: any) => s + Number(r.actual_amount || 0), 0);
    const overruns = variance.filter((r: any) => Number(r.variance_pct || 0) > Number(r.alert_threshold_pct || 10)).length;
    const underruns = variance.filter((r: any) => Number(r.variance_pct || 0) < -Number(r.alert_threshold_pct || 10)).length;
    return { totalBudget, totalActual, overruns, underruns };
  }, [variance]);

  const openEditor = (r?: any) => {
    if (r) setDraft({
      id: r.budget_id, fiscal_year: r.fiscal_year, period_month: r.period_month,
      account_code: r.account_code, account_name: r.account_name,
      cost_center: r.cost_center ?? "", currency: r.currency ?? "USD",
      budget_amount: Number(r.budget_amount), alert_threshold_pct: Number(r.alert_threshold_pct ?? 10), notes: "",
    });
    else setDraft({ ...emptyDraft, fiscal_year: year, period_month: month === "all" ? 1 : parseInt(month) });
    setEditorOpen(true);
  };

  const severityBadge = (pct: number, threshold: number) => {
    const abs = Math.abs(pct);
    if (abs > threshold * 2) return <Badge variant="destructive">Critical</Badge>;
    if (abs > threshold) return <Badge className="bg-amber-500">Warning</Badge>;
    return <Badge variant="secondary">On Track</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Wallet className="w-6 h-6" /> Budget Management & Variance</h1>
          <p className="text-muted-foreground text-sm">Set budgets, monitor actuals, and flag overruns</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCopyDialog(true)}><Copy className="w-4 h-4 mr-1" /> Copy From Year</Button>
          <Button onClick={() => openEditor()}><Plus className="w-4 h-4 mr-1" /> New Entry</Button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div>
          <Label className="text-xs">Fiscal Year</Label>
          <Select value={String(year)} onValueChange={v => setYear(parseInt(v))}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>{[CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Month</Label>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Total Budget</div>
          <div className="text-2xl font-bold">{kpis.totalBudget.toLocaleString()}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Total Actual</div>
          <div className="text-2xl font-bold">{kpis.totalActual.toLocaleString()}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3 text-destructive" /> Overruns</div>
          <div className="text-2xl font-bold text-destructive">{kpis.overruns}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><TrendingDown className="w-3 h-3 text-emerald-600" /> Underruns</div>
          <div className="text-2xl font-bold text-emerald-600">{kpis.underruns}</div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="variance">
        <TabsList>
          <TabsTrigger value="variance">Variance Analysis</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="variance">
          <Card>
            <CardHeader><CardTitle>Budget vs Actual — {year}{month !== "all" ? ` · ${MONTHS[parseInt(month) - 1]}` : ""}</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <div className="text-sm text-muted-foreground py-6">Loading...</div>
                : variance.length === 0 ? <div className="text-sm text-muted-foreground py-6 text-center">No budget entries for this period.</div>
                : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Period</TableHead><TableHead>Account</TableHead><TableHead>Cost Center</TableHead>
                    <TableHead className="text-right">Budget</TableHead><TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Variance</TableHead><TableHead className="text-right">%</TableHead>
                    <TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {variance.map((r: any) => {
                      const pct = Number(r.variance_pct || 0);
                      const th = Number(r.alert_threshold_pct || 10);
                      return (
                        <TableRow key={r.budget_id}>
                          <TableCell className="text-xs">{MONTHS[r.period_month - 1]}</TableCell>
                          <TableCell><div className="font-medium">{r.account_code}</div><div className="text-xs text-muted-foreground">{r.account_name}</div></TableCell>
                          <TableCell className="text-xs">{r.cost_center || "—"}</TableCell>
                          <TableCell className="text-right">{Number(r.budget_amount).toLocaleString()} {r.currency}</TableCell>
                          <TableCell className="text-right">{Number(r.actual_amount).toLocaleString()}</TableCell>
                          <TableCell className={`text-right ${Number(r.variance_amount) > 0 ? "text-destructive" : "text-emerald-600"}`}>
                            {Number(r.variance_amount).toLocaleString()}
                          </TableCell>
                          <TableCell className={`text-right font-medium ${pct > 0 ? "text-destructive" : "text-emerald-600"}`}>
                            {pct > 0 ? "+" : ""}{pct.toFixed(1)}%
                          </TableCell>
                          <TableCell>{severityBadge(pct, th)}</TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button size="sm" variant="outline" onClick={() => openEditor(r)}>Edit</Button>
                            <Button size="sm" variant="ghost" onClick={() => confirm("Delete?") && deleteMut.mutate(r.budget_id)}><Trash2 className="w-3 h-3" /></Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> Threshold Breaches</CardTitle></CardHeader>
            <CardContent>
              {variance.filter((r: any) => Math.abs(Number(r.variance_pct || 0)) > Number(r.alert_threshold_pct || 10)).length === 0
                ? <div className="text-sm text-muted-foreground py-6 text-center">No alerts — every account is within its threshold.</div>
                : (
                  <div className="space-y-2">
                    {variance.filter((r: any) => Math.abs(Number(r.variance_pct || 0)) > Number(r.alert_threshold_pct || 10)).map((r: any) => (
                      <div key={r.budget_id} className="border rounded p-3 flex justify-between items-center">
                        <div>
                          <div className="font-medium">{r.account_code} — {r.account_name}</div>
                          <div className="text-xs text-muted-foreground">{MONTHS[r.period_month - 1]} {r.fiscal_year} · {r.cost_center || "—"}</div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold ${Number(r.variance_pct) > 0 ? "text-destructive" : "text-emerald-600"}`}>
                            {Number(r.variance_pct) > 0 ? "+" : ""}{Number(r.variance_pct).toFixed(1)}%
                          </div>
                          <div className="text-xs text-muted-foreground">threshold ±{r.alert_threshold_pct}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{draft.id ? "Edit Budget Entry" : "New Budget Entry"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Fiscal Year</Label><Input type="number" value={draft.fiscal_year} onChange={e => setDraft({ ...draft, fiscal_year: parseInt(e.target.value) || CURRENT_YEAR })} /></div>
            <div>
              <Label>Month</Label>
              <Select value={String(draft.period_month)} onValueChange={v => setDraft({ ...draft, period_month: parseInt(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Account</Label>
              <Select value={draft.account_code} onValueChange={v => {
                const acc = coa.find((a: any) => a.code === v);
                setDraft({ ...draft, account_code: v, account_name: acc?.name ?? "" });
              }}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>{coa.map((a: any) => <SelectItem key={a.code} value={a.code}>{a.code} — {a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Cost Center</Label><Input value={draft.cost_center} onChange={e => setDraft({ ...draft, cost_center: e.target.value })} /></div>
            <div><Label>Currency</Label>
              <Select value={draft.currency} onValueChange={v => setDraft({ ...draft, currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["USD","EUR","EGP","AED","SAR","GBP"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Budget Amount</Label><Input type="number" value={draft.budget_amount} onChange={e => setDraft({ ...draft, budget_amount: parseFloat(e.target.value) || 0 })} /></div>
            <div><Label>Alert Threshold (%)</Label><Input type="number" value={draft.alert_threshold_pct} onChange={e => setDraft({ ...draft, alert_threshold_pct: parseFloat(e.target.value) || 10 })} /></div>
            <div className="col-span-2"><Label>Notes</Label><Input value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMut.mutate(draft)} disabled={!draft.account_code}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={copyDialog} onOpenChange={setCopyDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Copy Budget from Another Year</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Copy from</Label>
              <Select value={String(copyFromYear)} onValueChange={v => setCopyFromYear(parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[CURRENT_YEAR - 3, CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">All entries from {copyFromYear} will be duplicated into {year}. Existing {year} entries are not removed.</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyDialog(false)}>Cancel</Button>
            <Button onClick={() => copyMut.mutate()}>Copy</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
