import { useState, useMemo, useCallback } from "react";
import {
  Building2, Plane, Plus, Search, Clock, Users, AlertTriangle,
  CheckCircle, X, Trash2, ChevronLeft, ChevronRight, Eye
} from "lucide-react";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type FlightRow = {
  id: string;
  flight_no: string;
  route: string;
  sta: string | null;
  std: string | null;
  status: string;
  clearance_type: string;
  airline_id: string | null;
  handling_agent: string;
  arrival_date: string | null;
  departure_date: string | null;
  aircraft_type: string;
  registration: string;
  authority: string;
};

type DispatchRow = {
  id: string;
  flight_schedule_id: string | null;
  contract_id: string | null;
  station: string;
  airline: string;
  flight_no: string;
  flight_date: string;
  service_type: string;
  staff_names: string;
  staff_count: number;
  scheduled_start: string;
  scheduled_end: string;
  actual_start: string;
  actual_end: string;
  contract_duration_hours: number;
  actual_duration_hours: number;
  overtime_hours: number;
  overtime_rate: number;
  base_fee: number;
  service_rate: number;
  overtime_charge: number;
  total_charge: number;
  status: string;
  notes: string;
  dispatched_by: string;
  created_at: string;
};

type ContractRow = {
  id: string;
  airline: string;
  stations: string | null;
  base_flat_fee: number;
  overtime_rate: number;
  default_team_size: string;
  service_scope: string;
  status: string;
};

type ServiceRateRow = {
  id: string;
  contract_id: string;
  service_type: string;
  rate: number;
  staff_count: number;
  duration_hours: number;
};

const STATIONS = [
  { code: "CAI", name: "Cairo International" },
  { code: "HRG", name: "Hurghada International" },
  { code: "SSH", name: "Sharm El Sheikh" },
];

const DISPATCH_STATUSES = ["Pending", "Dispatched", "In Progress", "Completed", "Cancelled"];
const SERVICE_TYPES = ["Arrival", "Departure", "Turnaround", "Maintenance", "ADHOC", "Transportation"];

const PAGE_SIZE = 15;

const statusColors: Record<string, string> = {
  Pending: "bg-warning/15 text-warning",
  Dispatched: "bg-info/15 text-info",
  "In Progress": "bg-primary/15 text-primary",
  Completed: "bg-success/15 text-success",
  Cancelled: "bg-muted text-muted-foreground",
};

const inputCls = "text-sm border rounded px-2 py-1.5 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground w-full";
const selectCls = "text-sm border rounded px-2 py-1.5 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full";

function calcDurationHours(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 1440;
  return Math.round((mins / 60) * 100) / 100;
}

export default function StationDispatchPage() {
  const { data: flights, isLoading: flightsLoading } = useSupabaseTable<FlightRow>("flight_schedules");
  const { data: dispatches, isLoading: dispLoading, add, update, remove, isAdding, isUpdating } = useSupabaseTable<DispatchRow>("dispatch_assignments");
  const { data: contracts } = useSupabaseTable<ContractRow>("contracts");
  const { data: serviceRates } = useSupabaseTable<ServiceRateRow>("contract_service_rates");
  const { data: airlines } = useSupabaseTable<{ id: string; name: string; iata_code: string }>("airlines");

  const [stationFilter, setStationFilter] = useState("CAI");
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<DispatchRow>>({});
  const [viewId, setViewId] = useState<string | null>(null);

  const airlineMap = useMemo(() => {
    const m: Record<string, { name: string; iata: string }> = {};
    airlines.forEach(a => { m[a.id] = { name: a.name, iata: a.iata_code }; });
    return m;
  }, [airlines]);

  // Find contract & rates for a given airline + station + service type
  const findContractRate = useCallback((airline: string, station: string, serviceType: string) => {
    const contract = contracts.find(c =>
      c.status === "Active" &&
      c.airline.toLowerCase() === airline.toLowerCase() &&
      (c.stations || "").toUpperCase().includes(station)
    );
    if (!contract) return null;
    const rate = serviceRates.find(r => r.contract_id === contract.id && r.service_type === serviceType);
    return { contract, rate };
  }, [contracts, serviceRates]);

  // Filtered dispatches
  const filtered = useMemo(() => {
    let r = dispatches.filter(d => d.station === stationFilter);
    if (dateFilter) r = r.filter(d => d.flight_date === dateFilter);
    if (search) {
      const s = search.toLowerCase();
      r = r.filter(d => d.flight_no.toLowerCase().includes(s) || d.airline.toLowerCase().includes(s) || d.staff_names.toLowerCase().includes(s));
    }
    return r;
  }, [dispatches, stationFilter, dateFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Station flights for the day (unassigned)
  const stationFlights = useMemo(() => {
    return flights.filter(f => {
      const routeMatch = (f.route || "").toUpperCase().includes(stationFilter);
      const authorityMatch = (f.authority || "").toUpperCase() === stationFilter;
      const stationMatch = routeMatch || authorityMatch;
      const dateMatch = f.arrival_date === dateFilter || f.departure_date === dateFilter;
      return stationMatch && dateMatch;
    });
  }, [flights, stationFilter, dateFilter]);

  const assignedFlightIds = useMemo(() => new Set(dispatches.filter(d => d.flight_schedule_id).map(d => d.flight_schedule_id)), [dispatches]);

  // Open form for a flight
  const openNewFromFlight = (flight: FlightRow) => {
    const airlineName = flight.airline_id ? airlineMap[flight.airline_id]?.name || "" : "";
    const sType = flight.clearance_type || "Arrival";
    const match = findContractRate(airlineName, stationFilter, sType);

    setFormData({
      flight_schedule_id: flight.id,
      station: stationFilter,
      airline: airlineName,
      flight_no: flight.flight_no,
      flight_date: dateFilter,
      service_type: sType,
      staff_names: "",
      staff_count: match?.rate?.staff_count || match?.contract?.default_team_size ? parseInt(match.contract.default_team_size) || 0 : 0,
      scheduled_start: flight.sta || "",
      scheduled_end: flight.std || "",
      actual_start: "",
      actual_end: "",
      contract_duration_hours: match?.rate?.duration_hours || 0,
      actual_duration_hours: 0,
      overtime_hours: 0,
      overtime_rate: match?.contract?.overtime_rate || 0,
      base_fee: match?.contract?.base_flat_fee || 0,
      service_rate: match?.rate?.rate || 0,
      overtime_charge: 0,
      total_charge: 0,
      status: "Pending",
      notes: "",
      dispatched_by: "",
      contract_id: match?.contract?.id || null,
    });
    setEditId(null);
    setShowForm(true);
  };

  const openNewManual = () => {
    setFormData({
      station: stationFilter,
      airline: "",
      flight_no: "",
      flight_date: dateFilter,
      service_type: "Arrival",
      staff_names: "",
      staff_count: 0,
      scheduled_start: "",
      scheduled_end: "",
      actual_start: "",
      actual_end: "",
      contract_duration_hours: 0,
      actual_duration_hours: 0,
      overtime_hours: 0,
      overtime_rate: 0,
      base_fee: 0,
      service_rate: 0,
      overtime_charge: 0,
      total_charge: 0,
      status: "Pending",
      notes: "",
      dispatched_by: "",
    });
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (d: DispatchRow) => {
    setFormData({ ...d });
    setEditId(d.id);
    setShowForm(true);
  };

  // Recalc charges when times change
  const updateFormField = (key: string, val: any) => {
    const updated = { ...formData, [key]: val };
    if (key === "actual_start" || key === "actual_end") {
      const actualHrs = calcDurationHours(updated.actual_start || "", updated.actual_end || "");
      const contractHrs = updated.contract_duration_hours || 0;
      const overtime = Math.max(0, actualHrs - contractHrs);
      const overtimeCharge = overtime * (updated.overtime_rate || 0) * (updated.staff_count || 1);
      const total = (updated.base_fee || 0) + (updated.service_rate || 0) + overtimeCharge;
      updated.actual_duration_hours = actualHrs;
      updated.overtime_hours = overtime;
      updated.overtime_charge = Math.round(overtimeCharge * 100) / 100;
      updated.total_charge = Math.round(total * 100) / 100;
    }
    setFormData(updated);
  };

  const saveForm = async () => {
    if (!formData.flight_no) return;
    if (editId) {
      const { id, created_at, ...rest } = formData as any;
      await update({ id: editId, ...rest });
    } else {
      await add(formData as any);
    }
    setShowForm(false);
    setEditId(null);
  };

  const isLoading = flightsLoading || dispLoading;
  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  // KPIs
  const todayDispatches = dispatches.filter(d => d.flight_date === dateFilter && d.station === stationFilter);
  const completedCount = todayDispatches.filter(d => d.status === "Completed").length;
  const overtimeTotal = todayDispatches.reduce((s, d) => s + (d.overtime_hours || 0), 0);
  const revenueTotal = todayDispatches.reduce((s, d) => s + (d.total_charge || 0), 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
          <Building2 size={22} className="text-primary" /> Station Dispatch
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Assign staff to flights, log service times & track overtime</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="stat-card"><div className="stat-card-icon bg-primary"><Plane size={20} /></div><div><div className="text-xl font-bold text-foreground">{todayDispatches.length}</div><div className="text-xs text-muted-foreground">Dispatched Today</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-success"><CheckCircle size={20} /></div><div><div className="text-xl font-bold text-foreground">{completedCount}</div><div className="text-xs text-muted-foreground">Completed</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-warning"><AlertTriangle size={20} /></div><div><div className="text-xl font-bold text-foreground">{overtimeTotal.toFixed(1)}h</div><div className="text-xs text-muted-foreground">Overtime Hours</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-info"><Users size={20} /></div><div><div className="text-xl font-bold text-foreground">{stationFlights.length - [...assignedFlightIds].filter(id => dispatches.find(d => d.flight_schedule_id === id)?.station === stationFilter).length}</div><div className="text-xs text-muted-foreground">Unassigned Flights</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-muted"><Clock size={20} /></div><div><div className="text-xl font-bold text-foreground">${revenueTotal.toLocaleString()}</div><div className="text-xs text-muted-foreground">Today's Charges</div></div></div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={stationFilter} onChange={e => { setStationFilter(e.target.value); setPage(1); }} className={selectCls + " w-40"}>
          {STATIONS.map(s => <option key={s.code} value={s.code}>{s.code} — {s.name}</option>)}
        </select>
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className={inputCls + " w-40"} />
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-8 pr-3 py-1.5 text-sm border rounded bg-card text-foreground placeholder:text-muted-foreground w-48 focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <button onClick={openNewManual} className="toolbar-btn-primary ml-auto"><Plus size={14} /> New Dispatch</button>
      </div>

      <Tabs defaultValue="dispatches">
        <TabsList>
          <TabsTrigger value="dispatches">Dispatch Log ({filtered.length})</TabsTrigger>
          <TabsTrigger value="flights">Station Flights ({stationFlights.length})</TabsTrigger>
        </TabsList>

        {/* Dispatch Log */}
        <TabsContent value="dispatches">
          <div className="bg-card rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr>{["#","FLIGHT","AIRLINE","TYPE","STAFF","SCHED TIME","ACTUAL TIME","DURATION","OT HRS","CHARGE","STATUS","ACTIONS"].map(h =>
                  <th key={h} className="data-table-header px-3 py-3 text-left whitespace-nowrap">{h}</th>
                )}</tr></thead>
                <tbody>
                  {pageData.length === 0 ? (
                    <tr><td colSpan={12} className="text-center py-16 text-muted-foreground">No dispatches found for this date/station</td></tr>
                  ) : pageData.map((d, i) => (
                    <tr key={d.id} className="data-table-row">
                      <td className="px-3 py-2.5 text-muted-foreground text-xs">{(page - 1) * PAGE_SIZE + i + 1}</td>
                      <td className="px-3 py-2.5 font-semibold text-foreground">{d.flight_no}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{d.airline}</td>
                      <td className="px-3 py-2.5 text-xs">{d.service_type}</td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs font-mono">{d.staff_count} staff</span>
                        {d.staff_names && <div className="text-xs text-muted-foreground truncate max-w-[120px]">{d.staff_names}</div>}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{d.scheduled_start}–{d.scheduled_end}</td>
                      <td className="px-3 py-2.5 font-mono text-xs">{d.actual_start && d.actual_end ? `${d.actual_start}–${d.actual_end}` : "—"}</td>
                      <td className="px-3 py-2.5 text-xs">{d.actual_duration_hours ? `${d.actual_duration_hours}h` : "—"}</td>
                      <td className="px-3 py-2.5">
                        {d.overtime_hours > 0 ? <span className="text-warning font-semibold text-xs">{d.overtime_hours}h</span> : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-success text-xs">${d.total_charge}</td>
                      <td className="px-3 py-2.5"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[d.status] || ""}`}>{d.status}</span></td>
                      <td className="px-3 py-2.5 flex gap-1.5">
                        <button onClick={() => openEdit(d)} className="text-info hover:text-info/80" title="Edit"><Eye size={13} /></button>
                        <button onClick={() => remove(d.id)} className="text-destructive hover:text-destructive/80" title="Delete"><Trash2 size={13} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length > PAGE_SIZE && (
              <div className="p-3 border-t flex items-center justify-between text-sm text-muted-foreground">
                <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
                <div className="flex items-center gap-2">
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded border hover:bg-muted disabled:opacity-40"><ChevronLeft size={14} /></button>
                  <span className="text-foreground font-medium">Page {page}/{totalPages}</span>
                  <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded border hover:bg-muted disabled:opacity-40"><ChevronRight size={14} /></button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Station Flights (assign from here) */}
        <TabsContent value="flights">
          <div className="bg-card rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr>{["FLIGHT","TYPE","ROUTE","STA","STD","A/C TYPE","REG","STATUS","ASSIGN"].map(h =>
                  <th key={h} className="data-table-header px-3 py-3 text-left whitespace-nowrap">{h}</th>
                )}</tr></thead>
                <tbody>
                  {stationFlights.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-16 text-muted-foreground">No flights at this station for the selected date</td></tr>
                  ) : stationFlights.map(f => {
                    const assigned = assignedFlightIds.has(f.id);
                    return (
                      <tr key={f.id} className={`data-table-row ${assigned ? "opacity-60" : ""}`}>
                        <td className="px-3 py-2.5 font-semibold text-foreground">{f.flight_no}</td>
                        <td className="px-3 py-2.5 text-xs">{f.clearance_type}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{f.route}</td>
                        <td className="px-3 py-2.5 font-mono text-xs">{f.sta || "—"}</td>
                        <td className="px-3 py-2.5 font-mono text-xs">{f.std || "—"}</td>
                        <td className="px-3 py-2.5 text-xs">{f.aircraft_type}</td>
                        <td className="px-3 py-2.5 font-mono text-xs">{f.registration}</td>
                        <td className="px-3 py-2.5"><span className="text-xs font-medium">{f.status}</span></td>
                        <td className="px-3 py-2.5">
                          {assigned ? (
                            <span className="text-xs text-success font-medium">✔ Assigned</span>
                          ) : (
                            <button onClick={() => openNewFromFlight(f)} className="toolbar-btn-primary text-xs py-1"><Plus size={12} /> Assign</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dispatch Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm">
          <div className="bg-card rounded-xl border shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto m-4">
            <div className="sticky top-0 bg-card border-b px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
              <h2 className="font-bold text-foreground text-lg">{editId ? "Edit Dispatch" : "New Dispatch Assignment"}</h2>
              <button onClick={() => { setShowForm(false); setEditId(null); }} className="p-1.5 hover:bg-muted rounded-full text-muted-foreground"><X size={18} /></button>
            </div>

            <div className="p-6 space-y-4">
              {/* Flight Info */}
              <div className="grid grid-cols-3 gap-4">
                <div><label className="text-xs font-semibold text-muted-foreground">Flight No</label>
                  <input className={inputCls} value={formData.flight_no || ""} onChange={e => updateFormField("flight_no", e.target.value)} /></div>
                <div><label className="text-xs font-semibold text-muted-foreground">Airline</label>
                  <input className={inputCls} value={formData.airline || ""} onChange={e => updateFormField("airline", e.target.value)} /></div>
                <div><label className="text-xs font-semibold text-muted-foreground">Service Type</label>
                  <select className={selectCls} value={formData.service_type || "Arrival"} onChange={e => updateFormField("service_type", e.target.value)}>
                    {SERVICE_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select></div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div><label className="text-xs font-semibold text-muted-foreground">Station</label>
                  <select className={selectCls} value={formData.station || "CAI"} onChange={e => updateFormField("station", e.target.value)}>
                    {STATIONS.map(s => <option key={s.code} value={s.code}>{s.code}</option>)}
                  </select></div>
                <div><label className="text-xs font-semibold text-muted-foreground">Date</label>
                  <input type="date" className={inputCls} value={formData.flight_date || ""} onChange={e => updateFormField("flight_date", e.target.value)} /></div>
                <div><label className="text-xs font-semibold text-muted-foreground">Status</label>
                  <select className={selectCls} value={formData.status || "Pending"} onChange={e => updateFormField("status", e.target.value)}>
                    {DISPATCH_STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select></div>
              </div>

              {/* Staff */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2"><Users size={14} /> Staff Assignment</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-xs font-semibold text-muted-foreground">Staff Count</label>
                    <input type="number" className={inputCls} value={formData.staff_count || 0} onChange={e => updateFormField("staff_count", +e.target.value)} /></div>
                  <div><label className="text-xs font-semibold text-muted-foreground">Dispatched By</label>
                    <input className={inputCls} value={formData.dispatched_by || ""} onChange={e => updateFormField("dispatched_by", e.target.value)} placeholder="Supervisor name" /></div>
                </div>
                <div className="mt-3"><label className="text-xs font-semibold text-muted-foreground">Staff Names (comma-separated)</label>
                  <input className={inputCls} value={formData.staff_names || ""} onChange={e => updateFormField("staff_names", e.target.value)} placeholder="Ahmed Hassan, Omar Ali, ..." /></div>
              </div>

              {/* Time Tracking */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2"><Clock size={14} /> Time Tracking</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-xs font-semibold text-muted-foreground">Scheduled Start</label>
                    <input type="time" className={inputCls} value={formData.scheduled_start || ""} onChange={e => updateFormField("scheduled_start", e.target.value)} /></div>
                  <div><label className="text-xs font-semibold text-muted-foreground">Scheduled End</label>
                    <input type="time" className={inputCls} value={formData.scheduled_end || ""} onChange={e => updateFormField("scheduled_end", e.target.value)} /></div>
                  <div><label className="text-xs font-semibold text-muted-foreground">Actual Start</label>
                    <input type="time" className={inputCls} value={formData.actual_start || ""} onChange={e => updateFormField("actual_start", e.target.value)} /></div>
                  <div><label className="text-xs font-semibold text-muted-foreground">Actual End</label>
                    <input type="time" className={inputCls} value={formData.actual_end || ""} onChange={e => updateFormField("actual_end", e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-3">
                  <div><label className="text-xs font-semibold text-muted-foreground">Contract Duration (hrs)</label>
                    <input type="number" step="0.5" className={inputCls} value={formData.contract_duration_hours || 0} onChange={e => updateFormField("contract_duration_hours", +e.target.value)} /></div>
                  <div><label className="text-xs font-semibold text-muted-foreground">Actual Duration</label>
                    <input type="number" className={inputCls} value={formData.actual_duration_hours || 0} readOnly /></div>
                  <div><label className="text-xs font-semibold text-muted-foreground">Overtime Hours</label>
                    <input type="number" className={inputCls + (formData.overtime_hours && formData.overtime_hours > 0 ? " text-warning font-bold" : "")} value={formData.overtime_hours || 0} readOnly /></div>
                </div>
              </div>

              {/* Charges */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-bold text-foreground mb-2">Charges (auto-calculated from contract)</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div><label className="text-xs font-semibold text-muted-foreground">Base Fee</label>
                    <input type="number" className={inputCls} value={formData.base_fee || 0} onChange={e => updateFormField("base_fee", +e.target.value)} /></div>
                  <div><label className="text-xs font-semibold text-muted-foreground">Service Rate</label>
                    <input type="number" className={inputCls} value={formData.service_rate || 0} onChange={e => updateFormField("service_rate", +e.target.value)} /></div>
                  <div><label className="text-xs font-semibold text-muted-foreground">OT Rate ($/hr/staff)</label>
                    <input type="number" className={inputCls} value={formData.overtime_rate || 0} onChange={e => updateFormField("overtime_rate", +e.target.value)} /></div>
                  <div><label className="text-xs font-semibold text-muted-foreground">Total Charge</label>
                    <input type="number" className={inputCls + " font-bold text-success"} value={formData.total_charge || 0} readOnly /></div>
                </div>
              </div>

              {/* Notes */}
              <div><label className="text-xs font-semibold text-muted-foreground">Notes</label>
                <textarea className={inputCls + " resize-none"} rows={2} value={formData.notes || ""} onChange={e => updateFormField("notes", e.target.value)} /></div>
            </div>

            <div className="sticky bottom-0 bg-card border-t px-6 py-4 flex gap-3 justify-end rounded-b-xl">
              <button onClick={() => { setShowForm(false); setEditId(null); }} className="toolbar-btn-outline">Cancel</button>
              <button onClick={saveForm} disabled={isAdding || isUpdating} className="toolbar-btn-primary">
                {isAdding || isUpdating ? "Saving…" : editId ? "Update" : "Create Dispatch"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
