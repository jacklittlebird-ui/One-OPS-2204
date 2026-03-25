import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

type AccountRow = { id: string; code: string; name: string; name_ar: string; account_type: string; is_group: boolean; current_balance: number; opening_balance: number; parent_id: string | null; };
type JournalLine = { account_id: string; debit: number; credit: number; };
type JournalEntry = { id: string; status: string; };

const COLORS = ["#3b82f6", "#ef4444", "#8b5cf6", "#22c55e", "#f97316"];

export default function FinancialReportsPage() {
  const { data: accounts = [] } = useQuery({
    queryKey: ["chart_of_accounts"],
    queryFn: async () => { const { data } = await supabase.from("chart_of_accounts" as any).select("*").order("code"); return (data || []) as unknown as AccountRow[]; },
  });
  const { data: journalEntries = [] } = useQuery({
    queryKey: ["journal_entries"],
    queryFn: async () => { const { data } = await supabase.from("journal_entries" as any).select("id,status"); return (data || []) as unknown as JournalEntry[]; },
  });
  const { data: journalLines = [] } = useQuery({
    queryKey: ["journal_entry_lines_all"],
    queryFn: async () => { const { data } = await supabase.from("journal_entry_lines" as any).select("account_id,debit,credit"); return (data || []) as unknown as JournalLine[]; },
  });

  // Calculate balances from journal lines
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

  // P&L
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

  const plChartData = [
    ...revenues.filter(a => a.balanceCredit > 0).map(a => ({ name: a.name, value: a.balanceCredit, type: "Revenue" })),
    ...expenses.filter(a => a.balanceDebit > 0).map(a => ({ name: a.name, value: a.balanceDebit, type: "Expense" })),
  ];

  const bsChartData = [
    { name: "Assets", value: totalAssets },
    { name: "Liabilities", value: totalLiabilities },
    { name: "Equity", value: totalEquity },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Financial Reports</h1>
        <p className="text-muted-foreground text-sm">التقارير المالية · Trial Balance, P&L, Balance Sheet</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Assets", value: totalAssets, cls: "text-blue-600" },
          { label: "Total Liabilities", value: totalLiabilities, cls: "text-red-600" },
          { label: "Total Revenue", value: totalRevenue, cls: "text-green-600" },
          { label: "Net Income", value: netIncome, cls: netIncome >= 0 ? "text-green-600" : "text-red-600" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-3"><p className="text-xs text-muted-foreground">{s.label}</p><p className={`text-xl font-bold font-mono ${s.cls}`}>{s.value.toLocaleString()}</p></CardContent></Card>
        ))}
      </div>

      <Tabs defaultValue="trial-balance">
        <TabsList>
          <TabsTrigger value="trial-balance">Trial Balance / ميزان المراجعة</TabsTrigger>
          <TabsTrigger value="pl">P&L / الأرباح والخسائر</TabsTrigger>
          <TabsTrigger value="bs">Balance Sheet / الميزانية</TabsTrigger>
        </TabsList>

        {/* Trial Balance */}
        <TabsContent value="trial-balance">
          <Card>
            <CardHeader><CardTitle className="text-lg">Trial Balance — ميزان المراجعة</CardTitle></CardHeader>
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
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-lg text-green-700">Revenue / الإيرادات</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    {revenues.filter(a => a.balanceCredit > 0).map(a => (
                      <TableRow key={a.id}><TableCell>{a.name}</TableCell><TableCell className="text-right font-mono text-green-700">{a.balanceCredit.toLocaleString()}</TableCell></TableRow>
                    ))}
                    <TableRow className="font-bold bg-green-50"><TableCell>Total Revenue</TableCell><TableCell className="text-right font-mono">{totalRevenue.toLocaleString()}</TableCell></TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg text-red-700">Expenses / المصروفات</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    {expenses.filter(a => a.balanceDebit > 0).map(a => (
                      <TableRow key={a.id}><TableCell>{a.name}</TableCell><TableCell className="text-right font-mono text-red-700">{a.balanceDebit.toLocaleString()}</TableCell></TableRow>
                    ))}
                    <TableRow className="font-bold bg-red-50"><TableCell>Total Expenses</TableCell><TableCell className="text-right font-mono">{totalExpenses.toLocaleString()}</TableCell></TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
          <Card className="mt-4">
            <CardContent className="p-4 text-center">
              <p className="text-lg font-bold">Net Income / صافي الربح</p>
              <p className={`text-3xl font-bold font-mono ${netIncome >= 0 ? "text-green-600" : "text-red-600"}`}>{netIncome.toLocaleString()}</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Balance Sheet */}
        <TabsContent value="bs">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-lg text-blue-700">Assets / الأصول</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    {assets.filter(a => a.balanceDebit > 0).map(a => (
                      <TableRow key={a.id}><TableCell>{a.name}</TableCell><TableCell className="text-right font-mono">{a.balanceDebit.toLocaleString()}</TableCell></TableRow>
                    ))}
                    <TableRow className="font-bold bg-blue-50"><TableCell>Total Assets</TableCell><TableCell className="text-right font-mono">{totalAssets.toLocaleString()}</TableCell></TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-lg text-red-700">Liabilities / الالتزامات</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableBody>
                      {liabilities.filter(a => a.balanceCredit > 0).map(a => (
                        <TableRow key={a.id}><TableCell>{a.name}</TableCell><TableCell className="text-right font-mono">{a.balanceCredit.toLocaleString()}</TableCell></TableRow>
                      ))}
                      <TableRow className="font-bold bg-red-50"><TableCell>Total Liabilities</TableCell><TableCell className="text-right font-mono">{totalLiabilities.toLocaleString()}</TableCell></TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-lg text-purple-700">Equity / حقوق الملكية</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableBody>
                      {equity.filter(a => a.balanceCredit > 0).map(a => (
                        <TableRow key={a.id}><TableCell>{a.name}</TableCell><TableCell className="text-right font-mono">{a.balanceCredit.toLocaleString()}</TableCell></TableRow>
                      ))}
                      <TableRow><TableCell>Net Income (Current Year)</TableCell><TableCell className="text-right font-mono">{netIncome.toLocaleString()}</TableCell></TableRow>
                      <TableRow className="font-bold bg-purple-50"><TableCell>Total Equity</TableCell><TableCell className="text-right font-mono">{totalEquity.toLocaleString()}</TableCell></TableRow>
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
                <span className={`font-bold ${Math.abs(totalAssets - totalLiabilities - totalEquity) < 0.01 ? "text-green-600" : "text-red-600"}`}>
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
