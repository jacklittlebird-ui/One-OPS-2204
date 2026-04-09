import { useState, useMemo, useCallback, useRef } from "react";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import { useReadOnly } from "@/hooks/useReadOnly";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Search, Pencil, Trash2, Building2, Globe, CheckCircle, XCircle,
  Upload, Download, ChevronLeft, ChevronRight, MapPin, Eye, X, Plane
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

type AirportRow = { id: string; country_id: string; name: string; iata_code: string; icao_code: string; city: string; terminal_count: number; status: string; created_at: string };
type CountryRow = { id: string; name: string; code: string; };

const PAGE_SIZE = 20;

export default function AirportsPage() {
  const readOnly = useReadOnly();
  const { data, isLoading, add, update, remove } = useSupabaseTable<AirportRow>("airports", { orderBy: "name", ascending: true });
  const { data: countries } = useQuery({
    queryKey: ["countries"],
    queryFn: async () => { const { data } = await supabase.from("countries" as any).select("id,name,code").order("name"); return (data || []) as unknown as CountryRow[]; },
  });
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<AirportRow | null>(null);
  const [inspectItem, setInspectItem] = useState<AirportRow | null>(null);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ country_id: "", name: "", iata_code: "", icao_code: "", city: "", terminal_count: 1, status: "Active" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const countryMap = Object.fromEntries((countries || []).map(c => [c.id, c]));

  const filtered = useMemo(() => {
    return data.filter(a => {
      const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.iata_code.toLowerCase().includes(search.toLowerCase()) || a.city.toLowerCase().includes(search.toLowerCase());
      const matchCountry = countryFilter === "all" || a.country_id === countryFilter;
      const matchStatus = statusFilter === "all" || a.status === statusFilter;
      return matchSearch && matchCountry && matchStatus;
    });
  }, [data, search, countryFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // KPI stats
  const activeCount = data.filter(a => a.status === "Active").length;
  const countriesCount = new Set(data.map(a => a.country_id)).size;
  const totalTerminals = data.reduce((s, a) => s + (a.terminal_count || 0), 0);

  const openAdd = () => { setEditItem(null); setForm({ country_id: countries?.[0]?.id || "", name: "", iata_code: "", icao_code: "", city: "", terminal_count: 1, status: "Active" }); setDialogOpen(true); };
  const openEdit = (a: AirportRow) => { setEditItem(a); setForm({ country_id: a.country_id, name: a.name, iata_code: a.iata_code, icao_code: a.icao_code, city: a.city, terminal_count: a.terminal_count, status: a.status }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name || !form.iata_code || !form.country_id) { toast({ title: "Error", description: "Name, IATA code, and country required", variant: "destructive" }); return; }
    if (editItem) { await update({ id: editItem.id, ...form } as any); } else { await add(form as any); }
    setDialogOpen(false);
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map(a => ({
      Name: a.name, IATA: a.iata_code, ICAO: a.icao_code, City: a.city,
      Country: countryMap[a.country_id]?.name || "", Terminals: a.terminal_count, Status: a.status,
    })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Airports"); XLSX.writeFile(wb, "airports.xlsx");
  };

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: "binary" });
      const json = XLSX.utils.sheet_to_json<any>(wb.Sheets[wb.SheetNames[0]]);
      for (const row of json) {
        await add({
          name: row["Name"] || "", iata_code: row["IATA"] || "", icao_code: row["ICAO"] || "",
          city: row["City"] || "", terminal_count: Number(row["Terminals"] || 1),
          status: row["Status"] || "Active", country_id: countries?.[0]?.id || "",
        } as any);
      }
    };
    reader.readAsBinaryString(file); e.target.value = "";
  }, [add, countries]);

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Airports</h1>
          <p className="text-muted-foreground text-sm">Manage operating airports, terminals & ground infrastructure</p>
        </div>
        <div className="flex gap-2">
          {!readOnly && <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><Upload size={14} className="mr-1" /> Import</Button>}
          <Button variant="outline" size="sm" onClick={handleExport}><Download size={14} className="mr-1" /> Export</Button>
          {!readOnly && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button onClick={openAdd}><Plus size={16} className="mr-1" /> Add Airport</Button></DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader><DialogTitle>{editItem ? "Edit Airport" : "Add Airport"}</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Country</label>
                  <Select value={form.country_id} onValueChange={v => setForm({ ...form, country_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select Country" /></SelectTrigger>
                    <SelectContent>{(countries || []).map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Airport Name</label>
                  <Input placeholder="Cairo International Airport" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">IATA Code</label>
                    <Input placeholder="CAI" value={form.iata_code} onChange={e => setForm({ ...form, iata_code: e.target.value.toUpperCase() })} maxLength={4} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">ICAO Code</label>
                    <Input placeholder="HECA" value={form.icao_code} onChange={e => setForm({ ...form, icao_code: e.target.value.toUpperCase() })} maxLength={4} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">City</label>
                    <Input placeholder="Cairo" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Terminals</label>
                    <Input type="number" value={form.terminal_count} onChange={e => setForm({ ...form, terminal_count: parseInt(e.target.value) || 1 })} min={1} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Status</label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={handleSave}>{editItem ? "Update Airport" : "Add Airport"}</Button>
              </div>
            </DialogContent>
          </Dialog>
          )}
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleUpload} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Building2 className="text-primary" size={20} /></div>
          <div><div className="text-2xl font-bold text-foreground">{data.length}</div><div className="text-xs text-muted-foreground">Total Airports</div></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center"><CheckCircle className="text-success" size={20} /></div>
          <div><div className="text-2xl font-bold text-foreground">{activeCount}</div><div className="text-xs text-muted-foreground">Active Airports</div></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center"><Globe className="text-info" size={20} /></div>
          <div><div className="text-2xl font-bold text-foreground">{countriesCount}</div><div className="text-xs text-muted-foreground">Countries</div></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center"><MapPin className="text-accent-foreground" size={20} /></div>
          <div><div className="text-2xl font-bold text-foreground">{totalTerminals}</div><div className="text-xs text-muted-foreground">Total Terminals</div></div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
          <Input placeholder="Search by name, IATA, or city…" className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={countryFilter} onValueChange={v => { setCountryFilter(v); setPage(1); }}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Countries" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Countries</SelectItem>{(countries || []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Airport</TableHead>
                <TableHead>IATA</TableHead>
                <TableHead>ICAO</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Terminals</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.map(a => (
                <TableRow key={a.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setInspectItem(a)}>
                  <TableCell className="font-medium"><Building2 size={14} className="inline mr-1.5 text-muted-foreground" />{a.name}</TableCell>
                  <TableCell><Badge variant="outline" className="font-mono">{a.iata_code}</Badge></TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">{a.icao_code}</TableCell>
                  <TableCell>{a.city}</TableCell>
                  <TableCell>{countryMap[a.country_id]?.name || "—"}</TableCell>
                  <TableCell>{a.terminal_count}</TableCell>
                  <TableCell><Badge variant={a.status === "Active" ? "default" : "secondary"}>{a.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" onClick={() => setInspectItem(a)}><Eye size={14} /></Button>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(a)}><Pencil size={14} /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(a.id)}><Trash2 size={14} /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No airports found</TableCell></TableRow>}
            </TableBody>
          </Table>

          {/* Pagination */}
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

      {/* Inspector Modal */}
      <Dialog open={!!inspectItem} onOpenChange={() => setInspectItem(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Building2 size={18} /> Airport Details</DialogTitle></DialogHeader>
          {inspectItem && (
            <Tabs defaultValue="overview" className="mt-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="operations">Operations</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-4 pt-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Building2 className="text-primary" size={28} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{inspectItem.name}</h3>
                    <p className="text-sm text-muted-foreground">{inspectItem.city}, {countryMap[inspectItem.country_id]?.name || "—"}</p>
                  </div>
                  <Badge className="ml-auto" variant={inspectItem.status === "Active" ? "default" : "secondary"}>{inspectItem.status}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">IATA Code</div>
                    <div className="text-lg font-bold font-mono text-foreground">{inspectItem.iata_code}</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">ICAO Code</div>
                    <div className="text-lg font-bold font-mono text-foreground">{inspectItem.icao_code}</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">Terminals</div>
                    <div className="text-lg font-bold text-foreground">{inspectItem.terminal_count}</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">Country Code</div>
                    <div className="text-lg font-bold font-mono text-foreground">{countryMap[inspectItem.country_id]?.code || "—"}</div>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="operations" className="space-y-3 pt-4">
                <div className="text-sm text-muted-foreground">
                  <p>Operations data linked to <strong>{inspectItem.iata_code}</strong> will appear here once flights and service reports reference this airport.</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="border rounded-lg p-3 text-center">
                    <Plane size={18} className="mx-auto mb-1 text-primary" />
                    <div className="text-xs text-muted-foreground">Daily Flights</div>
                    <div className="text-lg font-bold text-foreground">—</div>
                  </div>
                  <div className="border rounded-lg p-3 text-center">
                    <Building2 size={18} className="mx-auto mb-1 text-info" />
                    <div className="text-xs text-muted-foreground">Service Providers</div>
                    <div className="text-lg font-bold text-foreground">—</div>
                  </div>
                  <div className="border rounded-lg p-3 text-center">
                    <Globe size={18} className="mx-auto mb-1 text-success" />
                    <div className="text-xs text-muted-foreground">Airlines Served</div>
                    <div className="text-lg font-bold text-foreground">—</div>
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
