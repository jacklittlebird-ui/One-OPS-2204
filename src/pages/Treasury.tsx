import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Landmark, Wallet, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, ClipboardCheck, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const links = [
  { to: "/treasury/bank-accounts", label: "Bank Accounts", desc: "Manage bank accounts, IBAN, balances", icon: Landmark, color: "text-blue-600" },
  { to: "/treasury/cash-accounts", label: "Cash Accounts", desc: "Petty cash & cash on hand", icon: Wallet, color: "text-emerald-600" },
  { to: "/treasury/receipts", label: "Receipts", desc: "Customer collections & receipts", icon: ArrowDownToLine, color: "text-green-600" },
  { to: "/treasury/payments", label: "Payments", desc: "Vendor & supplier payments", icon: ArrowUpFromLine, color: "text-rose-600" },
  { to: "/treasury/bank-transfers", label: "Bank Transfers", desc: "Inter-account transfers", icon: ArrowLeftRight, color: "text-violet-600" },
  { to: "/treasury/bank-reconciliation", label: "Bank Reconciliation", desc: "Reconcile statements vs system", icon: ClipboardCheck, color: "text-amber-600" },
];

export default function TreasuryPage() {
  const [stats, setStats] = useState({ banks: 0, cash: 0, bankBal: 0, cashBal: 0, paymentsMonth: 0, receiptsMonth: 0 });

  useEffect(() => {
    (async () => {
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
      const ms = monthStart.toISOString().slice(0, 10);
      const [b, c, p, r] = await Promise.all([
        (supabase.from as any)("bank_accounts").select("current_balance"),
        (supabase.from as any)("cash_accounts").select("current_balance"),
        (supabase.from as any)("payments").select("amount").gte("payment_date", ms),
        (supabase.from as any)("receipts").select("amount").gte("receipt_date", ms),
      ]);
      const sum = (rows: any[] | null, k: string) => (rows || []).reduce((s, x) => s + Number(x[k] || 0), 0);
      setStats({
        banks: b.data?.length || 0,
        cash: c.data?.length || 0,
        bankBal: sum(b.data, "current_balance"),
        cashBal: sum(c.data, "current_balance"),
        paymentsMonth: sum(p.data, "amount"),
        receiptsMonth: sum(r.data, "amount"),
      });
    })();
  }, []);

  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Treasury</h1>
        <p className="text-sm text-muted-foreground">Cash, banking, payments, receipts and reconciliation</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Bank Balance</div>
          <div className="text-xl font-bold">{fmt(stats.bankBal)}</div>
          <div className="text-xs text-muted-foreground">{stats.banks} accounts</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Cash Balance</div>
          <div className="text-xl font-bold">{fmt(stats.cashBal)}</div>
          <div className="text-xs text-muted-foreground">{stats.cash} accounts</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Receipts (MTD)</div>
          <div className="text-xl font-bold text-green-600">{fmt(stats.receiptsMonth)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Payments (MTD)</div>
          <div className="text-xl font-bold text-rose-600">{fmt(stats.paymentsMonth)}</div>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {links.map((l) => {
          const Icon = l.icon;
          return (
            <Link key={l.to} to={l.to}>
              <Card className="hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                  <div className={`p-2 rounded-lg bg-muted ${l.color}`}><Icon size={20} /></div>
                  <CardTitle className="text-base flex-1">{l.label}</CardTitle>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{l.desc}</CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
