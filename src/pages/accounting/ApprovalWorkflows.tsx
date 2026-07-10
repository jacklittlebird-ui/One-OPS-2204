// Approval Workflows
// -------------------------------------------------------------
// Two tabs:
//   1. Rules   — configure threshold-based approval chains per doc_type/company.
//   2. Requests — pending & historical approval requests; approvers act step-by-step.
//
// Rules match by doc_type + company (or global if company null) + amount range.
// Requests store an ordered list of approver_roles copied from the matched rule;
// the current step points at the role that must act next. Approve → advance /
// complete; Reject → mark Rejected immediately.

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { CheckCircle2, ClipboardCheck, Download, Plus, ShieldCheck, XCircle } from "lucide-react";
import { exportToExcel } from "@/lib/exportExcel";
import { format } from "date-fns";

const DOC_TYPES = [
  { value: "journal_entry", label: "Journal Entry" },
  { value: "payment", label: "Payment" },
  { value: "vendor_invoice", label: "Vendor Invoice" },
  { value: "invoice", label: "Customer Invoice" },
];

const APPROVER_ROLES = [
  "accountant",
  "general_accounts",
  "receivables",
  "payables",
  "admin",
];

interface Company { id: string; code: string; name: string; }
interface Rule {
  id: string;
  name: string;
  doc_type: string;
  company_id: string | null;
  min_amount: number;
  max_amount: number | null;
  currency: string;
  approver_roles: string[];
  active: boolean;
  notes: string | null;
}
interface Request {
  id: string;
  request_no: string;
  doc_type: string;
  doc_id: string;
  doc_reference: string | null;
  company_id: string | null;
  amount: number;
  currency: string;
  status: string;
  current_step: number;
  total_steps: number;
  approver_roles: string[];
  rule_id: string | null;
  submitted_by: string | null;
  submitted_at: string;
  completed_at: string | null;
  notes: string | null;
}
interface Action {
  id: string;
  request_id: string;
  step: number;
  action: string;
  approver_id: string | null;
  approver_role: string | null;
  comment: string | null;
  acted_at: string;
}

const money = (n: number, ccy = "USD") =>
  `${ccy} ${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ApprovalWorkflowsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [tab, setTab] = useState("requests");

  const { data: companies = [] } = useQuery({
    queryKey: ["aw", "companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("id, code, name").order("code");
      if (error) throw error;
      return (data ?? []) as Company[];
    },
  });
  const companiesById = useMemo(() => Object.fromEntries(companies.map(c => [c.id, c])), [companies]);

  const { data: myRoles = [] } = useQuery({
    queryKey: ["aw", "my-roles", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((r: any) => r.role as string);
    },
  });

  // ----- Rules -----
  const { data: rules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ["aw", "rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approval_rules")
        .select("*")
        .order("doc_type").order("min_amount");
      if (error) throw error;
      return (data ?? []) as Rule[];
    },
  });

  const [ruleOpen, setRuleOpen] = useState(false);
  const [ruleForm, setRuleForm] = useState({
    name: "", doc_type: "payment", company_id: "" as string | "",
    min_amount: "0", max_amount: "", currency: "USD",
    approver_roles: [] as string[], active: true, notes: "",
  });
  const resetRule = () => setRuleForm({
    name: "", doc_type: "payment", company_id: "",
    min_amount: "0", max_amount: "", currency: "USD",
    approver_roles: [], active: true, notes: "",
  });

  const createRule = useMutation({
    mutationFn: async () => {
      if (!ruleForm.name) throw new Error("Name required");
      if (!ruleForm.approver_roles.length) throw new Error("Add at least one approver role");
      const { error } = await supabase.from("approval_rules").insert({
        name: ruleForm.name,
        doc_type: ruleForm.doc_type,
        company_id: ruleForm.company_id || null,
        min_amount: Number(ruleForm.min_amount) || 0,
        max_amount: ruleForm.max_amount ? Number(ruleForm.max_amount) : null,
        currency: ruleForm.currency || "USD",
        approver_roles: ruleForm.approver_roles,
        active: ruleForm.active,
        notes: ruleForm.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Approval rule created");
      qc.invalidateQueries({ queryKey: ["aw", "rules"] });
      setRuleOpen(false);
      resetRule();
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const toggleRule = useMutation({
    mutationFn: async (r: Rule) => {
      const { error } = await supabase.from("approval_rules").update({ active: !r.active }).eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["aw", "rules"] }),
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const addApprover = (role: string) => {
    if (!role || ruleForm.approver_roles.includes(role)) return;
    setRuleForm(f => ({ ...f, approver_roles: [...f.approver_roles, role] }));
  };
  const removeApprover = (role: string) =>
    setRuleForm(f => ({ ...f, approver_roles: f.approver_roles.filter(r => r !== role) }));

  // ----- Requests -----
  const { data: requests = [], isLoading: reqLoading } = useQuery({
    queryKey: ["aw", "requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approval_requests")
        .select("*")
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Request[];
    },
  });

  const { data: actions = [] } = useQuery({
    queryKey: ["aw", "actions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approval_actions")
        .select("*")
        .order("acted_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Action[];
    },
  });

  const actionsByReq = useMemo(() => {
    const m: Record<string, Action[]> = {};
    for (const a of actions) (m[a.request_id] ||= []).push(a);
    return m;
  }, [actions]);

  const [reqOpen, setReqOpen] = useState(false);
  const [reqForm, setReqForm] = useState({
    doc_type: "payment", doc_reference: "", company_id: "" as string | "",
    amount: "", currency: "USD", notes: "",
  });
  const resetReq = () => setReqForm({
    doc_type: "payment", doc_reference: "", company_id: "",
    amount: "", currency: "USD", notes: "",
  });

  const createRequest = useMutation({
    mutationFn: async () => {
      const amt = Number(reqForm.amount);
      if (!amt || amt <= 0) throw new Error("Amount required");
      // Match rule: active + doc_type + (company null or matching) + amount in range + currency
      const matches = rules.filter(r =>
        r.active
        && r.doc_type === reqForm.doc_type
        && (!r.company_id || r.company_id === (reqForm.company_id || null))
        && (r.currency || "USD") === (reqForm.currency || "USD")
        && amt >= Number(r.min_amount || 0)
        && (r.max_amount == null || amt <= Number(r.max_amount))
      );
      // Prefer company-specific over global
      matches.sort((a, b) => Number(!!b.company_id) - Number(!!a.company_id));
      const rule = matches[0];
      if (!rule) throw new Error("No matching approval rule for this document/amount");

      const request_no = `AR-${format(new Date(), "yyyyMMdd-HHmmss")}`;
      const { error } = await supabase.from("approval_requests").insert({
        request_no,
        doc_type: reqForm.doc_type,
        doc_id: crypto.randomUUID(), // placeholder — real integrations will pass the real doc_id
        doc_reference: reqForm.doc_reference || null,
        company_id: reqForm.company_id || null,
        amount: amt,
        currency: reqForm.currency,
        status: "Pending",
        current_step: 1,
        total_steps: rule.approver_roles.length,
        approver_roles: rule.approver_roles,
        rule_id: rule.id,
        submitted_by: user?.id ?? null,
        notes: reqForm.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Approval request submitted");
      qc.invalidateQueries({ queryKey: ["aw", "requests"] });
      setReqOpen(false);
      resetReq();
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const actOn = useMutation({
    mutationFn: async ({ req, action, comment }: { req: Request; action: "Approved" | "Rejected"; comment?: string }) => {
      const stepRole = req.approver_roles[req.current_step - 1];
      const { error: aErr } = await supabase.from("approval_actions").insert({
        request_id: req.id,
        step: req.current_step,
        action,
        approver_id: user?.id ?? null,
        approver_role: stepRole,
        comment: comment || null,
      });
      if (aErr) throw aErr;

      const patch: {
        status?: string;
        completed_at?: string;
        current_step?: number;
      } = {};
      if (action === "Rejected") {
        patch.status = "Rejected";
        patch.completed_at = new Date().toISOString();
      } else if (req.current_step >= req.total_steps) {
        patch.status = "Approved";
        patch.completed_at = new Date().toISOString();
      } else {
        patch.current_step = req.current_step + 1;
      }
      const { error: uErr } = await supabase.from("approval_requests").update(patch).eq("id", req.id);
      if (uErr) throw uErr;
    },
    onSuccess: (_v, vars) => {
      toast.success(vars.action === "Approved" ? "Step approved" : "Request rejected");
      qc.invalidateQueries({ queryKey: ["aw", "requests"] });
      qc.invalidateQueries({ queryKey: ["aw", "actions"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const canActOn = (req: Request) => {
    if (req.status !== "Pending") return false;
    const role = req.approver_roles[req.current_step - 1];
    return myRoles.includes(role) || myRoles.includes("admin");
  };

  const stats = useMemo(() => {
    return {
      pending: requests.filter(r => r.status === "Pending").length,
      approved: requests.filter(r => r.status === "Approved").length,
      rejected: requests.filter(r => r.status === "Rejected").length,
      rules: rules.filter(r => r.active).length,
    };
  }, [requests, rules]);

  const exportRequests = () => {
    exportToExcel(
      requests.map(r => ({
        Request_No: r.request_no,
        Doc_Type: r.doc_type,
        Doc_Reference: r.doc_reference ?? "",
        Company: r.company_id ? companiesById[r.company_id]?.code : "",
        Amount: Number(r.amount),
        Currency: r.currency,
        Status: r.status,
        Step: `${r.current_step}/${r.total_steps}`,
        Current_Role: r.approver_roles[r.current_step - 1] ?? "",
        Submitted_At: r.submitted_at,
        Completed_At: r.completed_at ?? "",
      })),
      "Approvals",
      `approval-requests-${format(new Date(), "yyyyMMdd")}.xlsx`,
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6" /> Approval Workflows
          </h1>
          <p className="text-sm text-muted-foreground">
            Threshold-based multi-step approvals for journals, payments, and invoices.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportRequests} disabled={!requests.length}>
          <Download className="mr-2 h-4 w-4" /> Excel
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pending</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-amber-600">{stats.pending}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Approved</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{stats.approved}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Rejected</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-600">{stats.rejected}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Active Rules</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.rules}</div></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="requests"><ClipboardCheck className="mr-2 h-4 w-4" /> Requests</TabsTrigger>
          <TabsTrigger value="rules"><ShieldCheck className="mr-2 h-4 w-4" /> Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={reqOpen} onOpenChange={setReqOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="mr-2 h-4 w-4" /> New Request</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Submit Approval Request</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Document Type</Label>
                    <Select value={reqForm.doc_type} onValueChange={v => setReqForm(f => ({ ...f, doc_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{DOC_TYPES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Company</Label>
                    <Select value={reqForm.company_id} onValueChange={v => setReqForm(f => ({ ...f, company_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="(any)" /></SelectTrigger>
                      <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Document Reference</Label>
                    <Input value={reqForm.doc_reference} onChange={e => setReqForm(f => ({ ...f, doc_reference: e.target.value }))} placeholder="INV-001 / JE-123" />
                  </div>
                  <div>
                    <Label>Currency</Label>
                    <Input value={reqForm.currency} onChange={e => setReqForm(f => ({ ...f, currency: e.target.value.toUpperCase() }))} />
                  </div>
                  <div>
                    <Label>Amount</Label>
                    <Input type="number" step="0.01" value={reqForm.amount} onChange={e => setReqForm(f => ({ ...f, amount: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <Label>Notes</Label>
                    <Textarea rows={2} value={reqForm.notes} onChange={e => setReqForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setReqOpen(false)}>Cancel</Button>
                  <Button onClick={() => createRequest.mutate()} disabled={createRequest.isPending}>
                    {createRequest.isPending ? "Submitting…" : "Submit"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader><CardTitle>Approval Requests</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              {reqLoading ? <p className="text-muted-foreground">Loading…</p> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Step</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>History</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.length === 0 && (
                      <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">No requests yet</TableCell></TableRow>
                    )}
                    {requests.map(r => {
                      const currentRole = r.approver_roles[r.current_step - 1];
                      const trail = actionsByReq[r.id] ?? [];
                      const statusColor =
                        r.status === "Approved" ? "default" :
                        r.status === "Rejected" ? "destructive" : "secondary";
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono text-xs">{r.request_no}</TableCell>
                          <TableCell>{DOC_TYPES.find(d => d.value === r.doc_type)?.label ?? r.doc_type}</TableCell>
                          <TableCell>{r.doc_reference}</TableCell>
                          <TableCell>{r.company_id ? companiesById[r.company_id]?.code : "—"}</TableCell>
                          <TableCell className="text-right font-mono">{money(Number(r.amount), r.currency)}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-xs">{r.current_step}/{r.total_steps}</span>
                              {r.status === "Pending" && <span className="text-xs text-muted-foreground">{currentRole}</span>}
                            </div>
                          </TableCell>
                          <TableCell><Badge variant={statusColor as any}>{r.status}</Badge></TableCell>
                          <TableCell className="text-xs">
                            {trail.length === 0 ? <span className="text-muted-foreground">—</span> :
                              trail.map(a => (
                                <div key={a.id} className="flex items-center gap-1">
                                  {a.action === "Approved"
                                    ? <CheckCircle2 className="h-3 w-3 text-green-600" />
                                    : <XCircle className="h-3 w-3 text-red-600" />}
                                  <span>{a.approver_role}</span>
                                </div>
                              ))
                            }
                          </TableCell>
                          <TableCell className="text-right">
                            {canActOn(r) && (
                              <div className="flex gap-1 justify-end">
                                <Button size="sm" variant="outline" onClick={() => actOn.mutate({ req: r, action: "Approved" })} disabled={actOn.isPending}>
                                  <CheckCircle2 className="mr-1 h-3 w-3" /> Approve
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => {
                                  const c = window.prompt("Reason for rejection?");
                                  if (c == null) return;
                                  actOn.mutate({ req: r, action: "Rejected", comment: c });
                                }} disabled={actOn.isPending}>
                                  <XCircle className="mr-1 h-3 w-3" /> Reject
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={ruleOpen} onOpenChange={setRuleOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="mr-2 h-4 w-4" /> New Rule</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>New Approval Rule</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Name</Label>
                    <Input value={ruleForm.name} onChange={e => setRuleForm(f => ({ ...f, name: e.target.value }))} placeholder="Payments &gt; 10,000 USD" />
                  </div>
                  <div>
                    <Label>Document Type</Label>
                    <Select value={ruleForm.doc_type} onValueChange={v => setRuleForm(f => ({ ...f, doc_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{DOC_TYPES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Company (blank = all)</Label>
                    <Select value={ruleForm.company_id} onValueChange={v => setRuleForm(f => ({ ...f, company_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="(all companies)" /></SelectTrigger>
                      <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Min Amount</Label>
                    <Input type="number" step="0.01" value={ruleForm.min_amount} onChange={e => setRuleForm(f => ({ ...f, min_amount: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Max Amount (blank = ∞)</Label>
                    <Input type="number" step="0.01" value={ruleForm.max_amount} onChange={e => setRuleForm(f => ({ ...f, max_amount: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Currency</Label>
                    <Input value={ruleForm.currency} onChange={e => setRuleForm(f => ({ ...f, currency: e.target.value.toUpperCase() }))} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={ruleForm.active} onCheckedChange={v => setRuleForm(f => ({ ...f, active: v }))} />
                    <Label>Active</Label>
                  </div>
                  <div className="col-span-2">
                    <Label>Approver Chain (in order)</Label>
                    <div className="flex flex-wrap gap-2 mt-2 mb-2">
                      {ruleForm.approver_roles.map((r, i) => (
                        <Badge key={r} variant="secondary" className="cursor-pointer" onClick={() => removeApprover(r)}>
                          {i + 1}. {r} ✕
                        </Badge>
                      ))}
                      {!ruleForm.approver_roles.length && <span className="text-xs text-muted-foreground">No approvers yet</span>}
                    </div>
                    <Select value="" onValueChange={addApprover}>
                      <SelectTrigger><SelectValue placeholder="+ Add approver role" /></SelectTrigger>
                      <SelectContent>
                        {APPROVER_ROLES.filter(r => !ruleForm.approver_roles.includes(r)).map(r =>
                          <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>Notes</Label>
                    <Textarea rows={2} value={ruleForm.notes} onChange={e => setRuleForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setRuleOpen(false)}>Cancel</Button>
                  <Button onClick={() => createRule.mutate()} disabled={createRule.isPending}>
                    {createRule.isPending ? "Saving…" : "Create Rule"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader><CardTitle>Approval Rules</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              {rulesLoading ? <p className="text-muted-foreground">Loading…</p> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Doc Type</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead className="text-right">Min</TableHead>
                      <TableHead className="text-right">Max</TableHead>
                      <TableHead>Ccy</TableHead>
                      <TableHead>Approver Chain</TableHead>
                      <TableHead>Active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.length === 0 && (
                      <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No rules configured</TableCell></TableRow>
                    )}
                    {rules.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell>{DOC_TYPES.find(d => d.value === r.doc_type)?.label ?? r.doc_type}</TableCell>
                        <TableCell>{r.company_id ? companiesById[r.company_id]?.code : <span className="text-muted-foreground">All</span>}</TableCell>
                        <TableCell className="text-right font-mono">{Number(r.min_amount).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono">{r.max_amount == null ? "∞" : Number(r.max_amount).toLocaleString()}</TableCell>
                        <TableCell>{r.currency}</TableCell>
                        <TableCell className="text-xs">
                          {r.approver_roles.map((role, i) => (
                            <span key={role}>{i > 0 && " → "}{role}</span>
                          ))}
                        </TableCell>
                        <TableCell>
                          <Switch checked={r.active} onCheckedChange={() => toggleRule.mutate(r)} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
