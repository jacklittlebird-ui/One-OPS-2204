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

export default function AllocationDrivers() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [values, setValues] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [dOpen, setDOpen] = useState(false);
  const [dForm, setDForm] = useState<any>({ code: "", name: "", unit: "", is_active: true });
  const [vOpen, setVOpen] = useState(false);
  const [vForm, setVForm] = useState<any>({ driver_id: "", cost_center: "", period_year: new Date().getFullYear(), period_month: new Date().getMonth()+1, weight: 0 });
  const [rOpen, setROpen] = useState(false);
  const [rForm, setRForm] = useState<any>({ rule_id: "", period_year: new Date().getFullYear(), period_month: new Date().getMonth()+1, amount: 0 });

  const load = async () => {
    const [d, v, r, ru] = await Promise.all([
      supabase.from("cost_allocation_drivers").select("*").order("code"),
      supabase.from("cost_allocation_driver_values").select("*").order("period_year", { ascending: false }),
      supabase.from("cost_allocation_runs").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("cost_allocation_rules").select("id,name").order("name"),
    ]);
    setDrivers(d.data ?? []); setValues(v.data ?? []); setRuns(r.data ?? []); setRules(ru.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const saveDriver = async () => {
    const { error } = await supabase.from("cost_allocation_drivers").insert(dForm);
    if (error) toast.error(error.message); else { toast.success("Driver saved"); setDOpen(false); load(); }
  };
  const saveValue = async () => {
    const { error } = await supabase.from("cost_allocation_driver_values").insert(vForm);
    if (error) toast.error(error.message); else { toast.success("Weight saved"); setVOpen(false); load(); }
  };
  const runAlloc = async () => {
    const { error } = await supabase.rpc("run_cost_allocation", { _rule_id: rForm.rule_id, _year: rForm.period_year, _month: rForm.period_month, _amount: rForm.amount });
    if (error) toast.error(error.message); else { toast.success("Run created"); setROpen(false); load(); }
  };
  const reverse = async (id: string) => {
    const { error } = await supabase.rpc("reverse_allocation_run", { _run_id: id });
    if (error) toast.error(error.message); else { toast.success("Reversed"); load(); }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Advanced Cost Allocation</h1>
        <p className="text-muted-foreground">Driver-based allocation with reversal support.</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Drivers</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{drivers.length}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Driver Weights</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{values.length}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Runs</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{runs.length}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Reversed</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{runs.filter(r => r.reversed_at).length}</CardContent></Card>
      </div>

      <Tabs defaultValue="runs">
        <TabsList>
          <TabsTrigger value="runs">Allocation Runs</TabsTrigger>
          <TabsTrigger value="drivers">Drivers</TabsTrigger>
          <TabsTrigger value="weights">Driver Weights</TabsTrigger>
        </TabsList>

        <TabsContent value="runs">
          <div className="flex justify-end mb-2">
            <Dialog open={rOpen} onOpenChange={setROpen}>
              <DialogTrigger asChild><Button>Run Allocation</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Run Allocation</DialogTitle></DialogHeader>
                <div className="grid gap-3">
                  <div><Label>Rule</Label>
                    <select className="w-full border rounded p-2" value={rForm.rule_id} onChange={e => setRForm({...rForm, rule_id: e.target.value})}>
                      <option value="">— select —</option>
                      {rules.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><Label>Year</Label><Input type="number" value={rForm.period_year} onChange={e => setRForm({...rForm, period_year: Number(e.target.value)})} /></div>
                    <div><Label>Month</Label><Input type="number" value={rForm.period_month} onChange={e => setRForm({...rForm, period_month: Number(e.target.value)})} /></div>
                    <div><Label>Amount</Label><Input type="number" value={rForm.amount} onChange={e => setRForm({...rForm, amount: Number(e.target.value)})} /></div>
                  </div>
                  <Button onClick={runAlloc}>Run</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card><CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted"><tr><th className="p-2 text-left">Rule</th><th>Period</th><th>Amount</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {runs.map(r => {
                  const rule = rules.find(x => x.id === r.rule_id);
                  return <tr key={r.id} className="border-t">
                    <td className="p-2">{rule?.name ?? r.rule_id?.slice(0,8)}</td>
                    <td className="text-center">{r.period_year}-{String(r.period_month).padStart(2,"0")}</td>
                    <td className="text-right">{Number(r.total_allocated ?? 0).toFixed(2)}</td>
                    <td className="text-center">{r.reversed_at ? <Badge variant="destructive">Reversed</Badge> : r.reversal_of ? <Badge variant="secondary">Reversal</Badge> : <Badge>Posted</Badge>}</td>
                    <td className="p-2 text-right">{!r.reversed_at && !r.reversal_of && <Button size="sm" variant="outline" onClick={() => reverse(r.id)}>Reverse</Button>}</td>
                  </tr>;
                })}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="drivers">
          <div className="flex justify-end mb-2">
            <Dialog open={dOpen} onOpenChange={setDOpen}>
              <DialogTrigger asChild><Button>New Driver</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New Allocation Driver</DialogTitle></DialogHeader>
                <div className="grid gap-3">
                  <div><Label>Code</Label><Input value={dForm.code} onChange={e => setDForm({...dForm, code: e.target.value})} /></div>
                  <div><Label>Name</Label><Input value={dForm.name} onChange={e => setDForm({...dForm, name: e.target.value})} /></div>
                  <div><Label>Unit</Label><Input value={dForm.unit} onChange={e => setDForm({...dForm, unit: e.target.value})} placeholder="headcount, sqm, revenue..." /></div>
                  <Button onClick={saveDriver}>Save</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card><CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted"><tr><th className="p-2 text-left">Code</th><th>Name</th><th>Unit</th><th>Active</th></tr></thead>
              <tbody>
                {drivers.map(d => <tr key={d.id} className="border-t">
                  <td className="p-2">{d.code}</td><td>{d.name}</td><td className="text-center">{d.unit}</td>
                  <td className="text-center">{d.is_active ? "✓" : "—"}</td>
                </tr>)}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="weights">
          <div className="flex justify-end mb-2">
            <Dialog open={vOpen} onOpenChange={setVOpen}>
              <DialogTrigger asChild><Button>Add Weight</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Driver Weight</DialogTitle></DialogHeader>
                <div className="grid gap-3">
                  <div><Label>Driver</Label>
                    <select className="w-full border rounded p-2" value={vForm.driver_id} onChange={e => setVForm({...vForm, driver_id: e.target.value})}>
                      <option value="">— select —</option>
                      {drivers.map(d => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
                    </select>
                  </div>
                  <div><Label>Cost Center</Label><Input value={vForm.cost_center} onChange={e => setVForm({...vForm, cost_center: e.target.value})} /></div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><Label>Year</Label><Input type="number" value={vForm.period_year} onChange={e => setVForm({...vForm, period_year: Number(e.target.value)})} /></div>
                    <div><Label>Month</Label><Input type="number" value={vForm.period_month} onChange={e => setVForm({...vForm, period_month: Number(e.target.value)})} /></div>
                    <div><Label>Weight</Label><Input type="number" value={vForm.weight} onChange={e => setVForm({...vForm, weight: Number(e.target.value)})} /></div>
                  </div>
                  <Button onClick={saveValue}>Save</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card><CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted"><tr><th className="p-2 text-left">Driver</th><th>Cost Center</th><th>Period</th><th>Weight</th></tr></thead>
              <tbody>
                {values.map(v => {
                  const dr = drivers.find(x => x.id === v.driver_id);
                  return <tr key={v.id} className="border-t">
                    <td className="p-2">{dr?.code ?? v.driver_id?.slice(0,8)}</td>
                    <td className="text-center">{v.cost_center}</td>
                    <td className="text-center">{v.period_year}-{String(v.period_month).padStart(2,"0")}</td>
                    <td className="text-right">{Number(v.weight).toFixed(4)}</td>
                  </tr>;
                })}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
