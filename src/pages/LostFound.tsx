import { useState, useMemo } from "react";
import { Search, Plus, Pencil, Trash2, X, Package, CheckCircle, Clock, AlertCircle, Database } from "lucide-react";

type LFStatus = "Reported" | "In Storage" | "Claimed" | "Forwarded" | "Disposed";

interface LostFoundItem {
  id: string;
  reportDate: string;
  flightNo: string;
  airline: string;
  station: string;
  category: string;
  description: string;
  color: string;
  brand: string;
  ownerName: string;
  ownerContact: string;
  storageLocation: string;
  status: LFStatus;
  claimDate: string;
  notes: string;
}

const sampleItems: LostFoundItem[] = [
  { id: "LF001", reportDate: "2024-01-11", flightNo: "SM123", airline: "Air Cairo", station: "CAI", category: "Bag", description: "Small black trolley suitcase", color: "Black", brand: "Samsonite", ownerName: "Ahmed Hassan", ownerContact: "+201001234567", storageLocation: "Storage A-1", status: "In Storage", claimDate: "", notes: "Found under seat 12B" },
  { id: "LF002", reportDate: "2024-01-12", flightNo: "EK924", airline: "Emirates", station: "CAI", category: "Electronics", description: "Apple iPad Pro 12.9 with grey cover", color: "Space Grey", brand: "Apple", ownerName: "John Smith", ownerContact: "john@example.com", storageLocation: "Storage B-3", status: "Claimed", claimDate: "2024-01-14", notes: "Returned to owner" },
  { id: "LF003", reportDate: "2024-01-13", flightNo: "QR1301", airline: "Qatar Airways", station: "CAI", category: "Documents", description: "EU Blue Passport", color: "Blue", brand: "—", ownerName: "Unknown", ownerContact: "", storageLocation: "Office Safe", status: "Reported", claimDate: "", notes: "Handed to immigration" },
  { id: "LF004", reportDate: "2024-01-14", flightNo: "LH581", airline: "Lufthansa", station: "CAI", category: "Clothing", description: "Black leather jacket with patches", color: "Black", brand: "Unknown", ownerName: "Maria Müller", ownerContact: "+4917612345678", storageLocation: "Storage A-2", status: "Forwarded", claimDate: "", notes: "Forwarded to FRA station" },
];

const statusCfg: Record<LFStatus, { cls: string; icon: React.ReactNode }> = {
  Reported:   { cls: "bg-warning/15 text-warning",     icon: <AlertCircle size={11} /> },
  "In Storage":{ cls: "bg-info/15 text-info",          icon: <Clock size={11} /> },
  Claimed:    { cls: "bg-success/15 text-success",     icon: <CheckCircle size={11} /> },
  Forwarded:  { cls: "bg-primary/10 text-primary",     icon: <Package size={11} /> },
  Disposed:   { cls: "bg-muted text-muted-foreground", icon: <X size={11} /> },
};

const inp = "text-sm border rounded px-2 py-1.5 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary";

export default function LostFoundPage() {
  const [items, setItems] = useState<LostFoundItem[]>(sampleItems);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<Partial<LostFoundItem>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newRow, setNewRow] = useState<Partial<LostFoundItem>>({ reportDate: new Date().toISOString().slice(0, 10), flightNo: "", airline: "", station: "CAI", category: "", description: "", color: "", brand: "", ownerName: "", ownerContact: "", storageLocation: "", status: "Reported", claimDate: "", notes: "" });

  const filtered = useMemo(() => {
    let r = items;
    if (statusFilter !== "All") r = r.filter(i => i.status === statusFilter);
    if (search) { const s = search.toLowerCase(); r = r.filter(i => i.description.toLowerCase().includes(s) || i.ownerName.toLowerCase().includes(s) || i.flightNo.toLowerCase().includes(s) || i.id.toLowerCase().includes(s)); }
    return r;
  }, [items, search, statusFilter]);

  const set = (k: keyof LostFoundItem, v: any) => setEditRow(p => ({ ...p, [k]: v }));

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
            <input type="text" placeholder="Search items, owner, flight…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 pr-3 py-1.5 text-sm border rounded bg-card text-foreground placeholder:text-muted-foreground w-52 focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground">
            <option>All</option><option>Reported</option><option>In Storage</option><option>Claimed</option><option>Forwarded</option><option>Disposed</option>
          </select>
          <button onClick={() => setShowAdd(true)} className="toolbar-btn-primary"><Plus size={14} /> Report Item</button>
        </div>

        {showAdd && (
          <div className="p-4 border-b bg-muted">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end">
              <input type="date" value={newRow.reportDate || ""} onChange={e => setNewRow(p => ({ ...p, reportDate: e.target.value }))} className={inp} />
              <input placeholder="Flight No" value={newRow.flightNo || ""} onChange={e => setNewRow(p => ({ ...p, flightNo: e.target.value }))} className={inp} />
              <input placeholder="Airline" value={newRow.airline || ""} onChange={e => setNewRow(p => ({ ...p, airline: e.target.value }))} className={inp} />
              <input placeholder="Category (Bag, Electronics…)" value={newRow.category || ""} onChange={e => setNewRow(p => ({ ...p, category: e.target.value }))} className={inp} />
              <input placeholder="Description" value={newRow.description || ""} onChange={e => setNewRow(p => ({ ...p, description: e.target.value }))} className={inp + " col-span-2"} />
              <input placeholder="Owner Name" value={newRow.ownerName || ""} onChange={e => setNewRow(p => ({ ...p, ownerName: e.target.value }))} className={inp} />
              <div className="flex gap-1">
                <button onClick={() => { if (!newRow.description) return; setItems(p => [...p, { ...newRow, id: `LF${String(Date.now()).slice(-4)}` } as LostFoundItem]); setShowAdd(false); setNewRow({ reportDate: new Date().toISOString().slice(0, 10), status: "Reported" }); }} className="toolbar-btn-success text-xs py-1">Save</button>
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
                <tr><td colSpan={11} className="text-center py-16"><Database size={40} className="mx-auto text-muted-foreground/30 mb-3" /><p className="font-semibold text-foreground">No Lost & Found Items</p></td></tr>
              ) : filtered.map(row => (
                <tr key={row.id} className="data-table-row">
                  {editingId === row.id ? (
                    <>
                      <td className="px-2 py-2 text-xs text-muted-foreground">{row.id}</td>
                      <td className="px-2 py-2"><input type="date" value={editRow.reportDate || ""} onChange={e => set("reportDate", e.target.value)} className={inp + " w-32"} /></td>
                      <td className="px-2 py-2"><input value={editRow.flightNo || ""} onChange={e => set("flightNo", e.target.value)} className={inp + " w-20"} /></td>
                      <td className="px-2 py-2"><input value={editRow.airline || ""} onChange={e => set("airline", e.target.value)} className={inp + " w-24"} /></td>
                      <td className="px-2 py-2"><input value={editRow.station || ""} onChange={e => set("station", e.target.value)} className={inp + " w-14"} /></td>
                      <td className="px-2 py-2"><input value={editRow.category || ""} onChange={e => set("category", e.target.value)} className={inp + " w-20"} /></td>
                      <td className="px-2 py-2"><input value={editRow.description || ""} onChange={e => set("description", e.target.value)} className={inp + " w-36"} /></td>
                      <td className="px-2 py-2"><input value={editRow.ownerName || ""} onChange={e => set("ownerName", e.target.value)} className={inp + " w-28"} /></td>
                      <td className="px-2 py-2"><input value={editRow.storageLocation || ""} onChange={e => set("storageLocation", e.target.value)} className={inp + " w-24"} /></td>
                      <td className="px-2 py-2"><select value={editRow.status} onChange={e => set("status", e.target.value as LFStatus)} className={inp}><option>Reported</option><option>In Storage</option><option>Claimed</option><option>Forwarded</option><option>Disposed</option></select></td>
                      <td className="px-2 py-2 flex gap-1">
                        <button onClick={() => { setItems(p => p.map(r => r.id === editingId ? { ...r, ...editRow } as LostFoundItem : r)); setEditingId(null); }} className="text-xs text-success hover:underline">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-destructive hover:underline">Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{row.id}</td>
                      <td className="px-3 py-2.5 text-foreground whitespace-nowrap">{row.reportDate}</td>
                      <td className="px-3 py-2.5 font-mono font-semibold text-foreground">{row.flightNo}</td>
                      <td className="px-3 py-2.5 text-foreground">{row.airline}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-foreground">{row.station}</td>
                      <td className="px-3 py-2.5"><span className="px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground">{row.category}</span></td>
                      <td className="px-3 py-2.5 text-foreground max-w-[160px] truncate">{row.description}</td>
                      <td className="px-3 py-2.5 text-foreground">{row.ownerName || "—"}</td>
                      <td className="px-3 py-2.5 text-muted-foreground text-xs">{row.storageLocation}</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${statusCfg[row.status].cls}`}>
                          {statusCfg[row.status].icon}{row.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 flex gap-1.5">
                        <button onClick={() => { setEditingId(row.id); setEditRow({ ...row }); }} className="text-info hover:text-info/80"><Pencil size={13} /></button>
                        <button onClick={() => setItems(p => p.filter(r => r.id !== row.id))} className="text-destructive hover:text-destructive/80"><Trash2 size={13} /></button>
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
