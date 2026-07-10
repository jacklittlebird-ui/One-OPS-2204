// Cost Center Budgeting & Variance Alerts (Phase 2f)
// -------------------------------------------------------------
// Compare monthly actuals (from posted journal_entry_lines) against
// budget_entries per cost center + account. Trigger and log breaches
// when actual / budget exceeds the per-line threshold percentage.

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { AlertTriangle, Download, RefreshCw, CheckCircle2, Target } from "lucide-react";
import { exportToExcel } from "@/lib/exportExcel";
import { format } from "date-fns";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

interface BudgetRow {
  id: string;
  fiscal_year: number;
  period_month: number;
  account_code: string;
  account_name: string | null;
  company_id: string | null;
  cost_center: string | null;
  budget_amount: number;
  alert_threshold_pct: number | null;
  currency: string | null;
}

interface Alert {
  id: string;
  fiscal_year: number;
  period_month: number;
  company_id: string | null;
  cost_center: string | null;
  account_code: string;
  account_name: string | null;
  budget_amount: number;
  actual_amount: number;
  variance_amount: number;
  variance_pct: number;
  threshold_pct: number;
  severity: string;
  status: string;
  acknowledged_at: string | null;
  notes: string | null;
  created_at: string;
}

export default function BudgetVariancePage() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [tab, setTab] = useState("variance");

  const budgetsQuery = useQuery({
    queryKey: ["budget-entries", year, month],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budget_entries")
        .select("*")
        .eq("fiscal_year", year)
        .eq("period_month", month);
      if (error) throw error;
      return (data ?? []) as BudgetRow[];
    },
  });

  const actualsQuery = useQuery({
    queryKey: ["actuals-je", year, month],
    enabled: !!session,
    queryFn: async () => {
      const start = `${year}-${String(month).padStart(2, "0")}-01`;
      const end = new Date(year, month, 0).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("journal_entry_lines")
        .select("account_code, cost_center, debit, credit, journal_entries!inner(entry_date,status)")
        .gte("journal_entries.entry_date", start)
        .lte("journal_entries.entry_date", end)
        .eq("journal_entries.status", "Posted");
      if (error) throw error;
      // Sum net (debit - credit) grouped by account+cost_center
      const map = new Map<string, number>();
      (data ?? []).forEach((l: any) => {
        const key = `${l.account_code}||${l.cost_center ?? ""}`;
        const net = Number(l.debit ?? 0) - Number(l.credit ?? 0);
        map.set(key, (map.get(key) ?? 0) + net);
      });
      return map;
    },
  });

  const alertsQuery = useQuery({
    queryKey: ["budget-alerts"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budget_variance_alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Alert[];
    },
  });

  const budgets = budgetsQuery.data ?? [];
  const actuals = actualsQuery.data ?? new Map<string, number>();
  const alerts = alertsQuery.data ?? [];

  const variance = useMemo(() => {
    return budgets.map(b => {
      const key = `${b.account_code}||${b.cost_center ?? ""}`;
      const actual = actuals.get(key) ?? 0;
      const bud = Number(b.budget_amount) || 0;
      const usedPct = bud === 0 ? (actual > 0 ? 999 : 0) : (actual / bud) * 100;
      const thr = Number(b.alert_threshold_pct ?? 100);
      const breached = usedPct >= thr;
      const severity = usedPct >= 120 ? "critical" : usedPct >= thr ? "warning" : "ok";
      return { ...b, actual, variance: actual - bud, usedPct, thresholdPct: thr, breached, severity };
    });
  }, [budgets, actuals]);

  const scanAndLog = useMutation({
    mutationFn: async () => {
      const breaches = variance.filter(v => v.breached);
      if (!breaches.length) return 0;

      // Fetch existing open alerts for this period to avoid duplicates
      const { data: existing } = await supabase
        .from("budget_variance_alerts")
        .select("id,account_code,cost_center")
        .eq("fiscal_year", year)
        .eq("period_month", month)
        .eq("status", "Open");
      const exKeys = new Set((existing ?? []).map((e: any) => `${e.account_code}||${e.cost_center ?? ""}`));

      const rows = breaches
        .filter(b => !exKeys.has(`${b.account_code}||${b.cost_center ?? ""}`))
        .map(b => ({
          fiscal_year: year,
          period_month: month,
          company_id: b.company_id,
          cost_center: b.cost_center,
          account_code: b.account_code,
          account_name: b.account_name,
          budget_amount: Number(b.budget_amount),
          actual_amount: Number(b.actual),
          variance_amount: Number(b.variance),
          variance_pct: Number(b.usedPct.toFixed(2)),
          threshold_pct: Number(b.thresholdPct),
          severity: b.severity,
          status: "Open",
        }));
      if (!rows.length) return 0;
      const { error } = await supabase.from("budget_variance_alerts").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (n) => {
      toast.success(n ? `Logged ${n} new alert(s)` : "No new breaches to log");
      qc.invalidateQueries({ queryKey: ["budget-alerts"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Scan failed"),
  });

  const acknowledge = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("budget_variance_alerts").update({
        status: "Acknowledged",
        acknowledged_by: session?.user?.id,
        acknowledged_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Alert acknowledged");
      qc.invalidateQueries({ queryKey: ["budget-alerts"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const openCount = alerts.filter(a => a.status === "Open").length;
  const totalBudget = variance.reduce((s, v) => s + Number(v.budget_amount || 0), 0);
  const totalActual = variance.reduce((s, v) => s + Number(v.actual || 0), 0);
  const totalBreaches = variance.filter(v => v.breached).length;

  const severityBadge = (sev: string) => {
    if (sev === "critical") return <Badge variant="destructive">Critical</Badge>;
    if (sev === "warning") return <Badge className="bg-amber-500 hover:bg-amber-600">Warning</Badge>;
    return <Badge variant="secondary">OK</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Target className="h-6 w-6" /> Budget vs Actual</h1>
          <p className="text-sm text-muted-foreground">Per cost center + account variance with threshold-based alerts.</p>
        </div>
        <div className="flex gap-2 items-end flex-wrap">
          <div><Label>Year</Label>
            <Input type="number" className="w-24" value={year} onChange={e => setYear(Number(e.target.value))} />
          </div>
          <div><Label>Month</Label>
            <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={() => { budgetsQuery.refetch(); actualsQuery.refetch(); }}>
            <RefreshCw className="h-4 w-4 mr-1" />Refresh
          </Button>
          <Button onClick={() => scanAndLog.mutate()} disabled={scanAndLog.isPending}>
            <AlertTriangle className="h-4 w-4 mr-1" />Scan & Log Alerts
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader><CardTitle className="text-sm">Budget ({MONTHS[month - 1]} {year})</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{totalBudget.toLocaleString()}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Actual</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{totalActual.toLocaleString()}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Breaches (current)</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold text-amber-600">{totalBreaches}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Open Alerts</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold text-destructive">{openCount}</CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="variance">Variance</TabsTrigger>
          <TabsTrigger value="alerts">Alerts Log ({openCount})</TabsTrigger>
        </TabsList>

        <TabsContent value="variance" className="space-y-3">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => exportToExcel(variance.map(v => ({
              Account: v.account_code, Name: v.account_name, CostCenter: v.cost_center,
              Budget: v.budget_amount, Actual: v.actual, Variance: v.variance, UsedPct: v.usedPct.toFixed(2), Threshold: v.thresholdPct,
            })), "Variance", `variance-${year}-${month}`)}>
              <Download className="h-4 w-4 mr-1" />Export
            </Button>
          </div>
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Account</TableHead><TableHead>Cost Center</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead className="w-48">Used</TableHead>
                <TableHead>Severity</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {variance.map(v => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <div className="font-medium">{v.account_code}</div>
                      <div className="text-xs text-muted-foreground">{v.account_name}</div>
                    </TableCell>
                    <TableCell>{v.cost_center ?? "—"}</TableCell>
                    <TableCell className="text-right">{Number(v.budget_amount).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{Number(v.actual).toLocaleString()}</TableCell>
                    <TableCell className={`text-right ${v.variance > 0 ? "text-destructive" : "text-emerald-600"}`}>
                      {v.variance.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={Math.min(v.usedPct, 100)} className="h-2" />
                        <span className="text-xs w-12 text-right">{v.usedPct.toFixed(0)}%</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">Threshold {v.thresholdPct}%</div>
                    </TableCell>
                    <TableCell>{severityBadge(v.severity)}</TableCell>
                  </TableRow>
                ))}
                {!variance.length && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                    No budgets for {MONTHS[month - 1]} {year}. Add lines in Budgets & Variance.
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-3">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => exportToExcel(alerts.map(a => ({
              Period: `${a.fiscal_year}-${a.period_month}`, Account: a.account_code, CostCenter: a.cost_center,
              Budget: a.budget_amount, Actual: a.actual_amount, Variance: a.variance_amount, UsedPct: a.variance_pct,
              Severity: a.severity, Status: a.status,
            })), "Alerts", "budget-alerts")}>
              <Download className="h-4 w-4 mr-1" />Export
            </Button>
          </div>
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Logged</TableHead><TableHead>Period</TableHead><TableHead>Account</TableHead>
                <TableHead>Cost Center</TableHead>
                <TableHead className="text-right">Budget</TableHead><TableHead className="text-right">Actual</TableHead>
                <TableHead>Used %</TableHead><TableHead>Severity</TableHead><TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {alerts.map(a => (
                  <TableRow key={a.id}>
                    <TableCell>{format(new Date(a.created_at), "dd/MM/yyyy")}</TableCell>
                    <TableCell>{MONTHS[a.period_month - 1]} {a.fiscal_year}</TableCell>
                    <TableCell>{a.account_code}</TableCell>
                    <TableCell>{a.cost_center ?? "—"}</TableCell>
                    <TableCell className="text-right">{Number(a.budget_amount).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{Number(a.actual_amount).toLocaleString()}</TableCell>
                    <TableCell>{Number(a.variance_pct).toFixed(0)}%</TableCell>
                    <TableCell>{severityBadge(a.severity)}</TableCell>
                    <TableCell>{a.status === "Open"
                      ? <Badge variant="destructive">Open</Badge>
                      : <Badge variant="secondary">{a.status}</Badge>}</TableCell>
                    <TableCell>
                      {a.status === "Open" && (
                        <Button size="sm" variant="ghost" onClick={() => acknowledge.mutate(a.id)}>
                          <CheckCircle2 className="h-4 w-4 mr-1" />Ack
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {!alerts.length && (
                  <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-6">
                    No alerts logged yet. Run <b>Scan & Log Alerts</b> for the current period.
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
