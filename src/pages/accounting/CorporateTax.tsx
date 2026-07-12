import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Calculator, FileCheck } from "lucide-react";

const fmt = (n: number) => new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n || 0));

export default function CorporateTaxPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const [openAdj, setOpenAdj] = useState(false);

  const { data: companies = [] } = useQuery({
    queryKey: ["companies_min"],
    queryFn: async () => (await supabase.from("companies").select("id, name").order("name")).data || [],
  });

  const { data: returns = [] } = useQuery({
    queryKey: ["ct_returns"],
    queryFn: async () => {
      const { data, error } = await supabase.from("corporate_tax_returns").select("*").order("tax_year", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const current = returns.find((r) => r.id === selected);

  const { data: adjustments = [] } = useQuery({
    queryKey: ["ct_adjustments", selected],
    enabled: !!selected,
    queryFn: async () => (await supabase.from("corporate_tax_adjustments").select("*").eq("return_id", selected).order("created_at")).data || [],
  });

  const createReturn = async (f: FormData) => {
    const payload: any = {
      tax_year: Number(f.get("tax_year")),
      company_id: f.get("company_id") || null,
      accounting_profit: Number(f.get("accounting_profit") || 0),
      tax_depreciation_adjustment: Number(f.get("tax_depreciation_adjustment") || 0),
      other_adjustments: Number(f.get("other_adjustments") || 0),
      tax_rate: Number(f.get("tax_rate") || 0.225),
      tax_paid_installments: Number(f.get("tax_paid_installments") || 0),
      withholding_credits: Number(f.get("withholding_credits") || 0),
      notes: f.get("notes"),
    };
    if (!payload.company_id) delete payload.company_id;
    const { data, error } = await supabase.from("corporate_tax_returns").insert(payload).select().single();
    if (error) return toast.error(error.message);
    toast.success("Return created");
    setOpenNew(false);
    setSelected(data.id);
    qc.invalidateQueries({ queryKey: ["ct_returns"] });
  };

  const addAdj = async (f: FormData) => {
    if (!selected) return;
    const payload: any = {
      return_id: selected,
      adjustment_type: f.get("adjustment_type"),
      category: f.get("category"),
      description: f.get("description"),
      amount: Number(f.get("amount") || 0),
      reference: f.get("reference"),
    };
    const { error } = await supabase.from("corporate_tax_adjustments").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Adjustment added");
    setOpenAdj(false);
    qc.invalidateQueries({ queryKey: ["ct_adjustments", selected] });
  };

  const recompute = async () => {
    if (!selected) return;
    const { error } = await supabase.rpc("recompute_corporate_tax", { p_return_id: selected });
    if (error) return toast.error(error.message);
    toast.success("Recomputed");
    qc.invalidateQueries({ queryKey: ["ct_returns"] });
  };

  const file = async () => {
    if (!selected) return;
    const { error } = await supabase.from("corporate_tax_returns").update({ status: "filed", filing_date: new Date().toISOString().slice(0, 10) }).eq("id", selected);
    if (error) return toast.error(error.message);
    toast.success("Filed");
    qc.invalidateQueries({ queryKey: ["ct_returns"] });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Corporate Tax Return</h1>
          <p className="text-muted-foreground text-sm">Annual computation: accounting profit → adjustments → taxable income → tax liability</p>
        </div>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Return</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>New Corporate Tax Return</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createReturn(new FormData(e.currentTarget)); }} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Tax Year</Label><Input type="number" name="tax_year" defaultValue={new Date().getFullYear() - 1} required /></div>
                <div><Label>Company</Label>
                  <Select name="company_id">
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{companies.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Accounting Profit (before tax)</Label><Input type="number" step="0.01" name="accounting_profit" required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Tax Depreciation Adjustment</Label><Input type="number" step="0.01" name="tax_depreciation_adjustment" defaultValue="0" /></div>
                <div><Label>Other Adjustments</Label><Input type="number" step="0.01" name="other_adjustments" defaultValue="0" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Tax Rate</Label><Input type="number" step="0.0001" name="tax_rate" defaultValue="0.225" required /></div>
                <div><Label>Installments Paid</Label><Input type="number" step="0.01" name="tax_paid_installments" defaultValue="0" /></div>
                <div><Label>WHT Credits</Label><Input type="number" step="0.01" name="withholding_credits" defaultValue="0" /></div>
              </div>
              <div><Label>Notes</Label><Textarea name="notes" /></div>
              <Button type="submit" className="w-full">Create</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Returns</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[600px] overflow-auto">
            {returns.map((r) => (
              <button key={r.id} onClick={() => setSelected(r.id)}
                className={`w-full text-left p-3 rounded border ${selected === r.id ? "border-primary bg-primary/5" : "border-border"}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">FY {r.tax_year}</span>
                  <Badge variant={r.status === "filed" ? "default" : r.status === "paid" ? "secondary" : "outline"}>{r.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">Payable: {fmt(r.net_tax_payable)}</div>
              </button>
            ))}
            {returns.length === 0 && <p className="text-sm text-muted-foreground">No returns yet.</p>}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Computation</CardTitle>
            {current && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={recompute}><Calculator className="h-4 w-4 mr-1" />Recompute</Button>
                {current.status === "draft" && <Button size="sm" onClick={file}><FileCheck className="h-4 w-4 mr-1" />File</Button>}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {!current ? (
              <p className="text-sm text-muted-foreground">Select a return.</p>
            ) : (
              <>
                <Table>
                  <TableBody>
                    <TableRow><TableCell>Accounting Profit</TableCell><TableCell className="text-right">{fmt(current.accounting_profit)}</TableCell></TableRow>
                    <TableRow><TableCell>Add: Non-Deductible Expenses</TableCell><TableCell className="text-right">{fmt(current.non_deductible_expenses)}</TableCell></TableRow>
                    <TableRow><TableCell>Less: Non-Taxable Income</TableCell><TableCell className="text-right">({fmt(current.non_taxable_income)})</TableCell></TableRow>
                    <TableRow><TableCell>Tax Depreciation Adjustment</TableCell><TableCell className="text-right">{fmt(current.tax_depreciation_adjustment)}</TableCell></TableRow>
                    <TableRow><TableCell>Other Adjustments</TableCell><TableCell className="text-right">{fmt(current.other_adjustments)}</TableCell></TableRow>
                    <TableRow className="font-semibold border-t"><TableCell>Taxable Income</TableCell><TableCell className="text-right">{fmt(current.taxable_income)}</TableCell></TableRow>
                    <TableRow><TableCell>× Tax Rate</TableCell><TableCell className="text-right">{(current.tax_rate * 100).toFixed(2)}%</TableCell></TableRow>
                    <TableRow className="font-semibold"><TableCell>Tax Liability</TableCell><TableCell className="text-right">{fmt(current.tax_liability)}</TableCell></TableRow>
                    <TableRow><TableCell>Less: Installments Paid</TableCell><TableCell className="text-right">({fmt(current.tax_paid_installments)})</TableCell></TableRow>
                    <TableRow><TableCell>Less: WHT Credits</TableCell><TableCell className="text-right">({fmt(current.withholding_credits)})</TableCell></TableRow>
                    <TableRow className="font-bold border-t text-base"><TableCell>Net Tax Payable</TableCell><TableCell className="text-right">{fmt(current.net_tax_payable)}</TableCell></TableRow>
                  </TableBody>
                </Table>

                <div className="mt-6 flex items-center justify-between">
                  <h3 className="font-semibold">M-1 Reconciling Adjustments</h3>
                  <Dialog open={openAdj} onOpenChange={setOpenAdj}>
                    <DialogTrigger asChild><Button size="sm" variant="secondary"><Plus className="h-4 w-4 mr-1" />Adjustment</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Add Adjustment</DialogTitle></DialogHeader>
                      <form onSubmit={(e) => { e.preventDefault(); addAdj(new FormData(e.currentTarget)); }} className="space-y-3">
                        <div><Label>Type</Label>
                          <Select name="adjustment_type" defaultValue="add_back">
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="add_back">Add Back (Non-Deductible)</SelectItem>
                              <SelectItem value="deduct">Deduct (Non-Taxable)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div><Label>Category</Label>
                          <Select name="category" defaultValue="entertainment">
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="entertainment">Entertainment</SelectItem>
                              <SelectItem value="fines_penalties">Fines &amp; Penalties</SelectItem>
                              <SelectItem value="donations">Donations</SelectItem>
                              <SelectItem value="dividends_received">Dividends Received</SelectItem>
                              <SelectItem value="capital_gains">Capital Gains</SelectItem>
                              <SelectItem value="depreciation_diff">Depreciation Difference</SelectItem>
                              <SelectItem value="provisions">Provisions</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div><Label>Description</Label><Input name="description" /></div>
                        <div><Label>Amount</Label><Input type="number" step="0.01" name="amount" required /></div>
                        <div><Label>Reference</Label><Input name="reference" /></div>
                        <Button type="submit" className="w-full">Add</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
                <Table className="mt-2">
                  <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Category</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {adjustments.map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell><Badge variant={a.adjustment_type === "add_back" ? "default" : "secondary"}>{a.adjustment_type === "add_back" ? "Add" : "Deduct"}</Badge></TableCell>
                        <TableCell>{a.category}</TableCell>
                        <TableCell className="text-sm">{a.description}</TableCell>
                        <TableCell className="text-right">{fmt(a.amount)}</TableCell>
                      </TableRow>
                    ))}
                    {adjustments.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No adjustments.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
