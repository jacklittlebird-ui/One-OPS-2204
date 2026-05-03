import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from "recharts";
import { Download, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import * as XLSX from "xlsx";
import { exportToPdf } from "@/lib/exportPdf";
import { logAudit } from "@/lib/auditLogger";

type AccountRow = { id: string; code: string; name: string; name_ar: string; account_type: string; is_group: boolean; current_balance: number; opening_balance: number; parent_id: string | null; };
type JournalLineWithDate = { account_id: string; debit: number; credit: number; entry_id: string; };
type JournalEntry = { id: string; status: string; entry_date: string; };

export default function FinancialReportsPage() {
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));

  const { data: accounts = [] } = useQuery({
    queryKey: ["chart_of_accounts"],
    queryFn: async () => { const { data } = await supabase.from("chart_of_accounts" as any).select("*").order("code"); return (data || []) as unknown as AccountRow[]; },
  });
  const { data: journalEntries = [] } = useQuery({
    queryKey: ["journal_entries_full"],
    queryFn: async () => { const { data } = await supabase.from("journal_entries" as any).select("id,status,entry_date"); return (data || []) as unknown as JournalEntry[]; },
  });
  const { data: journalLines = [] } = useQuery({
    queryKey: ["journal_entry_lines_all"],
    queryFn: async () => { const { data } = await supabase.from("journal_entry_lines" as any).select("account_id,debit,credit,entry_id"); return (data || []) as unknown as JournalLineWithDate[]; },
  });

  // Map entry_id → entry_date
  const entryDateMap = useMemo(() => {
    const map: Record<string, string> = {};
    journalEntries.forEach(e => { map[e.id] = e.entry_date; });
    return map;
  }, [journalEntries]);

  // Available years
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    journalEntries.forEach(e => { if (e.entry_date) years.add(e.entry_date.slice(0, 4)); });
    if (years.size === 0) years.add(String(new Date().getFullYear()));
    return Array.from(years).sort().reverse();
  }, [journalEntries]);

  // Overall balances (for Trial Balance, overall P&L, BS)
  const accountBalances = useMemo(() => {
    const balances: Record<string, { debit: number; credit: number }> = {};
    journalLines.forEach(l => {
      if (!balances[l.account_id]) balances[l.account_id] = { debit: 0, credit: 0 };
      balances[l.account_id].debit += l.debit || 0;
      balances[l.account_id].credit += l.credit || 0;
    });
    return balances;
  }, [journalLines]);

  const leafAccounts = accounts.filter(a => !a.is_group);
  const trialBalance = leafAccounts.map(a => {
    const bal = accountBalances[a.id] || { debit: 0, credit: 0 };
    const openBal = a.opening_balance || 0;
    const totalDebit = bal.debit + (["Asset", "Expense"].includes(a.account_type) ? openBal : 0);
    const totalCredit = bal.credit + (["Liability", "Equity", "Revenue"].includes(a.account_type) ? openBal : 0);
    const netBalance = totalDebit - totalCredit;
    return { ...a, totalDebit, totalCredit, balanceDebit: netBalance > 0 ? netBalance : 0, balanceCredit: netBalance < 0 ? Math.abs(netBalance) : 0 };
  });

  const tbTotalDebit = trialBalance.reduce((s, a) => s + a.balanceDebit, 0);
  const tbTotalCredit = trialBalance.reduce((s, a) => s + a.balanceCredit, 0);

  // P&L totals
  const revenues = trialBalance.filter(a => a.account_type === "Revenue");
  const expenses = trialBalance.filter(a => a.account_type === "Expense");
  const totalRevenue = revenues.reduce((s, a) => s + a.balanceCredit, 0);
  const totalExpenses = expenses.reduce((s, a) => s + a.balanceDebit, 0);
  const netIncome = totalRevenue - totalExpenses;

  // Balance Sheet
  const assets = trialBalance.filter(a => a.account_type === "Asset");
  const liabilities = trialBalance.filter(a => a.account_type === "Liability");
  const equity = trialBalance.filter(a => a.account_type === "Equity");
  const totalAssets = assets.reduce((s, a) => s + a.balanceDebit, 0);
  const totalLiabilities = liabilities.reduce((s, a) => s + a.balanceCredit, 0);
  const totalEquity = equity.reduce((s, a) => s + a.balanceCredit, 0) + netIncome;

  // =================== MONTHLY P&L ===================
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const revenueAccounts = leafAccounts.filter(a => a.account_type === "Revenue");
  const expenseAccounts = leafAccounts.filter(a => a.account_type === "Expense");

  // Monthly balances: { accountId -> { "01": credit, "02": credit, ... } }
  const monthlyData = useMemo(() => {
    const data: Record<string, Record<string, { debit: number; credit: number }>> = {};
    journalLines.forEach(l => {
      const entryDate = entryDateMap[l.entry_id];
      if (!entryDate || !entryDate.startsWith(selectedYear)) return;
      const month = entryDate.slice(5, 7); // "01"-"12"
      if (!data[l.account_id]) data[l.account_id] = {};
      if (!data[l.account_id][month]) data[l.account_id][month] = { debit: 0, credit: 0 };
      data[l.account_id][month].debit += l.debit || 0;
      data[l.account_id][month].credit += l.credit || 0;
    });
    return data;
  }, [journalLines, entryDateMap, selectedYear]);

  const getMonthVal = (accountId: string, month: string, type: "Revenue" | "Expense") => {
    const d = monthlyData[accountId]?.[month];
    if (!d) return 0;
    return type === "Revenue" ? d.credit : d.debit;
  };

  // Monthly totals for chart and table
  const monthlyTotals = useMemo(() => {
    return MONTHS.map((name, i) => {
      const mm = String(i + 1).padStart(2, "0");
      const rev = revenueAccounts.reduce((s, a) => s + getMonthVal(a.id, mm, "Revenue"), 0);
      const exp = expenseAccounts.reduce((s, a) => s + getMonthVal(a.id, mm, "Expense"), 0);
      return { month: name, monthKey: mm, revenue: rev, expenses: exp, netIncome: rev - exp };
    });
  }, [monthlyData, revenueAccounts, expenseAccounts]);

  // Account-level monthly rows
  const monthlyAccountRows = useMemo(() => {
    const buildRows = (accts: AccountRow[], type: "Revenue" | "Expense") =>
      accts.map(a => {
        const months: Record<string, number> = {};
        let total = 0;
        MONTHS.forEach((_, i) => {
          const mm = String(i + 1).padStart(2, "0");
          const val = getMonthVal(a.id, mm, type);
          months[mm] = val;
          total += val;
        });
        return { ...a, months, total };
      }).filter(r => r.total > 0);
    return { revenues: buildRows(revenueAccounts, "Revenue"), expenses: buildRows(expenseAccounts, "Expense") };
  }, [monthlyData, revenueAccounts, expenseAccounts]);

  // Change indicator
  const ChangeIndicator = ({ current, previous }: { current: number; previous: number }) => {
    if (previous === 0 && current === 0) return <Minus size={12} className="text-muted-foreground" />;
    if (previous === 0) return <ArrowUpRight size={12} className="text-success" />;
    const pct = ((current - previous) / Math.abs(previous)) * 100;
    if (Math.abs(pct) < 0.5) return <Minus size={12} className="text-muted-foreground" />;
    return (
      <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${pct > 0 ? "text-success" : "text-destructive"}`}>
        {pct > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
        {Math.abs(pct).toFixed(0)}%
      </span>
    );
  };

  // Export to Excel
  const handleExportMonthlyPL = () => {
    const wb = XLSX.utils.book_new();
    
    // Summary sheet
    const summaryRows = [
      [`Monthly P&L Report — ${selectedYear}`, "", ...MONTHS, "Total"],
      [],
      ["REVENUE", "", ...MONTHS.map((_, i) => {
        const mm = String(i + 1).padStart(2, "0");
        return revenueAccounts.reduce((s, a) => s + getMonthVal(a.id, mm, "Revenue"), 0);
      }), revenueAccounts.reduce((s, a) => s + (monthlyAccountRows.revenues.find(r => r.id === a.id)?.total || 0), 0)],
      ...monthlyAccountRows.revenues.map(r => [
        `  ${r.code} - ${r.name}`, r.name_ar,
        ...MONTHS.map((_, i) => r.months[String(i + 1).padStart(2, "0")] || 0),
        r.total,
      ]),
      [],
      ["EXPENSES", "", ...MONTHS.map((_, i) => {
        const mm = String(i + 1).padStart(2, "0");
        return expenseAccounts.reduce((s, a) => s + getMonthVal(a.id, mm, "Expense"), 0);
      }), expenseAccounts.reduce((s, a) => s + (monthlyAccountRows.expenses.find(r => r.id === a.id)?.total || 0), 0)],
      ...monthlyAccountRows.expenses.map(r => [
        `  ${r.code} - ${r.name}`, r.name_ar,
        ...MONTHS.map((_, i) => r.months[String(i + 1).padStart(2, "0")] || 0),
        r.total,
      ]),
      [],
      ["NET INCOME", "", ...monthlyTotals.map(m => m.netIncome), monthlyTotals.reduce((s, m) => s + m.netIncome, 0)],
    ];
    
    const ws = XLSX.utils.aoa_to_sheet([["", "", ...MONTHS, "Total"], ...summaryRows]);
    ws["!cols"] = [{ wch: 35 }, { wch: 20 }, ...MONTHS.map(() => ({ wch: 12 })), { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws, "Monthly P&L");

    // Monthly comparison sheet
    const compRows = [
      ["Month", "Revenue", "Expenses", "Net Income", "Revenue Change %", "Net Income Change %"],
      ...monthlyTotals.map((m, i) => {
        const prev = i > 0 ? monthlyTotals[i - 1] : null;
        const revChange = prev && prev.revenue > 0 ? (((m.revenue - prev.revenue) / prev.revenue) * 100).toFixed(1) + "%" : "—";
        const niChange = prev && Math.abs(prev.netIncome) > 0 ? (((m.netIncome - prev.netIncome) / Math.abs(prev.netIncome)) * 100).toFixed(1) + "%" : "—";
        return [m.month, m.revenue, m.expenses, m.netIncome, revChange, niChange];
      }),
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(compRows);
    ws2["!cols"] = [{ wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws2, "Comparison");

    XLSX.writeFile(wb, `PL_Monthly_${selectedYear}.xlsx`);
  };

  const handleExportTrialBalance = () => {
    const rows = trialBalance
      .filter(a => a.balanceDebit > 0 || a.balanceCredit > 0)
      .map(a => ({
        Code: a.code, Account: a.name, "الحساب": a.name_ar,
        Type: a.account_type,
        Debit: a.balanceDebit, Credit: a.balanceCredit,
      }));
    rows.push({ Code: "", Account: "TOTAL", "الحساب": "", Type: "", Debit: tbTotalDebit, Credit: tbTotalCredit } as any);
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 10 }, { wch: 30 }, { wch: 25 }, { wch: 12 }, { wch: 14 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Trial Balance");
    XLSX.writeFile(wb, `TrialBalance_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const handleExportPL = () => {
    const aoa: any[][] = [["Profit & Loss Statement"], [], ["Account", "الحساب", "Amount"], ["REVENUE / الإيرادات"]];
    revenues.filter(a => a.balanceCredit > 0).forEach(a => aoa.push([`  ${a.name}`, a.name_ar, a.balanceCredit]));
    aoa.push(["Total Revenue", "", totalRevenue], [], ["EXPENSES / المصروفات"]);
    expenses.filter(a => a.balanceDebit > 0).forEach(a => aoa.push([`  ${a.name}`, a.name_ar, a.balanceDebit]));
    aoa.push(["Total Expenses", "", totalExpenses], [], ["NET INCOME / صافي الربح", "", netIncome]);
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 35 }, { wch: 25 }, { wch: 16 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "P&L");
    XLSX.writeFile(wb, `PL_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const handleExportBalanceSheet = () => {
    const aoa: any[][] = [["Balance Sheet — الميزانية"], [], ["Account", "الحساب", "Amount"], ["ASSETS / الأصول"]];
    assets.filter(a => a.balanceDebit > 0).forEach(a => aoa.push([`  ${a.name}`, a.name_ar, a.balanceDebit]));
    aoa.push(["Total Assets", "", totalAssets], [], ["LIABILITIES / الالتزامات"]);
    liabilities.filter(a => a.balanceCredit > 0).forEach(a => aoa.push([`  ${a.name}`, a.name_ar, a.balanceCredit]));
    aoa.push(["Total Liabilities", "", totalLiabilities], [], ["EQUITY / حقوق الملكية"]);
    equity.filter(a => a.balanceCredit > 0).forEach(a => aoa.push([`  ${a.name}`, a.name_ar, a.balanceCredit]));
    aoa.push(["  Net Income (Current Year)", "", netIncome], ["Total Equity", "", totalEquity], [],
      ["Check: Assets = Liabilities + Equity", "", `${totalAssets} = ${totalLiabilities + totalEquity}`]);
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 35 }, { wch: 25 }, { wch: 16 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Balance Sheet");
    XLSX.writeFile(wb, `BalanceSheet_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  // PDF exports
  const handlePdfTrialBalance = () => {
    exportToPdf({
      title: "Trial Balance", subtitle: `As of ${new Date().toLocaleDateString()}`,
      head: [["Code", "Account", "Type", "Debit", "Credit"]],
      body: trialBalance.filter(a => a.balanceDebit > 0 || a.balanceCredit > 0).map(a => [a.code, a.name, a.account_type, a.balanceDebit.toLocaleString(), a.balanceCredit.toLocaleString()])
        .concat([["", "TOTAL", "", tbTotalDebit.toLocaleString(), tbTotalCredit.toLocaleString()]]),
      fileName: `TrialBalance_${new Date().toISOString().slice(0,10)}.pdf`, orientation: "portrait",
    });
    logAudit({ action: "export", entity_type: "trial_balance", details: { format: "pdf" } });
  };

  const handlePdfPL = () => {
    const body: (string | number)[][] = [["REVENUE", ""]];
    revenues.filter(a => a.balanceCredit > 0).forEach(a => body.push([`  ${a.name}`, a.balanceCredit.toLocaleString()]));
    body.push(["Total Revenue", totalRevenue.toLocaleString()], ["EXPENSES", ""]);
    expenses.filter(a => a.balanceDebit > 0).forEach(a => body.push([`  ${a.name}`, a.balanceDebit.toLocaleString()]));
    body.push(["Total Expenses", totalExpenses.toLocaleString()], ["NET INCOME", netIncome.toLocaleString()]);
    exportToPdf({ title: "Profit & Loss Statement", head: [["Account", "Amount"]], body, fileName: `PL_${new Date().toISOString().slice(0,10)}.pdf` });
    logAudit({ action: "export", entity_type: "profit_loss", details: { format: "pdf" } });
  };

  const handlePdfBalanceSheet = () => {
    const body: (string | number)[][] = [["ASSETS", ""]];
    assets.filter(a => a.balanceDebit > 0).forEach(a => body.push([`  ${a.name}`, a.balanceDebit.toLocaleString()]));
    body.push(["Total Assets", totalAssets.toLocaleString()], ["LIABILITIES", ""]);
    liabilities.filter(a => a.balanceCredit > 0).forEach(a => body.push([`  ${a.name}`, a.balanceCredit.toLocaleString()]));
    body.push(["Total Liabilities", totalLiabilities.toLocaleString()], ["EQUITY", ""]);
    equity.filter(a => a.balanceCredit > 0).forEach(a => body.push([`  ${a.name}`, a.balanceCredit.toLocaleString()]));
    body.push(["  Net Income", netIncome.toLocaleString()], ["Total Equity", totalEquity.toLocaleString()]);
    exportToPdf({ title: "Balance Sheet", head: [["Account", "Amount"]], body, fileName: `BalanceSheet_${new Date().toISOString().slice(0,10)}.pdf` });
    logAudit({ action: "export", entity_type: "balance_sheet", details: { format: "pdf" } });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Financial Reports</h1>
        <p className="text-muted-foreground text-sm">التقارير المالية · Trial Balance, P&L, Balance Sheet</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Assets", value: totalAssets, cls: "text-primary" },
          { label: "Total Liabilities", value: totalLiabilities, cls: "text-destructive" },
          { label: "Total Revenue", value: totalRevenue, cls: "text-success" },
          { label: "Net Income", value: netIncome, cls: netIncome >= 0 ? "text-success" : "text-destructive" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-3"><p className="text-xs text-muted-foreground">{s.label}</p><p className={`text-xl font-bold font-mono ${s.cls}`}>{s.value.toLocaleString()}</p></CardContent></Card>
        ))}
      </div>

      <Tabs defaultValue="trial-balance">
        <TabsList>
          <TabsTrigger value="trial-balance">Trial Balance / ميزان المراجعة</TabsTrigger>
          <TabsTrigger value="pl">P&L / الأرباح والخسائر</TabsTrigger>
          <TabsTrigger value="monthly-pl">Monthly P&L / شهري</TabsTrigger>
          <TabsTrigger value="bs">Balance Sheet / الميزانية</TabsTrigger>
        </TabsList>

        {/* Trial Balance */}
        <TabsContent value="trial-balance">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Trial Balance — ميزان المراجعة</CardTitle>
              <Button variant="outline" size="sm" onClick={handleExportTrialBalance}><Download size={14} className="mr-1.5" /> Excel</Button>
              <Button variant="outline" size="sm" onClick={handlePdfTrialBalance}><Download size={14} className="mr-1.5" /> PDF</Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Debit المدين</TableHead>
                    <TableHead className="text-right">Credit الدائن</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trialBalance.filter(a => a.balanceDebit > 0 || a.balanceCredit > 0).map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-xs">{a.code}</TableCell>
                      <TableCell>{a.name} <span className="text-muted-foreground text-xs">({a.name_ar})</span></TableCell>
                      <TableCell className="text-right font-mono">{a.balanceDebit > 0 ? a.balanceDebit.toLocaleString() : ""}</TableCell>
                      <TableCell className="text-right font-mono">{a.balanceCredit > 0 ? a.balanceCredit.toLocaleString() : ""}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell colSpan={2} className="text-right">Total الإجمالي</TableCell>
                    <TableCell className="text-right font-mono">{tbTotalDebit.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono">{tbTotalCredit.toLocaleString()}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* P&L */}
        <TabsContent value="pl">
          <div className="flex justify-end mb-2">
            <Button variant="outline" size="sm" onClick={handleExportPL}><Download size={14} className="mr-1.5" /> Excel</Button>
            <Button variant="outline" size="sm" onClick={handlePdfPL}><Download size={14} className="mr-1.5" /> PDF</Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-lg text-success">Revenue / الإيرادات</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    {revenues.filter(a => a.balanceCredit > 0).map(a => (
                      <TableRow key={a.id}><TableCell>{a.name}</TableCell><TableCell className="text-right font-mono text-success">{a.balanceCredit.toLocaleString()}</TableCell></TableRow>
                    ))}
                    <TableRow className="font-bold bg-success/10"><TableCell>Total Revenue</TableCell><TableCell className="text-right font-mono">{totalRevenue.toLocaleString()}</TableCell></TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg text-destructive">Expenses / المصروفات</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    {expenses.filter(a => a.balanceDebit > 0).map(a => (
                      <TableRow key={a.id}><TableCell>{a.name}</TableCell><TableCell className="text-right font-mono text-destructive">{a.balanceDebit.toLocaleString()}</TableCell></TableRow>
                    ))}
                    <TableRow className="font-bold bg-destructive/10"><TableCell>Total Expenses</TableCell><TableCell className="text-right font-mono">{totalExpenses.toLocaleString()}</TableCell></TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
          <Card className="mt-4">
            <CardContent className="p-4 text-center">
              <p className="text-lg font-bold">Net Income / صافي الربح</p>
              <p className={`text-3xl font-bold font-mono ${netIncome >= 0 ? "text-success" : "text-destructive"}`}>{netIncome.toLocaleString()}</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =================== MONTHLY P&L TAB =================== */}
        <TabsContent value="monthly-pl">
          <div className="space-y-4">
            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>{availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">تقرير الأرباح والخسائر الشهري</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleExportMonthlyPL}>
                <Download size={14} className="mr-1.5" /> Export Excel
              </Button>
            </div>

            {/* Chart: Revenue vs Expenses vs Net Income */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp size={14} className="text-primary" /> Monthly Revenue vs Expenses — {selectedYear}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={monthlyTotals} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number) => [`$${v.toLocaleString()}`, ""]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="revenue" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Revenue" />
                    <Bar dataKey="expenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Expenses" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Net Income trend line */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  {monthlyTotals.reduce((s, m) => s + m.netIncome, 0) >= 0
                    ? <TrendingUp size={14} className="text-success" />
                    : <TrendingDown size={14} className="text-destructive" />
                  }
                  Net Income Trend — صافي الربح الشهري
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={monthlyTotals}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number) => [`$${v.toLocaleString()}`, "Net Income"]}
                    />
                    <Line type="monotone" dataKey="netIncome" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ fill: "hsl(var(--primary))", r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Monthly Comparison Table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Monthly Summary — ملخص شهري</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-card z-10">Month</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Expenses</TableHead>
                        <TableHead className="text-right">Net Income</TableHead>
                        <TableHead className="text-center">Margin %</TableHead>
                        <TableHead className="text-center">vs Prev Month</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyTotals.map((m, i) => {
                        const prev = i > 0 ? monthlyTotals[i - 1] : null;
                        const margin = m.revenue > 0 ? (m.netIncome / m.revenue) * 100 : 0;
                        const hasData = m.revenue > 0 || m.expenses > 0;
                        return (
                          <TableRow key={m.month} className={!hasData ? "opacity-40" : ""}>
                            <TableCell className="font-semibold sticky left-0 bg-card">{m.month}</TableCell>
                            <TableCell className="text-right font-mono text-success">{m.revenue > 0 ? `$${m.revenue.toLocaleString()}` : "—"}</TableCell>
                            <TableCell className="text-right font-mono text-destructive">{m.expenses > 0 ? `$${m.expenses.toLocaleString()}` : "—"}</TableCell>
                            <TableCell className={`text-right font-mono font-bold ${m.netIncome >= 0 ? "text-success" : "text-destructive"}`}>
                              {hasData ? `$${m.netIncome.toLocaleString()}` : "—"}
                            </TableCell>
                            <TableCell className="text-center text-xs font-mono">
                              {hasData ? `${margin.toFixed(1)}%` : "—"}
                            </TableCell>
                            <TableCell className="text-center">
                              {prev && hasData ? <ChangeIndicator current={m.netIncome} previous={prev.netIncome} /> : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow className="font-bold bg-muted/50">
                        <TableCell className="sticky left-0 bg-muted/50">Total {selectedYear}</TableCell>
                        <TableCell className="text-right font-mono text-success">${monthlyTotals.reduce((s, m) => s + m.revenue, 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono text-destructive">${monthlyTotals.reduce((s, m) => s + m.expenses, 0).toLocaleString()}</TableCell>
                        <TableCell className={`text-right font-mono font-bold ${monthlyTotals.reduce((s, m) => s + m.netIncome, 0) >= 0 ? "text-success" : "text-destructive"}`}>
                          ${monthlyTotals.reduce((s, m) => s + m.netIncome, 0).toLocaleString()}
                        </TableCell>
                        <TableCell colSpan={2} />
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Revenue by Account per Month */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-success">Revenue Detail by Month — تفاصيل الإيرادات</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-card z-10 min-w-[200px]">Account</TableHead>
                        {MONTHS.map(m => <TableHead key={m} className="text-right text-xs min-w-[80px]">{m}</TableHead>)}
                        <TableHead className="text-right font-bold min-w-[90px]">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyAccountRows.revenues.map(r => (
                        <TableRow key={r.id}>
                          <TableCell className="sticky left-0 bg-card text-xs">{r.code} — {r.name}</TableCell>
                          {MONTHS.map((_, i) => {
                            const v = r.months[String(i + 1).padStart(2, "0")];
                            return <TableCell key={i} className="text-right font-mono text-xs">{v > 0 ? v.toLocaleString() : "—"}</TableCell>;
                          })}
                          <TableCell className="text-right font-mono text-xs font-bold text-success">{r.total.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                      {monthlyAccountRows.revenues.length === 0 && (
                        <TableRow><TableCell colSpan={14} className="text-center py-6 text-muted-foreground">No revenue data for {selectedYear}</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Expenses by Account per Month */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-destructive">Expense Detail by Month — تفاصيل المصروفات</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-card z-10 min-w-[200px]">Account</TableHead>
                        {MONTHS.map(m => <TableHead key={m} className="text-right text-xs min-w-[80px]">{m}</TableHead>)}
                        <TableHead className="text-right font-bold min-w-[90px]">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyAccountRows.expenses.map(r => (
                        <TableRow key={r.id}>
                          <TableCell className="sticky left-0 bg-card text-xs">{r.code} — {r.name}</TableCell>
                          {MONTHS.map((_, i) => {
                            const v = r.months[String(i + 1).padStart(2, "0")];
                            return <TableCell key={i} className="text-right font-mono text-xs">{v > 0 ? v.toLocaleString() : "—"}</TableCell>;
                          })}
                          <TableCell className="text-right font-mono text-xs font-bold text-destructive">{r.total.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                      {monthlyAccountRows.expenses.length === 0 && (
                        <TableRow><TableCell colSpan={14} className="text-center py-6 text-muted-foreground">No expense data for {selectedYear}</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Balance Sheet */}
        <TabsContent value="bs">
          <div className="flex justify-end mb-2">
            <Button variant="outline" size="sm" onClick={handleExportBalanceSheet}><Download size={14} className="mr-1.5" /> Export Excel</Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-lg text-primary">Assets / الأصول</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    {assets.filter(a => a.balanceDebit > 0).map(a => (
                      <TableRow key={a.id}><TableCell>{a.name}</TableCell><TableCell className="text-right font-mono">{a.balanceDebit.toLocaleString()}</TableCell></TableRow>
                    ))}
                    <TableRow className="font-bold bg-primary/10"><TableCell>Total Assets</TableCell><TableCell className="text-right font-mono">{totalAssets.toLocaleString()}</TableCell></TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-lg text-destructive">Liabilities / الالتزامات</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableBody>
                      {liabilities.filter(a => a.balanceCredit > 0).map(a => (
                        <TableRow key={a.id}><TableCell>{a.name}</TableCell><TableCell className="text-right font-mono">{a.balanceCredit.toLocaleString()}</TableCell></TableRow>
                      ))}
                      <TableRow className="font-bold bg-destructive/10"><TableCell>Total Liabilities</TableCell><TableCell className="text-right font-mono">{totalLiabilities.toLocaleString()}</TableCell></TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-lg text-accent-foreground">Equity / حقوق الملكية</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableBody>
                      {equity.filter(a => a.balanceCredit > 0).map(a => (
                        <TableRow key={a.id}><TableCell>{a.name}</TableCell><TableCell className="text-right font-mono">{a.balanceCredit.toLocaleString()}</TableCell></TableRow>
                      ))}
                      <TableRow><TableCell>Net Income (Current Year)</TableCell><TableCell className="text-right font-mono">{netIncome.toLocaleString()}</TableCell></TableRow>
                      <TableRow className="font-bold bg-accent/10"><TableCell>Total Equity</TableCell><TableCell className="text-right font-mono">{totalEquity.toLocaleString()}</TableCell></TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
          <Card className="mt-4">
            <CardContent className="p-4">
              <div className="flex justify-between text-sm">
                <span>Assets = Liabilities + Equity</span>
                <span className={`font-bold ${Math.abs(totalAssets - totalLiabilities - totalEquity) < 0.01 ? "text-success" : "text-destructive"}`}>
                  {totalAssets.toLocaleString()} = {totalLiabilities.toLocaleString()} + {totalEquity.toLocaleString()}
                  {Math.abs(totalAssets - totalLiabilities - totalEquity) < 0.01 ? " ✓ Balanced" : " ✗ Not Balanced"}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}