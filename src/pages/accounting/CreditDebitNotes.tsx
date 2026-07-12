import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

type Note = {
  id: string; note_no: string; note_date: string; currency: string;
  amount: number; tax: number; total: number; reason: string | null; status: string;
  invoice_id?: string | null; airline_iata?: string | null;
  vendor_invoice_id?: string | null; vendor_name?: string | null;
};

export default function CreditDebitNotes() {
  const [credits, setCredits] = useState<Note[]>([]);
  const [debits, setDebits] = useState<Note[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [vendorInvoices, setVendorInvoices] = useState<any[]>([]);
  const [openC, setOpenC] = useState(false);
  const [openD, setOpenD] = useState(false);
  const [cForm, setCForm] = useState<any>({ note_no: "", note_date: new Date().toISOString().slice(0,10), currency: "USD", amount: 0, tax: 0, reason: "", invoice_id: null });
  const [dForm, setDForm] = useState<any>({ note_no: "", note_date: new Date().toISOString().slice(0,10), currency: "USD", amount: 0, tax: 0, reason: "", vendor_invoice_id: null });

  const load = async () => {
    const [c, d, i, vi] = await Promise.all([
      supabase.from("credit_notes").select("*").order("created_at", { ascending: false }),
      supabase.from("debit_notes").select("*").order("created_at", { ascending: false }),
      supabase.from("invoices").select("id,invoice_no,airline_iata,total,currency").order("date", { ascending: false }).limit(200),
      supabase.from("vendor_invoices").select("id,invoice_no,vendor_name,total,currency").order("created_at", { ascending: false }).limit(200),
    ]);
    setCredits((c.data ?? []) as any);
    setDebits((d.data ?? []) as any);
    setInvoices(i.data ?? []);
    setVendorInvoices(vi.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const saveCredit = async () => {
    if (!cForm.note_no) return toast.error("Note number required");
    const inv = invoices.find(x => x.id === cForm.invoice_id);
    const payload = { ...cForm, airline_iata: inv?.airline_iata ?? null, currency: inv?.currency ?? cForm.currency };
    const { error } = await supabase.from("credit_notes").insert(payload);
    if (error) toast.error(error.message); else { toast.success("Credit note created"); setOpenC(false); load(); }
  };
  const saveDebit = async () => {
    if (!dForm.note_no) return toast.error("Note number required");
    const vi = vendorInvoices.find(x => x.id === dForm.vendor_invoice_id);
    const payload = { ...dForm, vendor_name: vi?.vendor_name ?? null, currency: vi?.currency ?? dForm.currency };
    const { error } = await supabase.from("debit_notes").insert(payload);
    if (error) toast.error(error.message); else { toast.success("Debit note created"); setOpenD(false); load(); }
  };
  const applyC = async (id: string) => {
    const { error } = await supabase.rpc("apply_credit_note_to_invoice", { _id: id });
    if (error) toast.error(error.message); else { toast.success("Applied"); load(); }
  };
  const applyD = async (id: string) => {
    const { error } = await supabase.rpc("apply_debit_note_to_vendor_invoice", { _id: id });
    if (error) toast.error(error.message); else { toast.success("Applied"); load(); }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Credit & Debit Notes</h1>
        <p className="text-muted-foreground">Post-invoice adjustments for customers and vendors.</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Credit Notes</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{credits.length}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Applied CN</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{credits.filter(c => c.status === "applied").length}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Debit Notes</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{debits.length}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Applied DN</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{debits.filter(d => d.status === "applied").length}</CardContent></Card>
      </div>

      <Tabs defaultValue="credit">
        <TabsList>
          <TabsTrigger value="credit">Credit Notes (Customers)</TabsTrigger>
          <TabsTrigger value="debit">Debit Notes (Vendors)</TabsTrigger>
        </TabsList>

        <TabsContent value="credit">
          <div className="flex justify-end mb-2">
            <Dialog open={openC} onOpenChange={setOpenC}>
              <DialogTrigger asChild><Button>New Credit Note</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New Credit Note</DialogTitle></DialogHeader>
                <div className="grid gap-3">
                  <div><Label>Note No</Label><Input value={cForm.note_no} onChange={e => setCForm({...cForm, note_no: e.target.value})} /></div>
                  <div><Label>Linked Invoice</Label>
                    <select className="w-full border rounded p-2" value={cForm.invoice_id ?? ""} onChange={e => setCForm({...cForm, invoice_id: e.target.value || null})}>
                      <option value="">— none —</option>
                      {invoices.map(i => <option key={i.id} value={i.id}>{i.invoice_no} — {i.airline_iata} — {i.currency} {i.total}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><Label>Currency</Label><Input value={cForm.currency} onChange={e => setCForm({...cForm, currency: e.target.value})} /></div>
                    <div><Label>Amount</Label><Input type="number" value={cForm.amount} onChange={e => setCForm({...cForm, amount: Number(e.target.value)})} /></div>
                    <div><Label>Tax</Label><Input type="number" value={cForm.tax} onChange={e => setCForm({...cForm, tax: Number(e.target.value)})} /></div>
                  </div>
                  <div><Label>Reason</Label><Input value={cForm.reason} onChange={e => setCForm({...cForm, reason: e.target.value})} /></div>
                  <Button onClick={saveCredit}>Save</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card><CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted"><tr><th className="p-2 text-left">No</th><th>Date</th><th>Airline</th><th>Currency</th><th>Total</th><th>Reason</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {credits.map(n => <tr key={n.id} className="border-t">
                  <td className="p-2">{n.note_no}</td>
                  <td className="text-center">{n.note_date}</td>
                  <td className="text-center">{n.airline_iata}</td>
                  <td className="text-center">{n.currency}</td>
                  <td className="text-right">{Number(n.total).toFixed(2)}</td>
                  <td>{n.reason}</td>
                  <td className="text-center"><Badge>{n.status}</Badge></td>
                  <td className="p-2 text-right">{n.status === "draft" && n.invoice_id && <Button size="sm" onClick={() => applyC(n.id)}>Apply</Button>}</td>
                </tr>)}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="debit">
          <div className="flex justify-end mb-2">
            <Dialog open={openD} onOpenChange={setOpenD}>
              <DialogTrigger asChild><Button>New Debit Note</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New Debit Note</DialogTitle></DialogHeader>
                <div className="grid gap-3">
                  <div><Label>Note No</Label><Input value={dForm.note_no} onChange={e => setDForm({...dForm, note_no: e.target.value})} /></div>
                  <div><Label>Linked Vendor Invoice</Label>
                    <select className="w-full border rounded p-2" value={dForm.vendor_invoice_id ?? ""} onChange={e => setDForm({...dForm, vendor_invoice_id: e.target.value || null})}>
                      <option value="">— none —</option>
                      {vendorInvoices.map(i => <option key={i.id} value={i.id}>{i.invoice_no} — {i.vendor_name} — {i.currency} {i.total}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><Label>Currency</Label><Input value={dForm.currency} onChange={e => setDForm({...dForm, currency: e.target.value})} /></div>
                    <div><Label>Amount</Label><Input type="number" value={dForm.amount} onChange={e => setDForm({...dForm, amount: Number(e.target.value)})} /></div>
                    <div><Label>Tax</Label><Input type="number" value={dForm.tax} onChange={e => setDForm({...dForm, tax: Number(e.target.value)})} /></div>
                  </div>
                  <div><Label>Reason</Label><Input value={dForm.reason} onChange={e => setDForm({...dForm, reason: e.target.value})} /></div>
                  <Button onClick={saveDebit}>Save</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card><CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted"><tr><th className="p-2 text-left">No</th><th>Date</th><th>Vendor</th><th>Currency</th><th>Total</th><th>Reason</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {debits.map(n => <tr key={n.id} className="border-t">
                  <td className="p-2">{n.note_no}</td>
                  <td className="text-center">{n.note_date}</td>
                  <td className="text-center">{n.vendor_name}</td>
                  <td className="text-center">{n.currency}</td>
                  <td className="text-right">{Number(n.total).toFixed(2)}</td>
                  <td>{n.reason}</td>
                  <td className="text-center"><Badge>{n.status}</Badge></td>
                  <td className="p-2 text-right">{n.status === "draft" && n.vendor_invoice_id && <Button size="sm" onClick={() => applyD(n.id)}>Apply</Button>}</td>
                </tr>)}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
