import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, RefreshCw, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ForecastRow = {
  week_index: number;
  week_start: string;
  week_end: string;
  opening_balance: number;
  ar_inflow: number;
  recurring_inflow: number;
  ap_outflow: number;
  net_change: number;
  closing_balance: number;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number(n || 0));

const fmtDate = (d: string) => {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}`;
};

export default function CashFlowForecast() {
  const [weeks, setWeeks] = useState<number>(13);
  const [start, setStart] = useState<string>("");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["cash-flow-forecast", weeks, start],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_cash_flow_forecast", {
        _weeks: weeks,
        _start: start || null,
      });
      if (error) throw error;
      return (data ?? []) as ForecastRow[];
    },
  });

  const rows = data ?? [];

  const totals = useMemo(() => {
    const inflow = rows.reduce((s, r) => s + Number(r.ar_inflow) + Number(r.recurring_inflow), 0);
    const outflow = rows.reduce((s, r) => s + Number(r.ap_outflow), 0);
    const opening = rows[0]?.opening_balance ?? 0;
    const closing = rows[rows.length - 1]?.closing_balance ?? opening;
    const trough = rows.reduce(
      (min, r) => (Number(r.closing_balance) < min ? Number(r.closing_balance) : min),
      Number.POSITIVE_INFINITY
    );
    return {
      inflow,
      outflow,
      opening,
      closing,
      trough: rows.length ? trough : 0,
      net: closing - opening,
    };
  }, [rows]);

  const chartData = rows.map((r) => ({
    week: `W${r.week_index}`,
    range: `${fmtDate(r.week_start)}–${fmtDate(r.week_end)}`,
    Inflow: Number(r.ar_inflow) + Number(r.recurring_inflow),
    Outflow: -Number(r.ap_outflow),
    Balance: Number(r.closing_balance),
  }));

  const exportCsv = () => {
    const headers = [
      "Week",
      "Start",
      "End",
      "Opening",
      "AR Inflow",
      "Recurring",
      "AP Outflow",
      "Net Change",
      "Closing",
    ];
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        [
          r.week_index,
          r.week_start,
          r.week_end,
          r.opening_balance,
          r.ar_inflow,
          r.recurring_inflow,
          r.ap_outflow,
          r.net_change,
          r.closing_balance,
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cash-forecast-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Cash Flow Forecast</h1>
          <p className="text-muted-foreground text-sm">
            Rolling weekly cash projection from open AR, open AP, and active recurring invoices.
          </p>
        </div>
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <Label className="text-xs">Weeks</Label>
            <Input
              type="number"
              min={1}
              max={52}
              value={weeks}
              onChange={(e) => setWeeks(Math.max(1, Math.min(52, Number(e.target.value) || 13)))}
              className="w-24"
            />
          </div>
          <div>
            <Label className="text-xs">Start (optional)</Label>
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="w-44" />
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={exportCsv} disabled={!rows.length}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Opening
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{fmt(totals.opening)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" /> Total Inflow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-green-600">{fmt(totals.inflow)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" /> Total Outflow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-red-600">{fmt(totals.outflow)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Ending Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{fmt(totals.closing)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Trough: <span className={totals.trough < 0 ? "text-red-600 font-medium" : ""}>{fmt(totals.trough)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projected Closing Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Area type="monotone" dataKey="Balance" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.25)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Inflow vs Outflow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip formatter={(v: number) => fmt(Math.abs(v))} />
                <Legend />
                <Bar dataKey="Inflow" fill="#16a34a" />
                <Bar dataKey="Outflow" fill="#dc2626" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Loading forecast…</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No data.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Week</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Opening</TableHead>
                  <TableHead className="text-right">AR Inflow</TableHead>
                  <TableHead className="text-right">Recurring</TableHead>
                  <TableHead className="text-right">AP Outflow</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead className="text-right">Closing</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.week_index}>
                    <TableCell className="font-medium">W{r.week_index}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {fmtDate(r.week_start)} – {fmtDate(r.week_end)}
                    </TableCell>
                    <TableCell className="text-right">{fmt(r.opening_balance)}</TableCell>
                    <TableCell className="text-right text-green-600">{fmt(r.ar_inflow)}</TableCell>
                    <TableCell className="text-right text-green-600">{fmt(r.recurring_inflow)}</TableCell>
                    <TableCell className="text-right text-red-600">{fmt(r.ap_outflow)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={Number(r.net_change) >= 0 ? "default" : "destructive"}>
                        {Number(r.net_change) >= 0 ? "+" : ""}
                        {fmt(r.net_change)}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${Number(r.closing_balance) < 0 ? "text-red-600" : ""}`}>
                      {fmt(r.closing_balance)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
