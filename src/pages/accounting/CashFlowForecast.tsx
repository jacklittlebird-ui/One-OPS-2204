// Cash Flow Forecast (Phase 2g)
// -------------------------------------------------------------
// Rolling 13-week cash flow forecast blending:
//   • Open AR (customer invoices unpaid, by due_date)
//   • Open AP (vendor invoices unpaid, by due_date)
//   • Post-dated cheques inbound (cheques_under_collection by cheque_date)
//   • Post-dated cheques outbound (cheques where direction=outbound, by due_date)
//   • Notes payable outbound (by cheque_date / clearance_date)
// Buckets by ISO week starting on Monday from today.

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Download, RefreshCw, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { format, addWeeks, startOfWeek, endOfWeek, isBefore, isAfter } from "date-fns";
import { exportToExcel } from "@/lib/exportExcel";

interface FlowRow {
  source: string;
  direction: "in" | "out";
  party: string;
  reference: string;
  due_date: string;
  amount: number;
  currency: string;
  status: string;
}

const WEEKS = 13;

function weekBuckets(from: Date) {
  const start = startOfWeek(from, { weekStartsOn: 1 });
  return Array.from({ length: WEEKS }, (_, i) => {
    const ws = addWeeks(start, i);
    const we = endOfWeek(ws, { weekStartsOn: 1 });
    return { index: i, start: ws, end: we, label: `W${i + 1} · ${format(ws, "dd MMM")}` };
  });
}

const money = (n: number, c = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: c || "USD" }).format(n || 0);

export default function CashFlowForecastPage() {
  const { session } = useAuth();
  const today = useMemo(() => new Date(), []);
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [tab, setTab] = useState("summary");

  const buckets = useMemo(() => weekBuckets(today), [today]);
  const horizonEnd = buckets[buckets.length - 1].end;

  const flowsQuery = useQuery({
    queryKey: ["cash-flow-forecast", format(today, "yyyy-MM-dd")],
    enabled: !!session,
    queryFn: async () => {
      const rows: FlowRow[] = [];

      // 1) Open customer invoices (AR inflows) — status not Paid/Cancelled
      const { data: ar } = await supabase
        .from("invoices")
        .select("invoice_no, due_date, date, total, base_total, currency, status, operator")
        .not("status", "in", "(Paid,Cancelled,paid,cancelled)")
        .not("due_date", "is", null);
      (ar || []).forEach((r: any) => {
        rows.push({
          source: "AR Invoice",
          direction: "in",
          party: r.operator || "Customer",
          reference: r.invoice_no,
          due_date: r.due_date,
          amount: Number(r.base_total ?? r.total ?? 0),
          currency: r.currency || "USD",
          status: r.status || "Open",
        });
      });

      // 2) Open vendor invoices (AP outflows)
      const { data: ap } = await supabase
        .from("vendor_invoices")
        .select("invoice_no, vendor_name, due_date, total, currency, status")
        .not("status", "in", "(Paid,Cancelled,paid,cancelled)")
        .not("due_date", "is", null);
      (ap || []).forEach((r: any) => {
        rows.push({
          source: "AP Invoice",
          direction: "out",
          party: r.vendor_name || "Vendor",
          reference: r.invoice_no,
          due_date: r.due_date,
          amount: Number(r.total ?? 0),
          currency: r.currency || "USD",
          status: r.status || "Open",
        });
      });

      // 3) Cheques under collection (inbound, by cheque_date)
      const { data: cuc } = await supabase
        .from("cheques_under_collection")
        .select("cheque_no, cheque_date, customer_name, amount, currency, status")
        .not("status", "in", "(Cleared,Bounced,Cancelled,cleared,bounced,cancelled)");
      (cuc || []).forEach((r: any) => {
        rows.push({
          source: "Cheque (Collect.)",
          direction: "in",
          party: r.customer_name || "Customer",
          reference: r.cheque_no,
          due_date: r.cheque_date,
          amount: Number(r.amount ?? 0),
          currency: r.currency || "USD",
          status: r.status || "Pending",
        });
      });

      // 4) Cheques ledger
      const { data: chs } = await supabase
        .from("cheques")
        .select("cheque_number, direction, party_name, due_date, amount, currency, status")
        .not("status", "in", "(Cleared,Bounced,Cancelled,cleared,bounced,cancelled)")
        .not("due_date", "is", null);
      (chs || []).forEach((r: any) => {
        rows.push({
          source: "Cheque",
          direction: (r.direction === "inbound" || r.direction === "in") ? "in" : "out",
          party: r.party_name || "-",
          reference: r.cheque_number,
          due_date: r.due_date,
          amount: Number(r.amount ?? 0),
          currency: r.currency || "USD",
          status: r.status || "Pending",
        });
      });

      // 5) Notes payable (outbound)
      const { data: np } = await supabase
        .from("notes_payable")
        .select("cheque_no, cheque_date, clearance_date, supplier_name, amount, currency, status")
        .not("status", "in", "(Cleared,Cancelled,cleared,cancelled)");
      (np || []).forEach((r: any) => {
        const due = r.clearance_date || r.cheque_date;
        if (!due) return;
        rows.push({
          source: "Note Payable",
          direction: "out",
          party: r.supplier_name || "Supplier",
          reference: r.cheque_no,
          due_date: due,
          amount: Number(r.amount ?? 0),
          currency: r.currency || "USD",
          status: r.status || "Pending",
        });
      });

      return rows;
    },
  });

  const rows = flowsQuery.data ?? [];

  const bucketed = useMemo(() => {
    return buckets.map((b) => {
      const items = rows.filter((r) => {
        const d = new Date(r.due_date);
        return !isBefore(d, b.start) && !isAfter(d, b.end);
      });
      const inflow = items.filter((r) => r.direction === "in").reduce((s, r) => s + r.amount, 0);
      const outflow = items.filter((r) => r.direction === "out").reduce((s, r) => s + r.amount, 0);
      return { ...b, inflow, outflow, net: inflow - outflow, items };
    });
  }, [rows, buckets]);

  // Overdue = due before "today"
  const overdue = useMemo(() => {
    return rows.filter((r) => isBefore(new Date(r.due_date), buckets[0].start));
  }, [rows, buckets]);

  const running = useMemo(() => {
    let bal = Number(openingBalance) || 0;
    return bucketed.map((b) => {
      bal += b.net;
      return { ...b, closing: bal };
    });
  }, [bucketed, openingBalance]);

  const totalIn = bucketed.reduce((s, b) => s + b.inflow, 0);
  const totalOut = bucketed.reduce((s, b) => s + b.outflow, 0);
  const netHorizon = totalIn - totalOut;

  const exportSummary = () =>
    exportToExcel(
      running.map((b) => ({
        Week: b.label,
        "Start": format(b.start, "dd/MM/yyyy"),
        "End": format(b.end, "dd/MM/yyyy"),
        Inflow: b.inflow.toFixed(2),
        Outflow: b.outflow.toFixed(2),
        Net: b.net.toFixed(2),
        Closing: b.closing.toFixed(2),
      })),
      "Weekly Forecast",
      `cash-flow-forecast-${format(today, "yyyyMMdd")}`
    );

  const exportDetail = () =>
    exportToExcel(
      rows.map((r) => ({
        Source: r.source,
        Direction: r.direction === "in" ? "Inflow" : "Outflow",
        Party: r.party,
        Reference: r.reference,
        "Due Date": r.due_date ? format(new Date(r.due_date), "dd/MM/yyyy") : "",
        Amount: r.amount.toFixed(2),
        Currency: r.currency,
        Status: r.status,
      })),
      "Cash Flow Detail",
      `cash-flow-detail-${format(today, "yyyyMMdd")}`
    );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cash Flow Forecast</h1>
          <p className="text-sm text-muted-foreground">
            Rolling 13-week outlook combining open AR/AP, post-dated cheques, and notes payable
            through {format(horizonEnd, "dd/MM/yyyy")}.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => flowsQuery.refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportSummary}>
            <Download className="h-4 w-4 mr-1" /> Weekly
          </Button>
          <Button variant="outline" size="sm" onClick={exportDetail}>
            <Download className="h-4 w-4 mr-1" /> Detail
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Projected Inflow
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold text-emerald-600">
            {money(totalIn)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingDown className="h-3 w-3" /> Projected Outflow
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold text-rose-600">
            {money(totalOut)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <Wallet className="h-3 w-3" /> Net (13 weeks)
            </CardTitle>
          </CardHeader>
          <CardContent className={`text-xl font-bold ${netHorizon >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {money(netHorizon)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Overdue Items</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold">
            {overdue.length}
            <span className="text-xs font-normal text-muted-foreground ml-2">
              {money(overdue.reduce((s, r) => s + (r.direction === "in" ? r.amount : -r.amount), 0))}
            </span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-end gap-4">
            <div className="max-w-xs">
              <Label htmlFor="opening">Opening Cash Balance</Label>
              <Input
                id="opening"
                type="number"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(Number(e.target.value))}
              />
            </div>
            <p className="text-xs text-muted-foreground pb-2">
              Enter the current consolidated cash + bank balance to see rolling closing balances.
            </p>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="summary">Weekly Summary</TabsTrigger>
          <TabsTrigger value="detail">Detail ({rows.length})</TabsTrigger>
          <TabsTrigger value="overdue">Overdue ({overdue.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Week</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Inflow</TableHead>
                    <TableHead className="text-right">Outflow</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead className="text-right">Closing Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {running.map((b) => (
                    <TableRow key={b.index}>
                      <TableCell className="font-medium">{b.label}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(b.start, "dd/MM")} – {format(b.end, "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="text-right text-emerald-600">
                        {b.inflow ? money(b.inflow) : "—"}
                      </TableCell>
                      <TableCell className="text-right text-rose-600">
                        {b.outflow ? money(b.outflow) : "—"}
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${b.net >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {money(b.net)}
                      </TableCell>
                      <TableCell className={`text-right font-bold ${b.closing >= 0 ? "" : "text-rose-600"}`}>
                        {money(b.closing)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detail">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Party</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows
                    .slice()
                    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
                    .map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{r.source}</TableCell>
                        <TableCell>
                          <Badge variant={r.direction === "in" ? "default" : "destructive"}>
                            {r.direction === "in" ? "In" : "Out"}
                          </Badge>
                        </TableCell>
                        <TableCell>{r.party}</TableCell>
                        <TableCell className="font-mono text-xs">{r.reference}</TableCell>
                        <TableCell>{r.due_date ? format(new Date(r.due_date), "dd/MM/yyyy") : "—"}</TableCell>
                        <TableCell className="text-right">{money(r.amount, r.currency)}</TableCell>
                        <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        {flowsQuery.isLoading ? "Loading..." : "No open items in the forecast window."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overdue">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Party</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdue.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">{r.source}</TableCell>
                      <TableCell>
                        <Badge variant={r.direction === "in" ? "default" : "destructive"}>
                          {r.direction === "in" ? "In" : "Out"}
                        </Badge>
                      </TableCell>
                      <TableCell>{r.party}</TableCell>
                      <TableCell className="font-mono text-xs">{r.reference}</TableCell>
                      <TableCell className="text-rose-600">
                        {format(new Date(r.due_date), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="text-right">{money(r.amount, r.currency)}</TableCell>
                    </TableRow>
                  ))}
                  {overdue.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No overdue items — cash flow is on schedule.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
