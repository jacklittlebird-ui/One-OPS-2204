// Phase 2a — Treasury Vouchers
// -------------------------------------------------------------
// Formal receipt & payment vouchers with a full approval + posting lifecycle:
//   Draft → Pending Approval → Approved → Posted → Settled  (or Void)
//
// Supports Receipt (money in), Payment (money out), and Pending vouchers
// (parked vouchers awaiting supporting documents). Multi-currency with
// exchange rate → base amount, tied to bank/cash accounts and companies.

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
import {
  Receipt, ArrowDownCircle, ArrowUpCircle, Clock, Plus, Download,
  CheckCircle2, Send, Ban, FileCheck2,
} from "lucide-react";
import { exportToExcel } from "@/lib/exportExcel";
import { format } from "date-fns";

type VoucherType = "receipt" | "payment" | "pending";
type VoucherStatus =
  | "draft" | "pending_approval" | "approved" | "posted" | "settled" | "void";

const STATUS_VARIANT: Record<VoucherStatus, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  pending_approval: "secondary",
  approved: "default",
  posted: "default",
  settled: "default",
  void: "destructive",
};

const STATUS_LABEL: Record<VoucherStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending Approval",
  approved: "Approved",
  posted: "Posted",
  settled: "Settled",
  void: "Void",
};

const CURRENCIES = ["USD", "EUR", "EGP", "SAR", "AED"] as const;
const PARTY_TYPES = ["Customer", "Supplier", "Employee", "Other"] as const;

interface Voucher {
  id: string;
  voucher_no: string;
  voucher_type: VoucherType;
  voucher_date: string;
  status: VoucherStatus;
  description: string;
  reference: string | null;
  currency: string;
  amount: number;
  exchange_rate: number;
  base_amount: number;
  base_currency: string | null;
  party_type: string | null;
  party_name: string | null;
  bank_account_id: string | null;
  cash_account_id: string | null;
  company_id: string | null;
  notes: string | null;
  posted_at: string | null;
  settled_at: string | null;
  requires_approval: boolean;
  created_at: string;
}

interface Company { id: string; name: string; }
interface BankAccount { id: string; account_name: string; currency: string; }
interface CashAccount { id: string; account_name: string; currency: string; }

const emptyForm = (type: VoucherType) => ({
  voucher_no: "",
  voucher_type: type,
  voucher_date: format(new Date(), "yyyy-MM-dd"),
  description: "",
  reference: "",
  currency: "USD",
  amount: 0,
  exchange_rate: 1,
  party_type: "",
  party_name: "",
  bank_account_id: "",
  cash_account_id: "",
  company_id: "",
  notes: "",
});

export default function TreasuryVouchersPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<VoucherType>("receipt");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm("receipt"));
  const [statusFilter, setStatusFilter] = useState<"all" | VoucherStatus>("all");

  const { data: vouchers = [] } = useQuery({
    queryKey: ["treasury_vouchers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("treasury_vouchers")
        .select("*")
        .order("voucher_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Voucher[];
    },
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies_min"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("id,name").order("name");
      if (error) throw error;
      return (data ?? []) as Company[];
    },
  });

  const { data: banks = [] } = useQuery({
    queryKey: ["bank_accounts_min"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("id,account_name,currency")
        .order("account_name");
      if (error) throw error;
      return (data ?? []) as BankAccount[];
    },
  });

  const { data: cash = [] } = useQuery({
    queryKey: ["cash_accounts_min"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_accounts")
        .select("id,account_name,currency")
        .order("account_name");
      if (error) throw error;
      return (data ?? []) as CashAccount[];
    },
  });

  const filtered = useMemo(() => {
    return vouchers.filter(
      (v) =>
        v.voucher_type === activeTab &&
        (statusFilter === "all" || v.status === statusFilter),
    );
  }, [vouchers, activeTab, statusFilter]);

  const kpis = useMemo(() => {
    const list = vouchers.filter((v) => v.voucher_type === activeTab);
    const inflow = list
      .filter((v) => ["approved", "posted", "settled"].includes(v.status))
      .reduce((s, v) => s + (v.base_amount || 0), 0);
    const pending = list.filter((v) =>
      ["draft", "pending_approval"].includes(v.status),
    ).length;
    const posted = list.filter((v) => v.status === "posted" || v.status === "settled").length;
    return { total: list.length, amount: inflow, pending, posted };
  }, [vouchers, activeTab]);

  const create = useMutation({
    mutationFn: async () => {
      if (!form.voucher_no.trim()) throw new Error("Voucher number is required");
      if (!form.amount || form.amount <= 0) throw new Error("Amount must be greater than zero");

      const payload = {
        voucher_no: form.voucher_no.trim(),
        voucher_type: form.voucher_type,
        voucher_date: form.voucher_date,
        description: form.description || "",
        reference: form.reference || null,
        currency: form.currency as "USD" | "EUR" | "EGP" | "SAR" | "AED",
        amount: Number(form.amount),
        exchange_rate: Number(form.exchange_rate) || 1,
        base_amount: Number(form.amount) * (Number(form.exchange_rate) || 1),
        party_type: form.party_type || null,
        party_name: form.party_name || null,
        bank_account_id: form.bank_account_id || null,
        cash_account_id: form.cash_account_id || null,
        company_id: form.company_id || null,
        notes: form.notes || null,
        status: "draft" as VoucherStatus,
        created_by: user?.id ?? null,
        requires_approval: Number(form.amount) * (Number(form.exchange_rate) || 1) >= 5000,
      };
      const { error } = await supabase.from("treasury_vouchers").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["treasury_vouchers"] });
      setDialogOpen(false);
      setForm(emptyForm(activeTab));
      toast.success("Voucher created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const transition = useMutation({
    mutationFn: async ({ id, to }: { id: string; to: VoucherStatus }) => {
      const patch: {
        status: VoucherStatus;
        posted_at?: string;
        settled_at?: string;
      } = { status: to };
      if (to === "posted") patch.posted_at = new Date().toISOString();
      if (to === "settled") patch.settled_at = new Date().toISOString();
      const { error } = await supabase
        .from("treasury_vouchers")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["treasury_vouchers"] });
      toast.success(`Voucher ${STATUS_LABEL[v.to].toLowerCase()}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const nextActions = (v: Voucher): { label: string; to: VoucherStatus; icon: React.ReactNode }[] => {
    switch (v.status) {
      case "draft":
        return [
          { label: "Submit", to: "pending_approval", icon: <Send className="h-3 w-3" /> },
          { label: "Void", to: "void", icon: <Ban className="h-3 w-3" /> },
        ];
      case "pending_approval":
        return [
          { label: "Approve", to: "approved", icon: <CheckCircle2 className="h-3 w-3" /> },
          { label: "Void", to: "void", icon: <Ban className="h-3 w-3" /> },
        ];
      case "approved":
        return [{ label: "Post", to: "posted", icon: <FileCheck2 className="h-3 w-3" /> }];
      case "posted":
        return [{ label: "Settle", to: "settled", icon: <CheckCircle2 className="h-3 w-3" /> }];
      default:
        return [];
    }
  };

  const openCreate = (type: VoucherType) => {
    setForm(emptyForm(type));
    setDialogOpen(true);
  };

  const exportRows = () => {
    exportToExcel(
      filtered.map((v) => ({
        "Voucher No": v.voucher_no,
        "Type": v.voucher_type,
        "Date": v.voucher_date,
        "Status": STATUS_LABEL[v.status],
        "Party": v.party_name || "",
        "Reference": v.reference || "",
        "Currency": v.currency,
        "Amount": v.amount,
        "Rate": v.exchange_rate,
        "Base Amount": v.base_amount,
        "Description": v.description,
      })),
      `Vouchers-${activeTab}`,
      `treasury-vouchers-${activeTab}-${format(new Date(), "yyyyMMdd")}.xlsx`,
    );
  };

  const tabIcon = (t: VoucherType) =>
    t === "receipt" ? <ArrowDownCircle className="h-4 w-4" /> :
    t === "payment" ? <ArrowUpCircle className="h-4 w-4" /> :
    <Clock className="h-4 w-4" />;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="h-6 w-6" /> Treasury Vouchers
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Receipt, payment, and pending vouchers with approval &amp; posting lifecycle.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportRows}>
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
          <Button onClick={() => openCreate(activeTab)}>
            <Plus className="h-4 w-4 mr-2" /> New {activeTab === "pending" ? "Pending" : activeTab === "receipt" ? "Receipt" : "Payment"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Vouchers</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{kpis.total}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Approved+ Base Amount</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{kpis.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Pending Action</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{kpis.pending}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Posted / Settled</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{kpis.posted}</div></CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as VoucherType)}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList>
            <TabsTrigger value="receipt" className="gap-2">{tabIcon("receipt")} Receipts</TabsTrigger>
            <TabsTrigger value="payment" className="gap-2">{tabIcon("payment")} Payments</TabsTrigger>
            <TabsTrigger value="pending" className="gap-2">{tabIcon("pending")} Pending</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">Status</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {(Object.keys(STATUS_LABEL) as VoucherStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {(["receipt", "payment", "pending"] as VoucherType[]).map((t) => (
          <TabsContent key={t} value={t} className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Voucher No</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Party</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Currency</TableHead>
                      <TableHead className="text-right">Base Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                          No vouchers yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((v) => (
                        <TableRow key={v.id}>
                          <TableCell className="font-medium">{v.voucher_no}</TableCell>
                          <TableCell>{format(new Date(v.voucher_date), "dd/MM/yyyy")}</TableCell>
                          <TableCell>{v.party_name || "—"}</TableCell>
                          <TableCell className="max-w-xs truncate" title={v.description}>{v.description}</TableCell>
                          <TableCell className="text-right">{Number(v.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell>{v.currency}</TableCell>
                          <TableCell className="text-right">{Number(v.base_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell><Badge variant={STATUS_VARIANT[v.status]}>{STATUS_LABEL[v.status]}</Badge></TableCell>
                          <TableCell className="text-right space-x-1">
                            {nextActions(v).map((a) => (
                              <Button
                                key={a.to}
                                size="sm"
                                variant={a.to === "void" ? "destructive" : "outline"}
                                onClick={() => transition.mutate({ id: v.id, to: a.to })}
                                disabled={transition.isPending}
                              >
                                {a.icon}<span className="ml-1">{a.label}</span>
                              </Button>
                            ))}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New {form.voucher_type === "receipt" ? "Receipt" : form.voucher_type === "payment" ? "Payment" : "Pending"} Voucher</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Voucher Number</Label>
              <Input value={form.voucher_no} onChange={(e) => setForm({ ...form, voucher_no: e.target.value })} />
            </div>
            <div>
              <Label>Voucher Date</Label>
              <Input type="date" value={form.voucher_date} onChange={(e) => setForm({ ...form, voucher_date: e.target.value })} />
            </div>
            <div>
              <Label>Company</Label>
              <Select value={form.company_id} onValueChange={(v) => setForm({ ...form, company_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                <SelectContent>
                  {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reference</Label>
              <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
            </div>
            <div>
              <Label>Party Type</Label>
              <Select value={form.party_type} onValueChange={(v) => setForm({ ...form, party_type: v })}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {PARTY_TYPES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Party Name</Label>
              <Input value={form.party_name} onChange={(e) => setForm({ ...form, party_name: e.target.value })} />
            </div>
            <div>
              <Label>Bank Account</Label>
              <Select
                value={form.bank_account_id}
                onValueChange={(v) => setForm({ ...form, bank_account_id: v, cash_account_id: "" })}
              >
                <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
                <SelectContent>
                  {banks.map((b) => <SelectItem key={b.id} value={b.id}>{b.account_name} ({b.currency})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cash Account (alt.)</Label>
              <Select
                value={form.cash_account_id}
                onValueChange={(v) => setForm({ ...form, cash_account_id: v, bank_account_id: "" })}
              >
                <SelectTrigger><SelectValue placeholder="Select cash box" /></SelectTrigger>
                <SelectContent>
                  {cash.map((c) => <SelectItem key={c.id} value={c.id}>{c.account_name} ({c.currency})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount</Label>
              <Input type="number" min="0" step="0.01" value={form.amount}
                onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Exchange Rate</Label>
              <Input type="number" min="0" step="0.0001" value={form.exchange_rate}
                onChange={(e) => setForm({ ...form, exchange_rate: parseFloat(e.target.value) || 1 })} />
            </div>
            <div>
              <Label>Base Amount</Label>
              <Input value={(Number(form.amount) * (Number(form.exchange_rate) || 1)).toFixed(2)} disabled />
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending}>
              {create.isPending ? "Saving..." : "Create Voucher"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
