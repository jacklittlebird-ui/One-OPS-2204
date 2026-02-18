import { useNavigate } from "react-router-dom";
import {
  Plane, Building2, Clock, AlertTriangle, TrendingUp, DollarSign,
  FileBarChart2, CalendarDays, Users, Fuel, Shield, Crown,
  ArrowRight, CheckCircle2, XCircle, Timer
} from "lucide-react";

// Sample summary data
const stats = [
  { label: "Total Flights Today", value: "24", sub: "+3 from yesterday", icon: <Plane size={20} />, color: "bg-primary" },
  { label: "Active Airlines", value: "8", sub: "4 scheduled today", icon: <Building2 size={20} />, color: "bg-info" },
  { label: "On-Time Departures", value: "18", sub: "75% on-time rate", icon: <CheckCircle2 size={20} />, color: "bg-success" },
  { label: "Delayed Flights", value: "4", sub: "2 critical delays", icon: <Timer size={20} />, color: "bg-warning" },
  { label: "Cancellations", value: "2", sub: "WX + OPS reasons", icon: <XCircle size={20} />, color: "bg-destructive" },
  { label: "Revenue (Today)", value: "$142K", sub: "Airport charges + services", icon: <DollarSign size={20} />, color: "bg-accent" },
];

const recentFlights = [
  { flight: "SM123", operator: "Air Cairo", route: "AMS → CAI", sta: "10:00", atd: "12:10", status: "Departed", type: "Turn Around" },
  { flight: "MS456", operator: "EgyptAir", route: "LHR → HRG", sta: "13:30", atd: "14:00", status: "On Time", type: "Transit" },
  { flight: "XY789", operator: "Nile Air", route: "DXB → SSH", sta: "15:00", atd: "—", status: "Delayed", type: "Night Stop" },
  { flight: "AF200", operator: "Air France", route: "CDG → CAI", sta: "16:45", atd: "—", status: "On Time", type: "Turn Around" },
  { flight: "LH301", operator: "Lufthansa", route: "FRA → LXR", sta: "18:00", atd: "—", status: "Scheduled", type: "Turn Around" },
  { flight: "EK502", operator: "Emirates", route: "DXB → CAI", sta: "20:15", atd: "—", status: "Scheduled", type: "Transit" },
];

const airlineActivity = [
  { name: "Air Cairo", iata: "SM", flights: 6, pax: 1240, status: "Active" },
  { name: "EgyptAir", iata: "MS", flights: 4, pax: 890, status: "Active" },
  { name: "Nile Air", iata: "XY", flights: 3, pax: 540, status: "Active" },
  { name: "Air France", iata: "AF", flights: 2, pax: 420, status: "Active" },
  { name: "Lufthansa", iata: "LH", flights: 2, pax: 380, status: "Active" },
  { name: "Emirates", iata: "EK", flights: 3, pax: 710, status: "Active" },
];

const revenueByService = [
  { service: "Airport Charges", amount: 54200, icon: <Building2 size={14} />, color: "bg-primary" },
  { service: "Handling Services", amount: 32800, icon: <Plane size={14} />, color: "bg-info" },
  { service: "Fuel Services", amount: 28500, icon: <Fuel size={14} />, color: "bg-warning" },
  { service: "Civil Aviation", amount: 15600, icon: <CalendarDays size={14} />, color: "bg-success" },
  { service: "Security", amount: 6900, icon: <Shield size={14} />, color: "bg-accent" },
  { service: "VIP Services", amount: 4000, icon: <Crown size={14} />, color: "bg-destructive" },
];

const quickLinks = [
  { label: "Add Flight", icon: <Plane size={16} />, path: "/flight-schedule", color: "bg-primary" },
  { label: "Airport Charges", icon: <Building2 size={16} />, path: "/airport-charges", color: "bg-info" },
  { label: "Service Report", icon: <FileBarChart2 size={16} />, path: "/service-report", color: "bg-success" },
  { label: "Airlines", icon: <Users size={16} />, path: "/airlines", color: "bg-warning" },
  { label: "Aircrafts", icon: <Plane size={16} />, path: "/aircrafts", color: "bg-accent" },
  { label: "Chart of Services", icon: <DollarSign size={16} />, path: "/services", color: "bg-destructive" },
];

const statusColor: Record<string, string> = {
  "Departed":  "bg-success/15 text-success",
  "On Time":   "bg-info/15 text-info",
  "Delayed":   "bg-warning/15 text-warning",
  "Scheduled": "bg-muted text-muted-foreground",
  "Cancelled": "bg-destructive/15 text-destructive",
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const totalRevenue = revenueByService.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Operations overview · {new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map(s => (
          <div key={s.label} className="stat-card flex-col items-start gap-3">
            <div className={`stat-card-icon ${s.color}`}>{s.icon}</div>
            <div>
              <div className="text-2xl font-bold text-foreground">{s.value}</div>
              <div className="text-xs font-semibold text-foreground mt-0.5">{s.label}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main grid: Recent Flights + Airline Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Flights */}
        <div className="lg:col-span-2 bg-card rounded-lg border">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-foreground flex items-center gap-2"><Plane size={16} className="text-primary" /> Recent Flights</h2>
            <button onClick={() => navigate("/flight-schedule")} className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {["FLIGHT", "OPERATOR", "ROUTE", "STA", "ATD", "TYPE", "STATUS"].map(h => (
                    <th key={h} className="data-table-header px-4 py-2.5 text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentFlights.map(f => (
                  <tr key={f.flight} className="data-table-row">
                    <td className="px-4 py-2.5 font-semibold text-foreground">{f.flight}</td>
                    <td className="px-4 py-2.5 text-foreground">{f.operator}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{f.route}</td>
                    <td className="px-4 py-2.5 text-foreground">{f.sta}</td>
                    <td className="px-4 py-2.5 text-foreground">{f.atd}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{f.type}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor[f.status] || ""}`}>
                        {f.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Airline Activity */}
        <div className="bg-card rounded-lg border">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-foreground flex items-center gap-2"><Building2 size={16} className="text-info" /> Airline Activity</h2>
            <button onClick={() => navigate("/airlines")} className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="divide-y">
            {airlineActivity.map(a => (
              <div key={a.name} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">{a.iata}</div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{a.name}</div>
                    <div className="text-xs text-muted-foreground">{a.flights} flights · {a.pax.toLocaleString()} pax</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-success/15 text-success">{a.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue + Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Revenue Breakdown */}
        <div className="lg:col-span-2 bg-card rounded-lg border">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-foreground flex items-center gap-2"><TrendingUp size={16} className="text-accent" /> Revenue Breakdown (Today)</h2>
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

        {/* Quick Links */}
        <div className="bg-card rounded-lg border">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-foreground flex items-center gap-2"><AlertTriangle size={16} className="text-warning" /> Quick Actions</h2>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            {quickLinks.map(ql => (
              <button
                key={ql.label}
                onClick={() => navigate(ql.path)}
                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg text-white font-semibold text-xs transition-opacity hover:opacity-90 ${ql.color}`}
              >
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
