import { useState, useCallback, useMemo } from "react";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Search, Pencil, Trash2, ShieldCheck, Clock, CheckCircle2, XCircle, AlertTriangle, Download, Eye, Users, Upload, CalendarDays, TableIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { exportToExcel } from "@/lib/exportExcel";
import { formatDateDMY } from "@/lib/utils";
import { ClearanceRow, CLEARANCE_TYPES, STATUS_CONFIG, emptyForm, SECURITY_CLEARANCE_TYPES, getServiceCategory, getClearanceTypesByCategory, type ServiceCategory } from "@/components/clearances/ClearanceTypes";
import ClearanceFormDialog from "@/components/clearances/ClearanceFormDialog";
import ClearanceDetailDialog from "@/components/clearances/ClearanceDetailDialog";
import ScheduleUploadDialog from "@/components/clearances/ScheduleUploadDialog";

// ─── Calendar View Component ───
function CalendarView({ flights, month, onMonthChange, airlineMap, onView, onEdit }: {
  flights: ClearanceRow[];
  month: Date;
  onMonthChange: (d: Date) => void;
  airlineMap: Record<string, any>;
  onView: (c: ClearanceRow) => void;
  onEdit: (c: ClearanceRow) => void;
}) {
  const year = month.getFullYear();
  const mo = month.getMonth();
  const firstDay = new Date(year, mo, 1).getDay();
  const daysInMonth = new Date(year, mo + 1, 0).getDate();
  const today = new Date().toISOString().slice(0, 10);

  const byDate = useMemo(() => {
    const map: Record<string, ClearanceRow[]> = {};
    flights.forEach(f => {
      const d = f.arrival_date || f.departure_date || "";
      if (d) {
        if (!map[d]) map[d] = [];
        map[d].push(f);
      }
    });
    return map;
  }, [flights]);

  const prev = () => onMonthChange(new Date(year, mo - 1, 1));
  const next = () => onMonthChange(new Date(year, mo + 1, 1));
  const monthLabel = month.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const statusColor = (s: string) =>
    s === "Approved" ? "bg-success/20 text-success border-success/30" :
    s === "Pending" ? "bg-warning/20 text-warning border-warning/30" :
    s === "Rejected" ? "bg-destructive/20 text-destructive border-destructive/30" :
    "bg-muted text-muted-foreground border-muted";

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={prev}><ChevronLeft size={16} /></Button>
          <h3 className="text-sm font-semibold">{monthLabel}</h3>
          <Button variant="ghost" size="sm" onClick={next}><ChevronRight size={16} /></Button>
        </div>
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
            <div key={d} className="bg-muted/50 text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <div key={`e${i}`} className="bg-card min-h-[90px]" />;
            const dateStr = `${year}-${String(mo + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayFlights = byDate[dateStr] || [];
            const isToday = dateStr === today;
            return (
              <div key={dateStr} className={`bg-card min-h-[90px] p-1 ${isToday ? "ring-2 ring-primary ring-inset" : ""}`}>
                <div className={`text-xs font-medium mb-0.5 ${isToday ? "text-primary font-bold" : "text-muted-foreground"}`}>{day}</div>
                <div className="space-y-0.5 max-h-[70px] overflow-y-auto">
                  {dayFlights.slice(0, 4).map(f => (
                    <button
                      key={f.id}
                      onClick={() => onView(f)}
                      className={`w-full text-left px-1 py-0.5 rounded text-[10px] leading-tight truncate border ${statusColor(f.status)} hover:opacity-80 transition-opacity`}
                      title={`${f.flight_no} ${f.route} (${f.status})`}
                    >
                      <span className="font-mono font-semibold">{f.flight_no}</span>
                      {f.sta && <span className="ml-1 opacity-70">{f.sta}</span>}
                    </button>
                  ))}
                  {dayFlights.length > 4 && (
                    <div className="text-[10px] text-muted-foreground text-center">+{dayFlights.length - 4} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ClearancesPage() {
  const { data, isLoading, refetch, add, update, remove } = useSupabaseTable<ClearanceRow>("flight_schedules");
  const { data: airlines } = useQuery({ queryKey: ["airlines"], queryFn: async () => { const { data } = await supabase.from("airlines").select("id,name,code"); return data || []; } });
  const { data: airportsList } = useQuery({ queryKey: ["airports-iata"], queryFn: async () => { const { data } = await supabase.from("airports").select("iata_code,name").order("iata_code"); return data || []; } });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [stationFilter, setStationFilter] = useState("all");
  const [registrationFilter, setRegistrationFilter] = useState("all");
  const [airlineFilter, setAirlineFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [serviceCategory, setServiceCategory] = useState<ServiceCategory>("security");
  const [viewMode, setViewMode] = useState<"table" | "calendar">("table");
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [uploadOpen, setUploadOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<ClearanceRow | null>(null);
  const [editItem, setEditItem] = useState<ClearanceRow | null>(null);
  const [form, setForm] = useState<any>(emptyForm);

  const airlineMap = Object.fromEntries((airlines || []).map((a: any) => [a.id, a]));

  const stations = [...new Set((airportsList || []).map((a: any) => a.iata_code).filter(Boolean))].sort();
  const registrations = [...new Set(data.map(c => c.registration).filter(Boolean))].sort();

  const filtered = data.filter(c => {
    // Filter by service category first
    const categoryMatch = getServiceCategory(c.clearance_type) === serviceCategory;
    const ms = c.flight_no.toLowerCase().includes(search.toLowerCase()) || c.permit_no.toLowerCase().includes(search.toLowerCase()) || c.route.toLowerCase().includes(search.toLowerCase());
    const mst = statusFilter === "all" || c.status === statusFilter;
    const mt = typeFilter === "all" || c.clearance_type === typeFilter;
    const mstation = stationFilter === "all" || c.authority === stationFilter;
    const mreg = registrationFilter === "all" || c.registration === registrationFilter;
    const mairline = airlineFilter === "all" || c.airline_id === airlineFilter;
    const flightDate = c.arrival_date || c.departure_date || "";
    const mdf = !dateFrom || flightDate >= dateFrom;
    const mdt = !dateTo || flightDate <= dateTo;
    return categoryMatch && ms && mst && mt && mstation && mreg && mairline && mdf && mdt;
  }).sort((a, b) => {
    const da = a.arrival_date || a.departure_date || "";
    const db = b.arrival_date || b.departure_date || "";
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da.localeCompare(db);
  });

  const pendingApproval = data.filter(c => c.status === "Pending" && (c.remarks?.includes("Added from Station Dispatch") || c.purpose === "Security Service"));

  // Stats are scoped to the active service category (Security or Handling)
  const categoryData = data.filter(c => getServiceCategory(c.clearance_type) === serviceCategory);
  const stats = {
    total: categoryData.length,
    pending: categoryData.filter(c => c.status === "Pending").length,
    approved: categoryData.filter(c => c.status === "Approved").length,
    expiringSoon: categoryData.filter(c => c.status === "Approved" && c.valid_to && (new Date(c.valid_to).getTime() - Date.now()) / 86400000 <= 7 && (new Date(c.valid_to).getTime() - Date.now()) > 0).length,
    totalPax: categoryData.filter(c => c.status === "Approved").reduce((s, c) => s + (c.passengers || 0), 0),
  };

  const handleApprove = async (c: ClearanceRow) => {
    await update({ id: c.id, status: "Approved" as any });
    // If this clearance was added from a Security Service report, mark the
    // linked dispatch as Completed and move it to Pending Review (step 2 done).
    if (c.purpose === "Security Service") {
      const { error } = await supabase
        .from("dispatch_assignments")
        .update({ status: "Completed", review_status: "Pending Review" } as any)
        .eq("flight_schedule_id", c.id);
      if (error) console.error("Failed to update linked service report:", error.message);
    }
    toast({ title: "✅ Approved", description: `Flight ${c.flight_no} has been approved.` });
  };

  const handleReject = async (c: ClearanceRow) => {
    await update({ id: c.id, status: "Rejected" as any });
    if (c.purpose === "Security Service") {
      const { error } = await supabase
        .from("dispatch_assignments")
        .update({ review_status: "Rejected" } as any)
        .eq("flight_schedule_id", c.id);
      if (error) console.error("Failed to update linked service report:", error.message);
    }
    toast({ title: "❌ Rejected", description: `Flight ${c.flight_no} has been rejected.` });
  };

  const openAdd = () => {
    setEditItem(null);
    const defaultType = serviceCategory === "security" ? "Arrival Security" : "Full Handling";
    setForm({ ...emptyForm, clearance_type: defaultType });
    setDialogOpen(true);
  };
  const openEdit = (c: ClearanceRow) => {
    setEditItem(c);
    setForm({
      airline_id: c.airline_id || "", permit_no: c.permit_no, flight_no: c.flight_no,
      aircraft_type: c.aircraft_type, registration: c.registration, route: c.route,
      clearance_type: c.clearance_type, requested_date: c.requested_date || "",
      valid_from: c.valid_from || "", valid_to: c.valid_to || "", status: c.status,
      authority: c.authority, remarks: c.remarks, purpose: c.purpose || "Scheduled",
      passengers: c.passengers || 0, cargo_kg: c.cargo_kg || 0, handling_agent: c.handling_agent || "",
      config: c.config || 0, departure_flight: c.departure_flight || "",
      arrival_flight: c.arrival_flight || "", departure_date: c.departure_date || "",
      arrival_date: c.arrival_date || "", sta: c.sta || "", std: c.std || "",
      skd_type: c.skd_type || "", royalty: c.royalty || false, handling: c.handling || "",
      week_days: c.week_days || "", period_from: c.period_from || "",
      period_to: c.period_to || "", no_of_flights: c.no_of_flights || 0,
      ref_no: c.ref_no || "", notes: c.notes || "",
    });
    setDialogOpen(true);
  };

  const hasScheduleDefinition = (record: Partial<ClearanceRow> | null | undefined) => {
    if (!record) return false;
    return Boolean(record.period_from && record.period_to && record.week_days);
  };

  const getScheduleGroupIds = (source: ClearanceRow) => {
    return data
      .filter(r =>
        r.flight_no === source.flight_no &&
        (r.airline_id || "") === (source.airline_id || "") &&
        r.route === source.route &&
        r.clearance_type === source.clearance_type &&
        r.permit_no === source.permit_no &&
        (r.period_from || "") === (source.period_from || "") &&
        (r.period_to || "") === (source.period_to || "") &&
        (r.week_days || "") === (source.week_days || "")
      )
      .map(r => r.id);
  };

  const handleSave = async () => {
    if (!form.flight_no) { toast({ title: "Error", description: "Flight number is required", variant: "destructive" }); return; }
    const buildPayload = (overrides: any = {}) => {
      const p: any = {
        ...form,
        ...overrides,
        passengers: Number(form.passengers) || 0,
        cargo_kg: Number(form.cargo_kg) || 0,
        config: Number(form.config) || 0,
        no_of_flights: Number(form.no_of_flights) || 0,
      };
      if (!p.airline_id) delete p.airline_id;
      if (!p.valid_from) p.valid_from = null;
      if (!p.valid_to) p.valid_to = null;
      if (!p.departure_date) p.departure_date = null;
      if (!p.arrival_date) p.arrival_date = null;
      if (!p.period_from) p.period_from = null;
      if (!p.period_to) p.period_to = null;
      return p;
    };

    const expandFlightDates = (): string[] | null => {
      if (!form.period_from || !form.period_to || !form.week_days) return null;
      const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      const selectedDays = form.week_days.split(",").filter(Boolean).map((d: string) => dayMap[d]).filter((n: number) => n !== undefined);
      const startMatch = String(form.period_from).match(/^(\d{4})-(\d{2})-(\d{2})$/);
      const endMatch = String(form.period_to).match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!startMatch || !endMatch || selectedDays.length === 0) return null;
      const start = new Date(Number(startMatch[1]), Number(startMatch[2]) - 1, Number(startMatch[3]));
      const end = new Date(Number(endMatch[1]), Number(endMatch[2]) - 1, Number(endMatch[3]));
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return null;
      const dates: string[] = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (selectedDays.includes(d.getDay())) dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
      }
      return dates;
    };

    if (editItem) {
      const shouldReplaceScheduleGroup = hasScheduleDefinition(editItem) || hasScheduleDefinition(form);
      const flightDates = expandFlightDates();
      if (shouldReplaceScheduleGroup) {
        const idsToDelete = getScheduleGroupIds(editItem);
        if (!idsToDelete.includes(editItem.id)) idsToDelete.push(editItem.id);

        if (idsToDelete.length > 0) {
          const { error: delError } = await supabase
            .from("flight_schedules")
            .delete()
            .in("id", idsToDelete);
          if (delError) {
            toast({ title: "Error", description: `Failed to remove old records: ${delError.message}`, variant: "destructive" });
            return;
          }
        }

        const newRecords = flightDates && flightDates.length > 0
          ? flightDates.map(fDate => buildPayload({ arrival_date: fDate, departure_date: fDate, no_of_flights: 1 }))
          : [buildPayload()];

        const { error: insertError } = await supabase
          .from("flight_schedules")
          .insert(newRecords);
        if (insertError) {
          const isDuplicate = insertError.message?.includes("idx_flight_schedules_no_duplicates") || insertError.code === "23505";
          toast({ title: "Error", description: isDuplicate ? "Duplicate flight detected: a flight with the same number, route, date, and service type already exists." : insertError.message, variant: "destructive" });
          return;
        }

        await refetch();
        toast({ title: "✅ Updated", description: `Schedule updated: ${newRecords.length} flight record${newRecords.length === 1 ? "" : "s"} amended.` });
      } else {
        await update({ id: editItem.id, ...buildPayload() });
      }
    } else {
      const flightDates = expandFlightDates();
      if (flightDates && flightDates.length > 0) {
        const records = flightDates.map(fDate => buildPayload({ arrival_date: fDate, departure_date: fDate, no_of_flights: 1 }));
        const { error: insertError } = await supabase.from("flight_schedules").insert(records);
        if (insertError) {
          const isDuplicate = insertError.message?.includes("idx_flight_schedules_no_duplicates") || insertError.code === "23505";
          toast({ title: "Error", description: isDuplicate ? "Duplicate flight detected: a flight with the same number, route, date, and service type already exists." : insertError.message, variant: "destructive" });
          return;
        }
        await refetch();
        toast({ title: "✅ Created", description: `${records.length} individual flight records created.` });
      } else {
        const { error: insertError } = await supabase.from("flight_schedules").insert(buildPayload());
        if (insertError) {
          const isDuplicate = insertError.message?.includes("idx_flight_schedules_no_duplicates") || insertError.code === "23505";
          toast({ title: "Error", description: isDuplicate ? "Duplicate flight detected: a flight with the same number, route, date, and service type already exists." : insertError.message, variant: "destructive" });
          return;
        }
        await refetch();
      }
    }
    setDialogOpen(false);
  };

  const handleExport = () => exportToExcel(
    filtered.map(c => ({
      "Flight": c.flight_no, "Reg No": c.registration, "A/C Type": c.aircraft_type,
      "Airline": c.airline_id ? airlineMap[c.airline_id]?.name : "", "Route": c.route,
      "Arrival Flight": c.arrival_flight, "Departure Flight": c.departure_flight,
      "STA": c.sta, "STD": c.std, "Skd Type": c.skd_type,
      "Permit No": c.permit_no, "Service Type": c.clearance_type,
      "Status": c.status, "Valid From": c.valid_from, "Valid To": c.valid_to,
      "PAX": c.passengers, "Cargo": c.cargo_kg,
    })),
    "Clearances", "Clearances.xlsx"
  );

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2"><ShieldCheck size={22} className="text-primary" /> Flight Schedule & Clearances</h1>
          <p className="text-muted-foreground text-sm">التصاريح · Flight schedules, clearances and landing permits</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}><Download size={14} className="mr-1" /> Export</Button>
          <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}><Upload size={14} className="mr-1" /> Import Schedule</Button>
          <Button size="sm" onClick={openAdd}><Plus size={14} className="mr-1" /> Add Flights</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Total", value: stats.total, icon: <ShieldCheck size={20} />, color: "bg-primary" },
          { label: "Pending", value: stats.pending, icon: <Clock size={20} />, color: "bg-warning" },
          { label: "Approved", value: stats.approved, icon: <CheckCircle2 size={20} />, color: "bg-success" },
          { label: "Expiring <7d", value: stats.expiringSoon, icon: <AlertTriangle size={20} />, color: "bg-destructive" },
          { label: "Approved PAX", value: stats.totalPax.toLocaleString(), icon: <Users size={20} />, color: "bg-info" },
        ].map(s => (
          <div key={s.label} className="stat-card"><div className={`stat-card-icon ${s.color}`}>{s.icon}</div><div><div className="text-xl md:text-2xl font-bold text-foreground">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div></div>
        ))}
      </div>

      {/* Service Category Tabs */}
      <Tabs value={serviceCategory} onValueChange={(v) => { setServiceCategory(v as ServiceCategory); setTypeFilter("all"); }} className="space-y-4">
        <TabsList>
          <TabsTrigger value="security" className="gap-1.5">
            <ShieldCheck size={14} /> Security
          </TabsTrigger>
          <TabsTrigger value="handling" className="gap-1.5">
            <ShieldCheck size={14} /> Handling
          </TabsTrigger>
        </TabsList>

        <TabsContent value={serviceCategory}>
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Flights</TabsTrigger>
          <TabsTrigger value="pending-approval" className="gap-1">
            Pending Approval
            {pendingApproval.filter(c => getServiceCategory(c.clearance_type) === serviceCategory).length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 min-w-5 text-xs px-1.5">{pendingApproval.filter(c => getServiceCategory(c.clearance_type) === serviceCategory).length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="relative flex-1 min-w-[180px]"><Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} /><Input placeholder="Search flights…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
            <Select value={airlineFilter} onValueChange={setAirlineFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All Airlines" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Airlines</SelectItem>
                {(airlines || []).slice().sort((a: any, b: any) => a.name.localeCompare(b.name)).map((a: any) => (
                  <SelectItem key={a.id} value={a.id}>{a.code ? `${a.code} – ${a.name}` : a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Types</SelectItem>{getClearanceTypesByCategory(serviceCategory).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="Pending">Pending</SelectItem><SelectItem value="Approved">Approved</SelectItem><SelectItem value="Rejected">Rejected</SelectItem><SelectItem value="Expired">Expired</SelectItem></SelectContent>
            </Select>
            <Select value={stationFilter} onValueChange={setStationFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Stations</SelectItem>{stations.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            {registrations.length > 0 && (
              <Select value={registrationFilter} onValueChange={setRegistrationFilter}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Registrations</SelectItem>{registrations.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            )}
            <div className="flex items-center gap-1">
              <label className="text-xs text-muted-foreground whitespace-nowrap">From</label>
              <Input type="date" className="w-36 h-9" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-xs text-muted-foreground whitespace-nowrap">To</label>
              <Input type="date" className="w-36 h-9" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <div className="flex border rounded-lg overflow-hidden ml-auto">
              <Button variant={viewMode === "table" ? "default" : "ghost"} size="sm" className="rounded-none h-9 px-3" onClick={() => setViewMode("table")}><TableIcon size={14} className="mr-1" /> Table</Button>
              <Button variant={viewMode === "calendar" ? "default" : "ghost"} size="sm" className="rounded-none h-9 px-3" onClick={() => setViewMode("calendar")}><CalendarDays size={14} className="mr-1" /> Calendar</Button>
            </div>
          </div>

          {viewMode === "table" ? (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Arrival Date</TableHead>
                      <TableHead>Departure Date</TableHead>
                      <TableHead>Flight</TableHead>
                      <TableHead>Reg No</TableHead>
                      <TableHead>A/C Type</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Station</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>STA</TableHead>
                      <TableHead>STD</TableHead>
                      <TableHead>Service Type</TableHead>
                      <TableHead>Skd Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(c => {
                      const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.Pending;
                      const statusIcon = c.status === "Pending" ? <Clock size={12} /> : c.status === "Approved" ? <CheckCircle2 size={12} /> : c.status === "Rejected" ? <XCircle size={12} /> : <AlertTriangle size={12} />;
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="text-xs">{formatDateDMY(c.arrival_date)}</TableCell>
                          <TableCell className="text-xs">{formatDateDMY(c.departure_date)}</TableCell>
                          <TableCell className="font-medium font-mono">{c.flight_no}</TableCell>
                          <TableCell className="text-xs font-mono">{c.registration || "—"}</TableCell>
                          <TableCell className="text-xs">{c.aircraft_type || "—"}</TableCell>
                          <TableCell>{c.airline_id ? (airlineMap[c.airline_id]?.name || airlineMap[c.airline_id]?.code || "—") : "—"}</TableCell>
                          <TableCell className="text-xs">{c.authority || "—"}</TableCell>
                          <TableCell className="text-sm font-mono">{c.route || "—"}</TableCell>
                          <TableCell className="text-xs">{c.sta || "—"}</TableCell>
                          <TableCell className="text-xs">{c.std || "—"}</TableCell>
                          <TableCell className="text-xs">{c.clearance_type || "—"}</TableCell>
                          <TableCell className="text-xs">{c.skd_type || "—"}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>{statusIcon}{c.status}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" onClick={() => setDetailItem(c)}><Eye size={14} /></Button>
                              <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil size={14} /></Button>
                              <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(c.id)}><Trash2 size={14} /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filtered.length === 0 && <TableRow><TableCell colSpan={14} className="text-center py-8 text-muted-foreground">No flight schedules found</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <CalendarView
              flights={filtered}
              month={calMonth}
              onMonthChange={setCalMonth}
              airlineMap={airlineMap}
              onView={setDetailItem}
              onEdit={openEdit}
            />
          )}
        </TabsContent>

        <TabsContent value="pending-approval">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Flight</TableHead>
                      <TableHead>Airline</TableHead>
                      <TableHead>Reg No</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Service Type</TableHead>
                      <TableHead>Station</TableHead>
                      <TableHead>STA</TableHead>
                      <TableHead>STD</TableHead>
                      <TableHead>Remarks</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-36">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingApproval.filter(c => getServiceCategory(c.clearance_type) === serviceCategory).map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="text-xs">{formatDateDMY(c.arrival_date || c.departure_date)}</TableCell>
                        <TableCell className="font-medium font-mono">{c.flight_no}</TableCell>
                        <TableCell className="text-xs">{c.airline_id ? (airlineMap[c.airline_id]?.name || c.handling_agent || "—") : (c.handling_agent || "—")}</TableCell>
                        <TableCell className="text-xs font-mono">{c.registration || "—"}</TableCell>
                        <TableCell className="text-xs font-mono">{c.route || "—"}</TableCell>
                        <TableCell className="text-xs">{c.clearance_type}</TableCell>
                        <TableCell className="text-xs">{c.authority || "—"}</TableCell>
                        <TableCell className="text-xs">{c.sta || "—"}</TableCell>
                        <TableCell className="text-xs">{c.std || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{c.remarks || "—"}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-warning/15 text-warning"><Clock size={12} />Pending</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => handleApprove(c)}>
                              <CheckCircle2 size={13} className="mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleReject(c)}>
                              <XCircle size={13} className="mr-1" /> Reject
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(c)}>
                              <Pencil size={13} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {pendingApproval.filter(c => getServiceCategory(c.clearance_type) === serviceCategory).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">No flights pending approval</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        </TabsContent>
      </Tabs>

      <ClearanceFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        form={form}
        setForm={setForm}
        airlines={airlines || []}
        isEdit={!!editItem}
        onSave={handleSave}
      />

      <ClearanceDetailDialog
        item={detailItem}
        onClose={() => setDetailItem(null)}
        airlineMap={airlineMap}
      />

      <ScheduleUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  );
}
