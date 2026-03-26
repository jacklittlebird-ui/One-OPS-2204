import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Plane, Building2, CheckCircle2, XCircle, Timer, Clock,
  ArrowRight, AlertTriangle, Users, Globe, FileBarChart2
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

type FlightRow = { id: string; flight_no: string; airline: string; origin: string; destination: string; arrival: string; departure: string; status: string; flight_type: string; aircraft: string; terminal: string; };
type ServiceReportRow = { id: string; operator: string; flight_no: string; handling_type: string; arrival_date: string | null; total_cost: number; pax_in_adult_i: number; pax_in_adult_d: number; pax_in_inf_i: number; pax_in_inf_d: number; pax_transit: number; };

export default function OperationsDashboard() {
  const navigate = useNavigate();

  const { data: flights = [] } = useQuery({
    queryKey: ["flight_schedules"],
    queryFn: async () => { const { data } = await supabase.from("flight_schedules").select("*").order("departure", { ascending: true }); return (data || []) as FlightRow[]; },
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["service_reports_dash"],
    queryFn: async () => { const { data } = await supabase.from("service_reports").select("id,operator,flight_no,handling_type,arrival_date,total_cost,pax_in_adult_i,pax_in_adult_d,pax_in_inf_i,pax_in_inf_d,pax_transit").order("created_at", { ascending: false }).limit(100); return (data || []) as ServiceReportRow[]; },
  });

  const totalFlights = flights.length;
  const scheduled = flights.filter(f => f.status === "Scheduled").length;
  const completed = flights.filter(f => f.status === "Completed").length;
  const delayed = flights.filter(f => f.status === "Delayed").length;
  const cancelled = flights.filter(f => f.status === "Cancelled").length;
  const uniqueAirlines = new Set(flights.map(f => f.airline)).size;
  const totalPax = reports.reduce((s, r) => s + (r.pax_in_adult_i || 0) + (r.pax_in_adult_d || 0) + (r.pax_in_inf_i || 0) + (r.pax_in_inf_d || 0) + (r.pax_transit || 0), 0);

  const stats = [
    { label: "Total Flights", value: String(totalFlights), sub: "In schedule", icon: <Plane size={20} />, color: "bg-primary", link: "/flight-schedule" },
    { label: "Active Airlines", value: String(uniqueAirlines), sub: "Unique operators", icon: <Building2 size={20} />, color: "bg-info", link: "/airlines" },
    { label: "Completed", value: String(completed), sub: `${totalFlights > 0 ? Math.round(completed / totalFlights * 100) : 0}% rate`, icon: <CheckCircle2 size={20} />, color: "bg-success", link: "/flight-schedule" },
    { label: "Delayed", value: String(delayed), sub: `${totalFlights > 0 ? Math.round(delayed / totalFlights * 100) : 0}% of flights`, icon: <Timer size={20} />, color: "bg-warning", link: "/delay-codes" },
    { label: "Cancelled", value: String(cancelled), sub: "flights", icon: <XCircle size={20} />, color: "bg-destructive", link: "/flight-schedule" },
    { label: "Total PAX", value: totalPax.toLocaleString(), sub: "From service reports", icon: <Users size={20} />, color: "bg-accent", link: "/service-report" },
  ];

  const flightStatusData = useMemo(() => {
    const colors: Record<string, string> = { Scheduled: "hsl(210, 80%, 55%)", Completed: "hsl(152, 60%, 45%)", Delayed: "hsl(38, 92%, 50%)", Cancelled: "hsl(0, 84%, 60%)" };
    return ["Scheduled", "Completed", "Delayed", "Cancelled"]
      .map(s => ({ name: s, value: flights.filter(f => f.status === s).length, fill: colors[s] }))
      .filter(s => s.value > 0);
  }, [flights]);

  const flightTypeData = useMemo(() => {
    const typeCounts: Record<string, number> = {};
    flights.forEach(f => { const t = f.flight_type || "Scheduled"; typeCounts[t] = (typeCounts[t] || 0) + 1; });
    const fills = ["hsl(243, 55%, 45%)", "hsl(210, 80%, 55%)", "hsl(152, 60%, 45%)", "hsl(38, 92%, 50%)", "hsl(0, 84%, 60%)"];
    return Object.entries(typeCounts).slice(0, 5).map(([name, value], i) => ({ name, value, fill: fills[i % fills.length] }));
  }, [flights]);

  // Top airlines by flight count
  const airlineActivity = useMemo(() => {
    const map: Record<string, { flights: number; pax: number }> = {};
    flights.forEach(f => {
      if (!map[f.airline]) map[f.airline] = { flights: 0, pax: 0 };
      map[f.airline].flights++;
    });
    reports.forEach(r => {
      if (map[r.operator]) {
        map[r.operator].pax += (r.pax_in_adult_i || 0) + (r.pax_in_adult_d || 0);
      }
    });
    return Object.entries(map).sort((a, b) => b[1].flights - a[1].flights).slice(0, 6)
      .map(([name, v]) => ({ name, ...v }));
  }, [flights, reports]);

  // Handling type distribution from service reports
  const handlingTypeData = useMemo(() => {
    const counts: Record<string, number> = {};
    reports.forEach(r => { counts[r.handling_type] = (counts[r.handling_type] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, flights]) => ({ name, flights }));
  }, [reports]);

  const recentFlights = flights.slice(0, 6);

  const statusColor: Record<string, string> = {
    "Completed": "bg-success/15 text-success",
    "Scheduled": "bg-muted text-muted-foreground",
    "Delayed": "bg-warning/15 text-warning",
    "Cancelled": "bg-destructive/15 text-destructive",
  };

  const quickLinks = [
    { label: "Flight Schedule", icon: <Plane size={16} />, path: "/flight-schedule", color: "bg-primary" },
    { label: "Overfly Schedule", icon: <Globe size={16} />, path: "/overfly-schedule", color: "bg-info" },
    { label: "Delay Codes", icon: <Clock size={16} />, path: "/delay-codes", color: "bg-warning" },
    { label: "Service Report", icon: <FileBarChart2 size={16} />, path: "/service-report", color: "bg-success" },
    { label: "Airlines", icon: <Users size={16} />, path: "/airlines", color: "bg-accent" },
    { label: "Staff Roster", icon: <Users size={16} />, path: "/staff-roster", color: "bg-destructive" },
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
        {/* Handling Type Distribution */}
        <div className="bg-card rounded-lg border p-4">
          <h3 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
            <FileBarChart2 size={14} className="text-primary" /> Service Reports by Type
          </h3>
          {handlingTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={handlingTypeData}>
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} angle={-20} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="flights" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Reports" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[180px] text-muted-foreground text-sm">No service reports yet</div>
          )}
        </div>

        {/* Flight Status Pie */}
        <div className="bg-card rounded-lg border p-4">
          <h3 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
            <Timer size={14} className="text-warning" /> Flight Status
          </h3>
          {flightStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={flightStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={35} strokeWidth={2} stroke="hsl(var(--card))">
                  {flightStatusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[180px] text-muted-foreground text-sm">No flights yet</div>
          )}
        </div>

        {/* Flight Type Distribution */}
        <div className="bg-card rounded-lg border p-4">
          <h3 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
            <Plane size={14} className="text-info" /> Flight Types
          </h3>
          {flightTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={flightTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={35} strokeWidth={2} stroke="hsl(var(--card))">
                  {flightTypeData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[180px] text-muted-foreground text-sm">No data</div>
          )}
        </div>
      </div>

      {/* Flights Table + Airline Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-card rounded-lg border">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-foreground flex items-center gap-2"><Plane size={16} className="text-primary" /> Recent Flights</h2>
            <button onClick={() => navigate("/flight-schedule")} className="text-xs text-primary hover:underline flex items-center gap-1">View all <ArrowRight size={12} /></button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {["FLIGHT", "AIRLINE", "ROUTE", "DEP", "ARR", "TYPE", "STATUS"].map(h => (
                    <th key={h} className="data-table-header px-4 py-2.5 text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentFlights.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No flights in schedule</td></tr>
                ) : recentFlights.map(f => (
                  <tr key={f.id} className="data-table-row cursor-pointer" onClick={() => navigate("/flight-schedule")}>
                    <td className="px-4 py-2.5 font-semibold text-foreground">{f.flight_no}</td>
                    <td className="px-4 py-2.5 text-foreground">{f.airline}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{f.origin} → {f.destination}</td>
                    <td className="px-4 py-2.5 text-foreground">{f.departure}</td>
                    <td className="px-4 py-2.5 text-foreground">{f.arrival}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{f.flight_type || "Scheduled"}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor[f.status] || "bg-muted text-muted-foreground"}`}>{f.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-card rounded-lg border">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-foreground flex items-center gap-2"><Building2 size={16} className="text-info" /> Top Airlines</h2>
            <button onClick={() => navigate("/airlines")} className="text-xs text-primary hover:underline flex items-center gap-1">View all <ArrowRight size={12} /></button>
          </div>
          <div className="divide-y">
            {airlineActivity.length === 0 ? (
              <div className="px-4 py-8 text-center text-muted-foreground text-sm">No airline data</div>
            ) : airlineActivity.map(a => (
              <button key={a.name} onClick={() => navigate("/airlines")} className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">{a.name.slice(0, 2).toUpperCase()}</div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-foreground">{a.name}</div>
                    <div className="text-xs text-muted-foreground">{a.flights} flights · {a.pax.toLocaleString()} pax</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-card rounded-lg border">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-foreground flex items-center gap-2"><Plane size={16} className="text-primary" /> Quick Actions</h2>
        </div>
        <div className="p-4 grid grid-cols-3 lg:grid-cols-6 gap-3">
          {quickLinks.map(ql => (
            <button key={ql.label} onClick={() => navigate(ql.path)} className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg text-white font-semibold text-xs transition-opacity hover:opacity-90 ${ql.color}`}>
              {ql.icon}
              {ql.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
