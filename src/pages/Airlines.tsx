import { useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Plus, Trash2, Upload, Download, Building2, Globe, Users,
  Pencil, X, Database, ChevronLeft, ChevronRight, CheckCircle, XCircle, AlertCircle,
  Plane, FileText, Eye, Mail, Phone
} from "lucide-react";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import { useReadOnly } from "@/hooks/useReadOnly";
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

type AirlineRow = { id: string; code: string; name: string; country: string; contact_person: string; email: string; phone: string; status: string; credit_terms: string; billing_currency: string; iata_code: string; icao_code: string; alliance: string };

const statusBadge = (s: string) => {
  if (s === "Active") return <Badge variant="default" className="gap-1"><CheckCircle size={12} />{s}</Badge>;
  if (s === "Inactive") return <Badge variant="secondary" className="gap-1"><XCircle size={12} />{s}</Badge>;
  return <Badge variant="destructive" className="gap-1"><AlertCircle size={12} />{s}</Badge>;
};

export default function AirlinesPage() {
  const navigate = useNavigate();
  const readOnly = useReadOnly();
  const { data, isLoading, add, update, remove } = useSupabaseTable<AirlineRow>("airlines", { orderBy: "name", ascending: true });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<AirlineRow | null>(null);
  const [inspectItem, setInspectItem] = useState<AirlineRow | null>(null);
  const [form, setForm] = useState({ code: "", name: "", country: "", contact_person: "", email: "", phone: "", status: "Active", credit_terms: "Net 30", billing_currency: "USD", iata_code: "", icao_code: "", alliance: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const countries = useMemo(() => [...new Set(data.map(d => d.country).filter(Boolean))].sort(), [data]);

  const filtered = useMemo(() => {
    let result = data;
    if (statusFilter !== "all") result = result.filter(r => r.status === statusFilter);
    if (countryFilter !== "all") result = result.filter(r => r.country === countryFilter);
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(r => r.name.toLowerCase().includes(s) || r.code.toLowerCase().includes(s) || r.iata_code?.toLowerCase().includes(s) || r.country.toLowerCase().includes(s));
    }
    return result;
  }, [data, statusFilter, countryFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeCount = data.filter(d => d.status === "Active").length;
  const countriesCount = new Set(data.map(d => d.country)).size;

  const openAdd = () => { setEditItem(null); setForm({ code: "", name: "", country: "", contact_person: "", email: "", phone: "", status: "Active", credit_terms: "Net 30", billing_currency: "USD", iata_code: "", icao_code: "", alliance: "" }); setDialogOpen(true); };
  const openEdit = (row: AirlineRow) => { setEditItem(row); setForm({ ...row }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.code || !form.name) return;
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
          code: row["Code"] || "", name: row["Name"] || "", country: row["Country"] || "",
          contact_person: row["Contact Person"] || "", email: row["Email"] || "",
          phone: row["Phone"] || "", status: row["Status"] || "Active",
          iata_code: row["IATA"] || "", icao_code: row["ICAO"] || "",
          alliance: row["Alliance"] || "", credit_terms: row["Credit Terms"] || "Net 30",
          billing_currency: row["Currency"] || "USD",
        });
      }
    };
    reader.readAsBinaryString(file); e.target.value = "";
  }, [add]);

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map(r => ({ Code: r.code, Name: r.name, IATA: r.iata_code, ICAO: r.icao_code, Country: r.country, Alliance: r.alliance, "Credit Terms": r.credit_terms, Currency: r.billing_currency, "Contact Person": r.contact_person, Email: r.email, Phone: r.phone, Status: r.status })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Airlines"); XLSX.writeFile(wb, "airlines.xlsx");
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Airlines</h1>
          <p className="text-muted-foreground text-sm">Airline partners, commercial terms & contact directory</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/flight-schedule")}><Plane size={14} className="mr-1" /> Flights</Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/contracts")}><FileText size={14} className="mr-1" /> Contracts</Button>
          {!readOnly && <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><Upload size={14} className="mr-1" /> Import</Button>}
          <Button variant="outline" size="sm" onClick={handleExport}><Download size={14} className="mr-1" /> Export</Button>
          {!readOnly && <Button onClick={openAdd}><Plus size={16} className="mr-1" /> Add Airline</Button>}
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleUpload} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Building2 className="text-primary" size={20} /></div>
          <div><div className="text-xl md:text-2xl font-bold text-foreground">{data.length}</div><div className="text-xs text-muted-foreground">Total Airlines</div></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center"><CheckCircle className="text-success" size={20} /></div>
          <div><div className="text-xl md:text-2xl font-bold text-foreground">{activeCount}</div><div className="text-xs text-muted-foreground">Active Airlines</div></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center"><Globe className="text-info" size={20} /></div>
          <div><div className="text-xl md:text-2xl font-bold text-foreground">{countriesCount}</div><div className="text-xs text-muted-foreground">Countries</div></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center"><Users className="text-accent-foreground" size={20} /></div>
          <div><div className="text-xl md:text-2xl font-bold text-foreground">{data.filter(d => d.contact_person).length}</div><div className="text-xs text-muted-foreground">Contacts</div></div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
          <Input placeholder="Search by name, code, IATA, or country…" className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={countryFilter} onValueChange={v => { setCountryFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Countries" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Countries</SelectItem>{countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem><SelectItem value="Suspended">Suspended</SelectItem></SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Airline Name</TableHead>
                <TableHead>IATA</TableHead>
                <TableHead>ICAO</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Alliance</TableHead>
                <TableHead>Credit Terms</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center py-12">
                  <Database size={40} className="mx-auto text-muted-foreground/40 mb-3" />
                  <p className="font-semibold text-foreground">No Airlines Found</p>
                </TableCell></TableRow>
              ) : pageData.map(row => (
                <TableRow key={row.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setInspectItem(row)}>
                  <TableCell className="font-mono font-semibold text-foreground">{row.code}</TableCell>
                  <TableCell className="font-semibold text-foreground">{row.name}</TableCell>
                  <TableCell><Badge variant="outline" className="font-mono text-xs">{row.iata_code || "—"}</Badge></TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{row.icao_code || "—"}</TableCell>
                  <TableCell>{row.country}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{row.alliance || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{row.credit_terms || "Net 30"}</TableCell>
                  <TableCell>
                    <div className="text-foreground text-xs">{row.contact_person}</div>
                    <div className="text-muted-foreground text-xs">{row.email}</div>
                  </TableCell>
                  <TableCell>{statusBadge(row.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" onClick={() => setInspectItem(row)}><Eye size={14} /></Button>
                      {!readOnly && <Button size="icon" variant="ghost" onClick={() => openEdit(row)}><Pencil size={14} /></Button>}
                      {!readOnly && <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(row.id)}><Trash2 size={14} /></Button>}
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
          <DialogHeader><DialogTitle>{editItem ? "Edit Airline" : "Add Airline"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-sm font-medium text-foreground mb-1 block">Code</label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} maxLength={3} /></div>
              <div><label className="text-sm font-medium text-foreground mb-1 block">IATA</label><Input value={form.iata_code} onChange={e => setForm({ ...form, iata_code: e.target.value.toUpperCase() })} maxLength={3} /></div>
              <div><label className="text-sm font-medium text-foreground mb-1 block">ICAO</label><Input value={form.icao_code} onChange={e => setForm({ ...form, icao_code: e.target.value.toUpperCase() })} maxLength={4} /></div>
            </div>
            <div><label className="text-sm font-medium text-foreground mb-1 block">Airline Name</label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium text-foreground mb-1 block">Country</label><Input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} /></div>
              <div><label className="text-sm font-medium text-foreground mb-1 block">Alliance</label><Input placeholder="e.g. Star Alliance" value={form.alliance} onChange={e => setForm({ ...form, alliance: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium text-foreground mb-1 block">Credit Terms</label>
                <Select value={form.credit_terms} onValueChange={v => setForm({ ...form, credit_terms: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Net 15">Net 15</SelectItem><SelectItem value="Net 30">Net 30</SelectItem><SelectItem value="Net 45">Net 45</SelectItem><SelectItem value="Net 60">Net 60</SelectItem><SelectItem value="Prepaid">Prepaid</SelectItem></SelectContent>
                </Select>
              </div>
              <div><label className="text-sm font-medium text-foreground mb-1 block">Billing Currency</label>
                <Select value={form.billing_currency} onValueChange={v => setForm({ ...form, billing_currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="EGP">EGP</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div><label className="text-sm font-medium text-foreground mb-1 block">Contact Person</label><Input value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium text-foreground mb-1 block">Email</label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div><label className="text-sm font-medium text-foreground mb-1 block">Phone</label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div><label className="text-sm font-medium text-foreground mb-1 block">Status</label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem><SelectItem value="Suspended">Suspended</SelectItem></SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleSave}>{editItem ? "Update Airline" : "Add Airline"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inspector Modal */}
      <Dialog open={!!inspectItem} onOpenChange={() => setInspectItem(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Plane size={18} /> Airline Details</DialogTitle></DialogHeader>
          {inspectItem && (
            <Tabs defaultValue="overview" className="mt-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="commercial">Commercial</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-4 pt-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
                    <span className="text-xl font-bold text-primary">{inspectItem.code}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{inspectItem.name}</h3>
                    <p className="text-sm text-muted-foreground">{inspectItem.country} · {inspectItem.alliance || "No Alliance"}</p>
                  </div>
                  {statusBadge(inspectItem.status)}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3"><div className="text-xs text-muted-foreground mb-1">IATA Code</div><div className="text-lg font-bold font-mono text-foreground">{inspectItem.iata_code || "—"}</div></div>
                  <div className="bg-muted/50 rounded-lg p-3"><div className="text-xs text-muted-foreground mb-1">ICAO Code</div><div className="text-lg font-bold font-mono text-foreground">{inspectItem.icao_code || "—"}</div></div>
                </div>
                <div className="border rounded-lg p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-foreground">Contact Information</h4>
                  <div className="flex items-center gap-2 text-sm"><Users size={14} className="text-muted-foreground" /> {inspectItem.contact_person || "—"}</div>
                  <div className="flex items-center gap-2 text-sm"><Mail size={14} className="text-muted-foreground" /> {inspectItem.email || "—"}</div>
                  <div className="flex items-center gap-2 text-sm"><Phone size={14} className="text-muted-foreground" /> {inspectItem.phone || "—"}</div>
                </div>
              </TabsContent>
              <TabsContent value="commercial" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3"><div className="text-xs text-muted-foreground mb-1">Credit Terms</div><div className="text-lg font-bold text-foreground">{inspectItem.credit_terms}</div></div>
                  <div className="bg-muted/50 rounded-lg p-3"><div className="text-xs text-muted-foreground mb-1">Billing Currency</div><div className="text-lg font-bold text-foreground">{inspectItem.billing_currency}</div></div>
                </div>
                <div className="border rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-foreground mb-2">Quick Actions</h4>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setInspectItem(null); navigate("/contracts"); }}><FileText size={14} className="mr-1" /> View Contracts</Button>
                    <Button size="sm" variant="outline" onClick={() => { setInspectItem(null); navigate("/flight-schedule"); }}><Plane size={14} className="mr-1" /> View Flights</Button>
                    <Button size="sm" variant="outline" onClick={() => { setInspectItem(null); navigate("/invoices"); }}><FileText size={14} className="mr-1" /> Invoices</Button>
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
