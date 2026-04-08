import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Pencil, Trash2, ShieldCheck, Clock, CheckCircle2, XCircle, AlertTriangle, Download, Eye, Users, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { exportToExcel } from "@/lib/exportExcel";
import { formatDateDMY } from "@/lib/utils";
import { ClearanceRow, CLEARANCE_TYPES, STATUS_CONFIG, emptyForm } from "@/components/clearances/ClearanceTypes";
import ClearanceFormDialog from "@/components/clearances/ClearanceFormDialog";
import ClearanceDetailDialog from "@/components/clearances/ClearanceDetailDialog";

export default function ClearancesPage() {
  const { data, isLoading, add, update, remove } = useSupabaseTable<ClearanceRow>("flight_schedules");
  const { data: airlines } = useQuery({ queryKey: ["airlines"], queryFn: async () => { const { data } = await supabase.from("airlines").select("id,name,code"); return data || []; } });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<ClearanceRow | null>(null);
  const [editItem, setEditItem] = useState<ClearanceRow | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<any>(ws);
        let count = 0;
        for (const row of json) {
          const payload: any = {
            flight_no: row["Flight"] || row["Flight No"] || row["flight_no"] || row["FLIGHT"] || "",
            registration: row["Reg No"] || row["Registration"] || row["REG"] || "",
            aircraft_type: row["A/C Type"] || row["Aircraft Type"] || row["aircraft_type"] || "",
            route: row["Route"] || row["ROUTE"] || row["route"] || "",
            sta: row["STA"] || row["sta"] || "",
            std: row["STD"] || row["std"] || "",
            skd_type: row["Skd Type"] || row["SKD"] || "",
            permit_no: row["Permit No"] || row["permit_no"] || "",
            clearance_type: row["Type"] || row["clearance_type"] || "Landing",
            purpose: row["Purpose"] || row["purpose"] || "Scheduled",
            status: row["Status"] || "Pending",
            passengers: Number(row["PAX"] || row["passengers"] || 0),
            cargo_kg: Number(row["Cargo"] || row["cargo_kg"] || 0),
            handling: row["Handling"] || "",
            week_days: row["Days"] || row["week_days"] || "",
            arrival_flight: row["Arrival Flight"] || "",
            departure_flight: row["Departure Flight"] || "",
          };
          if (!payload.flight_no) continue;
          await add(payload);
          count++;
        }
        toast({ title: "✅ Import Complete", description: `${count} flight records imported from Excel.` });
      } catch (err: any) {
        toast({ title: "Import Error", description: err.message, variant: "destructive" });
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  }, [add]);

  const airlineMap = Object.fromEntries((airlines || []).map((a: any) => [a.id, a]));

  const filtered = data.filter(c => {
    const ms = c.flight_no.toLowerCase().includes(search.toLowerCase()) || c.permit_no.toLowerCase().includes(search.toLowerCase()) || c.route.toLowerCase().includes(search.toLowerCase());
    const mst = statusFilter === "all" || c.status === statusFilter;
    const mt = typeFilter === "all" || c.clearance_type === typeFilter;
    return ms && mst && mt;
  });

  const stats = {
    total: data.length,
    pending: data.filter(c => c.status === "Pending").length,
    approved: data.filter(c => c.status === "Approved").length,
    expiringSoon: data.filter(c => c.status === "Approved" && c.valid_to && (new Date(c.valid_to).getTime() - Date.now()) / 86400000 <= 7 && (new Date(c.valid_to).getTime() - Date.now()) > 0).length,
    totalPax: data.filter(c => c.status === "Approved").reduce((s, c) => s + (c.passengers || 0), 0),
  };

  const openAdd = () => { setEditItem(null); setForm(emptyForm); setDialogOpen(true); };
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
      const noOfFlights = Number(form.no_of_flights) || 0;
      if (!form.period_from || !form.period_to || !form.week_days || noOfFlights <= 1) return null;
      const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      const selectedDays = form.week_days.split(",").filter(Boolean).map((d: string) => dayMap[d]).filter((n: number) => n !== undefined);
      const start = new Date(form.period_from);
      const end = new Date(form.period_to);
      const dates: string[] = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (selectedDays.includes(d.getDay())) dates.push(d.toISOString().slice(0, 10));
      }
      return dates;
    };

    if (editItem) {
      const flightDates = expandFlightDates();
      if (flightDates && flightDates.length > 0) {
        // Find sibling records that share the same schedule properties
        const siblings = data.filter(r =>
          r.flight_no === editItem.flight_no &&
          r.airline_id === editItem.airline_id &&
          r.route === editItem.route &&
          r.clearance_type === editItem.clearance_type &&
          r.permit_no === editItem.permit_no &&
          r.id !== editItem.id &&
          r.no_of_flights === 1
        );
        // Remove old sibling records
        for (const s of siblings) {
          await remove(s.id);
        }
        // Remove the edited record itself
        await remove(editItem.id);
        // Create new expanded records
        let count = 0;
        for (const fDate of flightDates) {
          await add(buildPayload({ arrival_date: fDate, departure_date: fDate, no_of_flights: 1 }));
          count++;
        }
        toast({ title: "✅ Updated", description: `Schedule updated: ${count} flight records created.` });
      } else {
        await update({ id: editItem.id, ...buildPayload() });
      }
    } else {
      const flightDates = expandFlightDates();
      if (flightDates && flightDates.length > 0) {
        let count = 0;
        for (const fDate of flightDates) {
          await add(buildPayload({ arrival_date: fDate, departure_date: fDate, no_of_flights: 1 }));
          count++;
        }
        toast({ title: "✅ Created", description: `${count} individual flight records created.` });
      } else {
        await add(buildPayload());
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
      "Permit No": c.permit_no, "Type": c.clearance_type,
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
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><Upload size={14} className="mr-1" /> Upload Excel</Button>
          <Button size="sm" onClick={openAdd}><Plus size={14} className="mr-1" /> Add Flights</Button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleUpload} />
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

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1"><Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} /><Input placeholder="Search flights…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Types</SelectItem>{CLEARANCE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="Pending">Pending</SelectItem><SelectItem value="Approved">Approved</SelectItem><SelectItem value="Rejected">Rejected</SelectItem><SelectItem value="Expired">Expired</SelectItem></SelectContent>
        </Select>
      </div>

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
                    <TableCell>{c.airline_id ? (airlineMap[c.airline_id]?.code || "—") : "—"}</TableCell>
                    <TableCell className="text-xs">{c.authority || "—"}</TableCell>
                    <TableCell className="text-sm font-mono">{c.route || "—"}</TableCell>
                    <TableCell className="text-xs">{c.sta || "—"}</TableCell>
                    <TableCell className="text-xs">{c.std || "—"}</TableCell>
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
              {filtered.length === 0 && <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">No flight schedules found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
    </div>
  );
}
