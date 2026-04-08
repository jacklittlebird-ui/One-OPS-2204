import { useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Plus, Trash2, Upload, Download, PlaneTakeoff, Wrench,
  Pencil, Database, ChevronLeft, ChevronRight, CheckCircle, XCircle, Layers,
  Plane, Building2, Eye, AlertTriangle, Calendar, Tag
} from "lucide-react";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import * as XLSX from "xlsx";

const PAGE_SIZE = 25;

const CATEGORIES = ["Passenger", "Military", "Private", "Cargo", "Ambulance"] as const;

type AircraftRow = { id: string; registration: string; type: string; airline: string; model: string; mtow: number; seats: number; certificate_no: string; issue_date: string; status: string; ac_type: string };

const categoryBadge = (s: string) => {
  switch (s) {
    case "Passenger": return <Badge variant="default" className="gap-1"><CheckCircle size={12} />{s}</Badge>;
    case "Military": return <Badge className="gap-1 bg-destructive/15 text-destructive border-destructive/30">{s}</Badge>;
    case "Private": return <Badge className="gap-1 bg-info/15 text-info border-info/30">{s}</Badge>;
    case "Cargo": return <Badge className="gap-1 bg-warning/15 text-warning border-warning/30">{s}</Badge>;
    case "Ambulance": return <Badge className="gap-1 bg-success/15 text-success border-success/30">{s}</Badge>;
    default: return <Badge variant="outline" className="gap-1">{s || "—"}</Badge>;
  }
};

export default function AircraftsPage() {
  const navigate = useNavigate();
  const { data, isLoading, add, update, remove } = useSupabaseTable<AircraftRow>("aircrafts", { orderBy: "registration", ascending: true });
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [airlineFilter, setAirlineFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<AircraftRow | null>(null);
  const [inspectItem, setInspectItem] = useState<AircraftRow | null>(null);
  const [form, setForm] = useState({ registration: "", type: "", airline: "", model: "", mtow: 0, seats: 0, certificate_no: "", issue_date: "", status: "Passenger", ac_type: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const types = useMemo(() => [...new Set(data.map(d => d.type).filter(Boolean))].sort(), [data]);
  const airlines = useMemo(() => [...new Set(data.map(d => d.airline).filter(Boolean))].sort(), [data]);

  const filtered = useMemo(() => {
    let result = data;
    if (typeFilter !== "all") result = result.filter(r => r.type === typeFilter);
    if (categoryFilter !== "all") result = result.filter(r => r.status === categoryFilter);
    if (airlineFilter !== "all") result = result.filter(r => r.airline === airlineFilter);
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(r => (r.registration || '').toLowerCase().includes(s) || (r.model || '').toLowerCase().includes(s) || (r.airline || '').toLowerCase().includes(s) || (r.certificate_no || '').toLowerCase().includes(s) || (r.ac_type || '').toLowerCase().includes(s));
    }
    return result;
  }, [data, typeFilter, categoryFilter, airlineFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const passengerCount = data.filter(d => d.status === "Passenger").length;
  const cargoCount = data.filter(d => d.status === "Cargo").length;
  const airlinesCount = new Set(data.map(d => d.airline)).size;

  const openAdd = () => { setEditItem(null); setForm({ registration: "", type: "", airline: "", model: "", mtow: 0, seats: 0, certificate_no: "", issue_date: "", status: "Passenger", ac_type: "" }); setDialogOpen(true); };
  const openEdit = (row: AircraftRow) => { setEditItem(row); setForm({ ...row }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.registration || !form.model) return;
    if (editItem) { await update({ id: editItem.id, ...form } as any); } else { await add(form as any); }
    setDialogOpen(false);
  };

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: "binary" });
      const json = XLSX.utils.sheet_to_json<any>(wb.Sheets[wb.SheetNames[0]]);
      for (const row of json) {
        await add({
          registration: row["Registration"] || "", type: row["Type"] || "", airline: row["Airline"] || "",
          model: row["Model"] || "", mtow: Number(row["MTOW"] || 0), seats: Number(row["Seats"] || 0),
          certificate_no: row["Certificate No."] || "", issue_date: row["Issue Date"] || null,
          status: row["Category"] || "Passenger", ac_type: row["A/C Type"] || "",
        });
      }
    };
    reader.readAsBinaryString(file); e.target.value = "";
  }, [add]);

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map(r => ({ Registration: r.registration, Type: r.type, Airline: r.airline, Model: r.model, "MTOW (T)": r.mtow, Seats: r.seats, "Certificate No.": r.certificate_no, "Issue Date": r.issue_date, Category: r.status, "A/C Type": r.ac_type })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Aircrafts"); XLSX.writeFile(wb, "aircrafts.xlsx");
  };

  const isExpiringSoon = (date: string) => {
    if (!date) return false;
    const d = new Date(date);
    const now = new Date();
    const diff = d.getTime() - now.getTime();
    return diff > 0 && diff < 90 * 24 * 60 * 60 * 1000;
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Aircrafts</h1>
          <p className="text-muted-foreground text-sm">Fleet registry, specifications & airworthiness certificates</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/flight-schedule")}><Plane size={14} className="mr-1" /> Flights</Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/airlines")}><Building2 size={14} className="mr-1" /> Airlines</Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><Upload size={14} className="mr-1" /> Import</Button>
          <Button variant="outline" size="sm" onClick={handleExport}><Download size={14} className="mr-1" /> Export</Button>
          <Button onClick={openAdd}><Plus size={16} className="mr-1" /> Add Aircraft</Button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleUpload} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><PlaneTakeoff className="text-primary" size={20} /></div>
          <div><div className="text-xl md:text-2xl font-bold text-foreground">{data.length}</div><div className="text-xs text-muted-foreground">Total Aircraft</div></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center"><CheckCircle className="text-success" size={20} /></div>
          <div><div className="text-xl md:text-2xl font-bold text-foreground">{passengerCount}</div><div className="text-xs text-muted-foreground">Passenger</div></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center"><Tag className="text-warning" size={20} /></div>
          <div><div className="text-xl md:text-2xl font-bold text-foreground">{cargoCount}</div><div className="text-xs text-muted-foreground">Cargo</div></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center"><Layers className="text-info" size={20} /></div>
          <div><div className="text-xl md:text-2xl font-bold text-foreground">{types.length}</div><div className="text-xs text-muted-foreground">Aircraft Types</div></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center"><Building2 className="text-accent-foreground" size={20} /></div>
          <div><div className="text-xl md:text-2xl font-bold text-foreground">{airlinesCount}</div><div className="text-xs text-muted-foreground">Airlines</div></div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
          <Input placeholder="Search by registration, model, airline, A/C type…" className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={airlineFilter} onValueChange={v => { setAirlineFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Airlines" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Airlines</SelectItem>{airlines.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Types</SelectItem>{types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Registration</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>A/C Type</TableHead>
                <TableHead>Airline</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>MTOW (T)</TableHead>
                <TableHead>Seats</TableHead>
                <TableHead>Certificate</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.length === 0 ? (
                <TableRow><TableCell colSpan={11} className="text-center py-12">
                  <Database size={40} className="mx-auto text-muted-foreground/40 mb-3" />
                  <p className="font-semibold text-foreground">No Aircraft Found</p>
                </TableCell></TableRow>
              ) : pageData.map(row => (
                <TableRow key={row.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setInspectItem(row)}>
                  <TableCell className="font-mono font-semibold text-foreground">{row.registration}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{row.type || "—"}</Badge></TableCell>
                  <TableCell>{row.ac_type || "—"}</TableCell>
                  <TableCell>{row.airline}</TableCell>
                  <TableCell>{row.model}</TableCell>
                  <TableCell className="font-mono">{row.mtow}</TableCell>
                  <TableCell>{row.seats}</TableCell>
                  <TableCell className="font-mono text-xs">{row.certificate_no || "—"}</TableCell>
                  <TableCell className="text-sm">
                    {row.issue_date || "—"}
                    {isExpiringSoon(row.issue_date) && <AlertTriangle size={12} className="inline ml-1 text-warning" />}
                  </TableCell>
                  <TableCell>{categoryBadge(row.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" onClick={() => setInspectItem(row)}><Eye size={14} /></Button>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(row)}><Pencil size={14} /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(row.id)}><Trash2 size={14} /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filtered.length > PAGE_SIZE && (
            <div className="p-3 border-t flex items-center justify-between text-sm text-muted-foreground">
              <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={14} /></Button>
                <span className="text-foreground font-medium">Page {page}/{totalPages}</span>
                <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={14} /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editItem ? "Edit Aircraft" : "Add Aircraft"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium text-foreground mb-1 block">Registration</label><Input placeholder="SU-GEA" value={form.registration} onChange={e => setForm({ ...form, registration: e.target.value.toUpperCase() })} /></div>
              <div><label className="text-sm font-medium text-foreground mb-1 block">Type</label><Input placeholder="NB / WB" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium text-foreground mb-1 block">A/C Type</label><Input placeholder="B737-800" value={form.ac_type} onChange={e => setForm({ ...form, ac_type: e.target.value })} /></div>
              <div><label className="text-sm font-medium text-foreground mb-1 block">Airline</label><Input value={form.airline} onChange={e => setForm({ ...form, airline: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium text-foreground mb-1 block">Model</label><Input placeholder="737-800" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} /></div>
              <div><label className="text-sm font-medium text-foreground mb-1 block">MTOW (Tonnes)</label><Input type="number" step="0.1" value={form.mtow} onChange={e => setForm({ ...form, mtow: +e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium text-foreground mb-1 block">Seats</label><Input type="number" value={form.seats} onChange={e => setForm({ ...form, seats: +e.target.value })} /></div>
              <div><label className="text-sm font-medium text-foreground mb-1 block">Certificate No.</label><Input value={form.certificate_no} onChange={e => setForm({ ...form, certificate_no: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium text-foreground mb-1 block">Issue Date</label><Input type="date" value={form.issue_date} onChange={e => setForm({ ...form, issue_date: e.target.value })} /></div>
              <div><label className="text-sm font-medium text-foreground mb-1 block">Category</label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full" onClick={handleSave}>{editItem ? "Update Aircraft" : "Add Aircraft"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inspector Modal */}
      <Dialog open={!!inspectItem} onOpenChange={() => setInspectItem(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><PlaneTakeoff size={18} /> Aircraft Details</DialogTitle></DialogHeader>
          {inspectItem && (
            <Tabs defaultValue="overview" className="mt-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="technical">Technical</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-4 pt-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
                    <span className="text-lg font-bold font-mono text-primary">{inspectItem.registration}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{inspectItem.model}</h3>
                    <p className="text-sm text-muted-foreground">{inspectItem.airline} · {inspectItem.type}</p>
                  </div>
                  {categoryBadge(inspectItem.status)}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3"><div className="text-xs text-muted-foreground mb-1">MTOW</div><div className="text-lg font-bold text-foreground">{inspectItem.mtow}T</div></div>
                  <div className="bg-muted/50 rounded-lg p-3"><div className="text-xs text-muted-foreground mb-1">Seats</div><div className="text-lg font-bold text-foreground">{inspectItem.seats}</div></div>
                  <div className="bg-muted/50 rounded-lg p-3"><div className="text-xs text-muted-foreground mb-1">Type</div><div className="text-lg font-bold text-foreground">{inspectItem.type || "—"}</div></div>
                  <div className="bg-muted/50 rounded-lg p-3"><div className="text-xs text-muted-foreground mb-1">A/C Type</div><div className="text-lg font-bold text-foreground">{inspectItem.ac_type || "—"}</div></div>
                </div>
              </TabsContent>
              <TabsContent value="technical" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">Certificate No.</div>
                    <div className="text-sm font-bold font-mono text-foreground">{inspectItem.certificate_no || "—"}</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Calendar size={12} /> Issue Date</div>
                    <div className="text-sm font-bold text-foreground">{inspectItem.issue_date || "—"}</div>
                    {isExpiringSoon(inspectItem.issue_date) && <div className="text-xs text-warning mt-1 flex items-center gap-1"><AlertTriangle size={10} /> Expiring soon</div>}
                  </div>
                </div>
                <div className="border rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-foreground mb-2">Quick Actions</h4>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setInspectItem(null); navigate("/flight-schedule"); }}><Plane size={14} className="mr-1" /> View Flights</Button>
                    <Button size="sm" variant="outline" onClick={() => { setInspectItem(null); openEdit(inspectItem); }}><Pencil size={14} className="mr-1" /> Edit Aircraft</Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
