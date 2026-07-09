import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Search, Building2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type CompanyRow = {
  id: string;
  code: string;
  name: string;
  name_ar?: string | null;
  country?: string | null;
  base_currency: string;
  tax_id?: string | null;
  commercial_register?: string | null;
  address?: string | null;
  status: string;
};

const CURRENCIES = ["EGP", "AED", "MAD", "JOD", "USD", "EUR", "SAR"];

const emptyForm = () => ({
  code: "",
  name: "",
  name_ar: "",
  country: "",
  base_currency: "EGP",
  tax_id: "",
  commercial_register: "",
  address: "",
  status: "Active",
});

export default function CompaniesPage() {
  const { t } = useTranslation();
  const { data, isLoading, add, update, remove } = useSupabaseTable<CompanyRow>("companies", { orderBy: "code", ascending: true });
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<CompanyRow | null>(null);
  const [form, setForm] = useState(emptyForm());

  const q = search.toLowerCase();
  const filtered = data.filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.code.toLowerCase().includes(q) ||
    (c.country ?? "").toLowerCase().includes(q),
  );

  const openAdd = () => { setEditItem(null); setForm(emptyForm()); setDialogOpen(true); };
  const openEdit = (c: CompanyRow) => {
    setEditItem(c);
    setForm({
      code: c.code, name: c.name, name_ar: c.name_ar ?? "", country: c.country ?? "",
      base_currency: c.base_currency, tax_id: c.tax_id ?? "", commercial_register: c.commercial_register ?? "",
      address: c.address ?? "", status: c.status,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim() || !form.base_currency) {
      toast({ title: "Error", description: "Code, Name and Currency are required", variant: "destructive" });
      return;
    }
    const payload: any = { ...form, code: form.code.toUpperCase().trim(), name: form.name.trim() };
    if (editItem) await update({ id: editItem.id, ...payload });
    else await add(payload);
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this company?")) return;
    await remove(id);
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Building2 size={22} /> {t("accounting.companiesTitle")}</h1>
          <p className="text-muted-foreground text-sm">{t("accounting.companiesSubtitle")}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button onClick={openAdd}><Plus size={16} className="me-1" /> {t("common.add")} {t("accounting.company")}</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editItem ? t("common.edit") : t("common.add")} {t("accounting.company")}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium">{t("common.code")} *</label>
                <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} maxLength={10} /></div>
              <div><label className="text-xs font-medium">{t("accounting.currency")} *</label>
                <Select value={form.base_currency} onValueChange={v => setForm({ ...form, base_currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select></div>
              <div className="col-span-2"><label className="text-xs font-medium">{t("common.name")} (EN) *</label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="col-span-2"><label className="text-xs font-medium">{t("common.name")} (AR)</label>
                <Input dir="rtl" value={form.name_ar} onChange={e => setForm({ ...form, name_ar: e.target.value })} /></div>
              <div><label className="text-xs font-medium">{t("accounting.country")}</label>
                <Input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} /></div>
              <div><label className="text-xs font-medium">{t("accounting.taxId")}</label>
                <Input value={form.tax_id} onChange={e => setForm({ ...form, tax_id: e.target.value })} /></div>
              <div className="col-span-2"><label className="text-xs font-medium">{t("accounting.commercialReg")}</label>
                <Input value={form.commercial_register} onChange={e => setForm({ ...form, commercial_register: e.target.value })} /></div>
              <div className="col-span-2"><label className="text-xs font-medium">{t("accounting.address")}</label>
                <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
              <div><label className="text-xs font-medium">{t("common.status")}</label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">{t("common.active")}</SelectItem>
                    <SelectItem value="Inactive">{t("common.inactive")}</SelectItem>
                  </SelectContent>
                </Select></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
              <Button onClick={handleSave}>{t("common.save")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Search size={16} className="text-muted-foreground" />
            <Input placeholder={t("common.search") + "..."} value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.code")}</TableHead>
                <TableHead>{t("common.name")}</TableHead>
                <TableHead>{t("accounting.country")}</TableHead>
                <TableHead>{t("accounting.currency")}</TableHead>
                <TableHead>{t("accounting.taxId")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead className="text-end">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No companies yet</TableCell></TableRow>
              )}
              {filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono font-semibold">{c.code}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{c.name}</span>
                      {c.name_ar && <span className="text-xs text-muted-foreground" dir="rtl">{c.name_ar}</span>}
                    </div>
                  </TableCell>
                  <TableCell>{c.country || "—"}</TableCell>
                  <TableCell><Badge variant="outline">{c.base_currency}</Badge></TableCell>
                  <TableCell className="text-xs">{c.tax_id || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={c.status === "Active" ? "default" : "secondary"}>{c.status}</Badge>
                  </TableCell>
                  <TableCell className="text-end">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil size={14} /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}><Trash2 size={14} className="text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
