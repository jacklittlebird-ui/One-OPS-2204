import { useState, useMemo } from "react";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Download, Search } from "lucide-react";
import { formatDateDMY } from "@/lib/utils";
import { exportToExcel } from "@/lib/exportExcel";

type InvoiceRow = { id: string; invoice_no: string; operator: string; date: string; due_date: string; total: number; status: string; currency: string; airline_iata: string | null; };

const BUCKET_COLORS = {
  current: "hsl(var(--success))",
  d30: "hsl(var(--info))",
  d60: "hsl(var(--warning))",
  d90: "hsl(var(--destructive))",
  over90: "hsl(var(--destructive))",
};

export default function AgingReportsPage() {
  const { data: invoices = [], isLoading } = useSupabaseTable<InvoiceRow>("invoices", { orderBy: { column: "date", ascending: false } });
  const [search, setSearch] = useState("");

  const todayMs = useMemo(() => Date.now(), []);

  const unpaidInvoices = useMemo(
    () => invoices.filter((i) => i.status !== "Paid" && i.status !== "Cancelled"),
    [invoices]
  );

  const agingBuckets = useMemo(() => {
    const buckets = { current: [] as InvoiceRow[], days30: [] as InvoiceRow[], days60: [] as InvoiceRow[], days90: [] as InvoiceRow[], over90: [] as InvoiceRow[] };
    unpaidInvoices.forEach((inv) => {
      const due = new Date(inv.due_date).getTime();
      const diff = Math.floor((todayMs - due) / 86400000);
      if (diff <= 0) buckets.current.push(inv);
      else if (diff <= 30) buckets.days30.push(inv);
      else if (diff <= 60) buckets.days60.push(inv);
      else if (diff <= 90) buckets.days90.push(inv);
      else buckets.over90.push(inv);
    });
    return buckets;
  }, [unpaidInvoices, todayMs]);

  const bucketData = [
    { name: "Current", count: agingBuckets.current.length, total: agingBuckets.current.reduce((s, i) => s + Number(i.total || 0), 0), color: BUCKET_COLORS.current },
    { name: "1-30 Days", count: agingBuckets.days30.length, total: agingBuckets.days30.reduce((s, i) => s + Number(i.total || 0), 0), color: BUCKET_COLORS.d30 },
    { name: "31-60 Days", count: agingBuckets.days60.length, total: agingBuckets.days60.reduce((s, i) => s + Number(i.total || 0), 0), color: BUCKET_COLORS.d60 },
    { name: "61-90 Days", count: agingBuckets.days90.length, total: agingBuckets.days90.reduce((s, i) => s + Number(i.total || 0), 0), color: BUCKET_COLORS.d90 },
    { name: "90+ Days", count: agingBuckets.over90.length, total: agingBuckets.over90.reduce((s, i) => s + Number(i.total || 0), 0), color: BUCKET_COLORS.over90 },
  ];

  const totalOutstanding = unpaidInvoices.reduce((s, i) => s + Number(i.total || 0), 0);
  const totalOverdue = [...agingBuckets.days30, ...agingBuckets.days60, ...agingBuckets.days90, ...agingBuckets.over90].reduce((s, i) => s + Number(i.total || 0), 0);

  const byAirline = useMemo(() => {
    const map: Record<string, { operator: string; total: number; count: number; overdue: number }> = {};
    unpaidInvoices.forEach((i) => {
      if (!map[i.operator]) map[i.operator] = { operator: i.operator, total: 0, count: 0, overdue: 0 };
      map[i.operator].total += Number(i.total || 0);
      map[i.operator].count += 1;
      const diff = Math.floor((todayMs - new Date(i.due_date).getTime()) / 86400000);
      if (diff > 0) map[i.operator].overdue += Number(i.total || 0);
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [unpaidInvoices, todayMs]);

  const filteredDetail = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return unpaidInvoices;
    return unpaidInvoices.filter((i) =>
      i.invoice_no?.toLowerCase().includes(q) || i.operator?.toLowerCase().includes(q)
    );
  }, [unpaidInvoices, search]);

  const handleExportDetail = () => {
    const rows = filteredDetail.map((i) => {
      const diff = Math.floor((todayMs - new Date(i.due_date).getTime()) / 86400000);
      return {
        Invoice: i.invoice_no,
        Operator: i.operator,
        Date: formatDateDMY(i.date),
        "Due Date": formatDateDMY(i.due_date),
        "Days Overdue": diff > 0 ? diff : 0,
        Total: Number(i.total || 0),
        Currency: i.currency,
        Status: i.status,
      };
    });
    exportToExcel(rows, `aging-detail-${new Date().toISOString().slice(0, 10)}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Aging &amp; Debt Reports</h1>
          <p className="text-muted-foreground text-sm">تقارير المديونيات · Receivables aging analysis</p>
        </div>
        <Button onClick={handleExportDetail} variant="outline" size="sm" disabled={!unpaidInvoices.length}>
          <Download size={14} className="mr-1.5" /> Export Detail
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Total Outstanding</p><p className="text-xl font-bold font-mono text-foreground">{totalOutstanding.toLocaleString()}</p><p className="text-xs text-muted-foreground">{unpaidInvoices.length} invoices</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Total Overdue</p><p className="text-xl font-bold font-mono text-destructive">{totalOverdue.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Current (Not Due)</p><p className="text-xl font-bold font-mono text-success">{bucketData[0].total.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">90+ Days Overdue</p><p className="text-xl font-bold font-mono text-destructive">{bucketData[4].total.toLocaleString()}</p><p className="text-xs text-muted-foreground">{agingBuckets.over90.length} invoices</p></CardContent></Card>
      </div>

      <Tabs defaultValue="aging">
        <TabsList>
          <TabsTrigger value="aging">Aging Summary</TabsTrigger>
          <TabsTrigger value="by-airline">By Airline / بالعميل</TabsTrigger>
          <TabsTrigger value="detail">Detail / التفاصيل</TabsTrigger>
        </TabsList>

        <TabsContent value="aging">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Aging Buckets</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={bucketData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                    <Bar dataKey="total">
                      {bucketData.map((b, i) => <Cell key={i} fill={b.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Aging Distribution</CardTitle></CardHeader>
              <CardContent>
                {bucketData.some((b) => b.total > 0) ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={bucketData.filter((b) => b.total > 0)} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}>
                        {bucketData.filter((b) => b.total > 0).map((b, i) => <Cell key={i} fill={b.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">No outstanding invoices</div>
                )}
              </CardContent>
            </Card>
          </div>
          <Card className="mt-4">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Period</TableHead><TableHead className="text-right">Count</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">% of Total</TableHead></TableRow></TableHeader>
                <TableBody>
                  {bucketData.map((b) => (
                    <TableRow key={b.name}>
                      <TableCell className="font-medium"><span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: b.color }} />{b.name}</TableCell>
                      <TableCell className="text-right">{b.count}</TableCell>
                      <TableCell className="text-right font-mono">{b.total.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{totalOutstanding > 0 ? ((b.total / totalOutstanding) * 100).toFixed(1) : 0}%</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{unpaidInvoices.length}</TableCell>
                    <TableCell className="text-right font-mono">{totalOutstanding.toLocaleString()}</TableCell>
                    <TableCell className="text-right">100%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by-airline">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Airline / العميل</TableHead><TableHead className="text-right">Invoices</TableHead><TableHead className="text-right">Total Outstanding</TableHead><TableHead className="text-right">Overdue</TableHead></TableRow></TableHeader>
                <TableBody>
                  {byAirline.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No outstanding invoices</TableCell></TableRow>
                  ) : (
                    byAirline.map((a) => (
                      <TableRow key={a.operator}>
                        <TableCell className="font-medium">{a.operator}</TableCell>
                        <TableCell className="text-right">{a.count}</TableCell>
                        <TableCell className="text-right font-mono">{a.total.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono text-destructive">{a.overdue > 0 ? a.overdue.toLocaleString() : "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detail">
          <Card>
            <CardContent className="p-3 space-y-3">
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search invoice no or operator..."
                    className="pl-9 h-9"
                  />
                </div>
                <span className="text-xs text-muted-foreground">{filteredDetail.length} of {unpaidInvoices.length}</span>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Operator</TableHead><TableHead>Date</TableHead><TableHead>Due Date</TableHead><TableHead>Days Overdue</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {filteredDetail.map((i) => {
                      const diff = Math.floor((todayMs - new Date(i.due_date).getTime()) / 86400000);
                      return (
                        <TableRow key={i.id}>
                          <TableCell className="font-mono text-sm">{i.invoice_no}</TableCell>
                          <TableCell>{i.operator}</TableCell>
                          <TableCell>{formatDateDMY(i.date)}</TableCell>
                          <TableCell>{formatDateDMY(i.due_date)}</TableCell>
                          <TableCell>{diff > 0 ? <span className="text-destructive font-bold">{diff} days</span> : <span className="text-success">Current</span>}</TableCell>
                          <TableCell className="text-right font-mono">{Number(i.total || 0).toLocaleString()} {i.currency}</TableCell>
                          <TableCell><Badge variant={i.status === "Overdue" ? "destructive" : "secondary"}>{i.status}</Badge></TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredDetail.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{search ? "No matching invoices" : "No unpaid invoices"}</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
