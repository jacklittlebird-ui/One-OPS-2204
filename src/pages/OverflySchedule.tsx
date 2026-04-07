import { useState, useMemo } from "react";
import { formatDateDMY } from "@/lib/utils";
import { Search, Plus, Download, Globe, Pencil, Trash2, X, ChevronLeft, ChevronRight, Clock, CheckCircle, AlertCircle, XCircle, Database, Eye, MapPin } from "lucide-react";
import * as XLSX from "xlsx";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type OverflyRow = {
  id: string; flight_no: string; operator: string; registration: string; aircraft_type: string;
  route_from: string; route_to: string; entry_point: string; exit_point: string;
  altitude: string; overfly_date: string; entry_time: string; exit_time: string;
  mtow: string; permit_no: string; status: string; fee: number; currency: string;
  fir_zones: string; distance_nm: number;
};

const statusBadge = (s: string) => {
  const map: Record<string, { cls: string; icon: React.ReactNode }> = {
    Approved: { cls: "bg-success/15 text-success", icon: <CheckCircle size={11} /> },
    Pending:  { cls: "bg-warning/15 text-warning", icon: <Clock size={11} /> },
    Rejected: { cls: "bg-destructive/15 text-destructive", icon: <XCircle size={11} /> },
    Expired:  { cls: "bg-muted text-muted-foreground", icon: <AlertCircle size={11} /> },
  };
  const cfg = map[s] || map.Pending;
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.cls}`}>{cfg.icon}{s}</span>;
};

const PAGE_SIZE = 15;

export default function OverflySchedulePage() {
  const { data, isLoading, add, update, remove } = useSupabaseTable<OverflyRow>("overfly_schedules");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<OverflyRow | null>(null);
  const [editItem, setEditItem] = useState<OverflyRow | null>(null);

  const emptyForm = { flight_no: "", operator: "", registration: "", aircraft_type: "", route_from: "", route_to: "", entry_point: "", exit_point: "", altitude: "", overfly_date: "", entry_time: "", exit_time: "", mtow: "", permit_no: "", status: "Pending", fee: 0, currency: "USD", fir_zones: "", distance_nm: 0 };
  const [form, setForm] = useState<any>(emptyForm);

  const filtered = useMemo(() => {
    let r = data;
    if (statusFilter !== "All") r = r.filter(x => x.status === statusFilter);
    if (search) { const s = search.toLowerCase(); r = r.filter(x => x.flight_no.toLowerCase().includes(s) || x.operator.toLowerCase().includes(s) || x.permit_no?.toLowerCase().includes(s)); }
    return r;
  }, [data, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const approved = data.filter(d => d.status === "Approved").length;
  const pending = data.filter(d => d.status === "Pending").length;
  const totalFees = data.filter(d => d.status === "Approved").reduce((s, d) => s + d.fee, 0);
  const totalNM = data.filter(d => d.status === "Approved").reduce((s, d) => s + (d.distance_nm || 0), 0);

  const openAdd = () => { setEditItem(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (row: OverflyRow) => {
    setEditItem(row);
    setForm({ ...row });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.flight_no || !form.operator) return;
    const payload = { ...form, fee: Number(form.fee) || 0, distance_nm: Number(form.distance_nm) || 0 };
    delete payload.id;
    if (editItem) { await update({ id: editItem.id, ...payload }); } else { await add(payload); }
    setDialogOpen(false);
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map(r => ({ "Flight No": r.flight_no, Operator: r.operator, Registration: r.registration, "A/C Type": r.aircraft_type, From: r.route_from, To: r.route_to, "Entry Point": r.entry_point, "Exit Point": r.exit_point, Date: r.overfly_date, "Entry Time": r.entry_time, "Exit Time": r.exit_time, Altitude: r.altitude, "FIR Zones": r.fir_zones, "Distance NM": r.distance_nm, "Permit No": r.permit_no, Status: r.status, Fee: r.fee, Currency: r.currency })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Overfly Schedule"); XLSX.writeFile(wb, "overfly_schedule.xlsx");
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Globe size={22} className="text-primary" /> Overfly Schedule</h1>
          <p className="text-muted-foreground text-sm mt-1">التحليق · Overflight permits, FIR tracking, and fees</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}><Download size={14} className="mr-1" /> Export</Button>
          <Button size="sm" onClick={openAdd}><Plus size={14} className="mr-1" /> Add Overfly</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="stat-card"><div className="stat-card-icon bg-primary"><Globe size={20} /></div><div><div className="text-2xl font-bold text-foreground">{data.length}</div><div className="text-xs text-muted-foreground">Total Overflights</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-success"><CheckCircle size={20} /></div><div><div className="text-2xl font-bold text-foreground">{approved}</div><div className="text-xs text-muted-foreground">Approved</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-warning"><Clock size={20} /></div><div><div className="text-2xl font-bold text-foreground">{pending}</div><div className="text-xs text-muted-foreground">Pending</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-info"><MapPin size={20} /></div><div><div className="text-2xl font-bold text-foreground">{totalNM.toLocaleString()}</div><div className="text-xs text-muted-foreground">Total NM</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-accent"><AlertCircle size={20} /></div><div><div className="text-2xl font-bold text-foreground">${totalFees.toLocaleString()}</div><div className="text-xs text-muted-foreground">Total Fees</div></div></div>
      </div>

      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="p-4 border-b flex flex-wrap items-center gap-3">
          <h2 className="text-base font-semibold text-foreground mr-auto">Overfly Records</h2>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Search…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-8 pr-3 py-1.5 text-sm border rounded bg-card text-foreground placeholder:text-muted-foreground w-52 focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground">
            <option>All</option><option>Approved</option><option>Pending</option><option>Rejected</option><option>Expired</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr>{["FLIGHT","OPERATOR","REG","ROUTE","DATE","ENTRY/EXIT","FIR","DIST NM","PERMIT","STATUS","FEE","ACTIONS"].map(h => <th key={h} className="data-table-header px-3 py-3 text-left whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-16"><Database size={40} className="mx-auto text-muted-foreground/30 mb-3" /><p className="font-semibold text-foreground">No Records</p></td></tr>
              ) : pageData.map(row => (
                <tr key={row.id} className="data-table-row">
                  <td className="px-3 py-2.5 font-mono font-semibold text-foreground">{row.flight_no}</td>
                  <td className="px-3 py-2.5 text-foreground">{row.operator}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{row.registration}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{row.route_from}→{row.route_to}</td>
                  <td className="px-3 py-2.5 text-foreground whitespace-nowrap">{formatDateDMY(row.overfly_date)}</td>
                  <td className="px-3 py-2.5 text-xs">{row.entry_point} {row.entry_time} → {row.exit_point} {row.exit_time}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{row.fir_zones || "—"}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{row.distance_nm || "—"}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{row.permit_no}</td>
                  <td className="px-3 py-2.5">{statusBadge(row.status)}</td>
                  <td className="px-3 py-2.5 font-semibold text-success">{row.fee.toLocaleString()}</td>
                  <td className="px-3 py-2.5 flex gap-1.5">
                    <button onClick={() => setDetailItem(row)} className="text-primary hover:text-primary/80"><Eye size={13} /></button>
                    <button onClick={() => openEdit(row)} className="text-info hover:text-info/80"><Pencil size={13} /></button>
                    <button onClick={() => remove(row.id)} className="text-destructive hover:text-destructive/80"><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="p-3 border-t flex items-center justify-between text-sm text-muted-foreground">
            <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded border hover:bg-muted disabled:opacity-40"><ChevronLeft size={14} /></button>
              <span className="text-foreground font-medium">Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded border hover:bg-muted disabled:opacity-40"><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detailItem} onOpenChange={() => setDetailItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Overfly — {detailItem?.flight_no}</DialogTitle></DialogHeader>
          {detailItem && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground text-xs">Flight</span><p className="font-medium">{detailItem.flight_no}</p></div>
              <div><span className="text-muted-foreground text-xs">Operator</span><p className="font-medium">{detailItem.operator}</p></div>
              <div><span className="text-muted-foreground text-xs">Aircraft</span><p className="font-medium">{detailItem.aircraft_type} / {detailItem.registration}</p></div>
              <div><span className="text-muted-foreground text-xs">MTOW</span><p className="font-medium">{detailItem.mtow}</p></div>
              <div><span className="text-muted-foreground text-xs">Route</span><p className="font-medium">{detailItem.route_from} → {detailItem.route_to}</p></div>
              <div><span className="text-muted-foreground text-xs">Date</span><p className="font-medium">{detailItem.overfly_date}</p></div>
              <div><span className="text-muted-foreground text-xs">Entry</span><p className="font-medium">{detailItem.entry_point} @ {detailItem.entry_time}</p></div>
              <div><span className="text-muted-foreground text-xs">Exit</span><p className="font-medium">{detailItem.exit_point} @ {detailItem.exit_time}</p></div>
              <div><span className="text-muted-foreground text-xs">FIR Zones</span><p className="font-medium">{detailItem.fir_zones || "—"}</p></div>
              <div><span className="text-muted-foreground text-xs">Distance</span><p className="font-medium">{detailItem.distance_nm} NM</p></div>
              <div><span className="text-muted-foreground text-xs">Altitude</span><p className="font-medium">{detailItem.altitude}</p></div>
              <div><span className="text-muted-foreground text-xs">Permit No</span><p className="font-medium">{detailItem.permit_no}</p></div>
              <div><span className="text-muted-foreground text-xs">Fee</span><p className="font-medium font-mono">{detailItem.fee.toLocaleString()} {detailItem.currency}</p></div>
              <div><span className="text-muted-foreground text-xs">Status</span><p>{statusBadge(detailItem.status)}</p></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editItem ? "Edit Overfly" : "Add Overfly"}</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Flight No" value={form.flight_no} onChange={e => setForm({ ...form, flight_no: e.target.value.toUpperCase() })} />
              <Input placeholder="Operator" value={form.operator} onChange={e => setForm({ ...form, operator: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Input placeholder="Registration" value={form.registration} onChange={e => setForm({ ...form, registration: e.target.value.toUpperCase() })} />
              <Input placeholder="A/C Type" value={form.aircraft_type} onChange={e => setForm({ ...form, aircraft_type: e.target.value })} />
              <Input placeholder="MTOW" value={form.mtow} onChange={e => setForm({ ...form, mtow: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="From" value={form.route_from} onChange={e => setForm({ ...form, route_from: e.target.value.toUpperCase() })} />
              <Input placeholder="To" value={form.route_to} onChange={e => setForm({ ...form, route_to: e.target.value.toUpperCase() })} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><label className="text-xs text-muted-foreground">Date</label><Input type="date" value={form.overfly_date} onChange={e => setForm({ ...form, overfly_date: e.target.value })} /></div>
              <Input placeholder="Entry Point" value={form.entry_point} onChange={e => setForm({ ...form, entry_point: e.target.value.toUpperCase() })} />
              <Input placeholder="Exit Point" value={form.exit_point} onChange={e => setForm({ ...form, exit_point: e.target.value.toUpperCase() })} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Input placeholder="Entry Time" value={form.entry_time} onChange={e => setForm({ ...form, entry_time: e.target.value })} />
              <Input placeholder="Exit Time" value={form.exit_time} onChange={e => setForm({ ...form, exit_time: e.target.value })} />
              <Input placeholder="Altitude (FL)" value={form.altitude} onChange={e => setForm({ ...form, altitude: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="FIR Zones (e.g. HECC,HLLL)" value={form.fir_zones} onChange={e => setForm({ ...form, fir_zones: e.target.value })} />
              <Input type="number" placeholder="Distance NM" value={form.distance_nm} onChange={e => setForm({ ...form, distance_nm: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Input placeholder="Permit No" value={form.permit_no} onChange={e => setForm({ ...form, permit_no: e.target.value })} />
              <Input type="number" placeholder="Fee" value={form.fee} onChange={e => setForm({ ...form, fee: e.target.value })} />
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Pending">Pending</SelectItem><SelectItem value="Approved">Approved</SelectItem><SelectItem value="Rejected">Rejected</SelectItem><SelectItem value="Expired">Expired</SelectItem></SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleSave}>{editItem ? "Update" : "Save"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
