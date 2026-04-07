import { useState } from "react";
import { Receipt, Download, Pencil, Plus, Trash2, Save, X, Plane, Globe2, DollarSign, Banknote, Info } from "lucide-react";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import { exportToExcel } from "@/lib/exportExcel";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Row = {
  id: string; tax: string; unit: string; amount: string; applicability: string;
  section: string; usd_except_ssh: string; usd_ssh: string; egp_all: string;
  sort_order: number; is_total: boolean;
};

const emptyForm = { section: "International", tax: "", usd_except_ssh: "", usd_ssh: "", egp_all: "", sort_order: 0, is_total: false };

export default function AirportTaxPage() {
  const { data, isLoading } = useSupabaseTable<Row>("airport_tax", { orderBy: "sort_order", ascending: true });
  const queryClient = useQueryClient();
  const [editRow, setEditRow] = useState<Row | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const international = data.filter(r => r.section === "International");
  const domestic = data.filter(r => r.section === "Domestic");

  const calcSectionTotal = (rows: Row[], field: "usd_except_ssh" | "usd_ssh" | "egp_all") => {
    return rows
      .filter(r => !r.is_total)
      .reduce((sum, r) => {
        const val = parseFloat(r[field]);
        return sum + (isNaN(val) ? 0 : val);
      }, 0);
  };

  const handleExport = () => exportToExcel(data.map(r => ({
    Section: r.section, "Tax/Fee": r.tax,
    "USD (Except SSH)": r.usd_except_ssh, "USD (SSH)": r.usd_ssh, "EGP (All Airports)": r.egp_all,
  })), "Departure Tax", "Link_Departure_Tax.xlsx");

  const openEdit = (r: Row) => {
    setEditRow(r); setIsNew(false);
    setForm({ section: r.section, tax: r.tax, usd_except_ssh: r.usd_except_ssh, usd_ssh: r.usd_ssh, egp_all: r.egp_all, sort_order: r.sort_order, is_total: r.is_total });
  };
  const openNew = () => { setEditRow({} as Row); setIsNew(true); setForm(emptyForm); };

  const handleSave = async () => {
    if (!form.tax.trim()) { toast.error("Tax/Fee name is required"); return; }
    const payload = { section: form.section, tax: form.tax, usd_except_ssh: form.usd_except_ssh, usd_ssh: form.usd_ssh, egp_all: form.egp_all, sort_order: form.sort_order, is_total: form.is_total };
    if (isNew) {
      const { error } = await supabase.from("airport_tax").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Record added");
    } else {
      const { error } = await supabase.from("airport_tax").update(payload).eq("id", editRow!.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Record updated");
    }
    queryClient.invalidateQueries({ queryKey: ["airport_tax"] });
    setEditRow(null);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("airport_tax").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Record deleted");
    queryClient.invalidateQueries({ queryKey: ["airport_tax"] });
  };

  const renderTable = (rows: Row[]) => (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[40%]">
                Tax / Fee Description
              </th>
              <th colSpan={2} className="px-4 py-3 text-center border-l border-border/50">
                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <DollarSign size={13} className="text-primary" />
                  USD
                </div>
              </th>
              <th className="px-4 py-3 text-center border-l border-border/50">
                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Banknote size={13} className="text-accent" />
                  EGP
                </div>
              </th>
              <th className="px-3 py-3 text-center w-20 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Actions
              </th>
            </tr>
            <tr className="border-b bg-muted/15">
              <th className="px-5 py-2 text-left text-[11px] font-medium text-muted-foreground/70"></th>
              <th className="px-4 py-2 text-center text-[11px] font-medium text-muted-foreground/70 border-l border-border/50">
                All Airports Except SSH
              </th>
              <th className="px-4 py-2 text-center text-[11px] font-medium text-muted-foreground/70">
                Sharm El Sheikh (SSH)
              </th>
              <th className="px-4 py-2 text-center text-[11px] font-medium text-muted-foreground/70 border-l border-border/50">
                All Airports
              </th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {rows.map((r, idx) => (
              <tr
                key={r.id}
                className={`group transition-colors ${
                  r.is_total
                    ? "bg-primary/5 border-t-2 border-primary/20"
                    : idx % 2 === 0
                    ? "bg-card hover:bg-muted/30"
                    : "bg-muted/10 hover:bg-muted/30"
                }`}
              >
                <td className={`px-5 py-3 ${r.is_total ? "font-bold text-primary" : "text-foreground"}`}>
                  <div className="flex items-center gap-2">
                    {r.is_total && <div className="w-1 h-5 rounded-full bg-primary" />}
                    {r.tax}
                  </div>
                </td>
                <td className={`px-4 py-3 text-center border-l border-border/30 tabular-nums ${
                  r.is_total ? "font-bold text-primary text-base" : "font-medium text-foreground"
                }`}>
                  {r.usd_except_ssh || "—"}
                </td>
                <td className={`px-4 py-3 text-center tabular-nums ${
                  r.is_total ? "font-bold text-primary text-base" : "font-medium text-foreground"
                }`}>
                  {r.usd_ssh || "—"}
                </td>
                <td className={`px-4 py-3 text-center border-l border-border/30 tabular-nums ${
                  r.is_total ? "font-bold text-primary text-base" : "font-medium text-foreground"
                }`}>
                  {r.egp_all || "—"}
                </td>
                <td className="px-3 py-3">
                  <div className="flex gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-primary/10 hover:text-primary" onClick={() => openEdit(r)}>
                            <Pencil size={13} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top"><p>Edit</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive/10 text-destructive" onClick={() => handleDelete(r.id)}>
                            <Trash2 size={13} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top"><p>Delete</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const SummaryCard = ({ label, usd, egp, icon: Icon }: { label: string; usd: number; egp: number; icon: any }) => (
    <div className="bg-card rounded-xl border p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon size={16} className="text-primary" />
        </div>
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 mb-0.5">USD (Excl. SSH)</p>
          <p className="text-lg font-bold text-foreground tabular-nums">${usd.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 mb-0.5">EGP (All)</p>
          <p className="text-lg font-bold text-foreground tabular-nums">{egp.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Receipt size={20} className="text-primary" />
            </div>
            Departure Tax
          </h1>
          <p className="text-muted-foreground text-sm mt-1.5 ml-[46px]">
            Egyptian departure taxes, levies, and government fees
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={openNew} size="sm" className="gap-1.5">
            <Plus size={14} /> Add Tax
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
            <Download size={14} /> Export
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm">Loading tax data…</p>
        </div>
      ) : (
        <>
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              label="International Total"
              icon={Globe2}
              usd={calcSectionTotal(international, "usd_except_ssh")}
              egp={calcSectionTotal(international, "egp_all")}
            />
            <SummaryCard
              label="Domestic Total"
              icon={Plane}
              usd={calcSectionTotal(domestic, "usd_except_ssh")}
              egp={calcSectionTotal(domestic, "egp_all")}
            />
            <div className="bg-card rounded-xl border p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Info size={16} className="text-accent" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">Tax Items</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 mb-0.5">International</p>
                  <p className="text-lg font-bold text-foreground">{international.filter(r => !r.is_total).length}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 mb-0.5">Domestic</p>
                  <p className="text-lg font-bold text-foreground">{domestic.filter(r => !r.is_total).length}</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-xl border p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
                  <DollarSign size={16} className="text-warning" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">SSH Rate</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 mb-0.5">Int'l USD</p>
                  <p className="text-lg font-bold text-foreground tabular-nums">${calcSectionTotal(international, "usd_ssh").toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 mb-0.5">Dom. USD</p>
                  <p className="text-lg font-bold text-foreground tabular-nums">${calcSectionTotal(domestic, "usd_ssh").toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabbed Sections */}
          <Tabs defaultValue="international" className="space-y-4">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="international" className="gap-1.5 data-[state=active]:bg-card">
                <Globe2 size={14} />
                International
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{international.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="domestic" className="gap-1.5 data-[state=active]:bg-card">
                <Plane size={14} />
                Domestic
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{domestic.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="all" className="gap-1.5 data-[state=active]:bg-card">
                All
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{data.length}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="international">
              {renderTable(international)}
            </TabsContent>
            <TabsContent value="domestic">
              {renderTable(domestic)}
            </TabsContent>
            <TabsContent value="all" className="space-y-5">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Globe2 size={14} /> International
              </h3>
              {renderTable(international)}
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Plane size={14} /> Domestic
              </h3>
              {renderTable(domestic)}
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Edit/Add Dialog */}
      <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                {isNew ? <Plus size={16} className="text-primary" /> : <Pencil size={16} className="text-primary" />}
              </div>
              {isNew ? "Add Tax / Fee" : "Edit Tax / Fee"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 pt-2">
            <div>
              <Label className="text-xs font-medium">Section</Label>
              <Select value={form.section} onValueChange={v => setForm(f => ({ ...f, section: v }))}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="International">
                    <span className="flex items-center gap-2"><Globe2 size={14} /> International</span>
                  </SelectItem>
                  <SelectItem value="Domestic">
                    <span className="flex items-center gap-2"><Plane size={14} /> Domestic</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium">Tax / Fee Name</Label>
              <Input className="mt-1.5" value={form.tax} onChange={e => setForm(f => ({ ...f, tax: e.target.value }))} placeholder="e.g. Departure Pax Taxes" />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><DollarSign size={12} /> USD Amounts</Label>
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                <div>
                  <Label className="text-[11px] text-muted-foreground/70">Except SSH</Label>
                  <Input className="mt-1" value={form.usd_except_ssh} onChange={e => setForm(f => ({ ...f, usd_except_ssh: e.target.value }))} placeholder="0.00" />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground/70">SSH</Label>
                  <Input className="mt-1" value={form.usd_ssh} onChange={e => setForm(f => ({ ...f, usd_ssh: e.target.value }))} placeholder="0.00" />
                </div>
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Banknote size={12} /> EGP Amount</Label>
              <Input className="mt-1.5" value={form.egp_all} onChange={e => setForm(f => ({ ...f, egp_all: e.target.value }))} placeholder="0.00" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Sort Order</Label>
                <Input className="mt-1.5" type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
              </div>
              <div className="flex items-end gap-2 pb-2">
                <input type="checkbox" checked={form.is_total} onChange={e => setForm(f => ({ ...f, is_total: e.target.checked }))} id="is_total" className="rounded border-border" />
                <Label htmlFor="is_total" className="text-xs">Mark as Total Row</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" onClick={() => setEditRow(null)} className="gap-1.5">
                <X size={14} /> Cancel
              </Button>
              <Button onClick={handleSave} className="gap-1.5">
                <Save size={14} /> {isNew ? "Add" : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
