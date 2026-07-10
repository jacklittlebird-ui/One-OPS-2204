// Phase 1p — Cash Flow Statement (Indirect Method)
// Classifies posted journal-entry movements into Operating / Investing / Financing
// activities using Chart-of-Accounts type + code prefixes, with period comparison.

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Download, TrendingUp, TrendingDown, Wallet, ArrowRightLeft } from "lucide-react";
import { exportToExcel } from "@/lib/exportExcel";

interface Account { id: string; code: string; name: string; account_type: string; }
interface JournalEntry { id: string; status: string; entry_date: string; }
interface JournalLine { account_id: string; debit: number; credit: number; entry_id: string; company_id: string | null; station_id: string | null; }
interface Company { id: string; name: string; }
interface Station { id: string; name: string; company_id: string | null; }

type CFCategory = "operating" | "investing" | "financing" | "cash" | "ignore";

/** Classify an account into a cash-flow category. Cash accounts (11xx) are excluded from movement — they ARE the cash. */
function classifyAccount(a: Account): CFCategory {
  const code = a.code || "";
  const type = (a.account_type || "").toLowerCase();
  if (code.startsWith("11")) return "cash";                 // Cash & Bank
  if (code.startsWith("15") || code.startsWith("16")) return "investing"; // Fixed assets
  if (code.startsWith("25") || code.startsWith("26") || code.startsWith("27")) return "financing"; // Loans/Notes
  if (type === "equity" || code.startsWith("3")) return "financing";
  // Everything else touching P&L or working capital → operating
  if (["asset", "liability", "revenue", "expense"].includes(type)) return "operating";
  return "ignore";
}

/** Sign of the movement contribution to CASH.
 *  Asset ↑ (debit) → cash ↓  (except cash itself).
 *  Liability/Equity/Revenue ↑ (credit) → cash ↑.
 *  Expense ↑ (debit) → cash ↓ (part of net income).
 */
function cashSign(a: Account): 1 | -1 {
  const type = (a.account_type || "").toLowerCase();
  if (type === "asset") return -1;      // debit-normal, uses cash
  if (type === "expense") return -1;
  return +1;                            // liability, equity, revenue → source of cash
}

export default function CashFlowStatementPage() {
  const today = new Date();
  const yearStart = `${today.getFullYear()}-01-01`;
  const todayStr = today.toISOString().slice(0, 10);

  const [dateFrom, setDateFrom] = useState(yearStart);
  const [dateTo, setDateTo] = useState(todayStr);
  const [compareFrom, setCompareFrom] = useState("");
  const [compareTo, setCompareTo] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [stationFilter, setStationFilter] = useState("all");

  const { data: accounts = [] } = useQuery({
    queryKey: ["cfs_accounts"],
    queryFn: async () => {
      const { data } = await supabase.from("chart_of_accounts" as any).select("id,code,name,account_type").order("code");
      return (data || []) as unknown as Account[];
    },
  });
  const { data: entries = [] } = useQuery({
    queryKey: ["cfs_entries"],
    queryFn: async () => {
      const { data } = await supabase.from("journal_entries" as any).select("id,status,entry_date");
      return (data || []) as unknown as JournalEntry[];
    },
  });
  const { data: lines = [] } = useQuery({
    queryKey: ["cfs_lines"],
    queryFn: async () => {
      const { data } = await supabase.from("journal_entry_lines" as any).select("account_id,debit,credit,entry_id,company_id,station_id");
      return (data || []) as unknown as JournalLine[];
    },
  });
  const { data: companies = [] } = useQuery({
    queryKey: ["cfs_companies"],
    queryFn: async () => { const { data } = await supabase.from("companies" as any).select("id,name").order("name"); return (data || []) as unknown as Company[]; },
  });
  const { data: stations = [] } = useQuery({
    queryKey: ["cfs_stations"],
    queryFn: async () => { const { data } = await supabase.from("finance_stations" as any).select("id,name,company_id").order("name"); return (data || []) as unknown as Station[]; },
  });

  const accountMap = useMemo(() => {
    const m = new Map<string, Account>();
    accounts.forEach(a => m.set(a.id, a));
    return m;
  }, [accounts]);
  const entryDateMap = useMemo(() => {
    const m = new Map<string, string>();
    entries.filter(e => (e.status || "").toLowerCase() === "posted").forEach(e => m.set(e.id, e.entry_date));
    return m;
  }, [entries]);

  function computePeriod(from: string, to: string) {
    const byCat: Record<CFCategory, Map<string, { code: string; name: string; amount: number }>> = {
      operating: new Map(), investing: new Map(), financing: new Map(), cash: new Map(), ignore: new Map(),
    };
    let netCashChange = 0;
    for (const l of lines) {
      const d = entryDateMap.get(l.entry_id);
      if (!d) continue;
      const day = d.slice(0, 10);
      if (from && day < from) continue;
      if (to && day > to) continue;
      if (companyFilter !== "all" && l.company_id !== companyFilter) continue;
      if (stationFilter !== "all" && l.station_id !== stationFilter) continue;
      const acc = accountMap.get(l.account_id);
      if (!acc) continue;
      const cat = classifyAccount(acc);
      const netDebit = (l.debit || 0) - (l.credit || 0); // asset ↑ if positive
      const contribToCash = netDebit * cashSign(acc);
      if (cat === "cash") { netCashChange += (l.debit || 0) - (l.credit || 0); continue; }
      if (cat === "ignore") continue;
      const bucket = byCat[cat];
      const existing = bucket.get(acc.id) || { code: acc.code, name: acc.name, amount: 0 };
      existing.amount += contribToCash;
      bucket.set(acc.id, existing);
    }
    const summarize = (m: Map<string, { code: string; name: string; amount: number }>) => {
      const rows = Array.from(m.values()).filter(r => Math.abs(r.amount) > 0.005).sort((a, b) => a.code.localeCompare(b.code));
      const total = rows.reduce((s, r) => s + r.amount, 0);
      return { rows, total };
    };
    const operating = summarize(byCat.operating);
    const investing = summarize(byCat.investing);
    const financing = summarize(byCat.financing);
    const netChange = operating.total + investing.total + financing.total;
    return { operating, investing, financing, netChange, netCashMovement: netCashChange };
  }

  const current = useMemo(() => computePeriod(dateFrom, dateTo), [lines, entryDateMap, accountMap, dateFrom, dateTo, companyFilter, stationFilter]);
  const compare = useMemo(() => (compareFrom && compareTo ? computePeriod(compareFrom, compareTo) : null), [lines, entryDateMap, accountMap, compareFrom, compareTo, companyFilter, stationFilter]);

  const stationsForCompany = useMemo(() => (
    companyFilter === "all" ? stations : stations.filter(s => s.company_id === companyFilter)
  ), [stations, companyFilter]);

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function handleExport() {
    const rows: any[] = [];
    const push = (section: string, r: { code: string; name: string; amount: number }) =>
      rows.push({ Section: section, Code: r.code, Account: r.name, Current: r.amount, Compare: compare ? (compare[section.toLowerCase() as "operating" | "investing" | "financing"].rows.find(x => x.code === r.code)?.amount ?? 0) : "" });
    current.operating.rows.forEach(r => push("Operating", r));
    rows.push({ Section: "Operating", Code: "", Account: "Total Operating", Current: current.operating.total, Compare: compare?.operating.total ?? "" });
    current.investing.rows.forEach(r => push("Investing", r));
    rows.push({ Section: "Investing", Code: "", Account: "Total Investing", Current: current.investing.total, Compare: compare?.investing.total ?? "" });
    current.financing.rows.forEach(r => push("Financing", r));
    rows.push({ Section: "Financing", Code: "", Account: "Total Financing", Current: current.financing.total, Compare: compare?.financing.total ?? "" });
    rows.push({ Section: "Net", Code: "", Account: "Net Change in Cash", Current: current.netChange, Compare: compare?.netChange ?? "" });
    exportToExcel(rows, "Cash Flow", `cash-flow-${dateFrom}-to-${dateTo}.xlsx`);
  }

  const Section = ({ title, data, compareData }: { title: string; data: ReturnType<typeof computePeriod>["operating"]; compareData?: ReturnType<typeof computePeriod>["operating"] }) => (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Code</TableHead>
              <TableHead>Account</TableHead>
              <TableHead className="text-right">Current</TableHead>
              {compareData && <TableHead className="text-right">Compare</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.length === 0 ? (
              <TableRow><TableCell colSpan={compareData ? 4 : 3} className="text-center text-muted-foreground">No movements</TableCell></TableRow>
            ) : data.rows.map(r => {
              const cmp = compareData?.rows.find(x => x.code === r.code);
              return (
                <TableRow key={r.code}>
                  <TableCell className="font-mono text-xs">{r.code}</TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell className={`text-right ${r.amount < 0 ? "text-destructive" : ""}`}>{fmt(r.amount)}</TableCell>
                  {compareData && <TableCell className={`text-right ${(cmp?.amount ?? 0) < 0 ? "text-destructive" : ""}`}>{fmt(cmp?.amount ?? 0)}</TableCell>}
                </TableRow>
              );
            })}
            <TableRow className="font-semibold bg-muted/50">
              <TableCell />
              <TableCell>Total {title}</TableCell>
              <TableCell className={`text-right ${data.total < 0 ? "text-destructive" : ""}`}>{fmt(data.total)}</TableCell>
              {compareData && <TableCell className={`text-right ${compareData.total < 0 ? "text-destructive" : ""}`}>{fmt(compareData.total)}</TableCell>}
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ArrowRightLeft className="h-6 w-6" /> Cash Flow Statement</h1>
          <p className="text-sm text-muted-foreground">Indirect method — derived from posted journal entries.</p>
        </div>
        <Button onClick={handleExport} variant="outline"><Download className="h-4 w-4 mr-2" />Export Excel</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div><Label>From</Label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></div>
          <div><Label>To</Label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} /></div>
          <div><Label>Compare From</Label><Input type="date" value={compareFrom} onChange={e => setCompareFrom(e.target.value)} /></div>
          <div><Label>Compare To</Label><Input type="date" value={compareTo} onChange={e => setCompareTo(e.target.value)} /></div>
          <div>
            <Label>Company</Label>
            <Select value={companyFilter} onValueChange={v => { setCompanyFilter(v); setStationFilter("all"); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Station</Label>
            <Select value={stationFilter} onValueChange={setStationFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stations</SelectItem>
                {stationsForCompany.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Operating</div><div className={`text-2xl font-bold ${current.operating.total < 0 ? "text-destructive" : "text-green-600"}`}>{fmt(current.operating.total)}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Investing</div><div className={`text-2xl font-bold ${current.investing.total < 0 ? "text-destructive" : "text-green-600"}`}>{fmt(current.investing.total)}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Financing</div><div className={`text-2xl font-bold ${current.financing.total < 0 ? "text-destructive" : "text-green-600"}`}>{fmt(current.financing.total)}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground flex items-center gap-1"><Wallet className="h-3 w-3" />Net Change in Cash</div><div className={`text-2xl font-bold ${current.netChange < 0 ? "text-destructive" : "text-green-600"}`}>{fmt(current.netChange)}</div>
          {Math.abs(current.netChange - current.netCashMovement) > 0.5 && (
            <Badge variant="outline" className="mt-1 text-xs">Δ vs. cash ledger: {fmt(current.netChange - current.netCashMovement)}</Badge>
          )}
        </CardContent></Card>
      </div>

      <Tabs defaultValue="operating" className="space-y-4">
        <TabsList>
          <TabsTrigger value="operating"><TrendingUp className="h-4 w-4 mr-1" />Operating</TabsTrigger>
          <TabsTrigger value="investing"><TrendingDown className="h-4 w-4 mr-1" />Investing</TabsTrigger>
          <TabsTrigger value="financing"><Wallet className="h-4 w-4 mr-1" />Financing</TabsTrigger>
        </TabsList>
        <TabsContent value="operating"><Section title="Operating" data={current.operating} compareData={compare?.operating} /></TabsContent>
        <TabsContent value="investing"><Section title="Investing" data={current.investing} compareData={compare?.investing} /></TabsContent>
        <TabsContent value="financing"><Section title="Financing" data={current.financing} compareData={compare?.financing} /></TabsContent>
      </Tabs>
    </div>
  );
}
