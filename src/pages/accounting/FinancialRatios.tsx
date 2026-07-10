// Financial Ratios & KPI Dashboard (Phase 2k)
// -------------------------------------------------------------
// Computes liquidity, profitability, leverage, and efficiency ratios
// from chart_of_accounts (current_balance) + monthly invoice trends.
// No new schema — everything is derived.
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, Activity, Scale, TrendingUp, Gauge } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, BarChart, Bar,
} from "recharts";
import { format, subMonths, startOfMonth } from "date-fns";
import { exportToExcel } from "@/lib/exportExcel";

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const num = (n: number, d = 2) => (isFinite(n) ? n.toFixed(d) : "—");
const money = (n: number, c = "EGP") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: c || "EGP", maximumFractionDigits: 0 }).format(n || 0);

// Health thresholds
const health = (name: string, v: number): "good" | "warn" | "bad" => {
  const rules: Record<string, [number, number]> = {
    current_ratio: [1.5, 1.0],
    quick_ratio: [1.0, 0.7],
    debt_to_equity: [1.0, 2.0], // inverted
    gross_margin: [0.3, 0.15],
    net_margin: [0.1, 0.03],
    roa: [0.05, 0.02],
    roe: [0.1, 0.05],
    asset_turnover: [0.5, 0.25],
    ar_days: [45, 75], // inverted
  };
  const r = rules[name];
  if (!r) return "good";
  if (name === "debt_to_equity" || name === "ar_days") {
    if (v <= r[0]) return "good";
    if (v <= r[1]) return "warn";
    return "bad";
  }
  if (v >= r[0]) return "good";
  if (v >= r[1]) return "warn";
  return "bad";
};
const badgeVariant = (h: string) => (h === "good" ? "default" : h === "warn" ? "outline" : "destructive");

export default function FinancialRatiosPage() {
  const { session } = useAuth();
  const [companyId, setCompanyId] = useState<string>("all");
  const [tab, setTab] = useState("overview");

  const companiesQ = useQuery({
    queryKey: ["companies-ratios"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("id, code, name").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const coaQ = useQuery({
    queryKey: ["coa-balances", companyId],
    enabled: !!session,
    queryFn: async () => {
      let q = supabase.from("chart_of_accounts").select("id, code, name, account_type, current_balance, company_id");
      if (companyId !== "all") q = q.eq("company_id", companyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const invoicesQ = useQuery({
    queryKey: ["invoices-ratios", companyId],
    enabled: !!session,
    queryFn: async () => {
      const since = subMonths(startOfMonth(new Date()), 12).toISOString().slice(0, 10);
      let q = supabase.from("invoices").select("date, total, subtotal, status, currency, company_id").gte("date", since);
      if (companyId !== "all") q = q.eq("company_id", companyId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const vendorsQ = useQuery({
    queryKey: ["vendor-invoices-ratios"],
    enabled: !!session,
    queryFn: async () => {
      const since = subMonths(startOfMonth(new Date()), 12).toISOString().slice(0, 10);
      const { data, error } = await supabase.from("vendor_invoices")
        .select("date, total, status, currency").gte("date", since);
      if (error) throw error;
      return data || [];
    },
  });

  // Aggregate account totals by type (using absolute current_balance)
  const totals = useMemo(() => {
    const map: Record<string, number> = { asset: 0, liability: 0, equity: 0, revenue: 0, expense: 0 };
    const detail: Record<string, { current_assets: number; current_liabilities: number; inventory: number; cash: number; receivables: number }> = {
      current: { current_assets: 0, current_liabilities: 0, inventory: 0, cash: 0, receivables: 0 } as any,
    };
    for (const a of coaQ.data || []) {
      const t = String(a.account_type || "").toLowerCase();
      const bal = Math.abs(Number(a.current_balance || 0));
      map[t] = (map[t] || 0) + bal;
      const code = String(a.code || "");
      // Egyptian CoA style: 11xx = current assets (11 cash/bank, 12 AR, 13 inventory), 21xx = current liabilities
      if (t === "asset") {
        if (code.startsWith("11") || code.startsWith("12") || code.startsWith("13")) detail.current.current_assets += bal;
        if (code.startsWith("111") || code.startsWith("112")) detail.current.cash += bal;
        if (code.startsWith("12")) detail.current.receivables += bal;
        if (code.startsWith("13")) detail.current.inventory += bal;
      }
      if (t === "liability" && code.startsWith("21")) detail.current.current_liabilities += bal;
    }
    return { ...map, ...detail.current };
  }, [coaQ.data]);

  // Monthly revenue trend
  const monthly = useMemo(() => {
    const buckets: Record<string, { month: string; revenue: number; expense: number; invoices: number }> = {};
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(startOfMonth(new Date()), i);
      const key = format(d, "yyyy-MM");
      buckets[key] = { month: format(d, "MMM"), revenue: 0, expense: 0, invoices: 0 };
    }
    for (const inv of invoicesQ.data || []) {
      const k = String(inv.date).slice(0, 7);
      if (buckets[k]) { buckets[k].revenue += Number(inv.total || 0); buckets[k].invoices += 1; }
    }
    for (const v of vendorsQ.data || []) {
      const k = String(v.date).slice(0, 7);
      if (buckets[k]) buckets[k].expense += Number(v.total || 0);
    }
    return Object.values(buckets);
  }, [invoicesQ.data, vendorsQ.data]);

  const revenue12m = monthly.reduce((s, m) => s + m.revenue, 0);
  const expense12m = monthly.reduce((s, m) => s + m.expense, 0);
  const netIncome12m = revenue12m - expense12m;

  const currentRatio = totals.current_liabilities ? totals.current_assets / totals.current_liabilities : 0;
  const quickRatio = totals.current_liabilities ? (totals.current_assets - totals.inventory) / totals.current_liabilities : 0;
  const cashRatio = totals.current_liabilities ? totals.cash / totals.current_liabilities : 0;
  const workingCapital = totals.current_assets - totals.current_liabilities;

  const debtToEquity = totals.equity ? totals.liability / totals.equity : 0;
  const debtToAssets = totals.asset ? totals.liability / totals.asset : 0;
  const equityRatio = totals.asset ? totals.equity / totals.asset : 0;

  const grossMargin = revenue12m ? (revenue12m - (totals.expense * 0.7)) / revenue12m : 0; // COGS approx
  const netMargin = revenue12m ? netIncome12m / revenue12m : 0;
  const roa = totals.asset ? netIncome12m / totals.asset : 0;
  const roe = totals.equity ? netIncome12m / totals.equity : 0;

  const assetTurnover = totals.asset ? revenue12m / totals.asset : 0;
  const arDays = revenue12m ? (totals.receivables / revenue12m) * 365 : 0;

  const kpis = [
    { key: "current_ratio", label: "Current Ratio", value: num(currentRatio), raw: currentRatio, icon: Scale, group: "liquidity" },
    { key: "quick_ratio", label: "Quick Ratio", value: num(quickRatio), raw: quickRatio, icon: Scale, group: "liquidity" },
    { key: "cash_ratio", label: "Cash Ratio", value: num(cashRatio), raw: cashRatio, icon: Scale, group: "liquidity" },
    { key: "working_capital", label: "Working Capital", value: money(workingCapital), raw: workingCapital, icon: Activity, group: "liquidity" },
    { key: "debt_to_equity", label: "Debt / Equity", value: num(debtToEquity), raw: debtToEquity, icon: Gauge, group: "leverage" },
    { key: "debt_to_assets", label: "Debt / Assets", value: pct(debtToAssets), raw: debtToAssets, icon: Gauge, group: "leverage" },
    { key: "equity_ratio", label: "Equity Ratio", value: pct(equityRatio), raw: equityRatio, icon: Gauge, group: "leverage" },
    { key: "gross_margin", label: "Gross Margin", value: pct(grossMargin), raw: grossMargin, icon: TrendingUp, group: "profitability" },
    { key: "net_margin", label: "Net Margin", value: pct(netMargin), raw: netMargin, icon: TrendingUp, group: "profitability" },
    { key: "roa", label: "ROA", value: pct(roa), raw: roa, icon: TrendingUp, group: "profitability" },
    { key: "roe", label: "ROE", value: pct(roe), raw: roe, icon: TrendingUp, group: "profitability" },
    { key: "asset_turnover", label: "Asset Turnover", value: num(assetTurnover), raw: assetTurnover, icon: Activity, group: "efficiency" },
    { key: "ar_days", label: "A/R Days", value: num(arDays, 0), raw: arDays, icon: Activity, group: "efficiency" },
  ];

  const exportAll = () => exportToExcel(
    kpis.map(k => ({ Ratio: k.label, Value: k.value, Health: health(k.key, k.raw), Group: k.group })),
    "Ratios", `financial_ratios_${Date.now()}.xlsx`
  );

  const renderGroup = (group: string) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {kpis.filter(k => k.group === group).map(k => {
        const h = health(k.key, k.raw);
        const Icon = k.icon;
        return (
          <Card key={k.key}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Icon className="h-4 w-4" /> {k.label}
                </div>
                <Badge variant={badgeVariant(h) as any}>{h}</Badge>
              </div>
              <div className="text-2xl font-bold">{k.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Financial Ratios & KPI Dashboard</h1>
          <p className="text-sm text-muted-foreground">Liquidity, profitability, leverage, efficiency — with 12-month trend.</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All companies</SelectItem>
              {(companiesQ.data || []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportAll}><Download className="h-4 w-4 mr-1" /> Export</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Revenue (12M)</div><div className="text-lg font-semibold">{money(revenue12m)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Expenses (12M)</div><div className="text-lg font-semibold">{money(expense12m)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Net Income (12M)</div><div className={`text-lg font-semibold ${netIncome12m >= 0 ? "text-primary" : "text-destructive"}`}>{money(netIncome12m)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total Assets</div><div className="text-lg font-semibold">{money(totals.asset)}</div></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="liquidity">Liquidity</TabsTrigger>
          <TabsTrigger value="profitability">Profitability</TabsTrigger>
          <TabsTrigger value="leverage">Leverage</TabsTrigger>
          <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {(["liquidity", "profitability", "leverage", "efficiency"] as const).map(g => (
            <div key={g}>
              <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-2">{g}</h3>
              {renderGroup(g)}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="liquidity">{renderGroup("liquidity")}</TabsContent>
        <TabsContent value="profitability">{renderGroup("profitability")}</TabsContent>
        <TabsContent value="leverage">{renderGroup("leverage")}</TabsContent>
        <TabsContent value="efficiency">{renderGroup("efficiency")}</TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Revenue vs Expense (12M)</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer>
                <LineChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(v: any) => money(Number(v))} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} />
                  <Line type="monotone" dataKey="expense" stroke="hsl(var(--destructive))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Invoice Volume (12M)</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer>
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="invoices" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
