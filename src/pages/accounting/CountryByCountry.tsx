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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Globe2 } from "lucide-react";

const STATUSES = ["draft", "under_review", "filed", "amended"];

export default function CountryByCountryPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const [openJur, setOpenJur] = useState(false);
  const [openEnt, setOpenEnt] = useState(false);

  const { data: reports = [] } = useQuery({
    queryKey: ["cbcr_reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cbcr_reports")
        .select("*")
        .order("fiscal_year", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const current = reports.find((r) => r.id === selected);

  const { data: jurisdictions = [] } = useQuery({
    queryKey: ["cbcr_jurisdiction_lines", selected],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cbcr_jurisdiction_lines")
        .select("*")
        .eq("report_id", selected)
        .order("jurisdiction");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: entities = [] } = useQuery({
    queryKey: ["cbcr_entity_lines", selected],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cbcr_entity_lines")
        .select("*")
        .eq("report_id", selected)
        .order("jurisdiction");
      if (error) throw error;
      return data as any[];
    },
  });

  const totals = jurisdictions.reduce(
    (acc: any, j: any) => ({
      revenue_total: acc.revenue_total + Number(j.revenue_total || 0),
      profit_before_tax: acc.profit_before_tax + Number(j.profit_before_tax || 0),
      tax_paid_cash: acc.tax_paid_cash + Number(j.tax_paid_cash || 0),
      tax_accrued: acc.tax_accrued + Number(j.tax_accrued || 0),
      employees: acc.employees + Number(j.employees || 0),
    }),
    { revenue_total: 0, profit_before_tax: 0, tax_paid_cash: 0, tax_accrued: 0, employees: 0 }
  );

  async function createReport(form: any) {
    const payload = {
      company_group: form.company_group,
      fiscal_year: Number(form.fiscal_year),
      currency: form.currency || "USD",
      ultimate_parent: form.ultimate_parent || null,
      reporting_entity: form.reporting_entity || null,
      notes: form.notes || null,
    };
    const { error } = await supabase.from("cbcr_reports").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Report created");
    setOpenNew(false);
    qc.invalidateQueries({ queryKey: ["cbcr_reports"] });
  }

  async function addJurisdiction(form: any) {
    if (!selected) return;
    const revenue_total =
      Number(form.revenue_unrelated || 0) + Number(form.revenue_related || 0);
    const payload = {
      report_id: selected,
      jurisdiction: form.jurisdiction,
      revenue_unrelated: Number(form.revenue_unrelated || 0),
      revenue_related: Number(form.revenue_related || 0),
      revenue_total,
      profit_before_tax: Number(form.profit_before_tax || 0),
      tax_paid_cash: Number(form.tax_paid_cash || 0),
      tax_accrued: Number(form.tax_accrued || 0),
      stated_capital: Number(form.stated_capital || 0),
      accumulated_earnings: Number(form.accumulated_earnings || 0),
      employees: Number(form.employees || 0),
      tangible_assets: Number(form.tangible_assets || 0),
    };
    const { error } = await supabase.from("cbcr_jurisdiction_lines").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Jurisdiction added");
    setOpenJur(false);
    qc.invalidateQueries({ queryKey: ["cbcr_jurisdiction_lines", selected] });
  }

  async function addEntity(form: any) {
    if (!selected) return;
    const payload = {
      report_id: selected,
      jurisdiction: form.jurisdiction,
      entity_name: form.entity_name,
      tax_id: form.tax_id || null,
      main_activities: form.main_activities || null,
    };
    const { error } = await supabase.from("cbcr_entity_lines").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Entity added");
    setOpenEnt(false);
    qc.invalidateQueries({ queryKey: ["cbcr_entity_lines", selected] });
  }

  async function updateStatus(status: string) {
    if (!selected) return;
    const patch: any = { status };
    if (status === "filed") patch.filing_date = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("cbcr_reports").update(patch).eq("id", selected);
    if (error) return toast.error(error.message);
    toast.success(`Marked ${status}`);
    qc.invalidateQueries({ queryKey: ["cbcr_reports"] });
  }

  const fmt = (n: any) =>
    Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe2 className="h-6 w-6" /> Country-by-Country Reporting
          </h1>
          <p className="text-sm text-muted-foreground">
            OECD BEPS Action 13 CbCR — jurisdictional revenue, profit, tax, employees, and constituent entities.
          </p>
        </div>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> New Report
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New CbCR Report</DialogTitle>
            </DialogHeader>
            <form
              className="grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                createReport(Object.fromEntries(f.entries()));
              }}
            >
              <div>
                <Label>Company Group</Label>
                <Input name="company_group" required />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Fiscal Year</Label>
                  <Input name="fiscal_year" type="number" required defaultValue={new Date().getFullYear() - 1} />
                </div>
                <div>
                  <Label>Currency</Label>
                  <Input name="currency" defaultValue="USD" />
                </div>
              </div>
              <div>
                <Label>Ultimate Parent Entity</Label>
                <Input name="ultimate_parent" />
              </div>
              <div>
                <Label>Reporting Entity</Label>
                <Input name="reporting_entity" />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea name="notes" />
              </div>
              <Button type="submit">Create</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Group</TableHead>
                <TableHead>Fiscal Year</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Ultimate Parent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Filed</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((r) => (
                <TableRow key={r.id} className={selected === r.id ? "bg-muted" : ""}>
                  <TableCell>{r.company_group}</TableCell>
                  <TableCell>{r.fiscal_year}</TableCell>
                  <TableCell>{r.currency}</TableCell>
                  <TableCell>{r.ultimate_parent || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{r.status}</Badge>
                  </TableCell>
                  <TableCell>{r.filing_date || "—"}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => setSelected(r.id)}>
                      Open
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {reports.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No reports yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {current && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>
                {current.company_group} — FY {current.fiscal_year}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Currency: {current.currency} · Status: {current.status}
              </p>
            </div>
            <div className="flex gap-2">
              {STATUSES.filter((s) => s !== current.status).map((s) => (
                <Button key={s} size="sm" variant="outline" onClick={() => updateStatus(s)}>
                  Mark {s.replace("_", " ")}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              <Stat label="Total Revenue" value={fmt(totals.revenue_total)} />
              <Stat label="Profit Before Tax" value={fmt(totals.profit_before_tax)} />
              <Stat label="Tax Paid (Cash)" value={fmt(totals.tax_paid_cash)} />
              <Stat label="Tax Accrued" value={fmt(totals.tax_accrued)} />
              <Stat label="Employees" value={fmt(totals.employees)} />
            </div>

            <Tabs defaultValue="jurisdictions">
              <TabsList>
                <TabsTrigger value="jurisdictions">Jurisdictions ({jurisdictions.length})</TabsTrigger>
                <TabsTrigger value="entities">Entities ({entities.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="jurisdictions" className="space-y-2">
                <div className="flex justify-end">
                  <Dialog open={openJur} onOpenChange={setOpenJur}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" /> Add Jurisdiction
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Add Jurisdiction Line</DialogTitle>
                      </DialogHeader>
                      <form
                        className="grid grid-cols-2 gap-3"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const f = new FormData(e.currentTarget);
                          addJurisdiction(Object.fromEntries(f.entries()));
                        }}
                      >
                        <div className="col-span-2">
                          <Label>Jurisdiction (Country)</Label>
                          <Input name="jurisdiction" required />
                        </div>
                        <NumField name="revenue_unrelated" label="Revenue — Unrelated" />
                        <NumField name="revenue_related" label="Revenue — Related" />
                        <NumField name="profit_before_tax" label="Profit Before Tax" />
                        <NumField name="tax_paid_cash" label="Income Tax Paid (Cash)" />
                        <NumField name="tax_accrued" label="Income Tax Accrued" />
                        <NumField name="stated_capital" label="Stated Capital" />
                        <NumField name="accumulated_earnings" label="Accumulated Earnings" />
                        <NumField name="tangible_assets" label="Tangible Assets (ex-Cash)" />
                        <NumField name="employees" label="Employees" integer />
                        <div className="col-span-2">
                          <Button type="submit">Add</Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Jurisdiction</TableHead>
                      <TableHead className="text-right">Revenue Total</TableHead>
                      <TableHead className="text-right">Profit BT</TableHead>
                      <TableHead className="text-right">Tax Paid</TableHead>
                      <TableHead className="text-right">Tax Accrued</TableHead>
                      <TableHead className="text-right">Employees</TableHead>
                      <TableHead className="text-right">Tangible Assets</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jurisdictions.map((j) => (
                      <TableRow key={j.id}>
                        <TableCell className="font-medium">{j.jurisdiction}</TableCell>
                        <TableCell className="text-right">{fmt(j.revenue_total)}</TableCell>
                        <TableCell className="text-right">{fmt(j.profit_before_tax)}</TableCell>
                        <TableCell className="text-right">{fmt(j.tax_paid_cash)}</TableCell>
                        <TableCell className="text-right">{fmt(j.tax_accrued)}</TableCell>
                        <TableCell className="text-right">{fmt(j.employees)}</TableCell>
                        <TableCell className="text-right">{fmt(j.tangible_assets)}</TableCell>
                      </TableRow>
                    ))}
                    {jurisdictions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          No jurisdictions yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="entities" className="space-y-2">
                <div className="flex justify-end">
                  <Dialog open={openEnt} onOpenChange={setOpenEnt}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" /> Add Entity
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Constituent Entity</DialogTitle>
                      </DialogHeader>
                      <form
                        className="grid gap-3"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const f = new FormData(e.currentTarget);
                          addEntity(Object.fromEntries(f.entries()));
                        }}
                      >
                        <div>
                          <Label>Jurisdiction</Label>
                          <Input name="jurisdiction" required />
                        </div>
                        <div>
                          <Label>Entity Name</Label>
                          <Input name="entity_name" required />
                        </div>
                        <div>
                          <Label>Tax ID</Label>
                          <Input name="tax_id" />
                        </div>
                        <div>
                          <Label>Main Business Activities</Label>
                          <Textarea name="main_activities" />
                        </div>
                        <Button type="submit">Add</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Jurisdiction</TableHead>
                      <TableHead>Entity Name</TableHead>
                      <TableHead>Tax ID</TableHead>
                      <TableHead>Main Activities</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entities.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell>{e.jurisdiction}</TableCell>
                        <TableCell className="font-medium">{e.entity_name}</TableCell>
                        <TableCell>{e.tax_id || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{e.main_activities || "—"}</TableCell>
                      </TableRow>
                    ))}
                    {entities.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No entities yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function NumField({ name, label, integer }: { name: string; label: string; integer?: boolean }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input name={name} type="number" step={integer ? "1" : "0.01"} defaultValue={0} />
    </div>
  );
}
