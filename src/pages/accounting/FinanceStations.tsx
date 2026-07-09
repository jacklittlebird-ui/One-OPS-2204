import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SmartDropdown } from "@/components/ui/smart-dropdown";
import { Plus, Pencil, Trash2, Search, MapPin } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type StationRow = {
  id: string;
  code: string;
  name: string;
  name_ar?: string | null;
  country?: string | null;
  currency: string;
  company_id?: string | null;
  status: string;
};

type CompanyRow = { id: string; code: string; name: string; base_currency: string };

const CURRENCIES = ["EGP", "AED", "MAD", "JOD", "USD", "EUR", "SAR"];

const emptyForm = () => ({
  code: "", name: "", name_ar: "", country: "",
  currency: "EGP", company_id: "", status: "Active",
});

export default function FinanceStationsPage() {
  const { t } = useTranslation();
  const { data, isLoading, add, update, remove } = useSupabaseTable<StationRow>("finance_stations", { orderBy: "code", ascending: true });
  const { data: companies } = useSupabaseTable<CompanyRow>("companies", { orderBy: "code", ascending: true });
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<StationRow | null>(null);
  const [form, setForm] = useState(emptyForm());

  const companyOptions = useMemo(
    () => companies.map(c => ({ value: c.id, label: `${c.code} — ${c.name}`, sub: c.base_currency })),
    [companies],
  );
  const companyMap = useMemo(() => new Map(companies.map(c => [c.id, c])), [companies]);

  const q = search.toLowerCase();
  const filtered = data.filter(s =>
    s.name.toLowerCase().includes(q) ||
    s.code.toLowerCase().includes(q) ||
    (s.country ?? "").toLowerCase().includes(q),
  );

  const openAdd = () => { setEditItem(null); setForm(emptyForm()); setDialogOpen(true); };
  const openEdit = (s: StationRow) => {
    setEditItem(s);
    setForm({
      code: s.code, name: s.name, name_ar: s.name_ar ?? "", country: s.country ?? "",
      currency: s.currency, company_id: s.company_id ?? "", status: s.status,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim() || !form.currency) {
      toast({ title: "Error", description: "Code, Name and Currency are required", variant: "destructive" });
      return;
    }
    const payload: any = {
      ...form,
      code: form.code.toUpperCase().trim(),
      name: form.name.trim(),
      company_id: form.company_id || null,
    };
    if (editItem) await update({ id: editItem.id, ...payload });
    else await add(payload);
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this station?")) return;
    await remove(id);
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><MapPin size={22} /> {t("accounting.stationsTitle")}</h1>
          <p className="text-muted-foreground text-sm">{t("accounting.stationsSubtitle")}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button onClick={openAdd}><Plus size={16} className="me-1" /> {t("common.add")} {t("accounting.station")}</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editItem ? t("common.edit") : t("common.add")} {t("accounting.station")}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium">{t("common.code")} *</label>
                <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} maxLength={6} /></div>
              <div><label className="text-xs font-medium">{t("accounting.currency")} *</label>
                <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select></div>
              <div className="col-span-2"><label className="text-xs font-medium">{t("common.name")} (EN) *</label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="col-span-2"><label className="text-xs font-medium">{t("common.name")} (AR)</label>
                <Input dir="rtl" value={form.name_ar} onChange={e => setForm({ ...form, name_ar: e.target.value })} /></div>
              <div><label className="text-xs font-medium">{t("accounting.country")}</label>
                <Input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} /></div>
              <div><label className="text-xs font-medium">{t("accounting.company")}</label>
                <SmartDropdown
                  options={companyOptions}
                  value={form.company_id}
                  onChange={v => setForm({ ...form, company_id: v })}
                  placeholder={t("accounting.company")}
                />
              </div>
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
                <TableHead>{t("accounting.company")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead className="text-end">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No stations yet</TableCell></TableRow>
              )}
              {filtered.map(s => {
                const co = s.company_id ? companyMap.get(s.company_id) : null;
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono font-semibold">{s.code}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{s.name}</span>
                        {s.name_ar && <span className="text-xs text-muted-foreground" dir="rtl">{s.name_ar}</span>}
                      </div>
                    </TableCell>
                    <TableCell>{s.country || "—"}</TableCell>
                    <TableCell><Badge variant="outline">{s.currency}</Badge></TableCell>
                    <TableCell className="text-xs">{co ? `${co.code} — ${co.name}` : "—"}</TableCell>
                    <TableCell><Badge variant={s.status === "Active" ? "default" : "secondary"}>{s.status}</Badge></TableCell>
                    <TableCell className="text-end">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil size={14} /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}><Trash2 size={14} className="text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
