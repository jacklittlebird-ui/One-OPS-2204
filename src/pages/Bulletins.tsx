import { useState, useMemo } from "react";
import { formatDateDMY } from "@/lib/utils";
import { Search, FileText, CheckCircle, AlertCircle, Download, Plus, Pencil, Trash2, Eye, Users } from "lucide-react";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import { exportToExcel } from "@/lib/exportExcel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const statusCfg: Record<string, string> = { Active: "bg-success/15 text-success", Expired: "bg-muted text-muted-foreground", Draft: "bg-info/15 text-info", Superseded: "bg-warning/15 text-warning" };
const priorityCfg: Record<string, string> = { High: "bg-destructive/15 text-destructive", Medium: "bg-warning/15 text-warning", Low: "bg-muted text-muted-foreground" };

type BulRow = { id: string; bulletin_id: string; title: string; type: string; issued_date: string; effective_date: string; expiry_date: string; issued_by: string; status: string; priority: string; description: string; recipients: string; acknowledged_by: string; category_code: string; };

const TYPES = ["Safety", "Security", "Operations", "Quality", "Regulatory", "Emergency"];

export default function BulletinsPage() {
  const { data, isLoading, add, update, remove } = useSupabaseTable<BulRow>("bulletins", { orderBy: "issued_date", ascending: false });
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<BulRow | null>(null);
  const [editItem, setEditItem] = useState<BulRow | null>(null);

  const emptyForm = { bulletin_id: "", title: "", type: "Operations", issued_date: new Date().toISOString().slice(0, 10), effective_date: "", expiry_date: "", issued_by: "", status: "Draft", priority: "Medium", description: "", recipients: "", acknowledged_by: "", category_code: "" };
  const [form, setForm] = useState<any>(emptyForm);

  const filtered = useMemo(() => {
    let r = data;
    if (typeFilter !== "All") r = r.filter(b => b.type === typeFilter);
    if (statusFilter !== "All") r = r.filter(b => b.status === statusFilter);
    if (search) { const s = search.toLowerCase(); r = r.filter(b => b.title?.toLowerCase().includes(s) || b.bulletin_id?.toLowerCase().includes(s)); }
    return r;
  }, [data, search, typeFilter, statusFilter]);

  const openAdd = () => {
    setEditItem(null);
    const nextId = `BUL-${String(data.length + 1).padStart(4, "0")}`;
    setForm({ ...emptyForm, bulletin_id: nextId });
    setDialogOpen(true);
  };
  const openEdit = (b: BulRow) => { setEditItem(b); setForm({ ...b }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.title) return;
    const payload = { ...form };
    delete payload.id;
    if (!payload.effective_date) payload.effective_date = null;
    if (!payload.expiry_date) payload.expiry_date = null;
    if (!payload.issued_date) payload.issued_date = null;
    if (editItem) { await update({ id: editItem.id, ...payload }); } else { await add(payload); }
    setDialogOpen(false);
  };

  const handleExport = () => exportToExcel(
    filtered.map(b => ({ ID: b.bulletin_id, Title: b.title, Type: b.type, Category: b.category_code, Issued: b.issued_date, Effective: b.effective_date, Expiry: b.expiry_date, "Issued By": b.issued_by, Priority: b.priority, Status: b.status, Recipients: b.recipients })),
    "Bulletins", "Bulletins.xlsx"
  );

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><FileText size={22} className="text-primary" /> Bulletins</h1>
          <p className="text-muted-foreground text-sm mt-1">النشرات · Safety, security, and operational bulletins</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}><Download size={14} className="mr-1" /> Export</Button>
          <Button size="sm" onClick={openAdd}><Plus size={14} className="mr-1" /> New Bulletin</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="stat-card"><div className="stat-card-icon bg-primary"><FileText size={20} /></div><div><div className="text-2xl font-bold text-foreground">{data.length}</div><div className="text-xs text-muted-foreground">Total Bulletins</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-success"><CheckCircle size={20} /></div><div><div className="text-2xl font-bold text-foreground">{data.filter(b => b.status === "Active").length}</div><div className="text-xs text-muted-foreground">Active</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-destructive"><AlertCircle size={20} /></div><div><div className="text-2xl font-bold text-foreground">{data.filter(b => b.priority === "High").length}</div><div className="text-xs text-muted-foreground">High Priority</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-warning"><AlertCircle size={20} /></div><div><div className="text-2xl font-bold text-foreground">{data.filter(b => b.type === "Safety").length}</div><div className="text-xs text-muted-foreground">Safety</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-info"><Users size={20} /></div><div><div className="text-2xl font-bold text-foreground">{data.filter(b => b.status === "Draft").length}</div><div className="text-xs text-muted-foreground">Drafts</div></div></div>
      </div>

      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="p-4 border-b flex flex-wrap items-center gap-3">
          <h2 className="text-base font-semibold text-foreground mr-auto">Bulletin Records</h2>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Search bulletins…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 pr-3 py-1.5 text-sm border rounded bg-card text-foreground placeholder:text-muted-foreground w-52 focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground"><option>All</option>{TYPES.map(t => <option key={t}>{t}</option>)}</select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground"><option>All</option><option>Active</option><option>Expired</option><option>Draft</option><option>Superseded</option></select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr>{["ID", "TITLE", "TYPE", "CATEGORY", "ISSUED", "EFFECTIVE", "EXPIRY", "ISSUED BY", "RECIPIENTS", "PRIORITY", "STATUS", "ACTIONS"].map(h => <th key={h} className="data-table-header px-3 py-3 text-left whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={12} className="text-center py-16 text-muted-foreground">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-16 text-muted-foreground">No bulletins found</td></tr>
              ) : filtered.map(b => (
                <tr key={b.id} className="data-table-row">
                  <td className="px-3 py-2.5 font-mono text-xs font-semibold text-primary">{b.bulletin_id}</td>
                  <td className="px-3 py-2.5 font-semibold text-foreground max-w-[200px] truncate">{b.title}</td>
                  <td className="px-3 py-2.5"><span className="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">{b.type}</span></td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{b.category_code || "—"}</td>
                  <td className="px-3 py-2.5 text-foreground whitespace-nowrap">{formatDateDMY(b.issued_date)}</td>
                  <td className="px-3 py-2.5 text-foreground whitespace-nowrap">{formatDateDMY(b.effective_date)}</td>
                  <td className="px-3 py-2.5 text-foreground whitespace-nowrap">{formatDateDMY(b.expiry_date)}</td>
                  <td className="px-3 py-2.5 text-muted-foreground text-xs">{b.issued_by}</td>
                  <td className="px-3 py-2.5 text-muted-foreground text-xs max-w-[100px] truncate">{b.recipients || "—"}</td>
                  <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${priorityCfg[b.priority]}`}>{b.priority}</span></td>
                  <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusCfg[b.status]}`}>{b.status}</span></td>
                  <td className="px-3 py-2.5 flex gap-1.5">
                    <button onClick={() => setDetailItem(b)} className="text-primary hover:text-primary/80"><Eye size={13} /></button>
                    <button onClick={() => openEdit(b)} className="text-info hover:text-info/80"><Pencil size={13} /></button>
                    <button onClick={() => remove(b.id)} className="text-destructive hover:text-destructive/80"><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detailItem} onOpenChange={() => setDetailItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Bulletin — {detailItem?.bulletin_id}</DialogTitle></DialogHeader>
          {detailItem && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground text-xs">Type</span><p className="font-medium">{detailItem.type}</p></div>
                <div><span className="text-muted-foreground text-xs">Category</span><p className="font-medium">{detailItem.category_code || "—"}</p></div>
                <div><span className="text-muted-foreground text-xs">Priority</span><p><Badge variant={detailItem.priority === "High" ? "destructive" : "secondary"}>{detailItem.priority}</Badge></p></div>
                <div><span className="text-muted-foreground text-xs">Status</span><p><Badge variant={detailItem.status === "Active" ? "default" : "secondary"}>{detailItem.status}</Badge></p></div>
                <div><span className="text-muted-foreground text-xs">Issued By</span><p className="font-medium">{detailItem.issued_by}</p></div>
                <div><span className="text-muted-foreground text-xs">Issued Date</span><p className="font-medium">{formatDateDMY(detailItem.issued_date)}</p></div>
                <div><span className="text-muted-foreground text-xs">Effective</span><p className="font-medium">{formatDateDMY(detailItem.effective_date)}</p></div>
                <div><span className="text-muted-foreground text-xs">Expiry</span><p className="font-medium">{formatDateDMY(detailItem.expiry_date)}</p></div>
              </div>
              <div><span className="text-muted-foreground text-xs">Title</span><p className="font-semibold">{detailItem.title}</p></div>
              <div><span className="text-muted-foreground text-xs">Description</span><p className="text-muted-foreground">{detailItem.description || "—"}</p></div>
              <div><span className="text-muted-foreground text-xs">Recipients</span><p className="text-muted-foreground">{detailItem.recipients || "—"}</p></div>
              <div><span className="text-muted-foreground text-xs">Acknowledged By</span><p className="text-muted-foreground">{detailItem.acknowledged_by || "—"}</p></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editItem ? "Edit Bulletin" : "New Bulletin"}</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Bulletin ID" value={form.bulletin_id} onChange={e => setForm({ ...form, bulletin_id: e.target.value })} />
              <Input placeholder="Category Code" value={form.category_code} onChange={e => setForm({ ...form, category_code: e.target.value })} />
            </div>
            <Input placeholder="Title *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            <div className="grid grid-cols-3 gap-2">
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="High">High</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="Low">Low</SelectItem></SelectContent>
              </Select>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Draft">Draft</SelectItem><SelectItem value="Active">Active</SelectItem><SelectItem value="Expired">Expired</SelectItem><SelectItem value="Superseded">Superseded</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><label className="text-xs text-muted-foreground">Issued</label><Input type="date" value={form.issued_date} onChange={e => setForm({ ...form, issued_date: e.target.value })} /></div>
              <div><label className="text-xs text-muted-foreground">Effective</label><Input type="date" value={form.effective_date} onChange={e => setForm({ ...form, effective_date: e.target.value })} /></div>
              <div><label className="text-xs text-muted-foreground">Expiry</label><Input type="date" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} /></div>
            </div>
            <Input placeholder="Issued By" value={form.issued_by} onChange={e => setForm({ ...form, issued_by: e.target.value })} />
            <Input placeholder="Recipients (comma-separated)" value={form.recipients} onChange={e => setForm({ ...form, recipients: e.target.value })} />
            <textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full text-sm border rounded px-3 py-2 bg-card text-foreground min-h-[80px]" />
            <Button className="w-full" onClick={handleSave}>{editItem ? "Update" : "Create"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
