import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  DollarSign, TrendingUp, FileText, Receipt, Building2, Plane,
  ArrowRight, CheckCircle2, Clock, AlertTriangle, BookOpen, Users
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from "recharts";

type InvoiceRow = { id: string; invoice_no: string; operator: string; date: string; due_date: string; total: number; status: string; currency: string; invoice_type: string; };
type VendorInvoiceRow = { id: string; invoice_no: string; vendor_name: string; total: number; status: string; date: string; };
type JournalEntry = { id: string; entry_no: string; status: string; total_debit: number; entry_date: string; };

export default function AccountantDashboard() {
  const navigate = useNavigate();

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => { const { data } = await supabase.from("invoices").select("*").order("date", { ascending: false }); return (data || []) as InvoiceRow[]; },
  });

  const { data: vendorInvoices = [] } = useQuery({
    queryKey: ["vendor_invoices"],
    queryFn: async () => { const { data } = await supabase.from("vendor_invoices").select("*").order("date", { ascending: false }); return (data || []) as VendorInvoiceRow[]; },
  });

  const { data: journalEntries = [] } = useQuery({
    queryKey: ["journal_entries"],
    queryFn: async () => { const { data } = await supabase.from("journal_entries").select("id,entry_no,status,total_debit,entry_date").order("entry_date", { ascending: false }); return (data || []) as JournalEntry[]; },
  });

  const totalPaid = invoices.filter(i => i.status === "Paid").reduce((s, i) => s + (i.total || 0), 0);
  const totalPending = invoices.filter(i => i.status === "Sent" || i.status === "Draft").reduce((s, i) => s + (i.total || 0), 0);
  const totalOverdue = invoices.filter(i => i.status === "Overdue").reduce((s, i) => s + (i.total || 0), 0);
  const vendorUnpaid = vendorInvoices.filter(v => v.status !== "Paid").reduce((s, v) => s + (v.total || 0), 0);

  const stats = [
    { label: "Total Invoices", value: String(invoices.length), sub: "Client invoices", icon: <FileText size={20} />, color: "bg-primary", link: "/invoices" },
    { label: "Paid", value: `$${totalPaid.toLocaleString()}`, sub: `${invoices.filter(i => i.status === "Paid").length} invoices`, icon: <CheckCircle2 size={20} />, color: "bg-success", link: "/invoices" },
    { label: "Pending", value: `$${totalPending.toLocaleString()}`, sub: "Draft + Sent", icon: <Clock size={20} />, color: "bg-warning", link: "/invoices" },
    { label: "Overdue", value: `$${totalOverdue.toLocaleString()}`, sub: `${invoices.filter(i => i.status === "Overdue").length} invoices`, icon: <AlertTriangle size={20} />, color: "bg-destructive", link: "/aging-reports" },
    { label: "Vendor Payables", value: `$${vendorUnpaid.toLocaleString()}`, sub: `${vendorInvoices.filter(v => v.status !== "Paid").length} unpaid`, icon: <Building2 size={20} />, color: "bg-info", link: "/vendor-invoices" },
    { label: "Journal Entries", value: String(journalEntries.length), sub: `${journalEntries.filter(j => j.status === "Posted").length} posted`, icon: <BookOpen size={20} />, color: "bg-accent", link: "/journal-entries" },
  ];

  // Invoice status pie
  const invoiceStatusData = useMemo(() => {
    const counts: Record<string, number> = {};
    invoices.forEach(i => { counts[i.status] = (counts[i.status] || 0) + 1; });
    const colors: Record<string, string> = { Paid: "hsl(152, 60%, 45%)", Sent: "hsl(210, 80%, 55%)", Overdue: "hsl(0, 84%, 60%)", Draft: "hsl(215, 16%, 47%)", Cancelled: "hsl(30, 80%, 55%)" };
    return Object.entries(counts).map(([name, value]) => ({ name, value, fill: colors[name] || "hsl(215, 16%, 47%)" }));
  }, [invoices]);

  // Revenue by operator (top 6)
  const revenueByAirline = useMemo(() => {
    const map: Record<string, number> = {};
    invoices.filter(i => i.status === "Paid").forEach(i => { map[i.operator] = (map[i.operator] || 0) + (i.total || 0); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([airline, revenue]) => ({ airline, revenue }));
  }, [invoices]);

  // Monthly revenue (last 6 months)
  const monthlyRevenue = useMemo(() => {
    const months: Record<string, { revenue: number; expenses: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("en", { month: "short" });
      months[key] = { revenue: 0, expenses: 0 };
    }
    invoices.forEach(i => {
      const key = i.date?.slice(0, 7);
      if (months[key]) months[key].revenue += i.total || 0;
    });
    vendorInvoices.forEach(v => {
      const key = v.date?.slice(0, 7);
      if (months[key]) months[key].expenses += v.total || 0;
    });
    return Object.entries(months).map(([key, val]) => {
      const d = new Date(key + "-01");
      return { month: d.toLocaleString("en", { month: "short" }), ...val };
    });
  }, [invoices, vendorInvoices]);

  // Recent invoices (top 6)
  const recentInvoices = invoices.slice(0, 6);

  const invoiceStatusColor: Record<string, string> = {
    "Paid": "bg-success/15 text-success",
    "Sent": "bg-info/15 text-info",
    "Overdue": "bg-destructive/15 text-destructive",
    "Draft": "bg-muted text-muted-foreground",
    "Cancelled": "bg-warning/15 text-warning",
  };

  const quickLinks = [
    { label: "Invoices", icon: <FileText size={16} />, path: "/invoices", color: "bg-primary" },
    { label: "Chart of Accounts", icon: <BookOpen size={16} />, path: "/chart-of-accounts", color: "bg-info" },
    { label: "Journal Entries", icon: <Receipt size={16} />, path: "/journal-entries", color: "bg-warning" },
    { label: "Aging Reports", icon: <AlertTriangle size={16} />, path: "/aging-reports", color: "bg-destructive" },
    { label: "Financial Reports", icon: <TrendingUp size={16} />, path: "/financial-reports", color: "bg-success" },
    { label: "Vendor Invoices", icon: <Building2 size={16} />, path: "/vendor-invoices", color: "bg-accent" },
  ];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map(s => (
          <button key={s.label} onClick={() => navigate(s.link)} className="stat-card flex-col items-start gap-3 text-left hover:shadow-md transition-shadow cursor-pointer">
            <div className={`stat-card-icon ${s.color}`}>{s.icon}</div>
            <div>
              <div className="text-2xl font-bold text-foreground">{s.value}</div>
              <div className="text-xs font-semibold text-foreground mt-0.5">{s.label}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{s.sub}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-card rounded-lg border p-4">
          <h3 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
            <TrendingUp size={14} className="text-accent" /> Revenue vs Expenses
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`$${v.toLocaleString()}`, ""]} />
              <Line type="monotone" dataKey="revenue" stroke="hsl(var(--success))" strokeWidth={2.5} dot={{ fill: "hsl(var(--success))", r: 4 }} name="Revenue" />
              <Line type="monotone" dataKey="expenses" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ fill: "hsl(var(--destructive))", r: 3 }} name="Expenses" strokeDasharray="5 5" />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-lg border p-4">
          <h3 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
            <FileText size={14} className="text-primary" /> Invoice Status
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={invoiceStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={35} strokeWidth={2} stroke="hsl(var(--card))">
                {invoiceStatusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-lg border p-4">
          <h3 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
            <Building2 size={14} className="text-info" /> Revenue by Airline
          </h3>
          {revenueByAirline.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={revenueByAirline} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} />
                <YAxis type="category" dataKey="airline" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={70} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[180px] text-muted-foreground text-sm">No paid invoices yet</div>
          )}
        </div>
      </div>

      {/* Invoices Table + Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-card rounded-lg border">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-foreground flex items-center gap-2"><FileText size={16} className="text-primary" /> Recent Invoices</h2>
            <button onClick={() => navigate("/invoices")} className="text-xs text-primary hover:underline flex items-center gap-1">View all <ArrowRight size={12} /></button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {["INVOICE", "OPERATOR", "AMOUNT", "DATE", "TYPE", "STATUS"].map(h => (
                    <th key={h} className="data-table-header px-4 py-2.5 text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentInvoices.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No invoices yet</td></tr>
                ) : recentInvoices.map(inv => (
                  <tr key={inv.id} className="data-table-row cursor-pointer" onClick={() => navigate("/invoices")}>
                    <td className="px-4 py-2.5 font-semibold text-foreground">{inv.invoice_no}</td>
                    <td className="px-4 py-2.5 text-foreground">{inv.operator}</td>
                    <td className="px-4 py-2.5 font-semibold text-foreground">${(inv.total || 0).toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{inv.date}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${inv.invoice_type === "Final" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>
                        {inv.invoice_type || "Preliminary"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${invoiceStatusColor[inv.status] || ""}`}>{inv.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-card rounded-lg border">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-foreground flex items-center gap-2"><DollarSign size={16} className="text-primary" /> Quick Actions</h2>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            {quickLinks.map(ql => (
              <button key={ql.label} onClick={() => navigate(ql.path)} className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg text-white font-semibold text-xs transition-opacity hover:opacity-90 ${ql.color}`}>
                {ql.icon}
                {ql.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
