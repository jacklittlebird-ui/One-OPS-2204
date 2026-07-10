import { useMemo, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Play, Save, Trash2, Download, FileBarChart, Share2, Clock, Filter } from "lucide-react";

type Source = "invoices" | "receipts" | "payments" | "journal_entries" | "vendor_invoices" | "expenses";

const SOURCES: Record<Source, { label: string; fields: { name: string; label: string; type: "text" | "number" | "date" }[] }> = {
  invoices: {
    label: "Invoices (AR)",
    fields: [
      { name: "invoice_number", label: "Invoice #", type: "text" },
      { name: "invoice_date", label: "Date", type: "date" },
      { name: "due_date", label: "Due Date", type: "date" },
      { name: "customer_name", label: "Customer", type: "text" },
      { name: "status", label: "Status", type: "text" },
      { name: "currency", label: "Currency", type: "text" },
      { name: "subtotal", label: "Subtotal", type: "number" },
      { name: "tax_amount", label: "Tax", type: "number" },
      { name: "total_amount", label: "Total", type: "number" },
      { name: "balance_due", label: "Balance Due", type: "number" },
    ],
  },
  receipts: {
    label: "Receipts",
    fields: [
      { name: "receipt_number", label: "Receipt #", type: "text" },
      { name: "receipt_date", label: "Date", type: "date" },
      { name: "customer_name", label: "Customer", type: "text" },
      { name: "amount", label: "Amount", type: "number" },
      { name: "currency", label: "Currency", type: "text" },
      { name: "payment_method", label: "Method", type: "text" },
      { name: "status", label: "Status", type: "text" },
    ],
  },
  payments: {
    label: "Payments (AP)",
    fields: [
      { name: "payment_number", label: "Payment #", type: "text" },
      { name: "payment_date", label: "Date", type: "date" },
      { name: "vendor_name", label: "Vendor", type: "text" },
      { name: "amount", label: "Amount", type: "number" },
      { name: "currency", label: "Currency", type: "text" },
      { name: "status", label: "Status", type: "text" },
    ],
  },
  journal_entries: {
    label: "Journal Entries",
    fields: [
      { name: "entry_number", label: "Entry #", type: "text" },
      { name: "entry_date", label: "Date", type: "date" },
      { name: "description", label: "Description", type: "text" },
      { name: "total_debit", label: "Debit", type: "number" },
      { name: "total_credit", label: "Credit", type: "number" },
      { name: "status", label: "Status", type: "text" },
    ],
  },
  vendor_invoices: {
    label: "Vendor Invoices",
    fields: [
      { name: "invoice_number", label: "Invoice #", type: "text" },
      { name: "invoice_date", label: "Date", type: "date" },
      { name: "vendor_name", label: "Vendor", type: "text" },
      { name: "total_amount", label: "Total", type: "number" },
      { name: "currency", label: "Currency", type: "text" },
      { name: "status", label: "Status", type: "text" },
    ],
  },
  expenses: {
    label: "Expenses",
    fields: [
      { name: "expense_date", label: "Date", type: "date" },
      { name: "category", label: "Category", type: "text" },
      { name: "description", label: "Description", type: "text" },
      { name: "amount", label: "Amount", type: "number" },
      { name: "currency", label: "Currency", type: "text" },
    ],
  },
};

const OPERATORS = [
  { value: "eq", label: "=" },
  { value: "neq", label: "≠" },
  { value: "gt", label: ">" },
  { value: "gte", label: "≥" },
  { value: "lt", label: "<" },
  { value: "lte", label: "≤" },
  { value: "like", label: "contains" },
];

type Filter = { field: string; op: string; value: string };
type Sort = { field: string; dir: "asc" | "desc" };

interface Draft {
  id?: string;
  name: string;
  description: string;
  source: Source;
  fields: string[];
  filters: Filter[];
  group_by: string[];
  sort: Sort[];
  chart_type: "table" | "bar" | "line" | "pie";
  is_shared: boolean;
}

const emptyDraft: Draft = {
  name: "",
  description: "",
  source: "invoices",
  fields: ["invoice_number", "invoice_date", "customer_name", "total_amount", "status"],
  filters: [],
  group_by: [],
  sort: [{ field: "invoice_date", dir: "desc" }],
  chart_type: "table",
  is_shared: false,
};

export default function CustomReportBuilder() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editorOpen, setEditorOpen] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [running, setRunning] = useState(false);

  const { data: reports = [] } = useQuery({
    queryKey: ["custom_report_definitions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_report_definitions")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const saveMut = useMutation({
    mutationFn: async (d: Draft) => {
      const payload = {
        name: d.name,
        description: d.description,
        source: d.source,
        fields: d.fields,
        filters: d.filters,
        group_by: d.group_by,
        sort: d.sort,
        chart_type: d.chart_type,
        is_shared: d.is_shared,
        created_by: user?.id,
      };
      if (d.id) {
        const { error } = await supabase.from("custom_report_definitions").update(payload).eq("id", d.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("custom_report_definitions").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom_report_definitions"] });
      toast.success("Report saved");
      setEditorOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("custom_report_definitions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom_report_definitions"] });
      toast.success("Report deleted");
    },
  });

  const availableFields = SOURCES[draft.source].fields;

  const runReport = async (d: Draft) => {
    setRunning(true);
    try {
      const start = Date.now();
      let q: any = (supabase as any).from(d.source).select(d.fields.join(","));
      for (const f of d.filters) {
        if (!f.field || f.value === "") continue;
        const v = f.op === "like" ? `%${f.value}%` : f.value;
        (q as any) = (q as any)[f.op](f.field, v);
      }
      for (const s of d.sort) {
        if (!s.field) continue;
        q = q.order(s.field, { ascending: s.dir === "asc" });
      }
      q = q.limit(500);
      const { data, error } = await q;
      if (error) throw error;
      setResults(data ?? []);
      if (d.id) {
        await supabase.from("custom_report_runs").insert({
          report_id: d.id,
          row_count: data?.length ?? 0,
          duration_ms: Date.now() - start,
          status: "success",
          run_by: user?.id,
        });
        await supabase.from("custom_report_definitions").update({ last_run_at: new Date().toISOString() }).eq("id", d.id);
      }
      toast.success(`${data?.length ?? 0} rows in ${Date.now() - start}ms`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRunning(false);
    }
  };

  const exportCsv = () => {
    if (!results.length) return;
    const cols = Object.keys(results[0]);
    const lines = [cols.join(",")];
    for (const r of results) {
      lines.push(cols.map(c => JSON.stringify(r[c] ?? "")).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openEditor = (r?: any) => {
    if (r) {
      setDraft({
        id: r.id, name: r.name, description: r.description ?? "", source: r.source,
        fields: r.fields ?? [], filters: r.filters ?? [], group_by: r.group_by ?? [],
        sort: r.sort ?? [], chart_type: r.chart_type ?? "table", is_shared: !!r.is_shared,
      });
    } else {
      setDraft(emptyDraft);
    }
    setResults([]);
    setEditorOpen(true);
  };

  const kpis = useMemo(() => ({
    total: reports.length,
    shared: reports.filter((r: any) => r.is_shared).length,
    scheduled: reports.filter((r: any) => r.schedule_cron).length,
    recent: reports.filter((r: any) => r.last_run_at).length,
  }), [reports]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileBarChart className="w-6 h-6" /> Advanced Financial Reporting</h1>
          <p className="text-muted-foreground text-sm">Build, save, and schedule custom finance reports</p>
        </div>
        <Button onClick={() => openEditor()}><Plus className="w-4 h-4 mr-2" /> New Report</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Reports", value: kpis.total },
          { label: "Shared", value: kpis.shared },
          { label: "Scheduled", value: kpis.scheduled },
          { label: "Executed", value: kpis.recent },
        ].map(k => (
          <Card key={k.label}><CardContent className="p-4">
            <div className="text-xs text-muted-foreground">{k.label}</div>
            <div className="text-2xl font-bold">{k.value}</div>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Saved Reports</CardTitle></CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">No reports yet. Click "New Report" to build one.</div>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Name</TableHead><TableHead>Source</TableHead><TableHead>Fields</TableHead>
                <TableHead>Last Run</TableHead><TableHead>Tags</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {reports.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}<div className="text-xs text-muted-foreground">{r.description}</div></TableCell>
                    <TableCell><Badge variant="outline">{SOURCES[r.source as Source]?.label ?? r.source}</Badge></TableCell>
                    <TableCell className="text-xs">{(r.fields ?? []).length} fields</TableCell>
                    <TableCell className="text-xs">{r.last_run_at ? format(new Date(r.last_run_at), "dd/MM/yyyy HH:mm") : "—"}</TableCell>
                    <TableCell className="space-x-1">
                      {r.is_shared && <Badge variant="secondary"><Share2 className="w-3 h-3 mr-1" />Shared</Badge>}
                      {r.schedule_cron && <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Scheduled</Badge>}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => { openEditor(r); runReport({ ...r, id: r.id } as any); }}><Play className="w-3 h-3" /></Button>
                      <Button size="sm" variant="outline" onClick={() => openEditor(r)}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => confirm("Delete report?") && deleteMut.mutate(r.id)}><Trash2 className="w-3 h-3" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{draft.id ? "Edit Report" : "New Report"}</DialogTitle></DialogHeader>

          <Tabs defaultValue="basics">
            <TabsList>
              <TabsTrigger value="basics">Basics</TabsTrigger>
              <TabsTrigger value="fields">Fields</TabsTrigger>
              <TabsTrigger value="filters">Filters</TabsTrigger>
              <TabsTrigger value="sort">Sort</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="basics" className="space-y-3">
              <div><Label>Name</Label><Input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /></div>
              <div>
                <Label>Data Source</Label>
                <Select value={draft.source} onValueChange={(v: Source) => setDraft({ ...draft, source: v, fields: SOURCES[v].fields.slice(0, 5).map(f => f.name), filters: [], sort: [] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SOURCES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Chart Type</Label>
                <Select value={draft.chart_type} onValueChange={(v: any) => setDraft({ ...draft, chart_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="table">Table</SelectItem>
                    <SelectItem value="bar">Bar Chart</SelectItem>
                    <SelectItem value="line">Line Chart</SelectItem>
                    <SelectItem value="pie">Pie Chart</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between border rounded p-3">
                <div><Label>Share with team</Label><p className="text-xs text-muted-foreground">Visible to all authenticated users</p></div>
                <Switch checked={draft.is_shared} onCheckedChange={v => setDraft({ ...draft, is_shared: v })} />
              </div>
            </TabsContent>

            <TabsContent value="fields" className="space-y-2">
              <p className="text-xs text-muted-foreground">Toggle fields to include in the report.</p>
              <div className="grid grid-cols-2 gap-2">
                {availableFields.map(f => {
                  const active = draft.fields.includes(f.name);
                  return (
                    <button key={f.name} type="button"
                      onClick={() => setDraft({ ...draft, fields: active ? draft.fields.filter(x => x !== f.name) : [...draft.fields, f.name] })}
                      className={`text-left border rounded p-2 text-sm ${active ? "border-primary bg-primary/10" : "border-border"}`}>
                      <div className="font-medium">{f.label}</div>
                      <div className="text-xs text-muted-foreground">{f.name} · {f.type}</div>
                    </button>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="filters" className="space-y-2">
              {draft.filters.map((f, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Select value={f.field} onValueChange={v => { const nf = [...draft.filters]; nf[i] = { ...f, field: v }; setDraft({ ...draft, filters: nf }); }}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="Field" /></SelectTrigger>
                    <SelectContent>{availableFields.map(af => <SelectItem key={af.name} value={af.name}>{af.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={f.op} onValueChange={v => { const nf = [...draft.filters]; nf[i] = { ...f, op: v }; setDraft({ ...draft, filters: nf }); }}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>{OPERATORS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input className="flex-1" value={f.value} onChange={e => { const nf = [...draft.filters]; nf[i] = { ...f, value: e.target.value }; setDraft({ ...draft, filters: nf }); }} placeholder="value" />
                  <Button size="sm" variant="ghost" onClick={() => setDraft({ ...draft, filters: draft.filters.filter((_, x) => x !== i) })}><Trash2 className="w-3 h-3" /></Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => setDraft({ ...draft, filters: [...draft.filters, { field: availableFields[0].name, op: "eq", value: "" }] })}>
                <Filter className="w-3 h-3 mr-1" /> Add Filter
              </Button>
            </TabsContent>

            <TabsContent value="sort" className="space-y-2">
              {draft.sort.map((s, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Select value={s.field} onValueChange={v => { const ns = [...draft.sort]; ns[i] = { ...s, field: v }; setDraft({ ...draft, sort: ns }); }}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="Field" /></SelectTrigger>
                    <SelectContent>{availableFields.map(af => <SelectItem key={af.name} value={af.name}>{af.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={s.dir} onValueChange={(v: any) => { const ns = [...draft.sort]; ns[i] = { ...s, dir: v }; setDraft({ ...draft, sort: ns }); }}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="asc">Ascending</SelectItem><SelectItem value="desc">Descending</SelectItem></SelectContent>
                  </Select>
                  <Button size="sm" variant="ghost" onClick={() => setDraft({ ...draft, sort: draft.sort.filter((_, x) => x !== i) })}><Trash2 className="w-3 h-3" /></Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => setDraft({ ...draft, sort: [...draft.sort, { field: availableFields[0].name, dir: "desc" }] })}>Add Sort</Button>
            </TabsContent>

            <TabsContent value="preview" className="space-y-3">
              <div className="flex gap-2">
                <Button size="sm" onClick={() => runReport(draft)} disabled={running}><Play className="w-3 h-3 mr-1" /> {running ? "Running..." : "Run"}</Button>
                <Button size="sm" variant="outline" onClick={exportCsv} disabled={!results.length}><Download className="w-3 h-3 mr-1" /> Export CSV</Button>
                <div className="text-xs text-muted-foreground self-center">{results.length} rows</div>
              </div>
              {results.length > 0 && (
                <div className="border rounded max-h-96 overflow-auto">
                  <Table>
                    <TableHeader><TableRow>{draft.fields.map(f => <TableHead key={f}>{availableFields.find(af => af.name === f)?.label ?? f}</TableHead>)}</TableRow></TableHeader>
                    <TableBody>
                      {results.slice(0, 100).map((row, i) => (
                        <TableRow key={i}>{draft.fields.map(f => <TableCell key={f} className="text-xs">{String(row[f] ?? "")}</TableCell>)}</TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMut.mutate(draft)} disabled={!draft.name || !draft.fields.length}><Save className="w-3 h-3 mr-1" /> Save Report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
