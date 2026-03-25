import { useState, useMemo } from "react";
import { Search, Plus, Pencil, Trash2, X, Package, CheckCircle, Clock, AlertCircle, Database } from "lucide-react";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";

type LFStatus = "Reported" | "In Storage" | "Claimed" | "Forwarded" | "Disposed";

type LFRow = {
  id: string; report_date: string; flight_no: string; airline: string; station: string;
  category: string; description: string; color: string; brand: string;
  owner_name: string; owner_contact: string; storage_location: string;
  status: LFStatus; claim_date: string | null; notes: string;
};

const statusCfg: Record<LFStatus, { cls: string; icon: React.ReactNode }> = {
  Reported:   { cls: "bg-warning/15 text-warning",     icon: <AlertCircle size={11} /> },
  "In Storage":{ cls: "bg-info/15 text-info",          icon: <Clock size={11} /> },
  Claimed:    { cls: "bg-success/15 text-success",     icon: <CheckCircle size={11} /> },
  Forwarded:  { cls: "bg-primary/10 text-primary",     icon: <Package size={11} /> },
  Disposed:   { cls: "bg-muted text-muted-foreground", icon: <X size={11} /> },
};

const inp = "text-sm border rounded px-2 py-1.5 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary";

export default function LostFoundPage() {
  const { data: items, isLoading, add, update, remove } = useSupabaseTable<LFRow>("lost_found");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<Partial<LFRow>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newRow, setNewRow] = useState<Partial<LFRow>>({ report_date: new Date().toISOString().slice(0, 10), flight_no: "", airline: "", station: "CAI", category: "", description: "", color: "", brand: "", owner_name: "", owner_contact: "", storage_location: "", status: "Reported", notes: "" });

  const filtered = useMemo(() => {
    let r = items;
    if (statusFilter !== "All") r = r.filter(i => i.status === statusFilter);
    if (search) { const s = search.toLowerCase(); r = r.filter(i => i.description.toLowerCase().includes(s) || i.owner_name.toLowerCase().includes(s) || i.flight_no.toLowerCase().includes(s)); }
    return r;
  }, [items, search, statusFilter]);

  const set = (k: string, v: any) => setEditRow(p => ({ ...p, [k]: v }));

  const handleAdd = async () => {
    if (!newRow.description) return;
    await add(newRow as any);
    setShowAdd(false);
    setNewRow({ report_date: new Date().toISOString().slice(0, 10), status: "Reported" as LFStatus });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const { id, ...rest } = editRow;
    await update({ id: editingId, ...rest } as any);
    setEditingId(null);
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Package size={22} className="text-primary" /> Lost & Found</h1>
        <p className="text-muted-foreground text-sm mt-1">Tracking lost items reported at airports and aircraft</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card"><div className="stat-card-icon bg-primary"><Package size={20} /></div><div><div className="text-2xl font-bold text-foreground">{items.length}</div><div className="text-xs text-muted-foreground">Total Items</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-warning"><AlertCircle size={20} /></div><div><div className="text-2xl font-bold text-foreground">{items.filter(i => i.status === "Reported" || i.status === "In Storage").length}</div><div className="text-xs text-muted-foreground">Unclaimed</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-success"><CheckCircle size={20} /></div><div><div className="text-2xl font-bold text-foreground">{items.filter(i => i.status === "Claimed").length}</div><div className="text-xs text-muted-foreground">Claimed</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-info"><Clock size={20} /></div><div><div className="text-2xl font-bold text-foreground">{items.filter(i => i.status === "In Storage").length}</div><div className="text-xs text-muted-foreground">In Storage</div></div></div>
      </div>

      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="p-4 border-b flex flex-wrap items-center gap-3">
          <h2 className="text-base font-semibold text-foreground mr-auto">Lost & Found Records</h2>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Search items…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 pr-3 py-1.5 text-sm border rounded bg-card text-foreground placeholder:text-muted-foreground w-52 focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground">
            <option>All</option><option>Reported</option><option>In Storage</option><option>Claimed</option><option>Forwarded</option><option>Disposed</option>
          </select>
          <button onClick={() => setShowAdd(true)} className="toolbar-btn-primary"><Plus size={14} /> Report Item</button>
        </div>

        {showAdd && (
          <div className="p-4 border-b bg-muted">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end">
              <input type="date" value={newRow.report_date || ""} onChange={e => setNewRow(p => ({ ...p, report_date: e.target.value }))} className={inp} />
              <input placeholder="Flight No" value={newRow.flight_no || ""} onChange={e => setNewRow(p => ({ ...p, flight_no: e.target.value }))} className={inp} />
              <input placeholder="Airline" value={newRow.airline || ""} onChange={e => setNewRow(p => ({ ...p, airline: e.target.value }))} className={inp} />
              <input placeholder="Category" value={newRow.category || ""} onChange={e => setNewRow(p => ({ ...p, category: e.target.value }))} className={inp} />
              <input placeholder="Description" value={newRow.description || ""} onChange={e => setNewRow(p => ({ ...p, description: e.target.value }))} className={inp + " col-span-2"} />
              <input placeholder="Owner Name" value={newRow.owner_name || ""} onChange={e => setNewRow(p => ({ ...p, owner_name: e.target.value }))} className={inp} />
              <div className="flex gap-1">
                <button onClick={handleAdd} className="toolbar-btn-success text-xs py-1">Save</button>
                <button onClick={() => setShowAdd(false)} className="toolbar-btn-outline text-xs py-1"><X size={12} /></button>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr>{["ID","DATE","FLIGHT","AIRLINE","STATION","CATEGORY","DESCRIPTION","OWNER","STORAGE","STATUS","ACTIONS"].map(h => <th key={h} className="data-table-header px-3 py-3 text-left whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-16"><Database size={40} className="mx-auto text-muted-foreground/30 mb-3" /><p className="font-semibold text-foreground">No Items</p></td></tr>
              ) : filtered.map(row => (
                <tr key={row.id} className="data-table-row">
                  {editingId === row.id ? (
                    <>
                      <td className="px-2 py-2 text-xs text-muted-foreground">{row.id.slice(0,8)}</td>
                      <td className="px-2 py-2"><input type="date" value={editRow.report_date || ""} onChange={e => set("report_date", e.target.value)} className={inp + " w-32"} /></td>
                      <td className="px-2 py-2"><input value={editRow.flight_no || ""} onChange={e => set("flight_no", e.target.value)} className={inp + " w-20"} /></td>
                      <td className="px-2 py-2"><input value={editRow.airline || ""} onChange={e => set("airline", e.target.value)} className={inp + " w-24"} /></td>
                      <td className="px-2 py-2"><input value={editRow.station || ""} onChange={e => set("station", e.target.value)} className={inp + " w-14"} /></td>
                      <td className="px-2 py-2"><input value={editRow.category || ""} onChange={e => set("category", e.target.value)} className={inp + " w-20"} /></td>
                      <td className="px-2 py-2"><input value={editRow.description || ""} onChange={e => set("description", e.target.value)} className={inp + " w-36"} /></td>
                      <td className="px-2 py-2"><input value={editRow.owner_name || ""} onChange={e => set("owner_name", e.target.value)} className={inp + " w-28"} /></td>
                      <td className="px-2 py-2"><input value={editRow.storage_location || ""} onChange={e => set("storage_location", e.target.value)} className={inp + " w-24"} /></td>
                      <td className="px-2 py-2"><select value={editRow.status || "Reported"} onChange={e => set("status", e.target.value)} className={inp}><option>Reported</option><option>In Storage</option><option>Claimed</option><option>Forwarded</option><option>Disposed</option></select></td>
                      <td className="px-2 py-2 flex gap-1">
                        <button onClick={handleSaveEdit} className="text-xs text-success hover:underline">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-destructive hover:underline">Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{row.id.slice(0,8)}</td>
                      <td className="px-3 py-2.5 text-foreground whitespace-nowrap">{row.report_date}</td>
                      <td className="px-3 py-2.5 font-mono font-semibold text-foreground">{row.flight_no}</td>
                      <td className="px-3 py-2.5 text-foreground">{row.airline}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-foreground">{row.station}</td>
                      <td className="px-3 py-2.5"><span className="px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground">{row.category}</span></td>
                      <td className="px-3 py-2.5 text-foreground max-w-[160px] truncate">{row.description}</td>
                      <td className="px-3 py-2.5 text-foreground">{row.owner_name || "—"}</td>
                      <td className="px-3 py-2.5 text-muted-foreground text-xs">{row.storage_location}</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${statusCfg[row.status]?.cls || ""}`}>
                          {statusCfg[row.status]?.icon}{row.status}
                        </span>
                      </td>
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
      </div>
    </div>
  );
}
