import { useState, useMemo } from "react";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Plus, Search, Pencil, Trash2, Truck, Download, Building2,
  Phone, Mail, FileText, MapPin, Globe, Shield, ChevronRight,
  Users, CheckCircle2, XCircle, TrendingUp, Fuel, UtensilsCrossed,
  Plane, Star, Eye, ArrowUpDown
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { exportToExcel } from "@/lib/exportExcel";

type ProviderRow = {
  id: string; name: string; country_id: string | null; airport_id: string | null;
  service_category: string; contact_person: string; phone: string; email: string;
  contract_ref: string; status: string; created_at: string;
};

const SERVICE_CATEGORIES = [
  "Civil Aviation", "Ground Handling", "Catering", "Hotac",
  "Fuel", "Security", "Special Services", "Transport", "VIP"
] as const;

const categoryConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  "Civil Aviation":   { icon: <Shield size={14} />,           color: "text-primary",         bg: "bg-primary/10" },
  "Ground Handling":  { icon: <Plane size={14} />,            color: "text-info",            bg: "bg-info/10" },
  "Catering":         { icon: <UtensilsCrossed size={14} />,  color: "text-warning",         bg: "bg-warning/10" },
  "Hotac":            { icon: <Building2 size={14} />,        color: "text-accent",          bg: "bg-accent/10" },
  "Fuel":             { icon: <Fuel size={14} />,             color: "text-destructive",     bg: "bg-destructive/10" },
  "Security":         { icon: <Shield size={14} />,           color: "text-success",         bg: "bg-success/10" },
  "Special Services": { icon: <Star size={14} />,             color: "text-primary",         bg: "bg-primary/10" },
  "Transport":        { icon: <Truck size={14} />,            color: "text-info",            bg: "bg-info/10" },
  "VIP":              { icon: <Star size={14} />,             color: "text-warning",         bg: "bg-warning/10" },
};

type SortKey = "name" | "service_category" | "status";

export default function ServiceProvidersPage() {
  const { data, isLoading, add, update, remove } = useSupabaseTable<ProviderRow>("service_providers");
  const { data: countries } = useQuery({
    queryKey: ["countries"],
    queryFn: async () => {
      const { data } = await supabase.from("countries").select("id,name");
      return (data || []) as { id: string; name: string }[];
    },
  });
  const { data: airports } = useQuery({
    queryKey: ["airports"],
    queryFn: async () => {
      const { data } = await supabase.from("airports").select("id,name,iata_code,country_id");
      return (data || []) as { id: string; name: string; iata_code: string; country_id: string }[];
    },
  });

  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<ProviderRow | null>(null);
  const [editItem, setEditItem] = useState<ProviderRow | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);

  const emptyForm = {
    name: "", country_id: "", airport_id: "", service_category: "Ground Handling",
    contact_person: "", phone: "", email: "", contract_ref: "", status: "Active",
  };
  const [form, setForm] = useState(emptyForm);

  const countryMap = useMemo(() => Object.fromEntries((countries || []).map(c => [c.id, c.name])), [countries]);
  const airportMap = useMemo(() => Object.fromEntries((airports || []).map(a => [a.id, a])), [airports]);
  const filteredAirports = form.country_id ? (airports || []).filter(a => a.country_id === form.country_id) : (airports || []);

  // KPI stats
  const stats = useMemo(() => {
    const total = data.length;
    const active = data.filter(p => p.status === "Active").length;
    const inactive = total - active;
    const categoryCounts = SERVICE_CATEGORIES.map(c => ({
      cat: c, count: data.filter(p => p.service_category === c).length,
    })).sort((a, b) => b.count - a.count);
    const topCategory = categoryCounts[0];
    return { total, active, inactive, topCategory };
  }, [data]);

  // Filtered + sorted
  const filtered = useMemo(() => {
    let result = data.filter(p => {
      const ms = !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.contact_person.toLowerCase().includes(search.toLowerCase()) ||
        p.email.toLowerCase().includes(search.toLowerCase());
      const mc = catFilter === "all" || p.service_category === catFilter;
      const mst = statusFilter === "all" || p.status === statusFilter;
      return ms && mc && mst;
    });
    result.sort((a, b) => {
      const av = a[sortKey] || "";
      const bv = b[sortKey] || "";
      return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return result;
  }, [data, search, catFilter, statusFilter, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const openAdd = () => { setEditItem(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (p: ProviderRow) => {
    setEditItem(p);
    setForm({
      name: p.name, country_id: p.country_id || "", airport_id: p.airport_id || "",
      service_category: p.service_category, contact_person: p.contact_person,
      phone: p.phone, email: p.email, contract_ref: p.contract_ref, status: p.status,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) { toast({ title: "Error", description: "Provider name is required", variant: "destructive" }); return; }
    const payload: any = { ...form };
    if (!payload.country_id) payload.country_id = null;
    if (!payload.airport_id) payload.airport_id = null;
    if (editItem) await update({ id: editItem.id, ...payload });
    else await add(payload);
    setDialogOpen(false);
  };

  const handleExport = () => {
    const rows = filtered.map(p => ({
      Name: p.name,
      Category: p.service_category,
      Country: countryMap[p.country_id || ""] || "",
      Airport: airportMap[p.airport_id || ""]?.iata_code || "",
      Contact: p.contact_person,
      Phone: p.phone,
      Email: p.email,
      Contract: p.contract_ref,
      Status: p.status,
    }));
    exportToExcel(rows, "Service_Providers");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this provider?")) return;
    await remove(id);
    if (detailItem?.id === id) setDetailItem(null);
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );

  const kpiCards = [
    { label: "Total Providers", value: stats.total, icon: <Users size={20} />, color: "text-primary", bg: "bg-primary/10" },
    { label: "Active", value: stats.active, icon: <CheckCircle2 size={20} />, color: "text-success", bg: "bg-success/10" },
    { label: "Inactive", value: stats.inactive, icon: <XCircle size={20} />, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "Top Category", value: stats.topCategory?.cat || "—", sub: `${stats.topCategory?.count || 0} providers`, icon: <TrendingUp size={20} />, color: "text-warning", bg: "bg-warning/10" },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <Truck size={22} className="text-primary" /> Service Providers
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm mt-0.5">
            Manage suppliers & service partners · {data.length} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download size={14} className="mr-1" /> Export
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openAdd}><Plus size={14} className="mr-1" /> Add Provider</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editItem ? "Edit Provider" : "New Provider"}</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Provider Name *</label>
                  <Input className="mt-1" placeholder="e.g. Cairo Ground Services" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Service Category</label>
                  <Select value={form.service_category} onValueChange={v => setForm({ ...form, service_category: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{SERVICE_CATEGORIES.map(c => (
                      <SelectItem key={c} value={c}>
                        <span className="flex items-center gap-2">{categoryConfig[c]?.icon} {c}</span>
                      </SelectItem>
                    ))}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Country</label>
                    <Select value={form.country_id || "none"} onValueChange={v => setForm({ ...form, country_id: v === "none" ? "" : v, airport_id: "" })}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— None —</SelectItem>
                        {(countries || []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Airport</label>
                    <Select value={form.airport_id || "none"} onValueChange={v => setForm({ ...form, airport_id: v === "none" ? "" : v })}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— None —</SelectItem>
                        {filteredAirports.map(a => <SelectItem key={a.id} value={a.id}>{a.name} ({a.iata_code})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Separator />
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Contact Person</label>
                  <Input className="mt-1" placeholder="Full name" value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Phone</label>
                    <Input className="mt-1" placeholder="+20 xxx" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Email</label>
                    <Input className="mt-1" placeholder="email@provider.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Contract Reference</label>
                  <Input className="mt-1" placeholder="CTR-2025-xxx" value={form.contract_ref} onChange={e => setForm({ ...form, contract_ref: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Status</label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={handleSave}>{editItem ? "Update Provider" : "Add Provider"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpiCards.map((k, i) => (
          <Card key={i} className="border">
            <CardContent className="p-3 md:p-4 flex items-start gap-3">
              <div className={`p-2 rounded-lg ${k.bg} ${k.color} shrink-0`}>{k.icon}</div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium truncate">{k.label}</p>
                <p className="text-lg md:text-xl font-bold text-foreground truncate">
                  {typeof k.value === "number" ? k.value.toLocaleString() : k.value}
                </p>
                {"sub" in k && k.sub && <p className="text-[10px] text-muted-foreground">{k.sub}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Category Breakdown mini-bar */}
      <Card className="border">
        <CardContent className="p-3 md:p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Distribution by Category</p>
          <div className="flex flex-wrap gap-2">
            {SERVICE_CATEGORIES.map(cat => {
              const count = data.filter(p => p.service_category === cat).length;
              if (count === 0) return null;
              const cfg = categoryConfig[cat];
              return (
                <button
                  key={cat}
                  onClick={() => setCatFilter(catFilter === cat ? "all" : cat)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    catFilter === cat
                      ? "ring-2 ring-primary border-primary"
                      : "border-border hover:border-muted-foreground/30"
                  } ${cfg?.bg || ""} ${cfg?.color || ""}`}
                >
                  {cfg?.icon} {cat}
                  <span className="ml-1 font-bold">{count}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
          <Input placeholder="Search by name, contact, or email…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="h-9">
            <TabsTrigger value="all" className="text-xs px-3">All</TabsTrigger>
            <TabsTrigger value="Active" className="text-xs px-3">Active</TabsTrigger>
            <TabsTrigger value="Inactive" className="text-xs px-3">Inactive</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Table */}
      <Card className="border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("name")}>
                    <span className="flex items-center gap-1">Provider <ArrowUpDown size={12} className="text-muted-foreground" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hidden md:table-cell" onClick={() => toggleSort("service_category")}>
                    <span className="flex items-center gap-1">Category <ArrowUpDown size={12} className="text-muted-foreground" /></span>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">Location</TableHead>
                  <TableHead className="hidden md:table-cell">Contact</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("status")}>
                    <span className="flex items-center gap-1">Status <ArrowUpDown size={12} className="text-muted-foreground" /></span>
                  </TableHead>
                  <TableHead className="w-28 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => {
                  const cfg = categoryConfig[p.service_category];
                  return (
                    <TableRow key={p.id} className="group hover:bg-muted/50 cursor-pointer" onClick={() => setDetailItem(p)}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg ${cfg?.bg || "bg-muted"} ${cfg?.color || ""} flex items-center justify-center shrink-0`}>
                            {cfg?.icon || <Truck size={14} />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-foreground truncate">{p.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate md:hidden">{p.service_category}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline" className={`${cfg?.color || ""} border-current/20 text-xs`}>
                          {cfg?.icon} <span className="ml-1">{p.service_category}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin size={12} />
                          <span>{countryMap[p.country_id || ""] || "—"}</span>
                          {airportMap[p.airport_id || ""] && (
                            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{airportMap[p.airport_id || ""]?.iata_code}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium text-foreground truncate max-w-[160px]">{p.contact_person || "—"}</p>
                          {p.email && <p className="text-[10px] text-muted-foreground truncate max-w-[160px]">{p.email}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.status === "Active" ? "default" : "secondary"} className="text-xs">
                          {p.status === "Active" ? <CheckCircle2 size={10} className="mr-1" /> : <XCircle size={10} className="mr-1" />}
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-0.5">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDetailItem(p)}>
                            <Eye size={14} className="text-muted-foreground" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(p)}>
                            <Pencil size={14} className="text-muted-foreground" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(p.id)}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <Truck size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="font-medium">No providers found</p>
                      <p className="text-xs">Try adjusting your filters or add a new provider</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {filtered.length > 0 && (
            <div className="px-4 py-2 border-t text-xs text-muted-foreground">
              Showing {filtered.length} of {data.length} providers
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={!!detailItem} onOpenChange={() => setDetailItem(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          {detailItem && (() => {
            const p = detailItem;
            const cfg = categoryConfig[p.service_category];
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <div className={`w-9 h-9 rounded-lg ${cfg?.bg || "bg-muted"} ${cfg?.color || ""} flex items-center justify-center`}>
                      {cfg?.icon || <Truck size={16} />}
                    </div>
                    <div>
                      <span className="text-lg">{p.name}</span>
                      <Badge variant={p.status === "Active" ? "default" : "secondary"} className="ml-2 text-[10px]">
                        {p.status}
                      </Badge>
                    </div>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <InfoBlock icon={<Shield size={14} />} label="Category" value={p.service_category} />
                    <InfoBlock icon={<Globe size={14} />} label="Country" value={countryMap[p.country_id || ""] || "—"} />
                    <InfoBlock icon={<MapPin size={14} />} label="Airport" value={airportMap[p.airport_id || ""]?.iata_code || "—"} />
                    <InfoBlock icon={<FileText size={14} />} label="Contract Ref" value={p.contract_ref || "—"} />
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Contact Details</p>
                    <div className="grid grid-cols-1 gap-2">
                      <InfoBlock icon={<Users size={14} />} label="Contact Person" value={p.contact_person || "—"} />
                      <InfoBlock icon={<Phone size={14} />} label="Phone" value={p.phone || "—"} />
                      <InfoBlock icon={<Mail size={14} />} label="Email" value={p.email || "—"} />
                    </div>
                  </div>
                  <Separator />
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" onClick={() => { setDetailItem(null); openEdit(p); }}>
                      <Pencil size={14} className="mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(p.id)}>
                      <Trash2 size={14} className="mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoBlock({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase font-medium">{label}</p>
        <p className="text-sm font-medium text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}
