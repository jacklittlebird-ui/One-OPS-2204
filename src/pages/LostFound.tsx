import { useState, useMemo } from "react";
import { formatDateDMY } from "@/lib/utils";
import { Search, Plus, Pencil, Trash2, X, Package, CheckCircle, Clock, AlertCircle, Database, Download, Eye } from "lucide-react";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import { exportToExcel } from "@/lib/exportExcel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type LFStatus = "Reported" | "In Storage" | "Claimed" | "Forwarded" | "Disposed";

type LFRow = {
  id: string; report_date: string; flight_no: string; airline: string; station: string;
  category: string; description: string; color: string; brand: string;
  owner_name: string; owner_contact: string; storage_location: string;
  status: LFStatus; claim_date: string | null; notes: string;
  item_id: string; weight: string; terminal: string; found_by: string;
};

const statusCfg: Record<LFStatus, { cls: string; icon: React.ReactNode }> = {
  Reported:    { cls: "bg-warning/15 text-warning",     icon: <AlertCircle size={11} /> },
  "In Storage":{ cls: "bg-info/15 text-info",           icon: <Clock size={11} /> },
  Claimed:     { cls: "bg-success/15 text-success",     icon: <CheckCircle size={11} /> },
  Forwarded:   { cls: "bg-primary/10 text-primary",     icon: <Package size={11} /> },
  Disposed:    { cls: "bg-muted text-muted-foreground",  icon: <X size={11} /> },
};

const CATEGORIES = ["Bag", "Clothing", "Documents", "Electronics", "Jewelry", "Medical", "Other"];

export default function LostFoundPage() {
  const { data: items, isLoading, add, update, remove } = useSupabaseTable<LFRow>("lost_found", { stationFilter: true });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<LFRow | null>(null);
  const [editItem, setEditItem] = useState<LFRow | null>(null);

  const emptyForm = {
    report_date: new Date().toISOString().slice(0, 10), flight_no: "", airline: "", station: "CAI",
    category: "Bag", description: "", color: "", brand: "", owner_name: "", owner_contact: "",
    storage_location: "", status: "Reported" as LFStatus, notes: "",
    item_id: "", weight: "", terminal: "T1", found_by: "",
  };
  const [form, setForm] = useState<any>(emptyForm);

  const filtered = useMemo(() => {
    let r = items;
    if (statusFilter !== "All") r = r.filter(i => i.status === statusFilter);
    if (categoryFilter !== "All") r = r.filter(i => i.category === categoryFilter);
    if (search) { const s = search.toLowerCase(); r = r.filter(i => i.description?.toLowerCase().includes(s) || i.owner_name?.toLowerCase().includes(s) || i.flight_no?.toLowerCase().includes(s) || i.item_id?.toLowerCase().includes(s)); }
    return r;
  }, [items, search, statusFilter, categoryFilter]);

  const openAdd = () => {
    setEditItem(null);
    const nextId = `LF-${String(items.length + 1).padStart(5, "0")}`;
    setForm({ ...emptyForm, item_id: nextId });
    setDialogOpen(true);
  };
  const openEdit = (row: LFRow) => {
    setEditItem(row);
    setForm({ ...row });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.description) return;
    const payload = { ...form };
    delete payload.id;
    if (editItem) { await update({ id: editItem.id, ...payload }); } else { await add(payload); }
    setDialogOpen(false);
  };

  const handleExport = () => exportToExcel(
    filtered.map(i => ({ "Item ID": i.item_id, Date: i.report_date, Flight: i.flight_no, Airline: i.airline, Station: i.station, Terminal: i.terminal, Category: i.category, Description: i.description, Color: i.color, Brand: i.brand, Weight: i.weight, "Found By": i.found_by, Owner: i.owner_name, Contact: i.owner_contact, Storage: i.storage_location, Status: i.status })),
    "Lost & Found", "LostFound.xlsx"
  );

  // Days in storage calculation
  const daysInStorage = (date: string) => {
    const d = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
    return d;
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Package size={22} className="text-primary" /> Lost & Found</h1>
          <p className="text-muted-foreground text-sm mt-1">المفقودات · IATA AHM compliant tracking</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}><Download size={14} className="mr-1" /> Export</Button>
          <Button size="sm" onClick={openAdd}><Plus size={14} className="mr-1" /> Report Item</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="stat-card"><div className="stat-card-icon bg-primary"><Package size={20} /></div><div><div className="text-2xl font-bold text-foreground">{items.length}</div><div className="text-xs text-muted-foreground">Total Items</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-warning"><AlertCircle size={20} /></div><div><div className="text-2xl font-bold text-foreground">{items.filter(i => i.status === "Reported").length}</div><div className="text-xs text-muted-foreground">Reported</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-info"><Clock size={20} /></div><div><div className="text-2xl font-bold text-foreground">{items.filter(i => i.status === "In Storage").length}</div><div className="text-xs text-muted-foreground">In Storage</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-success"><CheckCircle size={20} /></div><div><div className="text-2xl font-bold text-foreground">{items.filter(i => i.status === "Claimed").length}</div><div className="text-xs text-muted-foreground">Claimed</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-destructive"><AlertCircle size={20} /></div><div><div className="text-2xl font-bold text-foreground">{items.filter(i => i.status !== "Claimed" && i.status !== "Disposed" && daysInStorage(i.report_date) > 30).length}</div><div className="text-xs text-muted-foreground">&gt;30 Days Unclaimed</div></div></div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="p-4 border-b flex flex-wrap items-center gap-3">
          <h2 className="text-base font-semibold text-foreground mr-auto">Lost & Found Records</h2>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Search items…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 pr-3 py-1.5 text-sm border rounded bg-card text-foreground placeholder:text-muted-foreground w-52 focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground">
            <option>All</option>{CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground">
            <option>All</option><option>Reported</option><option>In Storage</option><option>Claimed</option><option>Forwarded</option><option>Disposed</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr>{["ITEM ID","DATE","FLIGHT","AIRLINE","TERMINAL","CATEGORY","DESCRIPTION","FOUND BY","DAYS","STATUS","ACTIONS"].map(h => <th key={h} className="data-table-header px-3 py-3 text-left whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-16"><Database size={40} className="mx-auto text-muted-foreground/30 mb-3" /><p className="font-semibold text-foreground">No Items</p></td></tr>
              ) : filtered.map(row => (
                <tr key={row.id} className="data-table-row">
                  <td className="px-3 py-2.5 font-mono text-xs font-semibold text-primary">{row.item_id || row.id.slice(0,8)}</td>
                  <td className="px-3 py-2.5 text-foreground whitespace-nowrap">{formatDateDMY(row.report_date)}</td>
                  <td className="px-3 py-2.5 font-mono font-semibold text-foreground">{row.flight_no}</td>
                  <td className="px-3 py-2.5 text-foreground">{row.airline}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{row.terminal || "—"}</td>
                  <td className="px-3 py-2.5"><span className="px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground">{row.category}</span></td>
                  <td className="px-3 py-2.5 text-foreground max-w-[160px] truncate">{row.description}</td>
                  <td className="px-3 py-2.5 text-muted-foreground text-xs">{row.found_by || "—"}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-semibold ${daysInStorage(row.report_date) > 30 ? "text-destructive" : "text-muted-foreground"}`}>
                      {daysInStorage(row.report_date)}d
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${statusCfg[row.status]?.cls || ""}`}>
                      {statusCfg[row.status]?.icon}{row.status}
                    </span>
                  </td>
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
      </div>

      {/* Detail Modal */}
      <Dialog open={!!detailItem} onOpenChange={() => setDetailItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Item Details — {detailItem?.item_id}</DialogTitle></DialogHeader>
          {detailItem && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground text-xs">Date</span><p className="font-medium">{formatDateDMY(detailItem.report_date)}</p></div>
              <div><span className="text-muted-foreground text-xs">Flight</span><p className="font-medium">{detailItem.flight_no}</p></div>
              <div><span className="text-muted-foreground text-xs">Airline</span><p className="font-medium">{detailItem.airline}</p></div>
              <div><span className="text-muted-foreground text-xs">Station / Terminal</span><p className="font-medium">{detailItem.station} / {detailItem.terminal}</p></div>
              <div><span className="text-muted-foreground text-xs">Category</span><p className="font-medium">{detailItem.category}</p></div>
              <div><span className="text-muted-foreground text-xs">Color / Brand</span><p className="font-medium">{detailItem.color || "—"} / {detailItem.brand || "—"}</p></div>
              <div className="col-span-2"><span className="text-muted-foreground text-xs">Description</span><p className="font-medium">{detailItem.description}</p></div>
              <div><span className="text-muted-foreground text-xs">Weight</span><p className="font-medium">{detailItem.weight || "—"}</p></div>
              <div><span className="text-muted-foreground text-xs">Found By</span><p className="font-medium">{detailItem.found_by || "—"}</p></div>
              <div><span className="text-muted-foreground text-xs">Owner</span><p className="font-medium">{detailItem.owner_name || "—"}</p></div>
              <div><span className="text-muted-foreground text-xs">Contact</span><p className="font-medium">{detailItem.owner_contact || "—"}</p></div>
              <div><span className="text-muted-foreground text-xs">Storage Location</span><p className="font-medium">{detailItem.storage_location || "—"}</p></div>
              <div><span className="text-muted-foreground text-xs">Status</span><p><Badge variant={detailItem.status === "Claimed" ? "default" : "secondary"}>{detailItem.status}</Badge></p></div>
              {detailItem.notes && <div className="col-span-2"><span className="text-muted-foreground text-xs">Notes</span><p className="text-muted-foreground">{detailItem.notes}</p></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editItem ? "Edit Item" : "Report Lost Item"}</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Item ID" value={form.item_id} onChange={e => setForm({ ...form, item_id: e.target.value })} />
              <Input type="date" value={form.report_date} onChange={e => setForm({ ...form, report_date: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Input placeholder="Flight No" value={form.flight_no} onChange={e => setForm({ ...form, flight_no: e.target.value.toUpperCase() })} />
              <Input placeholder="Airline" value={form.airline} onChange={e => setForm({ ...form, airline: e.target.value })} />
              <Input placeholder="Station" value={form.station} onChange={e => setForm({ ...form, station: e.target.value.toUpperCase() })} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Select value={form.terminal || "T1"} onValueChange={v => setForm({ ...form, terminal: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="T1">Terminal 1</SelectItem><SelectItem value="T2">Terminal 2</SelectItem><SelectItem value="T3">Terminal 3</SelectItem></SelectContent>
              </Select>
              <Select value={form.category || "Bag"} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Weight" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} />
            </div>
            <Input placeholder="Description *" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} />
              <Input placeholder="Brand" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} />
            </div>
            <Input placeholder="Found By" value={form.found_by} onChange={e => setForm({ ...form, found_by: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Owner Name" value={form.owner_name} onChange={e => setForm({ ...form, owner_name: e.target.value })} />
              <Input placeholder="Owner Contact" value={form.owner_contact} onChange={e => setForm({ ...form, owner_contact: e.target.value })} />
            </div>
            <Input placeholder="Storage Location" value={form.storage_location} onChange={e => setForm({ ...form, storage_location: e.target.value })} />
            <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="Reported">Reported</SelectItem><SelectItem value="In Storage">In Storage</SelectItem><SelectItem value="Claimed">Claimed</SelectItem><SelectItem value="Forwarded">Forwarded</SelectItem><SelectItem value="Disposed">Disposed</SelectItem></SelectContent>
            </Select>
            <Input placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            <Button className="w-full" onClick={handleSave}>{editItem ? "Update" : "Report Item"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
