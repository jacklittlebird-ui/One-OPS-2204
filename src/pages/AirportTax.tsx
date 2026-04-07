import { useState } from "react";
import { Receipt, Download, Pencil, Plus, Trash2, Save, X } from "lucide-react";
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

  const renderSection = (title: string, rows: Row[]) => (
    <div className="bg-card rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th colSpan={5} className="bg-muted/50 px-4 py-2.5 text-left font-bold text-foreground text-base border-b">{title}</th>
            </tr>
            <tr className="border-b">
              <th className="data-table-header px-4 py-2.5 text-left w-[40%]"></th>
              <th colSpan={2} className="data-table-header px-4 py-2.5 text-center border-l">USD</th>
              <th className="data-table-header px-4 py-2.5 text-center border-l">EGP</th>
              <th className="data-table-header px-4 py-2.5 text-center w-16"></th>
            </tr>
            <tr>
              <th className="data-table-header px-4 py-2 text-left text-xs font-medium text-muted-foreground">Departure Tax</th>
              <th className="data-table-header px-4 py-2 text-center text-xs font-medium text-muted-foreground border-l">All Airports Except SSH</th>
              <th className="data-table-header px-4 py-2 text-center text-xs font-medium text-muted-foreground">SSH</th>
              <th className="data-table-header px-4 py-2 text-center text-xs font-medium text-muted-foreground border-l">All Airports</th>
              <th className="data-table-header px-4 py-2 text-center"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className={`data-table-row ${r.is_total ? "bg-muted/40 font-bold border-t-2 border-foreground/20" : ""}`}>
                <td className={`px-4 py-2.5 ${r.is_total ? "font-bold text-foreground" : "text-foreground"}`}>{r.tax}</td>
                <td className={`px-4 py-2.5 text-center border-l ${r.is_total ? "font-bold text-primary" : "font-semibold text-foreground"}`}>{r.usd_except_ssh || "—"}</td>
                <td className={`px-4 py-2.5 text-center ${r.is_total ? "font-bold text-primary" : "font-semibold text-foreground"}`}>{r.usd_ssh || "—"}</td>
                <td className={`px-4 py-2.5 text-center border-l ${r.is_total ? "font-bold text-primary" : "font-semibold text-foreground"}`}>{r.egp_all || "—"}</td>
                <td className="px-2 py-2.5 text-right">
                  <div className="flex gap-0.5 justify-end">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(r)}><Pencil size={12} /></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDelete(r.id)}><Trash2 size={12} /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Receipt size={22} className="text-primary" /> Departure Tax</h1>
          <p className="text-muted-foreground text-sm mt-1">Egyptian departure taxes, levies, and government fees</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={openNew}><Plus size={14} className="mr-1" /> Add</Button>
          <Button variant="outline" size="sm" onClick={handleExport}><Download size={14} className="mr-1" /> Export</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Loading…</div>
      ) : (
        <div className="space-y-6">
          {renderSection("International", international)}
          {renderSection("Domestic", domestic)}
        </div>
      )}

      <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isNew ? "Add Tax/Fee" : "Edit Tax/Fee"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Section</Label>
              <Select value={form.section} onValueChange={v => setForm(f => ({ ...f, section: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="International">International</SelectItem>
                  <SelectItem value="Domestic">Domestic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Tax / Fee</Label><Input value={form.tax} onChange={e => setForm(f => ({ ...f, tax: e.target.value }))} /></div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>USD (Except SSH)</Label><Input value={form.usd_except_ssh} onChange={e => setForm(f => ({ ...f, usd_except_ssh: e.target.value }))} /></div>
              <div><Label>USD (SSH)</Label><Input value={form.usd_ssh} onChange={e => setForm(f => ({ ...f, usd_ssh: e.target.value }))} /></div>
              <div><Label>EGP (All)</Label><Input value={form.egp_all} onChange={e => setForm(f => ({ ...f, egp_all: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Sort Order</Label><Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} /></div>
              <div className="flex items-end gap-2 pb-1">
                <input type="checkbox" checked={form.is_total} onChange={e => setForm(f => ({ ...f, is_total: e.target.checked }))} id="is_total" />
                <Label htmlFor="is_total">Total Row</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditRow(null)}><X size={14} className="mr-1" /> Cancel</Button>
              <Button onClick={handleSave}><Save size={14} className="mr-1" /> Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
