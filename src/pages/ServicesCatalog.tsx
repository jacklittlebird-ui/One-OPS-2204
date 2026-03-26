import { useState, useMemo } from "react";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Pencil, Trash2, Wrench, Download, Eye, Layers, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { exportToExcel } from "@/lib/exportExcel";

type ServiceCatalogRow = { id: string; name: string; category: string; description: string; related_reports: string; related_documents: string; report_template: string; status: string; };

const CATEGORIES = ["Civil Aviation", "Ground Handling", "Catering", "Hotac", "Fuel", "Security", "Special Services", "Transport", "VIP"];

const CATEGORY_ICONS: Record<string, string> = {
  "Civil Aviation": "✈️", "Ground Handling": "🛬", "Catering": "🍽️", "Hotac": "🏨",
  "Fuel": "⛽", "Security": "🔒", "Special Services": "⭐", "Transport": "🚌", "VIP": "👑",
};

export default function ServicesCatalogPage() {
  const { data, isLoading, add, update, remove } = useSupabaseTable<ServiceCatalogRow>("services_catalog", { orderBy: "category", ascending: true });
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<ServiceCatalogRow | null>(null);
  const [editItem, setEditItem] = useState<ServiceCatalogRow | null>(null);
  const emptyForm = { name: "", category: "Ground Handling", description: "", related_reports: "", related_documents: "", report_template: "", status: "Active" };
  const [form, setForm] = useState(emptyForm);

  const filtered = data.filter(s => {
    const ms = s.name.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase());
    const mc = catFilter === "all" || s.category === catFilter;
    return ms && mc;
  });

  const stats = useMemo(() => ({
    total: data.length,
    active: data.filter(s => s.status === "Active").length,
    inactive: data.filter(s => s.status === "Inactive").length,
    categories: new Set(data.map(s => s.category)).size,
  }), [data]);

  const categoryCounts = CATEGORIES.map(c => ({ cat: c, count: data.filter(s => s.category === c).length, icon: CATEGORY_ICONS[c] || "📋" }));

  const openAdd = () => { setEditItem(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (s: ServiceCatalogRow) => { setEditItem(s); setForm({ name: s.name, category: s.category, description: s.description, related_reports: s.related_reports, related_documents: s.related_documents, report_template: s.report_template, status: s.status }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name) { toast({ title: "Error", description: "Service name is required", variant: "destructive" }); return; }
    if (editItem) { await update({ id: editItem.id, ...form } as any); } else { await add(form as any); }
    setDialogOpen(false);
  };

  const handleExport = () => {
    exportToExcel(data.map(s => ({
      Name: s.name, Category: s.category, Description: s.description,
      "Related Reports": s.related_reports, "Related Documents": s.related_documents,
      "Report Template": s.report_template, Status: s.status,
    })), "Services", "services_catalog.xlsx");
    toast({ title: "Exported", description: "Services catalog exported." });
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Services Catalog</h1>
          <p className="text-muted-foreground text-sm">كتالوج الخدمات · Define and manage operational services</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}><Download size={14} className="mr-1" /> Export</Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button onClick={openAdd}><Plus size={16} className="mr-1" /> Add Service</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{editItem ? "Edit Service" : "Add Service"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Service Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{CATEGORY_ICONS[c]} {c}</SelectItem>)}</SelectContent>
                </Select>
                <Textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
                <Input placeholder="Related Reports" value={form.related_reports} onChange={e => setForm({ ...form, related_reports: e.target.value })} />
                <Input placeholder="Related Documents" value={form.related_documents} onChange={e => setForm({ ...form, related_documents: e.target.value })} />
                <Input placeholder="Report Template" value={form.report_template} onChange={e => setForm({ ...form, report_template: e.target.value })} />
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent>
                </Select>
                <Button className="w-full" onClick={handleSave}>{editItem ? "Update" : "Add"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Services", value: stats.total, icon: <Wrench size={16} />, cls: "text-primary" },
          { label: "Active", value: stats.active, icon: <CheckCircle2 size={16} />, cls: "text-success" },
          { label: "Inactive", value: stats.inactive, icon: <XCircle size={16} />, cls: "text-destructive" },
          { label: "Categories", value: stats.categories, icon: <Layers size={16} />, cls: "text-accent-foreground" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-3 flex items-center gap-3">
            <div className={s.cls}>{s.icon}</div>
            <div><p className="text-xs text-muted-foreground">{s.label}</p><p className={`text-xl font-bold ${s.cls}`}>{s.value}</p></div>
          </CardContent></Card>
        ))}
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setCatFilter("all")} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${catFilter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
          All ({data.length})
        </button>
        {categoryCounts.filter(c => c.count > 0).map(c => (
          <button key={c.cat} onClick={() => setCatFilter(catFilter === c.cat ? "all" : c.cat)}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${catFilter === c.cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
            {c.icon} {c.cat} ({c.count})
          </button>
        ))}
      </div>

      <div className="relative"><Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} /><Input placeholder="Search services…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Reports</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium"><Wrench size={14} className="inline mr-1.5 text-muted-foreground" />{s.name}</TableCell>
                  <TableCell><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">{CATEGORY_ICONS[s.category]} {s.category}</span></TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{s.description || "—"}</TableCell>
                  <TableCell className="text-sm">{s.related_reports || "—"}</TableCell>
                  <TableCell><Badge variant={s.status === "Active" ? "default" : "secondary"}>{s.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setDetailItem(s)}><Eye size={14} /></Button>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(s)}><Pencil size={14} /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(s.id)}><Trash2 size={14} /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No services found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={!!detailItem} onOpenChange={() => setDetailItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{CATEGORY_ICONS[detailItem?.category || ""]} {detailItem?.name}</DialogTitle></DialogHeader>
          {detailItem && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant={detailItem.status === "Active" ? "default" : "secondary"}>{detailItem.status}</Badge>
                <span className="text-muted-foreground">{detailItem.category}</span>
              </div>
              {detailItem.description && <div><span className="text-muted-foreground font-semibold">Description:</span><p className="mt-1">{detailItem.description}</p></div>}
              {detailItem.related_reports && <div><span className="text-muted-foreground font-semibold">Related Reports:</span> {detailItem.related_reports}</div>}
              {detailItem.related_documents && <div><span className="text-muted-foreground font-semibold">Related Documents:</span> {detailItem.related_documents}</div>}
              {detailItem.report_template && <div><span className="text-muted-foreground font-semibold">Report Template:</span> {detailItem.report_template}</div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
