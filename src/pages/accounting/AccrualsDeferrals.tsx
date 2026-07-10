// Accruals & Deferrals (Phase 2d)
// -------------------------------------------------------------
// Period-end journals for accrued/prepaid/deferred items with automatic
// reversal in the following (chosen) period.
//
// Lifecycle:
//   Draft → Posted → Reversed (also: Void)
//
// Posting creates a JE dated the period_end date; Reversing creates the
// mirror JE dated the reverse period start.

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
import { CalendarRange, Plus, Download, Send, RotateCcw, Ban } from "lucide-react";
import { exportToExcel } from "@/lib/exportExcel";
import { format } from "date-fns";

const ENTRY_TYPES = [
  "Accrued Expense",
  "Accrued Revenue",
  "Prepaid Expense",
  "Deferred Revenue",
] as const;
type EntryType = typeof ENTRY_TYPES[number];

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Draft: "outline",
  Posted: "default",
  Reversed: "secondary",
  Void: "destructive",
};

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

interface Company { id: string; name: string; }
interface Accrual {
  id: string;
  entry_no: string;
  entry_type: string;
  description: string;
  company_id: string | null;
  currency: string;
  amount: number;
  period_year: number;
  period_month: number;
  reverse_year: number;
  reverse_month: number;
  debit_account_code: string | null;
  credit_account_code: string | null;
  status: string;
  journal_entry_id: string | null;
  reversal_journal_entry_id: string | null;
  notes: string | null;
  posted_at: string | null;
  reversed_at: string | null;
  created_at: string;
  companies?: { name: string } | null;
}

const today = new Date();
const defaultReverse = (y: number, m: number) => {
  const rm = m === 12 ? 1 : m + 1;
  const ry = m === 12 ? y + 1 : y;
  return { ry, rm };
};

const emptyForm = () => {
  const y = today.getFullYear();
  const m = today.getMonth() + 1;
  const { ry, rm } = defaultReverse(y, m);
  return {
    entry_type: "Accrued Expense" as EntryType,
    description: "",
    company_id: "",
    currency: "USD",
    amount: "0",
    period_year: y,
    period_month: m,
    reverse_year: ry,
    reverse_month: rm,
    debit_account_code: "",
    credit_account_code: "",
    notes: "",
  };
};

const periodEndDate = (y: number, m: number) => {
  const last = new Date(y, m, 0).getDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
};
const periodStartDate = (y: number, m: number) =>
  `${y}-${String(m).padStart(2, "0")}-01`;

export default function AccrualsDeferralsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [tab, setTab] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies" as any).select("id,name").order("name");
      if (error) throw error;
      return (data as any as Company[]) ?? [];
    },
  });

  const { data: rows = [] } = useQuery({
    queryKey: ["accruals_deferrals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accruals_deferrals" as any)
        .select("*, companies:company_id(name)")
        .order("period_year", { ascending: false })
        .order("period_month", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any as Accrual[]) ?? [];
    },
  });

  const filtered = useMemo(() => {
    if (tab === "all") return rows;
    if (tab === "due") {
      return rows.filter((r) =>
        r.status === "Posted" &&
        (r.reverse_year < today.getFullYear() ||
          (r.reverse_year === today.getFullYear() && r.reverse_month <= today.getMonth() + 1)),
      );
    }
    return rows.filter((r) => r.status.toLowerCase() === tab);
  }, [rows, tab]);

  const kpis = useMemo(() => {
    const posted = rows.filter((r) => r.status === "Posted");
    return {
      draft: rows.filter((r) => r.status === "Draft").length,
      posted: posted.length,
      reversed: rows.filter((r) => r.status === "Reversed").length,
      openAmount: posted.reduce((s, r) => s + Number(r.amount || 0), 0),
    };
  }, [rows]);

  const resetForm = () => setForm(emptyForm());

  const createMut = useMutation({
    mutationFn: async () => {
      if (!form.description.trim()) throw new Error("Description is required");
      const amount = Number(form.amount);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("Amount must be > 0");
      const entry_no = `AD-${form.period_year}${String(form.period_month).padStart(2, "0")}-${Date.now().toString().slice(-5)}`;
      const { error } = await supabase.from("accruals_deferrals" as any).insert({
        entry_no,
        entry_type: form.entry_type,
        description: form.description.trim(),
        company_id: form.company_id || null,
        currency: form.currency || "USD",
        amount,
        period_year: form.period_year,
        period_month: form.period_month,
        reverse_year: form.reverse_year,
        reverse_month: form.reverse_month,
        debit_account_code: form.debit_account_code.trim() || null,
        credit_account_code: form.credit_account_code.trim() || null,
        notes: form.notes.trim() || null,
        status: "Draft",
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accruals_deferrals"] });
      toast.success("Accrual saved as Draft");
      setOpen(false);
      resetForm();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to save"),
  });

  const resolveCoaIds = async (debit?: string | null, credit?: string | null) => {
    const { data: coa } = await supabase.from("chart_of_accounts").select("id,code");
    const map = new Map<string, string>();
    (coa ?? []).forEach((c: any) => map.set(c.code, c.id));
    const dId = debit ? map.get(debit) : undefined;
    const cId = credit ? map.get(credit) : undefined;
    if (!dId || !cId) throw new Error(`Chart of Accounts missing code(s): ${!dId ? debit : ""} ${!cId ? credit : ""}`);
    return { dId, cId };
  };

  const postMut = useMutation({
    mutationFn: async (r: Accrual) => {
      if (!r.debit_account_code || !r.credit_account_code) {
        throw new Error("Debit and credit account codes are required");
      }
      const { dId, cId } = await resolveCoaIds(r.debit_account_code, r.credit_account_code);
      const entryDate = periodEndDate(r.period_year, r.period_month);
      const { data: je, error: jeErr } = await supabase
        .from("journal_entries" as any)
        .insert({
          entry_no: r.entry_no,
          entry_date: entryDate,
          description: `${r.entry_type}: ${r.description}`,
          reference: r.entry_no,
          reference_type: "Accrual",
          status: "Posted",
          total_debit: r.amount,
          total_credit: r.amount,
        })
        .select("id").single();
      if (jeErr) throw jeErr;
      const entryId = (je as any).id as string;
      const { error: linesErr } = await supabase.from("journal_entry_lines" as any).insert([
        { entry_id: entryId, account_id: dId, debit: r.amount, credit: 0, description: r.description, sort_order: 0 },
        { entry_id: entryId, account_id: cId, debit: 0, credit: r.amount, description: r.description, sort_order: 1 },
      ]);
      if (linesErr) throw linesErr;
      const { error: updErr } = await supabase.from("accruals_deferrals" as any).update({
        status: "Posted",
        journal_entry_id: entryId,
        posted_at: new Date().toISOString(),
      }).eq("id", r.id);
      if (updErr) throw updErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accruals_deferrals"] });
      toast.success("Journal posted");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to post"),
  });

  const reverseMut = useMutation({
    mutationFn: async (r: Accrual) => {
      if (r.status !== "Posted") throw new Error("Only Posted entries can be reversed");
      if (!r.debit_account_code || !r.credit_account_code) throw new Error("Missing account codes");
      const { dId, cId } = await resolveCoaIds(r.debit_account_code, r.credit_account_code);
      const entryDate = periodStartDate(r.reverse_year, r.reverse_month);
      const revNo = `${r.entry_no}-REV`;
      const { data: je, error: jeErr } = await supabase
        .from("journal_entries" as any)
        .insert({
          entry_no: revNo,
          entry_date: entryDate,
          description: `Reversal: ${r.description}`,
          reference: r.entry_no,
          reference_type: "Accrual Reversal",
          status: "Posted",
          total_debit: r.amount,
          total_credit: r.amount,
        })
        .select("id").single();
      if (jeErr) throw jeErr;
      const entryId = (je as any).id as string;
      // Reverse sides
      const { error: linesErr } = await supabase.from("journal_entry_lines" as any).insert([
        { entry_id: entryId, account_id: cId, debit: r.amount, credit: 0, description: `Reversal - ${r.description}`, sort_order: 0 },
        { entry_id: entryId, account_id: dId, debit: 0, credit: r.amount, description: `Reversal - ${r.description}`, sort_order: 1 },
      ]);
      if (linesErr) throw linesErr;
      const { error: updErr } = await supabase.from("accruals_deferrals" as any).update({
        status: "Reversed",
        reversal_journal_entry_id: entryId,
        reversed_at: new Date().toISOString(),
      }).eq("id", r.id);
      if (updErr) throw updErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accruals_deferrals"] });
      toast.success("Reversal journal posted");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to reverse"),
  });

  const voidMut = useMutation({
    mutationFn: async (r: Accrual) => {
      if (r.status === "Posted" || r.status === "Reversed") throw new Error("Only Draft entries can be voided");
      const { error } = await supabase.from("accruals_deferrals" as any)
        .update({ status: "Void" }).eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accruals_deferrals"] });
      toast.success("Entry voided");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const isDue = (r: Accrual) =>
    r.status === "Posted" &&
    (r.reverse_year < today.getFullYear() ||
      (r.reverse_year === today.getFullYear() && r.reverse_month <= today.getMonth() + 1));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <CalendarRange className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Accruals & Deferrals</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportToExcel(
              filtered.map((r) => ({
                "Entry No": r.entry_no,
                Type: r.entry_type,
                Description: r.description,
                Company: r.companies?.name ?? "",
                Currency: r.currency,
                Amount: r.amount,
                Period: `${r.period_year}-${String(r.period_month).padStart(2, "0")}`,
                Reverse: `${r.reverse_year}-${String(r.reverse_month).padStart(2, "0")}`,
                "Dr Acct": r.debit_account_code ?? "",
                "Cr Acct": r.credit_account_code ?? "",
                Status: r.status,
              })),
              "Accruals",
              "accruals-deferrals",
            )}
          >
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" />New Entry</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>New Accrual / Deferral</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select value={form.entry_type} onValueChange={(v: EntryType) => setForm((f) => ({ ...f, entry_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ENTRY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Company</Label>
                  <Select value={form.company_id} onValueChange={(v) => setForm((f) => ({ ...f, company_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Description</Label>
                  <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                </div>
                <div>
                  <Label>Amount</Label>
                  <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
                </div>
                <div>
                  <Label>Currency</Label>
                  <Input value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))} />
                </div>
                <div>
                  <Label>Period (Year / Month)</Label>
                  <div className="flex gap-2">
                    <Input type="number" value={form.period_year} onChange={(e) => {
                      const y = Number(e.target.value);
                      const { ry, rm } = defaultReverse(y, form.period_month);
                      setForm((f) => ({ ...f, period_year: y, reverse_year: ry, reverse_month: rm }));
                    }} />
                    <Select value={String(form.period_month)} onValueChange={(v) => {
                      const m = Number(v);
                      const { ry, rm } = defaultReverse(form.period_year, m);
                      setForm((f) => ({ ...f, period_month: m, reverse_year: ry, reverse_month: rm }));
                    }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Reverse (Year / Month)</Label>
                  <div className="flex gap-2">
                    <Input type="number" value={form.reverse_year} onChange={(e) => setForm((f) => ({ ...f, reverse_year: Number(e.target.value) }))} />
                    <Select value={String(form.reverse_month)} onValueChange={(v) => setForm((f) => ({ ...f, reverse_month: Number(v) }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Debit account code</Label>
                  <Input value={form.debit_account_code} onChange={(e) => setForm((f) => ({ ...f, debit_account_code: e.target.value }))} />
                </div>
                <div>
                  <Label>Credit account code</Label>
                  <Input value={form.credit_account_code} onChange={(e) => setForm((f) => ({ ...f, credit_account_code: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>
                  {createMut.isPending ? "Saving..." : "Save Draft"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Drafts</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{kpis.draft}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Posted</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{kpis.posted}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Reversed</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{kpis.reversed}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Open amount</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{kpis.openAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="posted">Posted</TabsTrigger>
          <TabsTrigger value="due">Due for reversal</TabsTrigger>
          <TabsTrigger value="reversed">Reversed</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-3">
          <Card>
            <CardHeader><CardTitle className="text-base">Register ({filtered.length})</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entry No</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Reverse</TableHead>
                    <TableHead>Dr / Cr</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">No entries.</TableCell></TableRow>
                  )}
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.entry_no}</TableCell>
                      <TableCell>{r.entry_type}</TableCell>
                      <TableCell className="max-w-[280px] truncate">{r.description}</TableCell>
                      <TableCell className="text-muted-foreground">{r.companies?.name ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        {Number(r.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })} {r.currency}
                      </TableCell>
                      <TableCell>{r.period_year}-{String(r.period_month).padStart(2, "0")}</TableCell>
                      <TableCell>
                        {r.reverse_year}-{String(r.reverse_month).padStart(2, "0")}
                        {isDue(r) && <Badge variant="secondary" className="ml-2">Due</Badge>}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {r.debit_account_code ?? "?"} / {r.credit_account_code ?? "?"}
                      </TableCell>
                      <TableCell><Badge variant={STATUS_VARIANT[r.status] ?? "outline"}>{r.status}</Badge></TableCell>
                      <TableCell className="text-right space-x-1">
                        {r.status === "Draft" && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => postMut.mutate(r)} disabled={postMut.isPending}>
                              <Send className="h-3 w-3 mr-1" />Post
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => voidMut.mutate(r)}>
                              <Ban className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                        {r.status === "Posted" && (
                          <Button size="sm" variant="outline" onClick={() => reverseMut.mutate(r)} disabled={reverseMut.isPending}>
                            <RotateCcw className="h-3 w-3 mr-1" />Reverse
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
