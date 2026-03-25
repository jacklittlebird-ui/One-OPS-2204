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
import { Plus, Search, Pencil, Trash2, ShieldCheck, Clock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type ClearanceRow = {
  id: string; flight_schedule_id: string | null; airline_id: string | null;
  permit_no: string; flight_no: string; aircraft_type: string; registration: string;
  route: string; clearance_type: string; requested_date: string;
  valid_from: string | null; valid_to: string | null;
  status: string; authority: string; remarks: string;
};

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; cls: string }> = {
  Pending: { icon: <Clock size={12} />, cls: "bg-yellow-100 text-yellow-800" },
  Approved: { icon: <CheckCircle2 size={12} />, cls: "bg-green-100 text-green-800" },
  Rejected: { icon: <XCircle size={12} />, cls: "bg-red-100 text-red-800" },
  Expired: { icon: <AlertTriangle size={12} />, cls: "bg-muted text-muted-foreground" },
  Cancelled: { icon: <XCircle size={12} />, cls: "bg-muted text-muted-foreground" },
};

const StatusBadge = ({ s }: { s: string }) => {
  const cfg = STATUS_CONFIG[s] || STATUS_CONFIG.Pending;
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>{cfg.icon}{s}</span>;
};

export default function ClearancesPage() {
  const { data, isLoading, add, update, remove } = useSupabaseTable<ClearanceRow>("clearances");
  const { data: airlines } = useQuery({ queryKey: ["airlines"], queryFn: async () => { const { data } = await supabase.from("airlines").select("id,name,code"); return data || []; } });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<ClearanceRow | null>(null);

  const emptyForm = {
    airline_id: "", permit_no: "", flight_no: "", aircraft_type: "", registration: "",
    route: "", clearance_type: "Landing", requested_date: new Date().toISOString().slice(0, 10),
    valid_from: "", valid_to: "", status: "Pending", authority: "", remarks: "",
  };
  const [form, setForm] = useState(emptyForm);

  const airlineMap = Object.fromEntries((airlines || []).map((a: any) => [a.id, a]));

  const filtered = data.filter(c => {
    const ms = c.flight_no.toLowerCase().includes(search.toLowerCase()) || c.permit_no.toLowerCase().includes(search.toLowerCase()) || c.route.toLowerCase().includes(search.toLowerCase());
    const mst = statusFilter === "all" || c.status === statusFilter;
    return ms && mst;
  });

  const stats = {
    total: data.length,
    pending: data.filter(c => c.status === "Pending").length,
    approved: data.filter(c => c.status === "Approved").length,
    rejected: data.filter(c => c.status === "Rejected").length,
  };

  const openAdd = () => { setEditItem(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (c: ClearanceRow) => {
    setEditItem(c);
    setForm({
      airline_id: c.airline_id || "", permit_no: c.permit_no, flight_no: c.flight_no,
      aircraft_type: c.aircraft_type, registration: c.registration, route: c.route,
      clearance_type: c.clearance_type, requested_date: c.requested_date || "",
      valid_from: c.valid_from || "", valid_to: c.valid_to || "",
      status: c.status, authority: c.authority, remarks: c.remarks,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.flight_no) { toast({ title: "Error", description: "Flight number is required", variant: "destructive" }); return; }
    const payload: any = { ...form };
    if (!payload.airline_id) delete payload.airline_id;
    if (!payload.valid_from) payload.valid_from = null;
    if (!payload.valid_to) payload.valid_to = null;
    if (editItem) { await update({ id: editItem.id, ...payload }); } else { await add(payload); }
    setDialogOpen(false);
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clearances & Permits</h1>
          <p className="text-muted-foreground text-sm">Manage flight clearances and landing permits</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button onClick={openAdd}><Plus size={16} className="mr-1" /> New Clearance</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editItem ? "Edit Clearance" : "New Clearance"}</DialogTitle></DialogHeader>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
              <Select value={form.airline_id || "none"} onValueChange={v => setForm({ ...form, airline_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Select Airline" /></SelectTrigger>
                <SelectContent><SelectItem value="none">No Airline</SelectItem>{(airlines || []).map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name} ({a.code})</SelectItem>)}</SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Flight No" value={form.flight_no} onChange={e => setForm({ ...form, flight_no: e.target.value.toUpperCase() })} />
                <Input placeholder="Permit No" value={form.permit_no} onChange={e => setForm({ ...form, permit_no: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Aircraft Type" value={form.aircraft_type} onChange={e => setForm({ ...form, aircraft_type: e.target.value })} />
                <Input placeholder="Registration" value={form.registration} onChange={e => setForm({ ...form, registration: e.target.value.toUpperCase() })} />
              </div>
              <Input placeholder="Route (e.g. CAI-JFK-CAI)" value={form.route} onChange={e => setForm({ ...form, route: e.target.value.toUpperCase() })} />
              <div className="grid grid-cols-2 gap-2">
                <Select value={form.clearance_type} onValueChange={v => setForm({ ...form, clearance_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Landing">Landing</SelectItem>
                    <SelectItem value="Overfly">Overfly</SelectItem>
                    <SelectItem value="Technical">Technical</SelectItem>
                    <SelectItem value="Charter">Charter</SelectItem>
                    <SelectItem value="Special">Special</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                    <SelectItem value="Expired">Expired</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><label className="text-xs text-muted-foreground">Requested</label><Input type="date" value={form.requested_date} onChange={e => setForm({ ...form, requested_date: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Valid From</label><Input type="date" value={form.valid_from} onChange={e => setForm({ ...form, valid_from: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Valid To</label><Input type="date" value={form.valid_to} onChange={e => setForm({ ...form, valid_to: e.target.value })} /></div>
              </div>
              <Input placeholder="Authority (e.g. ECAA)" value={form.authority} onChange={e => setForm({ ...form, authority: e.target.value })} />
              <Input placeholder="Remarks" value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} />
              <Button className="w-full" onClick={handleSave}>{editItem ? "Update" : "Submit"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, cls: "text-foreground" },
          { label: "Pending", value: stats.pending, cls: "text-yellow-600" },
          { label: "Approved", value: stats.approved, cls: "text-green-600" },
          { label: "Rejected", value: stats.rejected, cls: "text-red-600" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-3 text-center"><p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></CardContent></Card>
        ))}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1"><Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} /><Input placeholder="Search clearances…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="Pending">Pending</SelectItem><SelectItem value="Approved">Approved</SelectItem><SelectItem value="Rejected">Rejected</SelectItem><SelectItem value="Expired">Expired</SelectItem></SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Flight</TableHead>
                <TableHead>Permit No</TableHead>
                <TableHead>Airline</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Valid</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium"><ShieldCheck size={14} className="inline mr-1.5 text-muted-foreground" />{c.flight_no}</TableCell>
                  <TableCell>{c.permit_no || "—"}</TableCell>
                  <TableCell>{c.airline_id ? (airlineMap[c.airline_id]?.code || "—") : "—"}</TableCell>
                  <TableCell className="text-sm">{c.route || "—"}</TableCell>
                  <TableCell><Badge variant="outline">{c.clearance_type}</Badge></TableCell>
                  <TableCell className="text-xs">{c.valid_from && c.valid_to ? `${c.valid_from} → ${c.valid_to}` : "—"}</TableCell>
                  <TableCell><StatusBadge s={c.status} /></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil size={14} /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(c.id)}><Trash2 size={14} /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No clearances found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
