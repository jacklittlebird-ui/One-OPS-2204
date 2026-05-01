import { useEffect, useMemo, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export type FieldType = "text" | "number" | "date" | "select" | "textarea";

export interface TreasuryField {
  key: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  required?: boolean;
  default?: any;
  span?: 1 | 2;
}

interface Props {
  title: string;
  description?: string;
  table: string;
  orderBy: string;
  fields: TreasuryField[];
  columns: { key: string; label: string; render?: (row: any) => ReactNode }[];
  searchKeys: string[];
}

export default function TreasuryTablePage({ title, description, table, orderBy, fields, columns, searchKeys }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const emptyForm = useMemo(() => Object.fromEntries(fields.map(f => [f.key, f.default ?? ""])), [fields]);
  const [form, setForm] = useState<any>(emptyForm);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase.from as any)(table).select("*").order(orderBy, { ascending: false });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    setRows(data || []); setLoading(false);
  };
  useEffect(() => { load(); }, [table]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const s = search.toLowerCase();
    return rows.filter(r => searchKeys.some(k => String(r[k] ?? "").toLowerCase().includes(s)));
  }, [rows, search, searchKeys]);

  const openAdd = () => { setEditId(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (r: any) => { setEditId(r.id); setForm({ ...emptyForm, ...r }); setOpen(true); };

  const save = async () => {
    const payload: any = {};
    for (const f of fields) {
      let v = form[f.key];
      if (f.type === "number") v = v === "" || v == null ? 0 : Number(v);
      if (v === "") v = null;
      payload[f.key] = v;
    }
    if (editId) {
      const { error } = await (supabase.from as any)(table).update(payload).eq("id", editId);
      if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
      toast({ title: "Updated" });
    } else {
      const { error } = await (supabase.from as any)(table).insert(payload);
      if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
      toast({ title: "Created" });
    }
    setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this record?")) return;
    const { error } = await (supabase.from as any)(table).delete().eq("id", id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Deleted" }); load();
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        <Button onClick={openAdd}><Plus size={16} className="mr-1" /> New</Button>
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map(c => <TableHead key={c.key}>{c.label}</TableHead>)}
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={columns.length + 1} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={columns.length + 1} className="text-center py-8 text-muted-foreground">No records</TableCell></TableRow>
              ) : filtered.map(r => (
                <TableRow key={r.id}>
                  {columns.map(c => <TableCell key={c.key}>{c.render ? c.render(r) : (r[c.key] ?? "—")}</TableCell>)}
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil size={14} /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 size={14} /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Edit" : "New"} {title}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            {fields.map(f => (
              <div key={f.key} className={f.span === 2 || f.type === "textarea" ? "md:col-span-2" : ""}>
                <Label className="mb-1 block text-sm">{f.label}{f.required && " *"}</Label>
                {f.type === "select" ? (
                  <Select value={String(form[f.key] ?? "")} onValueChange={(v) => setForm({ ...form, [f.key]: v })}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {f.options?.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : f.type === "textarea" ? (
                  <Textarea value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                ) : (
                  <Input type={f.type} value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function StatusBadge({ value }: { value: string }) {
  const v = (value || "").toLowerCase();
  const cls = v === "active" || v === "posted" || v === "closed" ? "bg-green-100 text-green-800"
    : v === "draft" || v === "open" ? "bg-amber-100 text-amber-800"
    : v === "inactive" || v === "void" ? "bg-rose-100 text-rose-800"
    : "bg-muted";
  return <Badge variant="outline" className={cls}>{value || "—"}</Badge>;
}
