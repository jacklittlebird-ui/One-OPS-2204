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
import { Plus, Search, Pencil, Trash2, ShieldCheck, Clock, CheckCircle2, XCircle, AlertTriangle, Download, Eye, Users, Package } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { exportToExcel } from "@/lib/exportExcel";

type ClearanceRow = {
  id: string; flight_schedule_id: string | null; airline_id: string | null;
  permit_no: string; flight_no: string; aircraft_type: string; registration: string;
  route: string; clearance_type: string; requested_date: string;
  valid_from: string | null; valid_to: string | null;
  status: string; authority: string; remarks: string;
  purpose: string; passengers: number; cargo_kg: number; handling_agent: string;
};

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; cls: string }> = {
  Pending:   { icon: <Clock size={12} />,         cls: "bg-warning/15 text-warning" },
  Approved:  { icon: <CheckCircle2 size={12} />,  cls: "bg-success/15 text-success" },
  Rejected:  { icon: <XCircle size={12} />,       cls: "bg-destructive/15 text-destructive" },
  Expired:   { icon: <AlertTriangle size={12} />, cls: "bg-muted text-muted-foreground" },
  Cancelled: { icon: <XCircle size={12} />,       cls: "bg-muted text-muted-foreground" },
};

const CLEARANCE_TYPES = ["Landing", "Overfly", "Technical", "Charter", "Special", "Emergency", "Military"];
const PURPOSES = ["Scheduled", "Charter", "Technical Stop", "Cargo", "VIP", "Diplomatic", "Medical Evacuation", "Ferry"];

export default function ClearancesPage() {
  const { data, isLoading, add, update, remove } = useSupabaseTable<ClearanceRow>("clearances");
  const { data: airlines } = useQuery({ queryKey: ["airlines"], queryFn: async () => { const { data } = await supabase.from("airlines").select("id,name,code"); return data || []; } });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<ClearanceRow | null>(null);
  const [editItem, setEditItem] = useState<ClearanceRow | null>(null);

  const emptyForm = {
    airline_id: "", permit_no: "", flight_no: "", aircraft_type: "", registration: "",
    route: "", clearance_type: "Landing", requested_date: new Date().toISOString().slice(0, 10),
    valid_from: "", valid_to: "", status: "Pending", authority: "", remarks: "",
    purpose: "Scheduled", passengers: 0, cargo_kg: 0, handling_agent: "",
  };
  const [form, setForm] = useState<any>(emptyForm);

  const airlineMap = Object.fromEntries((airlines || []).map((a: any) => [a.id, a]));

  const filtered = data.filter(c => {
    const ms = c.flight_no.toLowerCase().includes(search.toLowerCase()) || c.permit_no.toLowerCase().includes(search.toLowerCase()) || c.route.toLowerCase().includes(search.toLowerCase());
    const mst = statusFilter === "all" || c.status === statusFilter;
    const mt = typeFilter === "all" || c.clearance_type === typeFilter;
    return ms && mst && mt;
  });

  const stats = {
    total: data.length,
    pending: data.filter(c => c.status === "Pending").length,
    approved: data.filter(c => c.status === "Approved").length,
    expiringSoon: data.filter(c => c.status === "Approved" && c.valid_to && (new Date(c.valid_to).getTime() - Date.now()) / 86400000 <= 7 && (new Date(c.valid_to).getTime() - Date.now()) > 0).length,
    totalPax: data.filter(c => c.status === "Approved").reduce((s, c) => s + (c.passengers || 0), 0),
  };

  const openAdd = () => { setEditItem(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (c: ClearanceRow) => {
    setEditItem(c);
    setForm({ airline_id: c.airline_id || "", permit_no: c.permit_no, flight_no: c.flight_no, aircraft_type: c.aircraft_type, registration: c.registration, route: c.route, clearance_type: c.clearance_type, requested_date: c.requested_date || "", valid_from: c.valid_from || "", valid_to: c.valid_to || "", status: c.status, authority: c.authority, remarks: c.remarks, purpose: c.purpose || "Scheduled", passengers: c.passengers || 0, cargo_kg: c.cargo_kg || 0, handling_agent: c.handling_agent || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.flight_no) { toast({ title: "Error", description: "Flight number is required", variant: "destructive" }); return; }
    const payload: any = { ...form, passengers: Number(form.passengers) || 0, cargo_kg: Number(form.cargo_kg) || 0 };
    if (!payload.airline_id) delete payload.airline_id;
    if (!payload.valid_from) payload.valid_from = null;
    if (!payload.valid_to) payload.valid_to = null;
    if (editItem) { await update({ id: editItem.id, ...payload }); } else { await add(payload); }
    setDialogOpen(false);
  };

  const handleExport = () => exportToExcel(
    filtered.map(c => ({ "Permit No": c.permit_no, Flight: c.flight_no, Airline: c.airline_id ? airlineMap[c.airline_id]?.name : "", Type: c.clearance_type, Purpose: c.purpose, Route: c.route, "Valid From": c.valid_from, "Valid To": c.valid_to, PAX: c.passengers, Cargo: c.cargo_kg, Agent: c.handling_agent, Status: c.status })),
    "Clearances", "Clearances.xlsx"
  );

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><ShieldCheck size={22} className="text-primary" /> Clearances & Permits</h1>
          <p className="text-muted-foreground text-sm">التصاريح · Flight clearances and landing permits</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}><Download size={14} className="mr-1" /> Export</Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button size="sm" onClick={openAdd}><Plus size={14} className="mr-1" /> New Clearance</Button></DialogTrigger>
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
                    <SelectContent>{CLEARANCE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={form.purpose} onValueChange={v => setForm({ ...form, purpose: v })}>
                    <SelectTrigger><SelectValue placeholder="Purpose" /></SelectTrigger>
                    <SelectContent>{PURPOSES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div><label className="text-xs text-muted-foreground">Requested</label><Input type="date" value={form.requested_date} onChange={e => setForm({ ...form, requested_date: e.target.value })} /></div>
                  <div><label className="text-xs text-muted-foreground">Valid From</label><Input type="date" value={form.valid_from} onChange={e => setForm({ ...form, valid_from: e.target.value })} /></div>
                  <div><label className="text-xs text-muted-foreground">Valid To</label><Input type="date" value={form.valid_to} onChange={e => setForm({ ...form, valid_to: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Input type="number" placeholder="Passengers" value={form.passengers} onChange={e => setForm({ ...form, passengers: e.target.value })} />
                  <Input type="number" placeholder="Cargo (kg)" value={form.cargo_kg} onChange={e => setForm({ ...form, cargo_kg: e.target.value })} />
                  <Input placeholder="Handling Agent" value={form.handling_agent} onChange={e => setForm({ ...form, handling_agent: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Authority (e.g. ECAA)" value={form.authority} onChange={e => setForm({ ...form, authority: e.target.value })} />
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Pending">Pending</SelectItem><SelectItem value="Approved">Approved</SelectItem><SelectItem value="Rejected">Rejected</SelectItem><SelectItem value="Expired">Expired</SelectItem><SelectItem value="Cancelled">Cancelled</SelectItem></SelectContent>
                  </Select>
                </div>
                <Input placeholder="Remarks" value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} />
                <Button className="w-full" onClick={handleSave}>{editItem ? "Update" : "Submit"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Total", value: stats.total, icon: <ShieldCheck size={20} />, color: "bg-primary" },
          { label: "Pending", value: stats.pending, icon: <Clock size={20} />, color: "bg-warning" },
          { label: "Approved", value: stats.approved, icon: <CheckCircle2 size={20} />, color: "bg-success" },
          { label: "Expiring <7d", value: stats.expiringSoon, icon: <AlertTriangle size={20} />, color: "bg-destructive" },
          { label: "Approved PAX", value: stats.totalPax.toLocaleString(), icon: <Users size={20} />, color: "bg-info" },
        ].map(s => (
          <div key={s.label} className="stat-card"><div className={`stat-card-icon ${s.color}`}>{s.icon}</div><div><div className="text-2xl font-bold text-foreground">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div></div>
        ))}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1"><Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} /><Input placeholder="Search clearances…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Types</SelectItem>{CLEARANCE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
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
                <TableHead>Purpose</TableHead>
                <TableHead>PAX/Cargo</TableHead>
                <TableHead>Valid</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium font-mono">{c.flight_no}</TableCell>
                  <TableCell className="text-xs font-mono">{c.permit_no || "—"}</TableCell>
                  <TableCell>{c.airline_id ? (airlineMap[c.airline_id]?.code || "—") : "—"}</TableCell>
                  <TableCell className="text-sm font-mono">{c.route || "—"}</TableCell>
                  <TableCell><Badge variant="outline">{c.clearance_type}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.purpose || "—"}</TableCell>
                  <TableCell className="text-xs">{c.passengers || 0} / {c.cargo_kg || 0}kg</TableCell>
                  <TableCell className="text-xs">{c.valid_from && c.valid_to ? `${c.valid_from} → ${c.valid_to}` : "—"}</TableCell>
                  <TableCell>
                    {(() => { const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.Pending; return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>{cfg.icon}{c.status}</span>; })()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setDetailItem(c)}><Eye size={14} /></Button>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil size={14} /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(c.id)}><Trash2 size={14} /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No clearances found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detailItem} onOpenChange={() => setDetailItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Clearance — {detailItem?.permit_no || detailItem?.flight_no}</DialogTitle></DialogHeader>
          {detailItem && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground text-xs">Flight</span><p className="font-medium">{detailItem.flight_no}</p></div>
              <div><span className="text-muted-foreground text-xs">Permit No</span><p className="font-medium">{detailItem.permit_no}</p></div>
              <div><span className="text-muted-foreground text-xs">Aircraft</span><p className="font-medium">{detailItem.aircraft_type} / {detailItem.registration}</p></div>
              <div><span className="text-muted-foreground text-xs">Route</span><p className="font-medium">{detailItem.route}</p></div>
              <div><span className="text-muted-foreground text-xs">Type</span><p className="font-medium">{detailItem.clearance_type}</p></div>
              <div><span className="text-muted-foreground text-xs">Purpose</span><p className="font-medium">{detailItem.purpose}</p></div>
              <div><span className="text-muted-foreground text-xs">Passengers</span><p className="font-medium">{detailItem.passengers}</p></div>
              <div><span className="text-muted-foreground text-xs">Cargo</span><p className="font-medium">{detailItem.cargo_kg} kg</p></div>
              <div><span className="text-muted-foreground text-xs">Handling Agent</span><p className="font-medium">{detailItem.handling_agent || "—"}</p></div>
              <div><span className="text-muted-foreground text-xs">Authority</span><p className="font-medium">{detailItem.authority}</p></div>
              <div><span className="text-muted-foreground text-xs">Valid From</span><p className="font-medium">{detailItem.valid_from || "—"}</p></div>
              <div><span className="text-muted-foreground text-xs">Valid To</span><p className="font-medium">{detailItem.valid_to || "—"}</p></div>
              {detailItem.remarks && <div className="col-span-2"><span className="text-muted-foreground text-xs">Remarks</span><p className="text-muted-foreground">{detailItem.remarks}</p></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
