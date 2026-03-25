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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Search, Pencil, Trash2, FileText, Clock, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type VendorInvoiceRow = {
  id: string; invoice_no: string; vendor_name: string; vendor_id: string | null;
  service_report_id: string | null; client_invoice_id: string | null;
  date: string; due_date: string; amount: number; vat: number; total: number;
  currency: string; status: string; notes: string;
};

type InvoiceRow = {
  id: string; invoice_no: string; operator: string; date: string; due_date: string;
  total: number; status: string; currency: string; invoice_type: string;
  finalized_at: string | null; sent_at: string | null;
};

export default function VendorInvoicesPage() {
  const { data, isLoading, add, update, remove } = useSupabaseTable<VendorInvoiceRow>("vendor_invoices");
  const { data: providers } = useQuery({
    queryKey: ["service_providers"],
    queryFn: async () => { const { data } = await supabase.from("service_providers" as any).select("id,name"); return (data || []) as unknown as { id: string; name: string }[]; },
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<VendorInvoiceRow | null>(null);
  const emptyForm = { invoice_no: "", vendor_name: "", vendor_id: "", date: new Date().toISOString().slice(0, 10), due_date: "", amount: 0, vat: 0, currency: "USD", status: "Draft", notes: "" };
  const [form, setForm] = useState<any>(emptyForm);

  const filtered = data.filter(v => {
    const ms = v.invoice_no.toLowerCase().includes(search.toLowerCase()) || v.vendor_name.toLowerCase().includes(search.toLowerCase());
    const mst = statusFilter === "all" || v.status === statusFilter;
    return ms && mst;
  });

  const stats = {
    total: data.length,
    totalAmount: data.reduce((s, v) => s + v.total, 0),
    unpaid: data.filter(v => v.status !== "Paid").reduce((s, v) => s + v.total, 0),
    overdue: data.filter(v => v.status === "Overdue" || (v.status !== "Paid" && new Date(v.due_date) < new Date())).length,
  };

  const openAdd = () => {
    setEditItem(null);
    const nextNo = `VI-${String(data.length + 1).padStart(4, "0")}`;
    setForm({ ...emptyForm, invoice_no: nextNo });
    setDialogOpen(true);
  };
  const openEdit = (v: VendorInvoiceRow) => {
    setEditItem(v);
    setForm({ invoice_no: v.invoice_no, vendor_name: v.vendor_name, vendor_id: v.vendor_id || "", date: v.date, due_date: v.due_date, amount: v.amount, vat: v.vat, currency: v.currency, status: v.status, notes: v.notes });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.invoice_no || !form.vendor_name) { toast({ title: "Error", description: "Invoice no and vendor required", variant: "destructive" }); return; }
    const payload: any = { ...form, amount: Number(form.amount) || 0, vat: Number(form.vat) || 0 };
    if (!payload.vendor_id) delete payload.vendor_id;
    if (!payload.due_date) payload.due_date = new Date(new Date(payload.date).getTime() + 30 * 86400000).toISOString().slice(0, 10);
    if (editItem) { await update({ id: editItem.id, ...payload }); } else { await add(payload); }
    setDialogOpen(false);
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vendor Invoices</h1>
          <p className="text-muted-foreground text-sm">فواتير الموردين · {data.length} invoices</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button onClick={openAdd}><Plus size={16} className="mr-1" /> New Vendor Invoice</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editItem ? "Edit Vendor Invoice" : "New Vendor Invoice"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Invoice No" value={form.invoice_no} onChange={e => setForm({ ...form, invoice_no: e.target.value })} />
                <Select value={form.vendor_id || "none"} onValueChange={v => {
                  const provider = (providers || []).find(p => p.id === v);
                  setForm({ ...form, vendor_id: v === "none" ? "" : v, vendor_name: provider?.name || form.vendor_name });
                }}>
                  <SelectTrigger><SelectValue placeholder="Select Vendor" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Manual Entry</SelectItem>{(providers || []).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Input placeholder="Vendor Name" value={form.vendor_name} onChange={e => setForm({ ...form, vendor_name: e.target.value })} />
              <div className="grid grid-cols-3 gap-2">
                <div><label className="text-xs text-muted-foreground">Date</label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Due Date</label><Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
                <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="EGP">EGP</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Input type="number" placeholder="Amount" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                <Input type="number" placeholder="VAT" value={form.vat} onChange={e => setForm({ ...form, vat: e.target.value })} />
                <div className="flex items-center px-3 bg-muted rounded text-sm font-mono">{(Number(form.amount) + Number(form.vat)).toLocaleString()}</div>
              </div>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Draft">Draft</SelectItem><SelectItem value="Received">Received</SelectItem><SelectItem value="Approved">Approved</SelectItem><SelectItem value="Paid">Paid</SelectItem><SelectItem value="Overdue">Overdue</SelectItem></SelectContent>
              </Select>
              <Input placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              <Button className="w-full" onClick={handleSave}>{editItem ? "Update" : "Save"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Invoices", value: stats.total, sub: "" },
          { label: "Total Amount", value: stats.totalAmount.toLocaleString(), sub: "USD" },
          { label: "Unpaid", value: stats.unpaid.toLocaleString(), sub: "USD" },
          { label: "Overdue", value: stats.overdue, sub: "invoices" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-3"><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.sub}</p></CardContent></Card>
        ))}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1"><Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} /><Input placeholder="Search vendor invoices…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="Draft">Draft</SelectItem><SelectItem value="Received">Received</SelectItem><SelectItem value="Approved">Approved</SelectItem><SelectItem value="Paid">Paid</SelectItem><SelectItem value="Overdue">Overdue</SelectItem></SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice No</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(v => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium font-mono"><FileText size={14} className="inline mr-1.5 text-muted-foreground" />{v.invoice_no}</TableCell>
                  <TableCell>{v.vendor_name}</TableCell>
                  <TableCell>{v.date}</TableCell>
                  <TableCell>{v.due_date}</TableCell>
                  <TableCell className="text-right font-mono">{v.amount.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono font-bold">{v.total.toLocaleString()} {v.currency}</TableCell>
                  <TableCell><Badge variant={v.status === "Paid" ? "default" : v.status === "Overdue" ? "destructive" : "secondary"}>{v.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(v)}><Pencil size={14} /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(v.id)}><Trash2 size={14} /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No vendor invoices</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
