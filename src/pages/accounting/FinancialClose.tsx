import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, Unlock, CheckCircle2, AlertTriangle, ClipboardList, History } from "lucide-react";

const DEFAULT_CHECKLIST = [
  { name: "All bank statements imported", category: "cash" },
  { name: "Bank reconciliations complete", category: "cash" },
  { name: "All AR invoices posted for the period", category: "ar" },
  { name: "All AP bills entered for the period", category: "ap" },
  { name: "Payroll journal posted", category: "payroll" },
  { name: "Depreciation run for the period", category: "assets" },
  { name: "Accruals & deferrals booked", category: "adjustments" },
  { name: "FX revaluation posted", category: "adjustments" },
  { name: "Intercompany balances reconciled", category: "intercompany" },
  { name: "Trial balance reviewed & signed off", category: "review" },
];

type Period = {
  id: string; year: number; month: number; period_start: string; period_end: string;
  status: string; locked_at: string | null; closed_at: string | null; reopened: boolean; notes: string | null;
};
type ChecklistItem = {
  id: string; period_id: string; name: string; category: string; sort_order: number;
  is_complete: boolean; completed_at: string | null; notes: string | null;
};

export default function FinancialClosePage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newYear, setNewYear] = useState(new Date().getFullYear());
  const [newMonth, setNewMonth] = useState(new Date().getMonth() + 1);
  const [actionDialog, setActionDialog] = useState<null | "close" | "reopen" | "lock">(null);
  const [reason, setReason] = useState("");

  const { data: periods = [] } = useQuery<Period[]>({
    queryKey: ["accounting_periods"],
    queryFn: async () => {
      const { data, error } = await supabase.from("accounting_periods").select("*").order("year", { ascending: false }).order("month", { ascending: false });
      if (error) throw error;
      return data as Period[];
    },
  });

  const selected = periods.find((p) => p.id === selectedId) ?? periods[0] ?? null;

  const { data: checklist = [] } = useQuery<ChecklistItem[]>({
    queryKey: ["period_checklist", selected?.id],
    enabled: !!selected?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("period_close_checklist_items").select("*").eq("period_id", selected!.id).order("sort_order");
      if (error) throw error;
      return data as ChecklistItem[];
    },
  });

  const { data: audit = [] } = useQuery({
    queryKey: ["period_audit", selected?.id],
    enabled: !!selected?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("period_close_audit").select("*").eq("period_id", selected!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createPeriod = useMutation({
    mutationFn: async () => {
      const start = new Date(newYear, newMonth - 1, 1);
      const end = new Date(newYear, newMonth, 0);
      const { data: period, error } = await supabase.from("accounting_periods").insert({
        year: newYear, month: newMonth,
        period_start: format(start, "yyyy-MM-dd"),
        period_end: format(end, "yyyy-MM-dd"),
        status: "open",
      }).select().single();
      if (error) throw error;
      const items = DEFAULT_CHECKLIST.map((c, i) => ({ period_id: period.id, name: c.name, category: c.category, sort_order: i }));
      const { error: e2 } = await supabase.from("period_close_checklist_items").insert(items);
      if (e2) throw e2;
      return period;
    },
    onSuccess: (p: any) => {
      toast.success(`Period ${p.year}-${String(p.month).padStart(2, "0")} created`);
      setCreateOpen(false);
      setSelectedId(p.id);
      qc.invalidateQueries({ queryKey: ["accounting_periods"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleItem = useMutation({
    mutationFn: async (item: ChecklistItem) => {
      const { error } = await supabase.from("period_close_checklist_items").update({
        is_complete: !item.is_complete,
        completed_at: !item.is_complete ? new Date().toISOString() : null,
        completed_by: !item.is_complete ? user?.id : null,
      }).eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["period_checklist", selected?.id] }),
  });

  const changeStatus = useMutation({
    mutationFn: async ({ status, action }: { status: string; action: string }) => {
      const patch: any = { status };
      if (status === "closed") { patch.closed_at = new Date().toISOString(); patch.closed_by = user?.id; patch.locked_at = new Date().toISOString(); patch.locked_by = user?.id; }
      if (status === "in_close") { patch.locked_at = new Date().toISOString(); patch.locked_by = user?.id; }
      if (status === "open" && action === "reopen") { patch.reopened = true; patch.closed_at = null; }
      const { error } = await supabase.from("accounting_periods").update(patch).eq("id", selected!.id);
      if (error) throw error;
      await supabase.from("period_close_audit").insert({ period_id: selected!.id, action, performed_by: user?.id, reason });
    },
    onSuccess: () => {
      toast.success("Period updated");
      setActionDialog(null); setReason("");
      qc.invalidateQueries({ queryKey: ["accounting_periods"] });
      qc.invalidateQueries({ queryKey: ["period_audit", selected?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openPeriods = periods.filter((p) => p.status === "open").length;
  const inClose = periods.filter((p) => p.status === "in_close").length;
  const closed = periods.filter((p) => p.status === "closed").length;
  const completeCount = checklist.filter((c) => c.is_complete).length;
  const totalCount = checklist.length;
  const readyToClose = totalCount > 0 && completeCount === totalCount;

  const statusBadge = (s: string) => {
    if (s === "closed") return <Badge variant="destructive"><Lock className="w-3 h-3 mr-1" />Closed</Badge>;
    if (s === "in_close") return <Badge className="bg-amber-500"><AlertTriangle className="w-3 h-3 mr-1" />In Close</Badge>;
    return <Badge variant="secondary"><Unlock className="w-3 h-3 mr-1" />Open</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Financial Close & Period Locking</h1>
          <p className="text-muted-foreground">Manage month-end checklists and lock closed periods to prevent back-dated postings.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>New Period</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Open Periods</div><div className="text-3xl font-bold">{openPeriods}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">In Close</div><div className="text-3xl font-bold text-amber-600">{inClose}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Closed</div><div className="text-3xl font-bold text-destructive">{closed}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Checklist Progress</div><div className="text-3xl font-bold">{completeCount}/{totalCount || 0}</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Periods</CardTitle></CardHeader>
          <CardContent className="space-y-1 max-h-[600px] overflow-y-auto">
            {periods.length === 0 && <p className="text-sm text-muted-foreground">No periods yet.</p>}
            {periods.map((p) => (
              <button key={p.id} onClick={() => setSelectedId(p.id)}
                className={`w-full text-left p-3 rounded-md border transition-colors ${selected?.id === p.id ? "bg-muted border-primary" : "hover:bg-muted/50"}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium">{p.year}-{String(p.month).padStart(2, "0")}</span>
                  {statusBadge(p.status)}
                </div>
                {p.reopened && <div className="text-xs text-amber-600 mt-1">Reopened</div>}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          {selected ? (
            <>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{format(new Date(selected.period_start), "MMMM yyyy")}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{format(new Date(selected.period_start), "dd/MM/yyyy")} → {format(new Date(selected.period_end), "dd/MM/yyyy")}</p>
                  </div>
                  <div className="flex gap-2">
                    {selected.status === "open" && (
                      <Button variant="outline" onClick={() => setActionDialog("lock")}><AlertTriangle className="w-4 h-4 mr-2" />Start Close</Button>
                    )}
                    {selected.status !== "closed" && (
                      <Button disabled={!readyToClose} onClick={() => setActionDialog("close")}>
                        <Lock className="w-4 h-4 mr-2" />Close Period
                      </Button>
                    )}
                    {selected.status === "closed" && (
                      <Button variant="destructive" onClick={() => setActionDialog("reopen")}><Unlock className="w-4 h-4 mr-2" />Reopen</Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="checklist">
                  <TabsList>
                    <TabsTrigger value="checklist"><ClipboardList className="w-4 h-4 mr-2" />Checklist</TabsTrigger>
                    <TabsTrigger value="audit"><History className="w-4 h-4 mr-2" />Audit Trail</TabsTrigger>
                  </TabsList>
                  <TabsContent value="checklist" className="space-y-2 mt-4">
                    {checklist.length === 0 && <p className="text-sm text-muted-foreground">No checklist items.</p>}
                    {checklist.map((item) => (
                      <div key={item.id} className="flex items-start gap-3 p-3 rounded-md border">
                        <Checkbox checked={item.is_complete} disabled={selected.status === "closed"}
                          onCheckedChange={() => toggleItem.mutate(item)} className="mt-1" />
                        <div className="flex-1">
                          <div className={item.is_complete ? "line-through text-muted-foreground" : ""}>{item.name}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            <Badge variant="outline" className="mr-2">{item.category}</Badge>
                            {item.is_complete && item.completed_at && <span>Done {format(new Date(item.completed_at), "dd/MM/yyyy HH:mm")}</span>}
                          </div>
                        </div>
                        {item.is_complete && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                      </div>
                    ))}
                  </TabsContent>
                  <TabsContent value="audit" className="mt-4">
                    <Table>
                      <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Action</TableHead><TableHead>Reason</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {audit.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No history yet.</TableCell></TableRow>}
                        {audit.map((a: any) => (
                          <TableRow key={a.id}>
                            <TableCell>{format(new Date(a.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                            <TableCell><Badge variant="outline">{a.action}</Badge></TableCell>
                            <TableCell className="text-sm">{a.reason || "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          ) : (
            <CardContent className="py-16 text-center text-muted-foreground">Create a period to begin.</CardContent>
          )}
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Accounting Period</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div><Label>Year</Label><Input type="number" value={newYear} onChange={(e) => setNewYear(+e.target.value)} /></div>
            <div>
              <Label>Month</Label>
              <Select value={String(newMonth)} onValueChange={(v) => setNewMonth(+v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <SelectItem key={m} value={String(m)}>{format(new Date(2000, m - 1, 1), "MMMM")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createPeriod.mutate()} disabled={createPeriod.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!actionDialog} onOpenChange={(o) => !o && setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog === "close" && "Close Period"}
              {actionDialog === "reopen" && "Reopen Period"}
              {actionDialog === "lock" && "Start Close Process"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            {actionDialog === "close" && <p className="text-sm text-muted-foreground">Closing this period will block all new or modified invoices, journal entries, receipts, and payments dated within it. Admins can still override.</p>}
            {actionDialog === "reopen" && <p className="text-sm text-destructive">Reopening a closed period allows back-dated postings again. This action is logged.</p>}
            {actionDialog === "lock" && <p className="text-sm text-muted-foreground">Marks the period as "In Close" — signals to the team that final adjustments are being made.</p>}
            <div>
              <Label>Reason / Notes</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional reason for audit trail" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button
              variant={actionDialog === "reopen" ? "destructive" : "default"}
              onClick={() => {
                if (actionDialog === "close") changeStatus.mutate({ status: "closed", action: "close" });
                if (actionDialog === "reopen") changeStatus.mutate({ status: "open", action: "reopen" });
                if (actionDialog === "lock") changeStatus.mutate({ status: "in_close", action: "lock" });
              }}
              disabled={changeStatus.isPending}
            >Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
