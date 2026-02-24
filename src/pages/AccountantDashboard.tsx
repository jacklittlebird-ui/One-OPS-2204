import { useNavigate } from "react-router-dom";
import {
  DollarSign, TrendingUp, FileText, Receipt, Building2, Plane,
  Fuel, CalendarDays, Shield, Crown, ArrowRight, CheckCircle2, Clock,
  AlertTriangle
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from "recharts";

const stats = [
  { label: "Revenue (Today)", value: "$142K", sub: "All services combined", icon: <DollarSign size={20} />, color: "bg-primary", link: "/invoices" },
  { label: "Paid Invoices", value: "38", sub: "This month", icon: <CheckCircle2 size={20} />, color: "bg-success", link: "/invoices" },
  { label: "Pending Invoices", value: "12", sub: "$86K outstanding", icon: <Clock size={20} />, color: "bg-warning", link: "/invoices" },
  { label: "Overdue Invoices", value: "3", sub: "$24K past due", icon: <AlertTriangle size={20} />, color: "bg-destructive", link: "/invoices" },
  { label: "Airport Tax Collected", value: "$18.5K", sub: "+12% vs last month", icon: <Building2 size={20} />, color: "bg-info", link: "/airport-tax" },
  { label: "Contracts Active", value: "14", sub: "2 expiring soon", icon: <FileText size={20} />, color: "bg-accent", link: "/contracts" },
];

const revenueByService = [
  { service: "Airport Charges", amount: 54200, icon: <Building2 size={14} />, color: "bg-primary" },
  { service: "Handling Services", amount: 32800, icon: <Plane size={14} />, color: "bg-info" },
  { service: "Fuel Services", amount: 28500, icon: <Fuel size={14} />, color: "bg-warning" },
  { service: "Civil Aviation", amount: 15600, icon: <CalendarDays size={14} />, color: "bg-success" },
  { service: "Security", amount: 6900, icon: <Shield size={14} />, color: "bg-accent" },
  { service: "VIP Services", amount: 4000, icon: <Crown size={14} />, color: "bg-destructive" },
];

const monthlyRevenue = [
  { month: "Sep", revenue: 98000, expenses: 62000 },
  { month: "Oct", revenue: 115000, expenses: 71000 },
  { month: "Nov", revenue: 132000, expenses: 78000 },
  { month: "Dec", revenue: 145000, expenses: 85000 },
  { month: "Jan", revenue: 142000, expenses: 82000 },
  { month: "Feb", revenue: 158000, expenses: 88000 },
];

const revenueByAirline = [
  { airline: "Air Cairo", revenue: 42000 },
  { airline: "EgyptAir", revenue: 35000 },
  { airline: "Emirates", revenue: 28000 },
  { airline: "Nile Air", revenue: 18000 },
  { airline: "Lufthansa", revenue: 12000 },
  { airline: "Air France", revenue: 7000 },
];

const invoiceStatusData = [
  { name: "Paid", value: 38, fill: "hsl(152, 60%, 45%)" },
  { name: "Sent", value: 12, fill: "hsl(210, 80%, 55%)" },
  { name: "Overdue", value: 3, fill: "hsl(0, 84%, 60%)" },
  { name: "Draft", value: 5, fill: "hsl(215, 16%, 47%)" },
];

const recentInvoices = [
  { id: "INV-2024-041", airline: "Air Cairo", amount: 12400, status: "Paid", date: "Feb 22" },
  { id: "INV-2024-040", airline: "EgyptAir", amount: 8900, status: "Paid", date: "Feb 21" },
  { id: "INV-2024-039", airline: "Emirates", amount: 15200, status: "Sent", date: "Feb 20" },
  { id: "INV-2024-038", airline: "Nile Air", amount: 6300, status: "Overdue", date: "Feb 15" },
  { id: "INV-2024-037", airline: "Lufthansa", amount: 9800, status: "Sent", date: "Feb 18" },
  { id: "INV-2024-036", airline: "Air France", amount: 4200, status: "Draft", date: "Feb 22" },
];

const quickLinks = [
  { label: "Invoices", icon: <FileText size={16} />, path: "/invoices", color: "bg-primary" },
  { label: "Airport Charges", icon: <Building2 size={16} />, path: "/airport-charges", color: "bg-info" },
  { label: "Airport Tax", icon: <Receipt size={16} />, path: "/airport-tax", color: "bg-warning" },
  { label: "Services Cost", icon: <DollarSign size={16} />, path: "/services", color: "bg-success" },
  { label: "Contracts", icon: <FileText size={16} />, path: "/contracts", color: "bg-accent" },
  { label: "Basic Ramp", icon: <Plane size={16} />, path: "/basic-ramp", color: "bg-destructive" },
];

const invoiceStatusColor: Record<string, string> = {
  "Paid": "bg-success/15 text-success",
  "Sent": "bg-info/15 text-info",
  "Overdue": "bg-destructive/15 text-destructive",
  "Draft": "bg-muted text-muted-foreground",
};

export default function AccountantDashboard() {
  const navigate = useNavigate();
  const totalRevenue = revenueByService.reduce((s, r) => s + r.amount, 0);

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
        {/* Revenue vs Expenses */}
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

        {/* Invoice Status Pie */}
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

        {/* Revenue by Airline */}
        <div className="bg-card rounded-lg border p-4">
          <h3 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
            <Building2 size={14} className="text-info" /> Revenue by Airline
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={revenueByAirline} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} />
              <YAxis type="category" dataKey="airline" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={70} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]} />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Invoices Table + Revenue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Invoices */}
        <div className="lg:col-span-2 bg-card rounded-lg border">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-foreground flex items-center gap-2"><FileText size={16} className="text-primary" /> Recent Invoices</h2>
            <button onClick={() => navigate("/invoices")} className="text-xs text-primary hover:underline flex items-center gap-1">View all <ArrowRight size={12} /></button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {["INVOICE", "AIRLINE", "AMOUNT", "DATE", "STATUS"].map(h => (
                    <th key={h} className="data-table-header px-4 py-2.5 text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map(inv => (
                  <tr key={inv.id} className="data-table-row cursor-pointer" onClick={() => navigate("/invoices")}>
                    <td className="px-4 py-2.5 font-semibold text-foreground">{inv.id}</td>
                    <td className="px-4 py-2.5 text-foreground">{inv.airline}</td>
                    <td className="px-4 py-2.5 font-semibold text-foreground">${inv.amount.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{inv.date}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${invoiceStatusColor[inv.status] || ""}`}>{inv.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Revenue Breakdown */}
        <div className="bg-card rounded-lg border">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-foreground flex items-center gap-2"><TrendingUp size={16} className="text-accent" /> Revenue Breakdown</h2>
            <span className="text-sm font-bold text-foreground">${totalRevenue.toLocaleString()}</span>
          </div>
          <div className="p-4 space-y-3">
            {revenueByService.map(r => {
              const pct = Math.round((r.amount / totalRevenue) * 100);
              return (
                <div key={r.service}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <span className={`w-5 h-5 rounded flex items-center justify-center text-white ${r.color}`}>{r.icon}</span>
                      {r.service}
                    </div>
                    <div className="text-sm font-semibold text-foreground">${r.amount.toLocaleString()} <span className="text-muted-foreground font-normal text-xs">({pct}%)</span></div>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${r.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
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
