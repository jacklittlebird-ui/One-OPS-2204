import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Banknote, Wallet, Coins, TrendingUp, Building2, ArrowRight,
  DollarSign, PiggyBank, ArrowUpRight, ArrowDownRight, Landmark,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";

/**
 * Consolidated Financial Dashboard — implements Section 11 of the ERP design doc:
 * 5 panels — KPIs, Banks, Treasury (vouchers/suspense), Petty Cash, FX Rates.
 */
export default function FinancialDashboard() {
  const nav = useNavigate();

  const { data: companies = [] } = useQuery({ queryKey: ["dash-companies"], queryFn: async () => (await supabase.from("companies" as any).select("id,name,currency")).data as any[] || [] });
  const { data: banks = [] } = useQuery({ queryKey: ["dash-banks"], queryFn: async () => (await supabase.from("bank_accounts" as any).select("id,bank_name,account_no,currency,current_balance,company_id")).data as any[] || [] });
  const { data: petty = [] } = useQuery({ queryKey: ["dash-petty"], queryFn: async () => (await supabase.from("petty_cash_funds" as any).select("id,fund_name,currency,current_balance,custodian_name,station_id")).data as any[] || [] });
  const { data: vouchers = [] } = useQuery({ queryKey: ["dash-vouchers"], queryFn: async () => (await supabase.from("treasury_vouchers" as any).select("id,voucher_type,amount,currency,status,voucher_date").order("voucher_date", { ascending: false }).limit(200)).data as any[] || [] });
  const { data: fx = [] } = useQuery({ queryKey: ["dash-fx"], queryFn: async () => (await supabase.from("exchange_rates" as any).select("*").order("rate_date", { ascending: false }).limit(50)).data as any[] || [] });
  const { data: invoices = [] } = useQuery({ queryKey: ["dash-inv"], queryFn: async () => (await supabase.from("invoices" as any).select("id,total,status,currency,operator,date")).data as any[] || [] });
  const { data: vendorInv = [] } = useQuery({ queryKey: ["dash-vi"], queryFn: async () => (await supabase.from("vendor_invoices" as any).select("id,total,status,date")).data as any[] || [] });

  // ─── KPIs ─────────────────────────────────────────────────
  const bankTotalEGP = banks.reduce((s, b) => s + (Number(b.current_balance) || 0), 0);
  const pettyTotalEGP = petty.reduce((s, p) => s + (Number(p.current_balance) || 0), 0);
  const arOpen = invoices.filter(i => i.status !== "Paid" && i.status !== "Cancelled").reduce((s, i) => s + (Number(i.total) || 0), 0);
  const apOpen = vendorInv.filter(v => v.status !== "Paid").reduce((s, v) => s + (Number(v.total) || 0), 0);
  const suspenseVouchers = vouchers.filter(v => v.status === "Pending" || v.status === "Draft");
  const suspenseAmount = suspenseVouchers.reduce((s, v) => s + (Number(v.amount) || 0), 0);
  const netLiquidity = bankTotalEGP + pettyTotalEGP - apOpen;

  const kpis = [
    { label: "Total Bank Balance", value: bankTotalEGP, sub: `${banks.length} accounts`, icon: <Landmark size={16} />, color: "bg-primary", link: "/treasury/bank-accounts" },
    { label: "Petty Cash", value: pettyTotalEGP, sub: `${petty.length} funds`, icon: <Coins size={16} />, color: "bg-warning", link: "/accounting/petty-cash" },
    { label: "Receivables (AR)", value: arOpen, sub: "Open invoices", icon: <ArrowDownRight size={16} />, color: "bg-success", link: "/invoices", trend: "up" },
    { label: "Payables (AP)", value: apOpen, sub: "Unpaid vendors", icon: <ArrowUpRight size={16} />, color: "bg-destructive", link: "/vendor-invoices", trend: "down" },
    { label: "Suspense", value: suspenseAmount, sub: `${suspenseVouchers.length} pending vouchers`, icon: <Wallet size={16} />, color: "bg-info", link: "/accounting/treasury-vouchers" },
    { label: "Net Liquidity", value: netLiquidity, sub: "Banks + Cash − AP", icon: <PiggyBank size={16} />, color: "bg-emerald", link: "/accounting/hub", trend: netLiquidity > 0 ? "up" : "down" },
  ];

  // ─── Banks by currency ────────────────────────────────────
  const banksByCurrency = useMemo(() => {
    const m: Record<string, number> = {};
    banks.forEach(b => { m[b.currency || "EGP"] = (m[b.currency || "EGP"] || 0) + (Number(b.current_balance) || 0); });
    const colors = ["hsl(210,80%,55%)", "hsl(152,60%,45%)", "hsl(38,92%,50%)", "hsl(270,60%,55%)", "hsl(0,84%,60%)", "hsl(180,60%,45%)"];
    return Object.entries(m).map(([name, value], i) => ({ name, value, fill: colors[i % colors.length] }));
  }, [banks]);

  // ─── Voucher activity ─────────────────────────────────────
  const voucherByType = useMemo(() => {
    const m: Record<string, number> = { Receipt: 0, Payment: 0, Transfer: 0 };
    vouchers.forEach(v => { m[v.voucher_type] = (m[v.voucher_type] || 0) + (Number(v.amount) || 0); });
    return Object.entries(m).map(([type, amount]) => ({ type, amount }));
  }, [vouchers]);

  // ─── Latest FX rates ──────────────────────────────────────
  const latestFx = useMemo(() => {
    const seen = new Set<string>();
    const rows: any[] = [];
    for (const r of fx) {
      const k = `${r.from_currency}->${r.to_currency}`;
      if (!seen.has(k)) { seen.add(k); rows.push(r); }
    }
    return rows.slice(0, 8);
  }, [fx]);

  const fmt = (n: number, c = "EGP") => `${c} ${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financial Dashboard</h1>
          <p className="text-muted-foreground text-sm">الداشبورد المالي الشامل · KPIs · Banks · Treasury · Petty Cash · FX</p>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map(k => (
          <button key={k.label} onClick={() => nav(k.link)} className="stat-card flex-col items-start gap-2 text-left hover:shadow-md transition-all cursor-pointer">
            <div className="flex items-center justify-between w-full">
              <div className={`stat-card-icon ${k.color} !w-8 !h-8`}>{k.icon}</div>
              {k.trend && (k.trend === "up" ? <ArrowUpRight size={12} className="text-success" /> : <ArrowDownRight size={12} className="text-destructive" />)}
            </div>
            <div>
              <div className="text-xl font-bold leading-tight">{fmt(k.value)}</div>
              <div className="text-[10px] font-semibold">{k.label}</div>
              <div className="text-[9px] text-muted-foreground">{k.sub}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Row 1: Banks + Treasury */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Landmark size={14} className="text-primary" /> Banks by Currency</CardTitle></CardHeader>
          <CardContent>
            {banksByCurrency.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={banksByCurrency} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={38} strokeWidth={2} stroke="hsl(var(--card))">
                    {banksByCurrency.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v: number, _n, p: any) => [`${p.payload.name} ${v.toLocaleString()}`, ""]} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="text-center py-10 text-muted-foreground text-sm">No bank accounts</div>}
            <div className="mt-2 space-y-1 text-xs">
              {banks.slice(0, 5).map(b => (
                <div key={b.id} className="flex justify-between border-b py-1 last:border-0">
                  <span className="truncate">{b.bank_name} · {b.account_no}</span>
                  <span className="font-mono font-semibold">{b.currency} {(Number(b.current_balance) || 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <button onClick={() => nav("/treasury/bank-accounts")} className="text-xs text-primary hover:underline mt-2 flex items-center gap-1">Open bank accounts <ArrowRight size={11} /></button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Wallet size={14} className="text-info" /> Treasury Vouchers (T-Account)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={voucherByType}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: number) => [v.toLocaleString(), ""]} />
                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md bg-warning/10 p-2">
                <div className="font-semibold text-warning">Suspense / Pending</div>
                <div className="font-mono text-sm">{suspenseAmount.toLocaleString()}</div>
                <div className="text-[10px] text-muted-foreground">{suspenseVouchers.length} vouchers</div>
              </div>
              <div className="rounded-md bg-success/10 p-2">
                <div className="font-semibold text-success">Approved this period</div>
                <div className="font-mono text-sm">{vouchers.filter(v => v.status === "Approved" || v.status === "Posted").reduce((s, v) => s + (Number(v.amount) || 0), 0).toLocaleString()}</div>
                <div className="text-[10px] text-muted-foreground">{vouchers.filter(v => v.status === "Approved" || v.status === "Posted").length} vouchers</div>
              </div>
            </div>
            <button onClick={() => nav("/accounting/treasury-vouchers")} className="text-xs text-primary hover:underline mt-2 flex items-center gap-1">Open treasury <ArrowRight size={11} /></button>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Petty Cash + FX */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Coins size={14} className="text-warning" /> Petty Cash Funds</CardTitle></CardHeader>
          <CardContent>
            {petty.length ? (
              <div className="space-y-1 text-xs">
                {petty.slice(0, 8).map(p => (
                  <div key={p.id} className="flex justify-between items-center border-b py-1.5 last:border-0">
                    <div>
                      <div className="font-semibold text-foreground">{p.fund_name}</div>
                      <div className="text-[10px] text-muted-foreground">Custodian: {p.custodian_name || "—"}</div>
                    </div>
                    <span className="font-mono font-semibold">{p.currency || "EGP"} {(Number(p.current_balance) || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : <div className="text-center py-8 text-muted-foreground text-sm">No petty cash funds</div>}
            <button onClick={() => nav("/accounting/petty-cash")} className="text-xs text-primary hover:underline mt-2 flex items-center gap-1">Open petty cash <ArrowRight size={11} /></button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp size={14} className="text-emerald" /> Latest Exchange Rates</CardTitle></CardHeader>
          <CardContent>
            {latestFx.length ? (
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr><th className="text-left pb-1">Pair</th><th className="text-right pb-1">Rate</th><th className="text-right pb-1">Date</th></tr>
                </thead>
                <tbody>
                  {latestFx.map((r, i) => (
                    <tr key={i} className="border-t">
                      <td className="py-1.5 font-medium">{r.from_currency} → {r.to_currency}</td>
                      <td className="py-1.5 text-right font-mono">{Number(r.rate).toFixed(4)}</td>
                      <td className="py-1.5 text-right text-muted-foreground">{r.rate_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className="text-center py-8 text-muted-foreground text-sm">No FX rates recorded</div>}
            <button onClick={() => nav("/accounting/exchange-rates")} className="text-xs text-primary hover:underline mt-2 flex items-center gap-1">Manage rates <ArrowRight size={11} /></button>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Companies overview */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Building2 size={14} className="text-violet" /> Group Companies</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {companies.map(c => {
              const cBanks = banks.filter(b => b.company_id === c.id);
              const balance = cBanks.reduce((s, b) => s + (Number(b.current_balance) || 0), 0);
              return (
                <button key={c.id} onClick={() => nav("/accounting/companies")} className="border rounded-lg p-3 text-left hover:shadow-md transition-all">
                  <div className="text-xs font-semibold text-foreground truncate">{c.name}</div>
                  <div className="text-[10px] text-muted-foreground">{c.currency}</div>
                  <div className="mt-2 font-mono text-sm">{balance.toLocaleString()}</div>
                  <div className="text-[9px] text-muted-foreground">{cBanks.length} bank(s)</div>
                </button>
              );
            })}
            {!companies.length && <div className="text-muted-foreground text-sm col-span-full text-center py-4">No companies configured</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
