// Financial Statements Pack (Phase 1z)
// -------------------------------------------------------------
// Four tabs:
//   1. Trial Balance — per-account DR/CR totals within a date range.
//   2. Profit & Loss — Revenue vs Expense, Net Profit.
//   3. Balance Sheet — Assets vs Liabilities + Equity (with computed NP).
//   4. Cash Flow — Operating movements from posted cash/bank journal lines.
//
// Filters: company, date range. Only journal_entries with status 'Posted'
// contribute. All figures are shown in base currency.

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Landmark, Download } from "lucide-react";
import { exportToExcel } from "@/lib/exportExcel";
import { format, startOfYear } from "date-fns";

type Account = {
  id: string;
  code: string;
  name: string;
  account_type: "Asset" | "Liability" | "Equity" | "Revenue" | "Expense";
  company_id: string | null;
};

type Line = {
  account_id: string;
  debit: number;
  credit: number;
  base_amount: number | null;
  company_id: string | null;
};

const NORMAL_DEBIT = new Set(["Asset", "Expense"]);
const fmt = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function FinancialStatements() {
  const today = new Date();
  const [from, setFrom] = useState(format(startOfYear(today), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(today, "yyyy-MM-dd"));
  const [companyId, setCompanyId] = useState<string>("all");
  const [tab, setTab] = useState<"tb" | "pl" | "bs" | "cf">("tb");

  const companiesQ = useQuery({
    queryKey: ["companies_min"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("id,name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const accountsQ = useQuery({
    queryKey: ["coa_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chart_of_accounts")
        .select("id,code,name,account_type,company_id")
        .order("code");
      if (error) throw error;
      return (data ?? []) as Account[];
    },
  });

  const linesQ = useQuery({
    queryKey: ["gl_lines", from, to, companyId],
    queryFn: async () => {
      // Pull posted journal entries in range, then their lines.
      let entriesQ = supabase
        .from("journal_entries")
        .select("id,company_id,entry_date,status")
        .gte("entry_date", from)
        .lte("entry_date", to)
        .ilike("status", "Posted");
      if (companyId !== "all") entriesQ = entriesQ.eq("company_id", companyId);
      const { data: entries, error: e1 } = await entriesQ;
      if (e1) throw e1;
      const ids = (entries ?? []).map((e: any) => e.id);
      if (ids.length === 0) return [] as Line[];

      const chunkSize = 500;
      const all: Line[] = [];
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const { data, error } = await supabase
          .from("journal_entry_lines")
          .select("account_id,debit,credit,base_amount,company_id")
          .in("entry_id", chunk);
        if (error) throw error;
        all.push(...((data ?? []) as Line[]));
      }
      return all;
    },
    enabled: !!from && !!to,
  });

  // Aggregate DR/CR per account
  const byAccount = useMemo(() => {
    const m = new Map<string, { debit: number; credit: number }>();
    for (const l of linesQ.data ?? []) {
      const cur = m.get(l.account_id) ?? { debit: 0, credit: 0 };
      cur.debit += Number(l.debit ?? 0);
      cur.credit += Number(l.credit ?? 0);
      m.set(l.account_id, cur);
    }
    return m;
  }, [linesQ.data]);

  const rows = useMemo(() => {
    const accts = accountsQ.data ?? [];
    return accts
      .map((a) => {
        const t = byAccount.get(a.id) ?? { debit: 0, credit: 0 };
        const net = t.debit - t.credit;
        const balance = NORMAL_DEBIT.has(a.account_type) ? net : -net;
        return { ...a, debit: t.debit, credit: t.credit, balance };
      })
      .filter((r) => r.debit !== 0 || r.credit !== 0);
  }, [accountsQ.data, byAccount]);

  const totals = useMemo(() => {
    const g = (t: string) =>
      rows.filter((r) => r.account_type === t).reduce((s, r) => s + r.balance, 0);
    const assets = g("Asset");
    const liab = g("Liability");
    const equity = g("Equity");
    const revenue = g("Revenue");
    const expense = g("Expense");
    const netProfit = revenue - expense;
    return { assets, liab, equity, revenue, expense, netProfit };
  }, [rows]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Landmark className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Financial Statements</h1>
          <p className="text-sm text-muted-foreground">
            Trial Balance, Profit &amp; Loss, Balance Sheet, and Cash Flow — from posted journals.
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label>From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label>To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <Label>Company</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All (Consolidated)</SelectItem>
                {(companiesQ.data ?? []).map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <div className="text-xs text-muted-foreground">
              {linesQ.isFetching
                ? "Loading…"
                : `${(linesQ.data ?? []).length.toLocaleString()} posted lines`}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="tb">Trial Balance</TabsTrigger>
          <TabsTrigger value="pl">Profit &amp; Loss</TabsTrigger>
          <TabsTrigger value="bs">Balance Sheet</TabsTrigger>
          <TabsTrigger value="cf">Cash Flow</TabsTrigger>
        </TabsList>

        <TabsContent value="tb">
          <TrialBalance rows={rows} />
        </TabsContent>
        <TabsContent value="pl">
          <ProfitLoss rows={rows} totals={totals} />
        </TabsContent>
        <TabsContent value="bs">
          <BalanceSheet rows={rows} totals={totals} />
        </TabsContent>
        <TabsContent value="cf">
          <CashFlow rows={rows} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type Row = Account & { debit: number; credit: number; balance: number };

function TrialBalance({ rows }: { rows: Row[] }) {
  const totalDr = rows.reduce((s, r) => s + r.debit, 0);
  const totalCr = rows.reduce((s, r) => s + r.credit, 0);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Trial Balance</CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            exportToExcel(
              rows.map((r) => ({
                Code: r.code,
                Account: r.name,
                Type: r.account_type,
                Debit: r.debit,
                Credit: r.credit,
                Balance: r.balance,
              })),
              "TrialBalance",
              "trial_balance.xlsx"
            )
          }
        >
          <Download className="h-4 w-4 mr-1" /> Export
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.code}</TableCell>
                <TableCell>{r.name}</TableCell>
                <TableCell>{r.account_type}</TableCell>
                <TableCell className="text-right">{fmt(r.debit)}</TableCell>
                <TableCell className="text-right">{fmt(r.credit)}</TableCell>
                <TableCell className="text-right font-medium">{fmt(r.balance)}</TableCell>
              </TableRow>
            ))}
            <TableRow className="font-semibold bg-muted/40">
              <TableCell colSpan={3}>Total</TableCell>
              <TableCell className="text-right">{fmt(totalDr)}</TableCell>
              <TableCell className="text-right">{fmt(totalCr)}</TableCell>
              <TableCell className="text-right">{fmt(totalDr - totalCr)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function Section({
  title,
  items,
  total,
}: {
  title: string;
  items: Row[];
  total: number;
}) {
  return (
    <div className="space-y-1">
      <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {title}
      </div>
      <Table>
        <TableBody>
          {items.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-mono text-xs w-32">{r.code}</TableCell>
              <TableCell>{r.name}</TableCell>
              <TableCell className="text-right w-40">{fmt(r.balance)}</TableCell>
            </TableRow>
          ))}
          <TableRow className="font-semibold bg-muted/30">
            <TableCell colSpan={2}>Total {title}</TableCell>
            <TableCell className="text-right">{fmt(total)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

function ProfitLoss({
  rows,
  totals,
}: {
  rows: Row[];
  totals: { revenue: number; expense: number; netProfit: number };
}) {
  const rev = rows.filter((r) => r.account_type === "Revenue");
  const exp = rows.filter((r) => r.account_type === "Expense");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Profit &amp; Loss</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Section title="Revenue" items={rev} total={totals.revenue} />
        <Section title="Expenses" items={exp} total={totals.expense} />
        <div className="flex justify-between items-center border-t pt-3">
          <div className="text-lg font-semibold">Net Profit</div>
          <div
            className={`text-lg font-bold ${
              totals.netProfit >= 0 ? "text-primary" : "text-destructive"
            }`}
          >
            {fmt(totals.netProfit)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BalanceSheet({
  rows,
  totals,
}: {
  rows: Row[];
  totals: { assets: number; liab: number; equity: number; netProfit: number };
}) {
  const assets = rows.filter((r) => r.account_type === "Asset");
  const liab = rows.filter((r) => r.account_type === "Liability");
  const equity = rows.filter((r) => r.account_type === "Equity");
  const equityWithNP = totals.equity + totals.netProfit;
  const totalLiabEquity = totals.liab + equityWithNP;
  const diff = totals.assets - totalLiabEquity;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Balance Sheet</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Section title="Assets" items={assets} total={totals.assets} />
        <Section title="Liabilities" items={liab} total={totals.liab} />
        <Section title="Equity" items={equity} total={totals.equity} />
        <div className="flex justify-between items-center text-sm">
          <span>Retained (Net Profit for period)</span>
          <span className="font-medium">{fmt(totals.netProfit)}</span>
        </div>
        <div className="border-t pt-3 space-y-1">
          <div className="flex justify-between font-semibold">
            <span>Total Assets</span>
            <span>{fmt(totals.assets)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Total Liabilities + Equity</span>
            <span>{fmt(totalLiabEquity)}</span>
          </div>
          <div
            className={`flex justify-between text-sm ${
              Math.abs(diff) < 0.01 ? "text-muted-foreground" : "text-destructive"
            }`}
          >
            <span>Difference</span>
            <span>{fmt(diff)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CashFlow({ rows }: { rows: Row[] }) {
  // Simple direct-method proxy: any account whose code starts with 1201/1202/1203
  // or name contains "Cash"/"Bank" (case-insensitive) is treated as cash.
  const isCash = (r: Row) =>
    /^1201|^1202|^1203/.test(r.code) ||
    /cash|bank|صندوق|بنك/i.test(r.name);
  const cash = rows.filter(isCash);
  const inflow = cash.reduce((s, r) => s + Math.max(r.debit - r.credit, 0), 0);
  const outflow = cash.reduce((s, r) => s + Math.max(r.credit - r.debit, 0), 0);
  const net = inflow - outflow;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cash Flow (Direct)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Cash / Bank Account</TableHead>
              <TableHead className="text-right">Inflow</TableHead>
              <TableHead className="text-right">Outflow</TableHead>
              <TableHead className="text-right">Net</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cash.map((r) => {
              const inf = Math.max(r.debit - r.credit, 0);
              const outf = Math.max(r.credit - r.debit, 0);
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.code}</TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell className="text-right">{fmt(inf)}</TableCell>
                  <TableCell className="text-right">{fmt(outf)}</TableCell>
                  <TableCell className="text-right font-medium">{fmt(inf - outf)}</TableCell>
                </TableRow>
              );
            })}
            {cash.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                  No cash movement in this period.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="border-t pt-3 space-y-1">
          <div className="flex justify-between">
            <span>Total Inflow</span>
            <span className="font-medium">{fmt(inflow)}</span>
          </div>
          <div className="flex justify-between">
            <span>Total Outflow</span>
            <span className="font-medium">{fmt(outflow)}</span>
          </div>
          <div className="flex justify-between text-lg font-semibold border-t pt-2">
            <span>Net Cash Movement</span>
            <span className={net >= 0 ? "text-primary" : "text-destructive"}>{fmt(net)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
