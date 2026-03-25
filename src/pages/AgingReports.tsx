import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { AlertTriangle, TrendingUp, DollarSign, Clock } from "lucide-react";

type InvoiceRow = { id: string; invoice_no: string; operator: string; date: string; due_date: string; total: number; status: string; currency: string; airline_iata: string | null; };

const COLORS = ["#22c55e", "#3b82f6", "#f97316", "#ef4444", "#6b7280"];

export default function AgingReportsPage() {
  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => { const { data } = await supabase.from("invoices").select("*").order("date", { ascending: false }); return (data || []) as InvoiceRow[]; },
  });

  const [periodFilter, setPeriodFilter] = useState("all");
  const today = new Date();

  // Aging buckets
  const unpaidInvoices = invoices.filter(i => i.status !== "Paid" && i.status !== "Cancelled");
  const agingBuckets = useMemo(() => {
    const buckets = { current: [] as InvoiceRow[], days30: [] as InvoiceRow[], days60: [] as InvoiceRow[], days90: [] as InvoiceRow[], over90: [] as InvoiceRow[] };
    unpaidInvoices.forEach(inv => {
      const due = new Date(inv.due_date);
      const diff = Math.floor((today.getTime() - due.getTime()) / 86400000);
      if (diff <= 0) buckets.current.push(inv);
      else if (diff <= 30) buckets.days30.push(inv);
      else if (diff <= 60) buckets.days60.push(inv);
      else if (diff <= 90) buckets.days90.push(inv);
      else buckets.over90.push(inv);
    });
    return buckets;
  }, [unpaidInvoices]);

  const bucketData = [
    { name: "Current", count: agingBuckets.current.length, total: agingBuckets.current.reduce((s, i) => s + i.total, 0), color: "#22c55e" },
    { name: "1-30 Days", count: agingBuckets.days30.length, total: agingBuckets.days30.reduce((s, i) => s + i.total, 0), color: "#3b82f6" },
    { name: "31-60 Days", count: agingBuckets.days60.length, total: agingBuckets.days60.reduce((s, i) => s + i.total, 0), color: "#f97316" },
    { name: "61-90 Days", count: agingBuckets.days90.length, total: agingBuckets.days90.reduce((s, i) => s + i.total, 0), color: "#ef4444" },
    { name: "90+ Days", count: agingBuckets.over90.length, total: agingBuckets.over90.reduce((s, i) => s + i.total, 0), color: "#991b1b" },
  ];

  const totalOutstanding = unpaidInvoices.reduce((s, i) => s + i.total, 0);
  const totalOverdue = [...agingBuckets.days30, ...agingBuckets.days60, ...agingBuckets.days90, ...agingBuckets.over90].reduce((s, i) => s + i.total, 0);

  // By airline
  const byAirline = useMemo(() => {
    const map: Record<string, { operator: string; total: number; count: number; overdue: number }> = {};
    unpaidInvoices.forEach(i => {
      if (!map[i.operator]) map[i.operator] = { operator: i.operator, total: 0, count: 0, overdue: 0 };
      map[i.operator].total += i.total;
      map[i.operator].count += 1;
      const diff = Math.floor((today.getTime() - new Date(i.due_date).getTime()) / 86400000);
      if (diff > 0) map[i.operator].overdue += i.total;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [unpaidInvoices]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Aging & Debt Reports</h1>
        <p className="text-muted-foreground text-sm">تقارير المديونيات · Receivables aging analysis</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Total Outstanding</p><p className="text-xl font-bold font-mono text-foreground">{totalOutstanding.toLocaleString()}</p><p className="text-xs text-muted-foreground">{unpaidInvoices.length} invoices</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Total Overdue</p><p className="text-xl font-bold font-mono text-red-600">{totalOverdue.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Current (Not Due)</p><p className="text-xl font-bold font-mono text-green-600">{agingBuckets.current.reduce((s, i) => s + i.total, 0).toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">90+ Days Overdue</p><p className="text-xl font-bold font-mono text-red-800">{agingBuckets.over90.reduce((s, i) => s + i.total, 0).toLocaleString()}</p><p className="text-xs text-muted-foreground">{agingBuckets.over90.length} invoices</p></CardContent></Card>
      </div>

      <Tabs defaultValue="aging">
        <TabsList>
          <TabsTrigger value="aging">Aging Summary</TabsTrigger>
          <TabsTrigger value="by-airline">By Airline / بالعميل</TabsTrigger>
          <TabsTrigger value="detail">Detail / التفاصيل</TabsTrigger>
        </TabsList>

        <TabsContent value="aging">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Aging Buckets</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={bucketData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="total" fill="#3b82f6">
                      {bucketData.map((b, i) => <Cell key={i} fill={b.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Aging Distribution</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={bucketData.filter(b => b.total > 0)} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {bucketData.map((b, i) => <Cell key={i} fill={b.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          <Card className="mt-4">
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Period</TableHead><TableHead className="text-right">Count</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">% of Total</TableHead></TableRow></TableHeader>
                <TableBody>
                  {bucketData.map(b => (
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
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Airline / العميل</TableHead><TableHead className="text-right">Invoices</TableHead><TableHead className="text-right">Total Outstanding</TableHead><TableHead className="text-right">Overdue</TableHead></TableRow></TableHeader>
                <TableBody>
                  {byAirline.map(a => (
                    <TableRow key={a.operator}>
                      <TableCell className="font-medium">{a.operator}</TableCell>
                      <TableCell className="text-right">{a.count}</TableCell>
                      <TableCell className="text-right font-mono">{a.total.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-red-600">{a.overdue > 0 ? a.overdue.toLocaleString() : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detail">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Operator</TableHead><TableHead>Date</TableHead><TableHead>Due Date</TableHead><TableHead>Days Overdue</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {unpaidInvoices.map(i => {
                    const diff = Math.floor((today.getTime() - new Date(i.due_date).getTime()) / 86400000);
                    return (
                      <TableRow key={i.id}>
                        <TableCell className="font-mono text-sm">{i.invoice_no}</TableCell>
                        <TableCell>{i.operator}</TableCell>
                        <TableCell>{i.date}</TableCell>
                        <TableCell>{i.due_date}</TableCell>
                        <TableCell>{diff > 0 ? <span className="text-red-600 font-bold">{diff} days</span> : <span className="text-green-600">Current</span>}</TableCell>
                        <TableCell className="text-right font-mono">{i.total.toLocaleString()} {i.currency}</TableCell>
                        <TableCell><Badge variant={i.status === "Overdue" ? "destructive" : "secondary"}>{i.status}</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                  {unpaidInvoices.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No unpaid invoices</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
