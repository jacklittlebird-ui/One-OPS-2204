// Phase 1n — Budgeting & Variance Analysis
// Annual budgets per account × month × company × station × cost-center, with
// an Actual-vs-Budget report that joins to posted journal_entry_lines.

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Download, Target, TrendingUp, TrendingDown } from "lucide-react";
import { exportToExcel } from "@/lib/exportExcel";

interface Budget {
  id: string;
  fiscal_year: number;
  period_month: number;
  account_code: string;
  account_name: string | null;
  company_id: string | null;
  station_id: string | null;
  cost_center: string | null;
  budget_amount: number;
  currency: string;
  notes: string | null;
}

interface Account { id: string; code: string; name: string; }
interface Company { id: string; name: string; }
interface Station { id: string; name: string; }

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmt = (n: number) =>
  (n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const emptyForm = (year: number) => ({
  fiscal_year: year,
  period_month: 1,
  account_code: "",
  account_name: "",
  company_id: "",
  station_id: "",
  cost_center: "",
  budget_amount: 0,
  currency: "USD",
  notes: "",
});

export default function BudgetsPage() {
  const qc = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [filterCompany, setFilterCompany] = useState<string>("all");
  const [filterStation, setFilterStation] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [form, setForm] = useState(emptyForm(currentYear));

  const { data: budgets = [] } = useQuery({
    queryKey: ["budget_entries", year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budget_entries")
        .select("*")
        .eq("fiscal_year", year)
        .order("account_code")
        .order("period_month");
      if (error) throw error;
      return (data ?? []) as Budget[];
    },
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["coa_for_budget"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chart_of_accounts")
        .select("id,code,name,type")
        .order("code");
      if (error) throw error;
      return (data ?? []) as Account[];
    },
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies_for_budget"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("id,name").order("name");
      if (error) throw error;
      return (data ?? []) as Company[];
    },
  });

  const { data: stations = [] } = useQuery({
    queryKey: ["finance_stations_for_budget"],
    queryFn: async () => {
      const { data, error } = await supabase.from("finance_stations").select("id,name").order("name");
      if (error) throw error;
      return (data ?? []) as Station[];
    },
  });

  // Actual amounts from posted journal_entry_lines for the fiscal year
  const { data: actuals = [] } = useQuery({
    queryKey: ["budget_actuals", year, filterCompany, filterStation],
    queryFn: async () => {
      const start = `${year}-01-01`;
      const end = `${year}-12-31`;
      const { data, error } = await supabase
        .from("journal_entry_lines")
        .select("account_code,debit,credit,entry_id,cost_center,journal_entries!inner(date,status,company_id,station_id)")
        .gte("journal_entries.date", start)
        .lte("journal_entries.date", end)
        .eq("journal_entries.status", "Posted");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  // Build a per-(account, month) actual map, respecting filters
  const actualMap = useMemo(() => {
    const map = new Map<string, number>(); // key: `${code}|${month}`
    for (const row of actuals) {
      const je = row.journal_entries;
      if (!je) continue;
      if (filterCompany !== "all" && je.company_id !== filterCompany) continue;
      if (filterStation !== "all" && je.station_id !== filterStation) continue;
      const month = new Date(je.date).getMonth() + 1;
      const code = row.account_code as string;
      const net = Number(row.debit || 0) - Number(row.credit || 0);
      const key = `${code}|${month}`;
      map.set(key, (map.get(key) || 0) + net);
    }
    return map;
  }, [actuals, filterCompany, filterStation]);

  // Aggregate budgets to (account, month), respecting filters
  const budgetMap = useMemo(() => {
    const map = new Map<string, { amount: number; name: string }>();
    for (const b of budgets) {
      if (filterCompany !== "all" && b.company_id !== filterCompany) continue;
      if (filterStation !== "all" && b.station_id !== filterStation) continue;
      const key = `${b.account_code}|${b.period_month}`;
      const prev = map.get(key);
      map.set(key, {
        amount: (prev?.amount || 0) + Number(b.budget_amount || 0),
        name: b.account_name || prev?.name || "",
      });
    }
    return map;
  }, [budgets, filterCompany, filterStation]);

  // Distinct accounts to display in variance report
  const varianceAccounts = useMemo(() => {
    const set = new Map<string, string>();
    for (const [key, v] of budgetMap) set.set(key.split("|")[0], v.name);
    for (const k of actualMap.keys()) {
      const code = k.split("|")[0];
      if (!set.has(code)) {
        const acc = accounts.find((a) => a.code === code);
        set.set(code, acc?.name || code);
      }
    }
    return Array.from(set.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [budgetMap, actualMap, accounts]);

  const kpis = useMemo(() => {
    let totalBudget = 0;
    let totalActual = 0;
    for (const v of budgetMap.values()) totalBudget += v.amount;
    for (const v of actualMap.values()) totalActual += v;
    const variance = totalActual - totalBudget;
    const pct = totalBudget !== 0 ? (variance / Math.abs(totalBudget)) * 100 : 0;
    return { totalBudget, totalActual, variance, pct };
  }, [budgetMap, actualMap]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.account_code) throw new Error("Account is required");
      const accountName = accounts.find((a) => a.code === form.account_code)?.name || form.account_name;
      const payload = {
        fiscal_year: form.fiscal_year,
        period_month: form.period_month,
        account_code: form.account_code,
        account_name: accountName,
        company_id: form.company_id || null,
        station_id: form.station_id || null,
        cost_center: form.cost_center || null,
        budget_amount: Number(form.budget_amount) || 0,
        currency: form.currency || "USD",
        notes: form.notes || null,
      };
      if (editing) {
        const { error } = await supabase.from("budget_entries").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("budget_entries").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budget_entries"] });
      toast({ title: editing ? "Budget updated" : "Budget added" });
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm(year));
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("budget_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budget_entries"] });
      toast({ title: "Budget deleted" });
    },
  });

  const startEdit = (b: Budget) => {
    setEditing(b);
    setForm({
      fiscal_year: b.fiscal_year,
      period_month: b.period_month,
      account_code: b.account_code,
      account_name: b.account_name || "",
      company_id: b.company_id || "",
      station_id: b.station_id || "",
      cost_center: b.cost_center || "",
      budget_amount: Number(b.budget_amount) || 0,
      currency: b.currency || "USD",
      notes: b.notes || "",
    });
    setDialogOpen(true);
  };

  const startNew = () => {
    setEditing(null);
    setForm(emptyForm(year));
    setDialogOpen(true);
  };

  const handleExport = () => {
    const rows = varianceAccounts.map(({ code, name }) => {
      const row: Record<string, any> = { "Account Code": code, "Account Name": name };
      let bTot = 0, aTot = 0;
      for (let m = 1; m <= 12; m++) {
        const b = budgetMap.get(`${code}|${m}`)?.amount || 0;
        const a = actualMap.get(`${code}|${m}`) || 0;
        bTot += b; aTot += a;
        row[`${MONTHS[m-1]} Budget`] = b;
        row[`${MONTHS[m-1]} Actual`] = a;
      }
      row["Total Budget"] = bTot;
      row["Total Actual"] = aTot;
      row["Variance"] = aTot - bTot;
      row["Variance %"] = bTot ? ((aTot - bTot) / Math.abs(bTot)) * 100 : 0;
      return row;
    });
    exportToExcel(rows, `Budget-${year}`, `budget-variance-${year}.xlsx`);
  };

  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = currentYear - 3; y <= currentYear + 2; y++) arr.push(y);
    return arr;
  }, [currentYear]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6" /> Budgets & Variance Analysis
          </h1>
          <p className="text-muted-foreground text-sm">
            Annual budgets by account, month, company, and station — with actual-vs-budget comparison.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
          <Button onClick={startNew}>
            <Plus className="h-4 w-4 mr-2" /> Add Budget
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-muted-foreground">Fiscal Year</label>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Company</label>
          <Select value={filterCompany} onValueChange={setFilterCompany}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Station</label>
          <Select value={filterStation} onValueChange={setFilterStation}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stations</SelectItem>
              {stations.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Budget</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{fmt(kpis.totalBudget)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Actual</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{fmt(kpis.totalActual)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Variance</CardTitle></CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold flex items-center gap-2 ${kpis.variance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {kpis.variance >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
              {fmt(kpis.variance)}
            </div>
          </CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Variance %</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{kpis.pct.toFixed(1)}%</div></CardContent></Card>
      </div>

      <Tabs defaultValue="variance">
        <TabsList>
          <TabsTrigger value="variance">Variance Report</TabsTrigger>
          <TabsTrigger value="entries">Budget Entries ({budgets.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="variance">
          <Card>
            <CardHeader><CardTitle>Actual vs Budget — {year}</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background">Account</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Actual</TableHead>
                    <TableHead>Variance</TableHead>
                    <TableHead>Var %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {varianceAccounts.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No budgets or actuals for {year}.
                    </TableCell></TableRow>
                  )}
                  {varianceAccounts.map(({ code, name }) => {
                    let b = 0, a = 0;
                    for (let m = 1; m <= 12; m++) {
                      b += budgetMap.get(`${code}|${m}`)?.amount || 0;
                      a += actualMap.get(`${code}|${m}`) || 0;
                    }
                    const v = a - b;
                    const pct = b ? (v / Math.abs(b)) * 100 : 0;
                    return (
                      <TableRow key={code}>
                        <TableCell className="font-mono text-sm sticky left-0 bg-background">
                          <div className="font-semibold">{code}</div>
                          <div className="text-xs text-muted-foreground">{name}</div>
                        </TableCell>
                        <TableCell>{fmt(b)}</TableCell>
                        <TableCell>{fmt(a)}</TableCell>
                        <TableCell className={v >= 0 ? "text-emerald-600" : "text-red-600"}>{fmt(v)}</TableCell>
                        <TableCell className={v >= 0 ? "text-emerald-600" : "text-red-600"}>{pct.toFixed(1)}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="entries">
          <Card>
            <CardHeader><CardTitle>Budget Entries — {year}</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Station</TableHead>
                    <TableHead>Cost Center</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budgets.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No budget entries yet. Click "Add Budget" to begin.
                    </TableCell></TableRow>
                  )}
                  {budgets.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>{MONTHS[b.period_month - 1]}</TableCell>
                      <TableCell>
                        <div className="font-mono text-sm">{b.account_code}</div>
                        <div className="text-xs text-muted-foreground">{b.account_name}</div>
                      </TableCell>
                      <TableCell>{companies.find((c) => c.id === b.company_id)?.name || "—"}</TableCell>
                      <TableCell>{stations.find((s) => s.id === b.station_id)?.name || "—"}</TableCell>
                      <TableCell>{b.cost_center || "—"}</TableCell>
                      <TableCell className="font-semibold">{fmt(Number(b.budget_amount))}</TableCell>
                      <TableCell><Badge variant="outline">{b.currency}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => startEdit(b)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(b.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Budget Entry</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Fiscal Year</label>
              <Input type="number" value={form.fiscal_year}
                onChange={(e) => setForm({ ...form, fiscal_year: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Month</label>
              <Select value={String(form.period_month)}
                onValueChange={(v) => setForm({ ...form, period_month: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => <SelectItem key={m} value={String(i+1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground">Account</label>
              <Select value={form.account_code}
                onValueChange={(v) => setForm({ ...form, account_code: v })}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.code}>{a.code} — {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Company</label>
              <Select value={form.company_id || "none"}
                onValueChange={(v) => setForm({ ...form, company_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All Companies</SelectItem>
                  {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Station</label>
              <Select value={form.station_id || "none"}
                onValueChange={(v) => setForm({ ...form, station_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All Stations</SelectItem>
                  {stations.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Cost Center</label>
              <Input value={form.cost_center}
                onChange={(e) => setForm({ ...form, cost_center: e.target.value })}
                placeholder="e.g. Security, Handling" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Currency</label>
              <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["USD","EUR","EGP","GBP","AED","SAR"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground">Budget Amount</label>
              <Input type="number" step="0.01" value={form.budget_amount}
                onChange={(e) => setForm({ ...form, budget_amount: Number(e.target.value) })} />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground">Notes</label>
              <Textarea value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {editing ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
