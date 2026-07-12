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

type Chain = { id: string; name: string; currency: string; min_amount: number; max_amount: number | null; level: number; approver_role: string; is_active: boolean; notes: string | null; };
type Step = { id: string; report_id: string; level: number; approver_role: string; status: string; comments: string | null; decided_at: string | null; };
type Report = { id: string; report_no: string | null; employee_name: string | null; currency: string | null; total_amount: number | null; status: string | null; };

export default function ExpenseApprovals() {
  const [chains, setChains] = useState<Chain[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<Chain>>({ name: "", currency: "USD", min_amount: 0, level: 1, approver_role: "accountant", is_active: true });
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const [c, s, r] = await Promise.all([
      supabase.from("expense_approval_chains").select("*").order("level"),
      supabase.from("expense_approval_steps").select("*").order("created_at", { ascending: false }),
      supabase.from("expense_reports").select("id,report_no,employee_name,currency,total_amount,status").order("created_at", { ascending: false }).limit(200),
    ]);
    setChains((c.data ?? []) as any);
    setSteps((s.data ?? []) as any);
    setReports((r.data ?? []) as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const saveChain = async () => {
    if (!form.name || !form.approver_role) { toast.error("Name and role required"); return; }
    const { error } = await supabase.from("expense_approval_chains").insert(form as any);
    if (error) toast.error(error.message); else { toast.success("Chain saved"); setOpen(false); load(); }
  };

  const submit = async (id: string) => {
    const { error } = await supabase.rpc("submit_expense_report_for_approval", { _report_id: id });
    if (error) toast.error(error.message); else { toast.success("Submitted for approval"); load(); }
  };
  const approve = async (id: string) => {
    const { error } = await supabase.rpc("approve_expense_step", { _step_id: id, _comments: null });
    if (error) toast.error(error.message); else { toast.success("Approved"); load(); }
  };
  const reject = async (id: string) => {
    const c = prompt("Rejection reason?"); if (c === null) return;
    const { error } = await supabase.rpc("reject_expense_step", { _step_id: id, _comments: c });
    if (error) toast.error(error.message); else { toast.success("Rejected"); load(); }
  };

  const pending = steps.filter(s => s.status === "pending");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Expense Claims Approval Workflow</h1>
          <p className="text-muted-foreground">Multi-level approval chains for employee expense reports.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button>New Approval Level</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Approval Level</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Chain Name</Label><Input value={form.name ?? ""} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Level</Label><Input type="number" value={form.level ?? 1} onChange={e => setForm({ ...form, level: Number(e.target.value) })} /></div>
                <div><Label>Approver Role</Label><Input value={form.approver_role ?? ""} onChange={e => setForm({ ...form, approver_role: e.target.value })} placeholder="accountant | admin | receivables" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Currency</Label><Input value={form.currency ?? "USD"} onChange={e => setForm({ ...form, currency: e.target.value })} /></div>
                <div><Label>Min Amount</Label><Input type="number" value={form.min_amount ?? 0} onChange={e => setForm({ ...form, min_amount: Number(e.target.value) })} /></div>
                <div><Label>Max Amount</Label><Input type="number" value={form.max_amount ?? ""} onChange={e => setForm({ ...form, max_amount: e.target.value ? Number(e.target.value) : null })} /></div>
              </div>
              <Button onClick={saveChain}>Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Chains</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{chains.length}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Pending Steps</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{pending.length}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Reports</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{reports.length}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Approved</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{reports.filter(r => r.status === "approved").length}</CardContent></Card>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending Approvals</TabsTrigger>
          <TabsTrigger value="reports">Expense Reports</TabsTrigger>
          <TabsTrigger value="chains">Approval Chains</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card><CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted"><tr><th className="p-2 text-left">Report</th><th>Level</th><th>Role</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {pending.map(s => {
                  const r = reports.find(x => x.id === s.report_id);
                  return <tr key={s.id} className="border-t">
                    <td className="p-2">{r?.report_no ?? s.report_id.slice(0,8)} — {r?.employee_name} ({r?.currency} {r?.total_amount})</td>
                    <td className="text-center">L{s.level}</td>
                    <td className="text-center">{s.approver_role}</td>
                    <td className="text-center"><Badge>{s.status}</Badge></td>
                    <td className="p-2 text-right space-x-2">
                      <Button size="sm" onClick={() => approve(s.id)}>Approve</Button>
                      <Button size="sm" variant="destructive" onClick={() => reject(s.id)}>Reject</Button>
                    </td>
                  </tr>;
                })}
                {pending.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No pending approvals</td></tr>}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card><CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted"><tr><th className="p-2 text-left">Report No</th><th>Employee</th><th>Amount</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {reports.map(r => <tr key={r.id} className="border-t">
                  <td className="p-2">{r.report_no ?? r.id.slice(0,8)}</td>
                  <td>{r.employee_name}</td>
                  <td className="text-right">{r.currency} {Number(r.total_amount ?? 0).toFixed(2)}</td>
                  <td className="text-center"><Badge variant="outline">{r.status ?? "draft"}</Badge></td>
                  <td className="p-2 text-right">
                    {(r.status === "draft" || !r.status) && <Button size="sm" onClick={() => submit(r.id)}>Submit</Button>}
                  </td>
                </tr>)}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="chains">
          <Card><CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted"><tr><th className="p-2 text-left">Name</th><th>Level</th><th>Role</th><th>Currency</th><th>Min</th><th>Max</th><th>Active</th></tr></thead>
              <tbody>
                {chains.map(c => <tr key={c.id} className="border-t">
                  <td className="p-2">{c.name}</td>
                  <td className="text-center">L{c.level}</td>
                  <td className="text-center">{c.approver_role}</td>
                  <td className="text-center">{c.currency}</td>
                  <td className="text-right">{Number(c.min_amount).toFixed(2)}</td>
                  <td className="text-right">{c.max_amount ? Number(c.max_amount).toFixed(2) : "∞"}</td>
                  <td className="text-center">{c.is_active ? "✓" : "—"}</td>
                </tr>)}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="history">
          <Card><CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted"><tr><th className="p-2 text-left">Report</th><th>Level</th><th>Role</th><th>Status</th><th>Decided</th><th>Comments</th></tr></thead>
              <tbody>
                {steps.filter(s => s.status !== "pending" && s.status !== "waiting").map(s => {
                  const r = reports.find(x => x.id === s.report_id);
                  return <tr key={s.id} className="border-t">
                    <td className="p-2">{r?.report_no ?? s.report_id.slice(0,8)}</td>
                    <td className="text-center">L{s.level}</td>
                    <td className="text-center">{s.approver_role}</td>
                    <td className="text-center"><Badge variant={s.status === "approved" ? "default" : "destructive"}>{s.status}</Badge></td>
                    <td className="text-center">{s.decided_at ? new Date(s.decided_at).toLocaleString() : "—"}</td>
                    <td className="p-2">{s.comments}</td>
                  </tr>;
                })}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {loading && <div className="text-center text-muted-foreground">Loading…</div>}
    </div>
  );
}
