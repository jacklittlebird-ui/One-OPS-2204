import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Shield, ArrowRight, TestTube2 } from "lucide-react";

const DOC_TYPES = ["invoice", "vendor_invoice", "payment", "journal_entry", "receipt", "petty_cash", "cheque", "contract", "purchase_order", "expense"];
const CURRENCIES = ["USD", "EUR", "EGP", "SAR", "AED"];
const ROLES = ["accountant", "receivables", "payables", "general_accounts", "operations", "station_manager", "admin"];

type Rule = {
  id: string; name: string; doc_type: string; company_id: string | null;
  min_amount: number; max_amount: number | null; currency: string;
  approver_roles: string[]; active: boolean; notes: string | null;
};

const empty = { name: "", doc_type: "invoice", min_amount: 0, max_amount: null as number | null, currency: "USD", approver_roles: ["accountant"], active: true, notes: "" };

export default function ApprovalMatrixPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [form, setForm] = useState<any>(empty);
  const [testOpen, setTestOpen] = useState(false);
  const [testForm, setTestForm] = useState({ doc_type: "invoice", amount: 1000, currency: "USD" });

  const { data: rules = [] } = useQuery<Rule[]>({
    queryKey: ["approval_rules"],
    queryFn: async () => {
      const { data, error } = await supabase.from("approval_rules").select("*").order("doc_type").order("min_amount");
      if (error) throw error;
      return data as Rule[];
    },
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies-lite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("id,name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, max_amount: form.max_amount === "" || form.max_amount === null ? null : Number(form.max_amount) };
      if (editing) {
        const { error } = await supabase.from("approval_rules").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("approval_rules").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Rule updated" : "Rule created");
      setDialogOpen(false); setEditing(null); setForm(empty);
      qc.invalidateQueries({ queryKey: ["approval_rules"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async (r: Rule) => {
      const { error } = await supabase.from("approval_rules").update({ active: !r.active }).eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["approval_rules"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("approval_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Rule deleted"); qc.invalidateQueries({ queryKey: ["approval_rules"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (r: Rule) => {
    setEditing(r);
    setForm({ ...r, notes: r.notes ?? "", max_amount: r.max_amount ?? "" });
    setDialogOpen(true);
  };
  const openNew = () => { setEditing(null); setForm(empty); setDialogOpen(true); };

  const toggleRole = (role: string) => {
    const cur: string[] = form.approver_roles ?? [];
    setForm({ ...form, approver_roles: cur.includes(role) ? cur.filter((r) => r !== role) : [...cur, role] });
  };

  // group rules by doc_type for matrix view
  const byType = rules.reduce<Record<string, Rule[]>>((acc, r) => {
    (acc[r.doc_type] ??= []).push(r);
    return acc;
  }, {});

  // simulator
  const matching = rules.filter((r) =>
    r.active && r.doc_type === testForm.doc_type && r.currency === testForm.currency
    && testForm.amount >= (r.min_amount || 0)
    && (r.max_amount == null || testForm.amount <= r.max_amount)
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Approval Matrix Configuration</h1>
          <p className="text-muted-foreground">Define multi-tier approval thresholds per document type, amount range, and currency.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTestOpen(true)}><TestTube2 className="w-4 h-4 mr-2" />Simulate</Button>
          <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />New Rule</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Total Rules</div><div className="text-3xl font-bold">{rules.length}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Active</div><div className="text-3xl font-bold text-green-600">{rules.filter((r) => r.active).length}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Doc Types Covered</div><div className="text-3xl font-bold">{Object.keys(byType).length}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Avg Steps / Type</div><div className="text-3xl font-bold">{rules.length ? (rules.reduce((s, r) => s + (r.approver_roles?.length || 0), 0) / rules.length).toFixed(1) : "0"}</div></CardContent></Card>
      </div>

      <Tabs defaultValue="matrix">
        <TabsList>
          <TabsTrigger value="matrix">Matrix View</TabsTrigger>
          <TabsTrigger value="list">Rule List</TabsTrigger>
        </TabsList>

        <TabsContent value="matrix" className="space-y-4 mt-4">
          {Object.entries(byType).length === 0 && (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No rules configured yet.</CardContent></Card>
          )}
          {Object.entries(byType).map(([dt, list]) => (
            <Card key={dt}>
              <CardHeader><CardTitle className="text-lg capitalize">{dt.replace(/_/g, " ")}</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {list.sort((a, b) => (a.min_amount || 0) - (b.min_amount || 0)).map((r) => (
                    <div key={r.id} className={`p-3 rounded-md border flex items-center gap-4 ${!r.active && "opacity-50"}`}>
                      <div className="flex-1">
                        <div className="font-medium">{r.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {r.currency} {Number(r.min_amount || 0).toLocaleString()} — {r.max_amount ? Number(r.max_amount).toLocaleString() : "∞"}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap max-w-md">
                        {r.approver_roles?.map((role, i) => (
                          <div key={i} className="flex items-center">
                            <Badge variant="secondary">{role}</Badge>
                            {i < r.approver_roles.length - 1 && <ArrowRight className="w-3 h-3 mx-1 text-muted-foreground" />}
                          </div>
                        ))}
                      </div>
                      <Switch checked={r.active} onCheckedChange={() => toggleActive.mutate(r)} />
                      <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => remove.mutate(r.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Name</TableHead><TableHead>Doc Type</TableHead>
                  <TableHead>Range</TableHead><TableHead>Approvers</TableHead>
                  <TableHead>Steps</TableHead><TableHead>Active</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {rules.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell><Badge variant="outline">{r.doc_type}</Badge></TableCell>
                      <TableCell>{r.currency} {Number(r.min_amount || 0).toLocaleString()} → {r.max_amount ? Number(r.max_amount).toLocaleString() : "∞"}</TableCell>
                      <TableCell className="text-xs">{r.approver_roles?.join(" → ")}</TableCell>
                      <TableCell>{r.approver_roles?.length || 0}</TableCell>
                      <TableCell><Switch checked={r.active} onCheckedChange={() => toggleActive.mutate(r)} /></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => remove.mutate(r.id)}><Trash2 className="w-4 h-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Editor */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Edit Rule" : "New Approval Rule"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Rule Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Invoices > $10K" /></div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Document Type</Label>
                <Select value={form.doc_type} onValueChange={(v) => setForm({ ...form, doc_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DOC_TYPES.map((d) => <SelectItem key={d} value={d}>{d.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Company (optional)</Label>
                <Select value={form.company_id ?? "all"} onValueChange={(v) => setForm({ ...form, company_id: v === "all" ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Companies</SelectItem>
                    {companies.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Currency</Label>
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Min Amount</Label><Input type="number" value={form.min_amount} onChange={(e) => setForm({ ...form, min_amount: +e.target.value })} /></div>
              <div><Label>Max Amount (blank = ∞)</Label><Input type="number" value={form.max_amount ?? ""} onChange={(e) => setForm({ ...form, max_amount: e.target.value })} /></div>
            </div>

            <div>
              <Label>Approval Chain (order matters)</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {ROLES.map((role) => (
                  <Badge key={role} variant={form.approver_roles?.includes(role) ? "default" : "outline"}
                    className="cursor-pointer" onClick={() => toggleRole(role)}>
                    {role}
                  </Badge>
                ))}
              </div>
              {form.approver_roles?.length > 0 && (
                <div className="mt-3 p-2 bg-muted rounded flex items-center gap-1 flex-wrap">
                  <Shield className="w-4 h-4 text-primary" />
                  {form.approver_roles.map((r: string, i: number) => (
                    <div key={i} className="flex items-center">
                      <Badge variant="secondary">{r}</Badge>
                      {i < form.approver_roles.length - 1 && <ArrowRight className="w-3 h-3 mx-1" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2"><Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} /><Label>Active</Label></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !form.name || !form.approver_roles?.length}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Simulator */}
      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Approval Simulator</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Test which rule(s) would apply to a hypothetical document.</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Doc Type</Label>
                <Select value={testForm.doc_type} onValueChange={(v) => setTestForm({ ...testForm, doc_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DOC_TYPES.map((d) => <SelectItem key={d} value={d}>{d.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Amount</Label><Input type="number" value={testForm.amount} onChange={(e) => setTestForm({ ...testForm, amount: +e.target.value })} /></div>
              <div>
                <Label>Currency</Label>
                <Select value={testForm.currency} onValueChange={(v) => setTestForm({ ...testForm, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4">
              <Label>Matching Rules ({matching.length})</Label>
              {matching.length === 0 ? (
                <div className="p-4 bg-muted rounded text-sm text-muted-foreground mt-2">No active rule matches — document would be auto-approved.</div>
              ) : (
                <div className="space-y-2 mt-2">
                  {matching.map((r) => (
                    <div key={r.id} className="p-3 border rounded">
                      <div className="font-medium">{r.name}</div>
                      <div className="flex items-center gap-1 flex-wrap mt-2">
                        {r.approver_roles.map((role, i) => (
                          <div key={i} className="flex items-center">
                            <Badge variant="secondary">{role}</Badge>
                            {i < r.approver_roles.length - 1 && <ArrowRight className="w-3 h-3 mx-1" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter><Button onClick={() => setTestOpen(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
