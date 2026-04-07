import { useState } from "react";
import { formatDateDMY } from "@/lib/utils";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Pencil, Trash2, Award, TrendingUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type IncentiveRow = {
  id: string; airline_id: string; incentive_type: string; period: string;
  threshold: number; rate: number; max_amount: number; currency: string;
  start_date: string; end_date: string | null; description: string; status: string;
};

const TYPES = ["Volume", "Revenue", "Growth", "Loyalty", "Performance"];
const PERIODS = ["Monthly", "Quarterly", "Semi-Annual", "Annual"];

const TYPE_COLORS: Record<string, string> = {
  Volume: "bg-blue-100 text-blue-800",
  Revenue: "bg-green-100 text-green-800",
  Growth: "bg-purple-100 text-purple-800",
  Loyalty: "bg-amber-100 text-amber-800",
  Performance: "bg-cyan-100 text-cyan-800",
};

export default function AirlineIncentivesPage() {
  const { data, isLoading, add, update, remove } = useSupabaseTable<IncentiveRow>("airline_incentives");
  const { data: airlines } = useQuery({
    queryKey: ["airlines"],
    queryFn: async () => { const { data } = await supabase.from("airlines").select("id,name,code"); return data || []; },
  });

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<IncentiveRow | null>(null);
  const emptyForm = { airline_id: "", incentive_type: "Volume", period: "Quarterly", threshold: 0, rate: 0, max_amount: 0, currency: "USD", start_date: new Date().toISOString().slice(0, 10), end_date: "", description: "", status: "Active" };
  const [form, setForm] = useState<any>(emptyForm);

  const airlineMap = Object.fromEntries((airlines || []).map((a: any) => [a.id, a]));
  const filtered = data.filter(i => {
    const airline = airlineMap[i.airline_id];
    return (airline?.name || "").toLowerCase().includes(search.toLowerCase()) || i.description.toLowerCase().includes(search.toLowerCase());
  });

  const stats = {
    total: data.length,
    active: data.filter(i => i.status === "Active").length,
    totalMaxAmount: data.filter(i => i.status === "Active").reduce((s, i) => s + i.max_amount, 0),
    airlines: new Set(data.map(i => i.airline_id)).size,
  };

  const openAdd = () => { setEditItem(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (i: IncentiveRow) => {
    setEditItem(i);
    setForm({ airline_id: i.airline_id, incentive_type: i.incentive_type, period: i.period, threshold: i.threshold, rate: i.rate, max_amount: i.max_amount, currency: i.currency, start_date: i.start_date, end_date: i.end_date || "", description: i.description, status: i.status });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.airline_id) { toast({ title: "Error", description: "Airline is required", variant: "destructive" }); return; }
    const payload: any = { ...form, threshold: Number(form.threshold) || 0, rate: Number(form.rate) || 0, max_amount: Number(form.max_amount) || 0 };
    if (!payload.end_date) payload.end_date = null;
    if (editItem) { await update({ id: editItem.id, ...payload }); } else { await add(payload); }
    setDialogOpen(false);
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Airline Incentives</h1>
          <p className="text-muted-foreground text-sm">حوافز الطيران · Manage airline incentive programs</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button onClick={openAdd}><Plus size={16} className="mr-1" /> New Incentive</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editItem ? "Edit Incentive" : "New Incentive"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Select value={form.airline_id} onValueChange={v => setForm({ ...form, airline_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select Airline" /></SelectTrigger>
                <SelectContent>{(airlines || []).map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name} ({a.code})</SelectItem>)}</SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-2">
                <Select value={form.incentive_type} onValueChange={v => setForm({ ...form, incentive_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.period} onValueChange={v => setForm({ ...form, period: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PERIODS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><label className="text-xs text-muted-foreground">Threshold</label><Input type="number" value={form.threshold} onChange={e => setForm({ ...form, threshold: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Rate %</label><Input type="number" value={form.rate} onChange={e => setForm({ ...form, rate: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Max Amount</label><Input type="number" value={form.max_amount} onChange={e => setForm({ ...form, max_amount: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><label className="text-xs text-muted-foreground">Start</label><Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">End</label><Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
                <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="EGP">EGP</SelectItem></SelectContent>
                </Select>
              </div>
              <Textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem><SelectItem value="Expired">Expired</SelectItem></SelectContent>
              </Select>
              <Button className="w-full" onClick={handleSave}>{editItem ? "Update" : "Save"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Programs", value: stats.total, icon: <Award size={16} className="text-amber-500" /> },
          { label: "Active", value: stats.active, icon: <TrendingUp size={16} className="text-green-500" /> },
          { label: "Airlines", value: stats.airlines, icon: null },
          { label: "Max Liability", value: stats.totalMaxAmount.toLocaleString(), icon: null },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-3 flex items-center gap-2">{s.icon}<div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.value}</p></div></CardContent></Card>
        ))}
      </div>

      <div className="relative"><Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} /><Input placeholder="Search incentives…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Airline</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Threshold</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Max</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(i => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{airlineMap[i.airline_id]?.name || "—"} <span className="text-muted-foreground text-xs">({airlineMap[i.airline_id]?.code})</span></TableCell>
                  <TableCell><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[i.incentive_type] || ""}`}>{i.incentive_type}</span></TableCell>
                  <TableCell>{i.period}</TableCell>
                  <TableCell className="font-mono">{i.threshold.toLocaleString()}</TableCell>
                  <TableCell className="font-mono">{i.rate}%</TableCell>
                  <TableCell className="font-mono">{i.max_amount.toLocaleString()} {i.currency}</TableCell>
                  <TableCell className="text-xs">{formatDateDMY(i.start_date)}{i.end_date ? ` → ${formatDateDMY(i.end_date)}` : " → ∞"}</TableCell>
                  <TableCell><Badge variant={i.status === "Active" ? "default" : "secondary"}>{i.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(i)}><Pencil size={14} /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(i.id)}><Trash2 size={14} /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No incentives configured</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
