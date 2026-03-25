import { useState } from "react";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Globe, Search, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type CountryRow = {
  id: string;
  name: string;
  name_ar: string;
  code: string;
  region: string;
  status: string;
};

export default function CountriesPage() {
  const { data, isLoading, add, update, remove } = useSupabaseTable<CountryRow>("countries", { orderBy: "name", ascending: true });
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<CountryRow | null>(null);
  const [form, setForm] = useState({ name: "", name_ar: "", code: "", region: "Middle East", status: "Active" });

  const filtered = data.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setEditItem(null); setForm({ name: "", name_ar: "", code: "", region: "Middle East", status: "Active" }); setDialogOpen(true); };
  const openEdit = (c: CountryRow) => { setEditItem(c); setForm({ name: c.name, name_ar: c.name_ar, code: c.code, region: c.region, status: c.status }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name || !form.code) { toast({ title: "Error", description: "Name and code are required", variant: "destructive" }); return; }
    if (editItem) {
      await update({ id: editItem.id, ...form } as any);
    } else {
      await add(form as any);
    }
    setDialogOpen(false);
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Countries</h1>
          <p className="text-muted-foreground text-sm">Manage operating countries</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button onClick={openAdd}><Plus size={16} className="mr-1" /> Add Country</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editItem ? "Edit Country" : "Add Country"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Country Name (EN)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <Input placeholder="اسم الدولة (عربي)" value={form.name_ar} onChange={e => setForm({ ...form, name_ar: e.target.value })} />
              <Input placeholder="Country Code (e.g. EG)" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} maxLength={4} />
              <Select value={form.region} onValueChange={v => setForm({ ...form, region: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Middle East">Middle East</SelectItem>
                  <SelectItem value="North Africa">North Africa</SelectItem>
                  <SelectItem value="Europe">Europe</SelectItem>
                  <SelectItem value="International">International</SelectItem>
                </SelectContent>
              </Select>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Button className="w-full" onClick={handleSave}>{editItem ? "Update" : "Add"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1"><Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} /><Input placeholder="Search countries…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Arabic</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium"><Globe size={14} className="inline mr-1.5 text-muted-foreground" />{c.name}</TableCell>
                  <TableCell>{c.name_ar}</TableCell>
                  <TableCell><Badge variant="outline">{c.code}</Badge></TableCell>
                  <TableCell>{c.region}</TableCell>
                  <TableCell><Badge variant={c.status === "Active" ? "default" : "secondary"}>{c.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil size={14} /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(c.id)}><Trash2 size={14} /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No countries found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
