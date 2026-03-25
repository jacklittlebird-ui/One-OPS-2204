import { useState } from "react";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Pencil, Trash2, Truck } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type ProviderRow = { id: string; name: string; country_id: string; airport_id: string; service_category: string; contact_person: string; phone: string; email: string; contract_ref: string; status: string; };

const SERVICE_CATEGORIES = ["Civil Aviation", "Ground Handling", "Catering", "Hotac", "Fuel", "Security", "Special Services", "Transport", "VIP"];

export default function ServiceProvidersPage() {
  const { data, isLoading, add, update, remove } = useSupabaseTable<ProviderRow>("service_providers");
  const { data: countries } = useQuery({ queryKey: ["countries"], queryFn: async () => { const { data } = await supabase.from("countries" as any).select("id,name"); return (data || []) as unknown as { id: string; name: string }[]; } });
  const { data: airports } = useQuery({ queryKey: ["airports"], queryFn: async () => { const { data } = await supabase.from("airports" as any).select("id,name,iata_code,country_id"); return (data || []) as unknown as { id: string; name: string; iata_code: string; country_id: string }[]; } });

  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<ProviderRow | null>(null);
  const emptyForm = { name: "", country_id: "", airport_id: "", service_category: "Ground Handling", contact_person: "", phone: "", email: "", contract_ref: "", status: "Active" };
  const [form, setForm] = useState(emptyForm);

  const countryMap = Object.fromEntries((countries || []).map(c => [c.id, c.name]));
  const airportMap = Object.fromEntries((airports || []).map(a => [a.id, a]));
  const filteredAirports = form.country_id ? (airports || []).filter(a => a.country_id === form.country_id) : (airports || []);

  const filtered = data.filter(p => {
    const ms = p.name.toLowerCase().includes(search.toLowerCase()) || p.contact_person.toLowerCase().includes(search.toLowerCase());
    const mc = catFilter === "all" || p.service_category === catFilter;
    return ms && mc;
  });

  const openAdd = () => { setEditItem(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (p: ProviderRow) => { setEditItem(p); setForm({ name: p.name, country_id: p.country_id || "", airport_id: p.airport_id || "", service_category: p.service_category, contact_person: p.contact_person, phone: p.phone, email: p.email, contract_ref: p.contract_ref, status: p.status }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name) { toast({ title: "Error", description: "Provider name is required", variant: "destructive" }); return; }
    const payload: any = { ...form };
    if (!payload.country_id) delete payload.country_id;
    if (!payload.airport_id) delete payload.airport_id;
    if (editItem) { await update({ id: editItem.id, ...payload }); } else { await add(payload); }
    setDialogOpen(false);
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Service Providers</h1>
          <p className="text-muted-foreground text-sm">Manage suppliers & service providers · {data.length} providers</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button onClick={openAdd}><Plus size={16} className="mr-1" /> Add Provider</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editItem ? "Edit Provider" : "Add Provider"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Provider Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <Select value={form.service_category} onValueChange={v => setForm({ ...form, service_category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SERVICE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-2">
                <Select value={form.country_id || "none"} onValueChange={v => setForm({ ...form, country_id: v === "none" ? "" : v, airport_id: "" })}>
                  <SelectTrigger><SelectValue placeholder="Country" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">No Country</SelectItem>{(countries || []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.airport_id || "none"} onValueChange={v => setForm({ ...form, airport_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Airport" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">No Airport</SelectItem>{filteredAirports.map(a => <SelectItem key={a.id} value={a.id}>{a.name} ({a.iata_code})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Input placeholder="Contact Person" value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                <Input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <Input placeholder="Contract Reference" value={form.contract_ref} onChange={e => setForm({ ...form, contract_ref: e.target.value })} />
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent>
              </Select>
              <Button className="w-full" onClick={handleSave}>{editItem ? "Update" : "Add"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1"><Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} /><Input placeholder="Search providers…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Categories</SelectItem>{SERVICE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Airport</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium"><Truck size={14} className="inline mr-1.5 text-muted-foreground" />{p.name}</TableCell>
                  <TableCell><Badge variant="outline">{p.service_category}</Badge></TableCell>
                  <TableCell>{countryMap[p.country_id] || "—"}</TableCell>
                  <TableCell>{airportMap[p.airport_id]?.iata_code || "—"}</TableCell>
                  <TableCell className="text-sm">{p.contact_person}<br /><span className="text-muted-foreground">{p.email}</span></TableCell>
                  <TableCell><Badge variant={p.status === "Active" ? "default" : "secondary"}>{p.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil size={14} /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(p.id)}><Trash2 size={14} /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No providers found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
