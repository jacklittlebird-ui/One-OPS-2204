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
import { Plus, Search, Pencil, Trash2, Building2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type AirportRow = { id: string; country_id: string; name: string; iata_code: string; icao_code: string; city: string; terminal_count: number; status: string; };
type CountryRow = { id: string; name: string; code: string; };

export default function AirportsPage() {
  const { data, isLoading, add, update, remove } = useSupabaseTable<AirportRow>("airports", { orderBy: "name", ascending: true });
  const { data: countries } = useQuery({
    queryKey: ["countries"],
    queryFn: async () => { const { data } = await supabase.from("countries" as any).select("id,name,code").order("name"); return (data || []) as unknown as CountryRow[]; },
  });
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<AirportRow | null>(null);
  const [form, setForm] = useState({ country_id: "", name: "", iata_code: "", icao_code: "", city: "", terminal_count: 1, status: "Active" });

  const countryMap = Object.fromEntries((countries || []).map(c => [c.id, c]));
  const filtered = data.filter(a => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) || a.iata_code.toLowerCase().includes(search.toLowerCase()) || a.city.toLowerCase().includes(search.toLowerCase());
    const matchCountry = countryFilter === "all" || a.country_id === countryFilter;
    return matchSearch && matchCountry;
  });

  const openAdd = () => { setEditItem(null); setForm({ country_id: countries?.[0]?.id || "", name: "", iata_code: "", icao_code: "", city: "", terminal_count: 1, status: "Active" }); setDialogOpen(true); };
  const openEdit = (a: AirportRow) => { setEditItem(a); setForm({ country_id: a.country_id, name: a.name, iata_code: a.iata_code, icao_code: a.icao_code, city: a.city, terminal_count: a.terminal_count, status: a.status }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name || !form.iata_code || !form.country_id) { toast({ title: "Error", description: "Name, IATA code, and country required", variant: "destructive" }); return; }
    if (editItem) { await update({ id: editItem.id, ...form } as any); } else { await add(form as any); }
    setDialogOpen(false);
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Airports</h1>
          <p className="text-muted-foreground text-sm">Manage operating airports · {data.length} airports</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button onClick={openAdd}><Plus size={16} className="mr-1" /> Add Airport</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editItem ? "Edit Airport" : "Add Airport"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Select value={form.country_id} onValueChange={v => setForm({ ...form, country_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select Country" /></SelectTrigger>
                <SelectContent>{(countries || []).map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Airport Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="IATA (e.g. CAI)" value={form.iata_code} onChange={e => setForm({ ...form, iata_code: e.target.value.toUpperCase() })} maxLength={4} />
                <Input placeholder="ICAO (e.g. HECA)" value={form.icao_code} onChange={e => setForm({ ...form, icao_code: e.target.value.toUpperCase() })} maxLength={4} />
              </div>
              <Input placeholder="City" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
              <Input type="number" placeholder="Terminals" value={form.terminal_count} onChange={e => setForm({ ...form, terminal_count: parseInt(e.target.value) || 1 })} min={1} />
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
        <div className="relative flex-1"><Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} /><Input placeholder="Search airports…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Select value={countryFilter} onValueChange={setCountryFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Countries" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Countries</SelectItem>{(countries || []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

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
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium"><Building2 size={14} className="inline mr-1.5 text-muted-foreground" />{a.name}</TableCell>
                  <TableCell><Badge variant="outline">{a.iata_code}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{a.icao_code}</TableCell>
                  <TableCell>{a.city}</TableCell>
                  <TableCell>{countryMap[a.country_id]?.name || "—"}</TableCell>
                  <TableCell>{a.terminal_count}</TableCell>
                  <TableCell><Badge variant={a.status === "Active" ? "default" : "secondary"}>{a.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(a)}><Pencil size={14} /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(a.id)}><Trash2 size={14} /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No airports found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
