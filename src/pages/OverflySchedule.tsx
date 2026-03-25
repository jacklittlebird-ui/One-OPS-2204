import { useState, useMemo, useRef, useCallback } from "react";
import { Search, Plus, Download, Globe, Pencil, Trash2, X, ChevronLeft, ChevronRight, Clock, CheckCircle, AlertCircle, XCircle, Database } from "lucide-react";
import * as XLSX from "xlsx";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";

type OverflyRow = {
  id: string; flight_no: string; operator: string; registration: string; aircraft_type: string;
  route_from: string; route_to: string; entry_point: string; exit_point: string;
  altitude: string; overfly_date: string; entry_time: string; exit_time: string;
  mtow: string; permit_no: string; status: string; fee: number; currency: string;
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<Partial<OverflyRow>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newRow, setNewRow] = useState<Partial<OverflyRow>>({ flight_no: "", operator: "", registration: "", aircraft_type: "", route_from: "", route_to: "", entry_point: "", exit_point: "", altitude: "", overfly_date: "", entry_time: "", exit_time: "", mtow: "", permit_no: "", status: "Pending", fee: 0, currency: "USD" });

  const filtered = useMemo(() => {
    let r = data;
    if (statusFilter !== "All") r = r.filter(x => x.status === statusFilter);
    if (search) { const s = search.toLowerCase(); r = r.filter(x => x.flight_no.toLowerCase().includes(s) || x.operator.toLowerCase().includes(s) || x.permit_no.toLowerCase().includes(s)); }
    return r;
  }, [data, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const approved = data.filter(d => d.status === "Approved").length;
  const pending = data.filter(d => d.status === "Pending").length;
  const totalFees = data.filter(d => d.status === "Approved").reduce((s, d) => s + d.fee, 0);

  const inp = "text-sm border rounded px-2 py-1.5 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
  const set = (key: string, val: any) => setEditRow(p => ({ ...p, [key]: val }));

  const handleAdd = async () => {
    if (!newRow.flight_no) return;
    await add(newRow as any);
    setShowAdd(false);
    setNewRow({ status: "Pending", fee: 0, currency: "USD" });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const { id, ...rest } = editRow;
    await update({ id: editingId, ...rest } as any);
    setEditingId(null);
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map(r => ({ "Flight No": r.flight_no, Operator: r.operator, Registration: r.registration, "A/C Type": r.aircraft_type, From: r.route_from, To: r.route_to, Date: r.overfly_date, "Entry Time": r.entry_time, "Exit Time": r.exit_time, Altitude: r.altitude, "Permit No": r.permit_no, Status: r.status, Fee: r.fee, Currency: r.currency })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Overfly Schedule"); XLSX.writeFile(wb, "overfly_schedule.xlsx");
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Globe size={22} className="text-primary" /> Overfly Schedule</h1>
        <p className="text-muted-foreground text-sm mt-1">Overflight permits, routes, and fees management</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card"><div className="stat-card-icon bg-primary"><Globe size={20} /></div><div><div className="text-2xl font-bold text-foreground">{data.length}</div><div className="text-xs text-muted-foreground">Total Overflights</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-success"><CheckCircle size={20} /></div><div><div className="text-2xl font-bold text-foreground">{approved}</div><div className="text-xs text-muted-foreground">Approved</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-warning"><Clock size={20} /></div><div><div className="text-2xl font-bold text-foreground">{pending}</div><div className="text-xs text-muted-foreground">Pending</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-info"><AlertCircle size={20} /></div><div><div className="text-2xl font-bold text-foreground">${totalFees.toLocaleString()}</div><div className="text-xs text-muted-foreground">Total Fees</div></div></div>
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
          <button onClick={() => setShowAdd(true)} className="toolbar-btn-primary"><Plus size={14} /> Add Overfly</button>
          <button onClick={handleExport} className="toolbar-btn-outline"><Download size={14} /> Export</button>
        </div>

        {showAdd && (
          <div className="p-4 border-b bg-muted">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 items-end">
              <input placeholder="Flight No" value={newRow.flight_no || ""} onChange={e => setNewRow(p => ({ ...p, flight_no: e.target.value }))} className={inp} />
              <input placeholder="Operator" value={newRow.operator || ""} onChange={e => setNewRow(p => ({ ...p, operator: e.target.value }))} className={inp} />
              <input placeholder="Registration" value={newRow.registration || ""} onChange={e => setNewRow(p => ({ ...p, registration: e.target.value }))} className={inp} />
              <input placeholder="A/C Type" value={newRow.aircraft_type || ""} onChange={e => setNewRow(p => ({ ...p, aircraft_type: e.target.value }))} className={inp} />
              <input placeholder="From" value={newRow.route_from || ""} onChange={e => setNewRow(p => ({ ...p, route_from: e.target.value }))} className={inp} />
              <input placeholder="To" value={newRow.route_to || ""} onChange={e => setNewRow(p => ({ ...p, route_to: e.target.value }))} className={inp} />
              <input type="date" value={newRow.overfly_date || ""} onChange={e => setNewRow(p => ({ ...p, overfly_date: e.target.value }))} className={inp} />
              <div className="flex gap-1">
                <button onClick={handleAdd} className="toolbar-btn-success text-xs py-1">Save</button>
                <button onClick={() => setShowAdd(false)} className="toolbar-btn-outline text-xs py-1"><X size={12} /></button>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr>{["FLIGHT","OPERATOR","REG","A/C TYPE","ROUTE","DATE","ENTRY","EXIT","ALTITUDE","PERMIT NO","STATUS","FEE","ACTIONS"].map(h => <th key={h} className="data-table-header px-3 py-3 text-left whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr><td colSpan={13} className="text-center py-16"><Database size={40} className="mx-auto text-muted-foreground/30 mb-3" /><p className="font-semibold text-foreground">No Records</p></td></tr>
              ) : pageData.map(row => (
                <tr key={row.id} className="data-table-row">
                  {editingId === row.id ? (
                    <>
                      <td className="px-2 py-2"><input value={editRow.flight_no || ""} onChange={e => set("flight_no", e.target.value)} className={inp + " w-20"} /></td>
                      <td className="px-2 py-2"><input value={editRow.operator || ""} onChange={e => set("operator", e.target.value)} className={inp + " w-28"} /></td>
                      <td className="px-2 py-2"><input value={editRow.registration || ""} onChange={e => set("registration", e.target.value)} className={inp + " w-20"} /></td>
                      <td className="px-2 py-2"><input value={editRow.aircraft_type || ""} onChange={e => set("aircraft_type", e.target.value)} className={inp + " w-24"} /></td>
                      <td className="px-2 py-2 text-muted-foreground text-xs">{editRow.route_from}→{editRow.route_to}</td>
                      <td className="px-2 py-2"><input type="date" value={editRow.overfly_date || ""} onChange={e => set("overfly_date", e.target.value)} className={inp + " w-32"} /></td>
                      <td className="px-2 py-2"><input value={editRow.entry_time || ""} onChange={e => set("entry_time", e.target.value)} className={inp + " w-16"} /></td>
                      <td className="px-2 py-2"><input value={editRow.exit_time || ""} onChange={e => set("exit_time", e.target.value)} className={inp + " w-16"} /></td>
                      <td className="px-2 py-2"><input value={editRow.altitude || ""} onChange={e => set("altitude", e.target.value)} className={inp + " w-16"} /></td>
                      <td className="px-2 py-2"><input value={editRow.permit_no || ""} onChange={e => set("permit_no", e.target.value)} className={inp + " w-28"} /></td>
                      <td className="px-2 py-2"><select value={editRow.status || "Pending"} onChange={e => set("status", e.target.value)} className={inp}><option>Approved</option><option>Pending</option><option>Rejected</option><option>Expired</option></select></td>
                      <td className="px-2 py-2"><input type="number" value={editRow.fee || 0} onChange={e => set("fee", +e.target.value)} className={inp + " w-20"} /></td>
                      <td className="px-2 py-2 flex gap-1">
                        <button onClick={handleSaveEdit} className="text-xs text-success hover:underline">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-destructive hover:underline">Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2.5 font-mono font-semibold text-foreground">{row.flight_no}</td>
                      <td className="px-3 py-2.5 text-foreground">{row.operator}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{row.registration}</td>
                      <td className="px-3 py-2.5 text-foreground">{row.aircraft_type}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{row.route_from}→{row.route_to}</td>
                      <td className="px-3 py-2.5 text-foreground">{row.overfly_date}</td>
                      <td className="px-3 py-2.5 text-foreground">{row.entry_time}</td>
                      <td className="px-3 py-2.5 text-foreground">{row.exit_time}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-foreground">{row.altitude}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{row.permit_no}</td>
                      <td className="px-3 py-2.5">{statusBadge(row.status)}</td>
                      <td className="px-3 py-2.5 font-semibold text-success">{row.fee.toLocaleString()}</td>
                      <td className="px-3 py-2.5 flex gap-1.5">
                        <button onClick={() => { setEditingId(row.id); setEditRow({ ...row }); }} className="text-info hover:text-info/80"><Pencil size={13} /></button>
                        <button onClick={() => remove(row.id)} className="text-destructive hover:text-destructive/80"><Trash2 size={13} /></button>
                      </td>
                    </>
                  )}
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
    </div>
  );
}
