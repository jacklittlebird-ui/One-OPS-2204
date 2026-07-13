import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Scale } from "lucide-react";

const STATUSES = ["draft", "under_review", "filed", "amended"];

export default function GlobeMinimumTaxPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const [openLine, setOpenLine] = useState(false);

  const { data: reports = [] } = useQuery({
    queryKey: ["globe_reports"],
    queryFn: async () => {
      const { data, error } = await supabase.from("globe_reports").select("*").order("fiscal_year", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const current = reports.find((r) => r.id === selected);

  const { data: lines = [] } = useQuery({
    queryKey: ["globe_jurisdiction_lines", selected],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("globe_jurisdiction_lines")
        .select("*")
        .eq("report_id", selected)
        .order("jurisdiction");
      if (error) throw error;
      return data as any[];
    },
  });

  const createReport = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      report_name: String(form.get("report_name") || ""),
      fiscal_year: Number(form.get("fiscal_year") || new Date().getFullYear()),
      currency: String(form.get("currency") || "USD"),
      ultimate_parent: String(form.get("ultimate_parent") || ""),
      minimum_rate: Number(form.get("minimum_rate") || 15),
      notes: String(form.get("notes") || ""),
    };
    const { error } = await supabase.from("globe_reports").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("GloBE report created");
    setOpenNew(false);
    qc.invalidateQueries({ queryKey: ["globe_reports"] });
  };

  const createLine = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selected) return;
    const form = new FormData(e.currentTarget);
    const payload = {
      report_id: selected,
      jurisdiction: String(form.get("jurisdiction") || ""),
      globe_income: Number(form.get("globe_income") || 0),
      covered_taxes: Number(form.get("covered_taxes") || 0),
      payroll_carveout: Number(form.get("payroll_carveout") || 0),
      tangible_carveout: Number(form.get("tangible_carveout") || 0),
      notes: String(form.get("notes") || ""),
    };
    const { error } = await supabase.from("globe_jurisdiction_lines").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Jurisdiction added");
    setOpenLine(false);
    qc.invalidateQueries({ queryKey: ["globe_jurisdiction_lines", selected] });
  };

  const setStatus = async (id: string, status: string) => {
    const patch: any = { status };
    if (status === "filed") patch.filed_at = new Date().toISOString();
    const { error } = await supabase.from("globe_reports").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["globe_reports"] });
  };

  const totals = lines.reduce(
    (acc, l) => ({
      income: acc.income + Number(l.globe_income || 0),
      taxes: acc.taxes + Number(l.covered_taxes || 0),
      topup: acc.topup + Number(l.top_up_tax || 0),
    }),
    { income: 0, taxes: 0, topup: 0 }
  );
  const groupETR = totals.income > 0 ? (totals.taxes / totals.income) * 100 : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Scale className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Pillar Two — GloBE Minimum Tax</h1>
            <p className="text-muted-foreground">15% global minimum effective tax rate (OECD Pillar Two)</p>
          </div>
        </div>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New Report</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New GloBE Report</DialogTitle></DialogHeader>
            <form onSubmit={createReport} className="space-y-3">
              <div><Label>Report Name</Label><Input name="report_name" required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Fiscal Year</Label><Input name="fiscal_year" type="number" defaultValue={new Date().getFullYear()} required /></div>
                <div><Label>Currency</Label><Input name="currency" defaultValue="USD" required /></div>
              </div>
              <div><Label>Ultimate Parent Entity</Label><Input name="ultimate_parent" /></div>
              <div><Label>Minimum Rate (%)</Label><Input name="minimum_rate" type="number" step="0.01" defaultValue={15} /></div>
              <div><Label>Notes</Label><Textarea name="notes" /></div>
              <Button type="submit" className="w-full">Create</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Reports</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{reports.length}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">GloBE Income</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{totals.income.toLocaleString(undefined, { maximumFractionDigits: 0 })}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Group ETR</CardTitle></CardHeader><CardContent className={`text-2xl font-bold ${groupETR < 15 ? "text-destructive" : "text-primary"}`}>{groupETR.toFixed(2)}%</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Top-up Tax</CardTitle></CardHeader><CardContent className="text-2xl font-bold text-destructive">{totals.topup.toLocaleString(undefined, { maximumFractionDigits: 0 })}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Reports</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Name</TableHead><TableHead>FY</TableHead><TableHead>Parent</TableHead><TableHead>Currency</TableHead><TableHead>Min %</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {reports.map((r) => (
                <TableRow key={r.id} className={selected === r.id ? "bg-muted" : "cursor-pointer"} onClick={() => setSelected(r.id)}>
                  <TableCell className="font-medium">{r.report_name}</TableCell>
                  <TableCell>{r.fiscal_year}</TableCell>
                  <TableCell>{r.ultimate_parent}</TableCell>
                  <TableCell>{r.currency}</TableCell>
                  <TableCell>{r.minimum_rate}%</TableCell>
                  <TableCell><Badge variant={r.status === "filed" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <select className="border rounded px-2 py-1 text-sm bg-background" value={r.status} onChange={(e) => setStatus(r.id, e.target.value)}>
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </TableCell>
                </TableRow>
              ))}
              {reports.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No reports</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {current && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Jurisdictions — {current.report_name}</CardTitle>
            <Dialog open={openLine} onOpenChange={setOpenLine}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />Add Jurisdiction</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Jurisdiction</DialogTitle></DialogHeader>
                <form onSubmit={createLine} className="space-y-3">
                  <div><Label>Jurisdiction</Label><Input name="jurisdiction" required /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>GloBE Income</Label><Input name="globe_income" type="number" step="0.01" defaultValue={0} /></div>
                    <div><Label>Covered Taxes</Label><Input name="covered_taxes" type="number" step="0.01" defaultValue={0} /></div>
                    <div><Label>Payroll Carve-out</Label><Input name="payroll_carveout" type="number" step="0.01" defaultValue={0} /></div>
                    <div><Label>Tangible Carve-out</Label><Input name="tangible_carveout" type="number" step="0.01" defaultValue={0} /></div>
                  </div>
                  <div><Label>Notes</Label><Textarea name="notes" /></div>
                  <Button type="submit" className="w-full">Add</Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Jurisdiction</TableHead><TableHead className="text-right">GloBE Income</TableHead><TableHead className="text-right">Covered Taxes</TableHead><TableHead className="text-right">Carve-outs</TableHead><TableHead className="text-right">ETR</TableHead><TableHead className="text-right">Top-up Tax</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {lines.map((l) => {
                  const etr = Number(l.effective_tax_rate || 0);
                  return (
                    <TableRow key={l.id}>
                      <TableCell>{l.jurisdiction}</TableCell>
                      <TableCell className="text-right">{Number(l.globe_income).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{Number(l.covered_taxes).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{(Number(l.payroll_carveout) + Number(l.tangible_carveout)).toLocaleString()}</TableCell>
                      <TableCell className={`text-right font-medium ${etr < 15 ? "text-destructive" : ""}`}>{etr.toFixed(2)}%</TableCell>
                      <TableCell className="text-right font-medium">{Number(l.top_up_tax).toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  );
                })}
                {lines.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No jurisdictions</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
