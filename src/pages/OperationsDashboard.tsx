import { useNavigate } from "react-router-dom";
import {
  Plane, Building2, CheckCircle2, XCircle, Timer, Clock,
  ArrowRight, AlertTriangle, Users, Globe, FileBarChart2
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const stats = [
  { label: "Total Flights Today", value: "24", sub: "+3 from yesterday", icon: <Plane size={20} />, color: "bg-primary", link: "/flight-schedule" },
  { label: "Active Airlines", value: "8", sub: "4 scheduled today", icon: <Building2 size={20} />, color: "bg-info", link: "/airlines" },
  { label: "On-Time Departures", value: "18", sub: "75% on-time rate", icon: <CheckCircle2 size={20} />, color: "bg-success", link: "/flight-schedule" },
  { label: "Delayed Flights", value: "4", sub: "2 critical delays", icon: <Timer size={20} />, color: "bg-warning", link: "/delay-codes" },
  { label: "Cancellations", value: "2", sub: "WX + OPS reasons", icon: <XCircle size={20} />, color: "bg-destructive", link: "/flight-schedule" },
  { label: "Total Passengers", value: "4,180", sub: "Across all flights", icon: <Users size={20} />, color: "bg-accent", link: "/airlines" },
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

const weeklyFlights = [
  { day: "Mon", flights: 22, onTime: 18 },
  { day: "Tue", flights: 19, onTime: 16 },
  { day: "Wed", flights: 25, onTime: 21 },
  { day: "Thu", flights: 20, onTime: 17 },
  { day: "Fri", flights: 28, onTime: 24 },
  { day: "Sat", flights: 31, onTime: 27 },
  { day: "Sun", flights: 24, onTime: 18 },
];

const flightStatusData = [
  { name: "On Time", value: 18, fill: "hsl(152, 60%, 45%)" },
  { name: "Delayed", value: 4, fill: "hsl(38, 92%, 50%)" },
  { name: "Cancelled", value: 2, fill: "hsl(0, 84%, 60%)" },
];

const delayBreakdown = [
  { code: "WX", reason: "Weather", count: 2, avgMin: 45 },
  { code: "RL", reason: "Reactionary / Late Arrival", count: 3, avgMin: 30 },
  { code: "TA", reason: "Technical / Aircraft", count: 1, avgMin: 90 },
  { code: "OA", reason: "Ops / ATC", count: 2, avgMin: 25 },
];

const flightTypeData = [
  { name: "Turn Around", value: 12, fill: "hsl(243, 55%, 25%)" },
  { name: "Transit", value: 6, fill: "hsl(210, 80%, 55%)" },
  { name: "Night Stop", value: 4, fill: "hsl(152, 60%, 45%)" },
  { name: "Charter", value: 2, fill: "hsl(38, 92%, 50%)" },
];

const quickLinks = [
  { label: "Flight Schedule", icon: <Plane size={16} />, path: "/flight-schedule", color: "bg-primary" },
  { label: "Overfly Schedule", icon: <Globe size={16} />, path: "/overfly-schedule", color: "bg-info" },
  { label: "Delay Codes", icon: <Clock size={16} />, path: "/delay-codes", color: "bg-warning" },
  { label: "Service Report", icon: <FileBarChart2 size={16} />, path: "/service-report", color: "bg-success" },
  { label: "Airlines", icon: <Users size={16} />, path: "/airlines", color: "bg-accent" },
  { label: "Staff Roster", icon: <Users size={16} />, path: "/staff-roster", color: "bg-destructive" },
];

const statusColor: Record<string, string> = {
  "Departed": "bg-success/15 text-success",
  "On Time": "bg-info/15 text-info",
  "Delayed": "bg-warning/15 text-warning",
  "Scheduled": "bg-muted text-muted-foreground",
  "Cancelled": "bg-destructive/15 text-destructive",
};

export default function OperationsDashboard() {
  const navigate = useNavigate();

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
        {/* Weekly Flights */}
        <div className="bg-card rounded-lg border p-4">
          <h3 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
            <Plane size={14} className="text-primary" /> Weekly Flights
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weeklyFlights}>
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="flights" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Total" />
              <Bar dataKey="onTime" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="On Time" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Flight Status Pie */}
        <div className="bg-card rounded-lg border p-4">
          <h3 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
            <Timer size={14} className="text-warning" /> Flight Status (Today)
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={flightStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={35} strokeWidth={2} stroke="hsl(var(--card))">
                {flightStatusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Flight Type Distribution */}
        <div className="bg-card rounded-lg border p-4">
          <h3 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
            <Plane size={14} className="text-info" /> Flight Types
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={flightTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={35} strokeWidth={2} stroke="hsl(var(--card))">
                {flightTypeData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Flights Table + Airline Activity + Delays */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Flights */}
        <div className="lg:col-span-2 bg-card rounded-lg border">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-foreground flex items-center gap-2"><Plane size={16} className="text-primary" /> Recent Flights</h2>
            <button onClick={() => navigate("/flight-schedule")} className="text-xs text-primary hover:underline flex items-center gap-1">View all <ArrowRight size={12} /></button>
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
                  <tr key={f.flight} className="data-table-row cursor-pointer" onClick={() => navigate("/flight-schedule")}>
                    <td className="px-4 py-2.5 font-semibold text-foreground">{f.flight}</td>
                    <td className="px-4 py-2.5 text-foreground">{f.operator}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{f.route}</td>
                    <td className="px-4 py-2.5 text-foreground">{f.sta}</td>
                    <td className="px-4 py-2.5 text-foreground">{f.atd}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{f.type}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor[f.status] || ""}`}>{f.status}</span>
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
            <button onClick={() => navigate("/airlines")} className="text-xs text-primary hover:underline flex items-center gap-1">View all <ArrowRight size={12} /></button>
          </div>
          <div className="divide-y">
            {airlineActivity.map(a => (
              <button key={a.name} onClick={() => navigate("/airlines")} className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">{a.iata}</div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-foreground">{a.name}</div>
                    <div className="text-xs text-muted-foreground">{a.flights} flights · {a.pax.toLocaleString()} pax</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-success/15 text-success">{a.status}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Delay Breakdown + Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-card rounded-lg border">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-foreground flex items-center gap-2"><AlertTriangle size={16} className="text-warning" /> Delay Breakdown (Today)</h2>
            <button onClick={() => navigate("/delay-codes")} className="text-xs text-primary hover:underline flex items-center gap-1">View all <ArrowRight size={12} /></button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {["CODE", "REASON", "OCCURRENCES", "AVG DELAY (MIN)"].map(h => (
                    <th key={h} className="data-table-header px-4 py-2.5 text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {delayBreakdown.map(d => (
                  <tr key={d.code} className="data-table-row">
                    <td className="px-4 py-2.5 font-semibold text-foreground">{d.code}</td>
                    <td className="px-4 py-2.5 text-foreground">{d.reason}</td>
                    <td className="px-4 py-2.5 text-foreground">{d.count}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${d.avgMin >= 60 ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning"}`}>{d.avgMin} min</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-card rounded-lg border">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-foreground flex items-center gap-2"><Plane size={16} className="text-primary" /> Quick Actions</h2>
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
