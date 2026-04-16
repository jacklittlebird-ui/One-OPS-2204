import { useState, useMemo, useCallback } from "react";
import {
  Building2, Plane, Plus, Search, Clock, Users, AlertTriangle,
  CheckCircle, X, Trash2, ChevronLeft, ChevronRight, Eye, CalendarDays, TableIcon
} from "lucide-react";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SECURITY_CLEARANCE_TYPES, getServiceCategory, type ServiceCategory } from "@/components/clearances/ClearanceTypes";

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
const SERVICE_TYPES_HANDLING = ["Arrival", "Departure", "Turnaround", "Maintenance", "ADHOC", "Transportation"];
const SERVICE_TYPES_SECURITY = ["Arrival Security", "Departure Security", "Maintenance Security", "Turnaround Security"];

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

function DispatchCalendarView({ dispatches, month, onMonthChange, onEdit }: {
  dispatches: DispatchRow[];
  month: Date;
  onMonthChange: (d: Date) => void;
  onEdit: (d: DispatchRow) => void;
}) {
  const year = month.getFullYear();
  const mo = month.getMonth();
  const firstDay = new Date(year, mo, 1).getDay();
  const daysInMonth = new Date(year, mo + 1, 0).getDate();
  const today = new Date().toISOString().slice(0, 10);

  const byDate = useMemo(() => {
    const map: Record<string, DispatchRow[]> = {};
    dispatches.forEach(d => {
      if (d.flight_date) {
        if (!map[d.flight_date]) map[d.flight_date] = [];
        map[d.flight_date].push(d);
      }
    });
    return map;
  }, [dispatches]);

  const prev = () => onMonthChange(new Date(year, mo - 1, 1));
  const next = () => onMonthChange(new Date(year, mo + 1, 1));
  const monthLabel = month.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prev} className="p-1.5 rounded hover:bg-muted"><ChevronLeft size={16} /></button>
        <h3 className="text-sm font-semibold">{monthLabel}</h3>
        <button onClick={next} className="p-1.5 rounded hover:bg-muted"><ChevronRight size={16} /></button>
      </div>
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
          <div key={d} className="bg-muted/50 text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} className="bg-card min-h-[90px]" />;
          const dateStr = `${year}-${String(mo + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayDispatches = byDate[dateStr] || [];
          const isToday = dateStr === today;
          return (
            <div key={dateStr} className={`bg-card min-h-[90px] p-1 ${isToday ? "ring-2 ring-primary ring-inset" : ""}`}>
              <div className={`text-xs font-medium mb-0.5 ${isToday ? "text-primary font-bold" : "text-muted-foreground"}`}>{day}</div>
              <div className="space-y-0.5 max-h-[70px] overflow-y-auto">
                {dayDispatches.slice(0, 4).map(d => (
                  <button key={d.id} onClick={() => onEdit(d)}
                    className={`w-full text-left px-1 py-0.5 rounded text-[10px] leading-tight truncate border ${statusColors[d.status] || "bg-muted text-muted-foreground"} hover:opacity-80 transition-opacity`}
                    title={`${d.flight_no} – ${d.airline} (${d.status})`}>
                    <span className="font-mono font-semibold">{d.flight_no}</span>
                    <span className="ml-1 opacity-70">{d.service_type}</span>
                  </button>
                ))}
                {dayDispatches.length > 4 && (
                  <div className="text-[10px] text-muted-foreground text-center">+{dayDispatches.length - 4} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface DispatchContentProps {
  serviceCategory: ServiceCategory;
}

export default function DispatchContent({ serviceCategory }: DispatchContentProps) {
  const { data: flights, isLoading: flightsLoading } = useSupabaseTable<FlightRow>("flight_schedules");
  const { data: dispatches, isLoading: dispLoading, add, update, remove, isAdding, isUpdating } = useSupabaseTable<DispatchRow>("dispatch_assignments");
  const { data: contracts } = useSupabaseTable<ContractRow>("contracts");
  const { data: serviceRates } = useSupabaseTable<ServiceRateRow>("contract_service_rates");
  const { data: airlines } = useSupabaseTable<{ id: string; name: string; iata_code: string }>("airlines");

  const [stationFilter, setStationFilter] = useState("");
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState(monthStart);
  const [dateTo, setDateTo] = useState(monthEnd);
  const [search, setSearch] = useState("");
  const [airlineFilter, setAirlineFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<DispatchRow>>({});
  const [viewMode, setViewMode] = useState<"table" | "calendar">("table");
  const [calMonth, setCalMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));

  const airlineMap = useMemo(() => {
    const m: Record<string, { name: string; iata: string }> = {};
    airlines.forEach(a => { m[a.id] = { name: a.name, iata: a.iata_code }; });
    return m;
  }, [airlines]);

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

  const filtered = useMemo(() => {
    const secTypes = SERVICE_TYPES_SECURITY.map(s => s.toLowerCase());
    let r = [...dispatches];
    r = r.filter(d => {
      const isSec = secTypes.includes(d.service_type.toLowerCase()) || SECURITY_CLEARANCE_TYPES.includes(d.service_type);
      return serviceCategory === "security" ? isSec : !isSec;
    });
    if (stationFilter) r = r.filter(d => d.station === stationFilter);
    if (dateFrom) r = r.filter(d => d.flight_date >= dateFrom);
    if (dateTo) r = r.filter(d => d.flight_date <= dateTo);
    if (airlineFilter) r = r.filter(d => d.airline.toLowerCase() === airlineFilter.toLowerCase());
    if (search) {
      const s = search.toLowerCase();
      r = r.filter(d => d.flight_no.toLowerCase().includes(s) || d.airline.toLowerCase().includes(s) || d.staff_names.toLowerCase().includes(s));
    }
    return r;
  }, [dispatches, stationFilter, dateFrom, dateTo, airlineFilter, search, serviceCategory]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stationFlights = useMemo(() => {
    return flights.filter(f => {
      const catMatch = getServiceCategory(f.clearance_type) === serviceCategory;
      if (!catMatch) return false;
      if (stationFilter) {
        const routeMatch = (f.route || "").toUpperCase().includes(stationFilter);
        const authorityMatch = (f.authority || "").toUpperCase() === stationFilter;
        if (!(routeMatch || authorityMatch)) return false;
      }
      const arrDate = f.arrival_date || "";
      const depDate = f.departure_date || "";
      const inRange = (d: string) => {
        if (!d) return false;
        if (dateFrom && d < dateFrom) return false;
        if (dateTo && d > dateTo) return false;
        return true;
      };
      if (!(inRange(arrDate) || inRange(depDate))) return false;
      if (airlineFilter && f.airline_id) {
        const aName = airlineMap[f.airline_id]?.name || "";
        if (aName.toLowerCase() !== airlineFilter.toLowerCase()) return false;
      }
      return true;
    });
  }, [flights, stationFilter, dateFrom, dateTo, airlineFilter, airlineMap, serviceCategory]);

  const assignedFlightIds = useMemo(() => new Set(dispatches.filter(d => d.flight_schedule_id).map(d => d.flight_schedule_id)), [dispatches]);

  const openNewFromFlight = (flight: FlightRow) => {
    const airlineName = flight.airline_id ? airlineMap[flight.airline_id]?.name || "" : "";
    const sType = flight.clearance_type || "Arrival";
    const match = findContractRate(airlineName, stationFilter, sType);
    setFormData({
      flight_schedule_id: flight.id,
      station: stationFilter || "CAI",
      airline: airlineName,
      flight_no: flight.flight_no,
      flight_date: dateFrom,
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
      station: stationFilter || "CAI",
      airline: "",
      flight_no: "",
      flight_date: dateFrom,
      service_type: serviceCategory === "security" ? "Arrival Security" : "Arrival",
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
      let scheduleId = formData.flight_schedule_id || null;
      if (!scheduleId) {
        const matchedAirline = airlines.find(a => a.name === formData.airline);
        const flightDate = formData.flight_date || null;
        const svcType = formData.service_type || "Arrival";
        const stationCode = formData.station || "";
        const { data: newSchedule, error: schedErr } = await supabase
          .from("flight_schedules")
          .insert({
            flight_no: formData.flight_no || "",
            route: stationCode,
            aircraft_type: "",
            registration: "",
            clearance_type: svcType === "Arrival" ? "Full Handling" : svcType === "Departure" ? "Full Handling" : svcType,
            status: "Pending" as any,
            authority: stationCode,
            purpose: "Scheduled",
            airline_id: matchedAirline?.id || null,
            handling_agent: formData.airline || "",
            arrival_date: flightDate,
            departure_date: flightDate,
            arrival_flight: svcType === "Arrival" ? (formData.flight_no || "") : "",
            departure_flight: svcType === "Departure" ? (formData.flight_no || "") : "",
            sta: formData.scheduled_start || "",
            std: formData.scheduled_end || "",
            requested_date: flightDate,
            remarks: `Added from Service Report – ${svcType} – pending clearance approval`,
          })
          .select("id")
          .single();
        if (schedErr) {
          const isDuplicate = schedErr.message?.includes("idx_flight_schedules_no_duplicates") || schedErr.code === "23505";
          toast({ title: "Error", description: isDuplicate ? "Duplicate flight: a flight with the same number, route, date, and service type already exists." : `Could not create flight schedule: ${schedErr.message}`, variant: "destructive" });
          return;
        }
        scheduleId = newSchedule.id;
        toast({ title: "Flight Schedule Created", description: "A pending clearance record was created for approval." });
      }
      await add({ ...formData, flight_schedule_id: scheduleId } as any);
    }
    setShowForm(false);
    setEditId(null);
  };

  const isLoading = flightsLoading || dispLoading;
  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  const todayDispatches = dispatches.filter(d => d.flight_date >= dateFrom && d.flight_date <= dateTo && (!stationFilter || d.station === stationFilter));
  const completedCount = todayDispatches.filter(d => d.status === "Completed").length;
  const overtimeTotal = todayDispatches.reduce((s, d) => s + (d.overtime_hours || 0), 0);
  const revenueTotal = todayDispatches.reduce((s, d) => s + (d.total_charge || 0), 0);

  return (
    <>
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="stat-card"><div className="stat-card-icon bg-primary"><Plane size={20} /></div><div><div className="text-xl font-bold text-foreground">{todayDispatches.length}</div><div className="text-xs text-muted-foreground">Dispatched</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-success"><CheckCircle size={20} /></div><div><div className="text-xl font-bold text-foreground">{completedCount}</div><div className="text-xs text-muted-foreground">Completed</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-warning"><AlertTriangle size={20} /></div><div><div className="text-xl font-bold text-foreground">{overtimeTotal.toFixed(1)}h</div><div className="text-xs text-muted-foreground">Overtime Hours</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-info"><Users size={20} /></div><div><div className="text-xl font-bold text-foreground">{stationFlights.length - [...assignedFlightIds].filter(id => dispatches.find(d => d.flight_schedule_id === id && (!stationFilter || d.station === stationFilter))).length}</div><div className="text-xs text-muted-foreground">Unassigned Flights</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-muted"><Clock size={20} /></div><div><div className="text-xl font-bold text-foreground">${revenueTotal.toLocaleString()}</div><div className="text-xs text-muted-foreground">Total Charges</div></div></div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select value={stationFilter} onChange={e => { setStationFilter(e.target.value); setPage(1); }} className={selectCls + " w-40"}>
          <option value="">All Stations</option>
          {STATIONS.map(s => <option key={s.code} value={s.code}>{s.code} — {s.name}</option>)}
        </select>
        <select value={airlineFilter} onChange={e => { setAirlineFilter(e.target.value); setPage(1); }} className={selectCls + " w-44"}>
          <option value="">All Airlines</option>
          {[...airlines].sort((a, b) => a.name.localeCompare(b.name)).map(a => <option key={a.id} value={a.name}>{a.iata_code ? `${a.iata_code} — ` : ""}{a.name}</option>)}
        </select>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-muted-foreground font-medium">From</label>
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className={inputCls + " w-36"} />
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-muted-foreground font-medium">To</label>
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className={inputCls + " w-36"} />
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-8 pr-3 py-1.5 text-sm border rounded bg-card text-foreground placeholder:text-muted-foreground w-48 focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div className="flex border rounded-lg overflow-hidden">
          <button onClick={() => setViewMode("table")} className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === "table" ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-muted"}`}><TableIcon size={13} /> Table</button>
          <button onClick={() => setViewMode("calendar")} className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === "calendar" ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-muted"}`}><CalendarDays size={13} /> Calendar</button>
        </div>
        <button onClick={openNewManual} className="toolbar-btn-primary ml-auto"><Plus size={14} /> New Service Report</button>
      </div>

      <Tabs defaultValue="dispatches">
        <TabsList>
          <TabsTrigger value="dispatches">Dispatch Log ({filtered.length})</TabsTrigger>
          <TabsTrigger value="flights">Station Flights ({stationFlights.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="dispatches">
          {viewMode === "calendar" ? (
            <DispatchCalendarView dispatches={filtered} month={calMonth} onMonthChange={setCalMonth} onEdit={openEdit} />
          ) : (
          <div className="bg-card rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr>{["#","FLIGHT","AIRLINE","SERVICE TYPE","STAFF","SCHED TIME","ACTUAL TIME","DURATION","OT HRS","CHARGE","STATUS","ACTIONS"].map(h =>
                  <th key={h} className="data-table-header px-3 py-3 text-left whitespace-nowrap">{h}</th>
                )}</tr></thead>
                <tbody>
                  {pageData.length === 0 ? (
                    <tr><td colSpan={12} className="text-center py-16 text-muted-foreground">No service reports found for this date/station</td></tr>
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
          )}
        </TabsContent>

        <TabsContent value="flights">
          <div className="bg-card rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr>{["FLIGHT","SERVICE TYPE","ROUTE","STA","STD","A/C TYPE","REG","STATUS","ASSIGN"].map(h =>
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

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm">
          <div className="bg-card rounded-xl border shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto m-4">
            <div className="sticky top-0 bg-card border-b px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
              <h2 className="font-bold text-foreground text-lg">{editId ? "Edit Service Report" : "New Service Report"}</h2>
              <button onClick={() => { setShowForm(false); setEditId(null); }} className="p-1.5 hover:bg-muted rounded-full text-muted-foreground"><X size={18} /></button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div><label className="text-xs font-semibold text-muted-foreground">Flight No</label>
                  <input className={inputCls} value={formData.flight_no || ""} onChange={e => updateFormField("flight_no", e.target.value)} /></div>
                <div><label className="text-xs font-semibold text-muted-foreground">Airline</label>
                  <select className={selectCls} value={formData.airline || ""} onChange={e => updateFormField("airline", e.target.value)}>
                    <option value="">Select Airline</option>
                    {[...airlines].sort((a, b) => a.name.localeCompare(b.name)).map(a => <option key={a.id} value={a.name}>{a.iata_code ? `${a.iata_code} — ` : ""}{a.name}</option>)}
                  </select></div>
                <div><label className="text-xs font-semibold text-muted-foreground">Service Type</label>
                  <select className={selectCls} value={formData.service_type || "Arrival"} onChange={e => updateFormField("service_type", e.target.value)}>
                    {(serviceCategory === "security" ? SERVICE_TYPES_SECURITY : SERVICE_TYPES_HANDLING).map(t => <option key={t}>{t}</option>)}
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

              <div><label className="text-xs font-semibold text-muted-foreground">Notes</label>
                <textarea className={inputCls + " resize-none"} rows={2} value={formData.notes || ""} onChange={e => updateFormField("notes", e.target.value)} /></div>
            </div>

            <div className="sticky bottom-0 bg-card border-t px-6 py-4 flex gap-3 justify-end rounded-b-xl">
              <button onClick={() => { setShowForm(false); setEditId(null); }} className="toolbar-btn-outline">Cancel</button>
              <button onClick={saveForm} disabled={isAdding || isUpdating} className="toolbar-btn-primary">
                {isAdding || isUpdating ? "Saving…" : editId ? "Update" : "Create Service Report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
