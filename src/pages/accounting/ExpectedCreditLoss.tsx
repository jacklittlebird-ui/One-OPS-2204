import { useState, useMemo, useEffect } from "react";
import { useAgingInvoices } from "@/data/finance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldAlert, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportToExcel } from "@/lib/exportExcel";

type InvoiceRow = {
  id: string;
  invoice_no: string;
  operator: string;
  date: string;
  due_date: string;
  total: number;
  status: string;
  currency: string;
  airline_iata: string | null;
};

type Bucket = "current" | "d30" | "d60" | "d90" | "over90";

const DEFAULT_RATES: Record<Bucket, number> = {
  current: 0.5,
  d30: 2,
  d60: 5,
  d90: 15,
  over90: 50,
};

const STORAGE_KEY = "ecl.loss-rates.v1";
const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ExpectedCreditLossPage() {
  const { data: invoices = [], isLoading } = useAgingInvoices<InvoiceRow>();
  const [rates, setRates] = useState<Record<Bucket, number>>(DEFAULT_RATES);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setRates({ ...DEFAULT_RATES, ...parsed });
      }
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rates));
  }, [rates]);

  const todayMs = useMemo(() => Date.now(), []);

  const buckets = useMemo(() => {
    const b: Record<Bucket, InvoiceRow[]> = { current: [], d30: [], d60: [], d90: [], over90: [] };
    for (const inv of invoices) {
      if (inv.status === "Paid" || inv.status === "Cancelled") continue;
      const due = new Date(inv.due_date).getTime();
      const diff = Math.floor((todayMs - due) / 86_400_000);
      if (diff <= 0) b.current.push(inv);
      else if (diff <= 30) b.d30.push(inv);
      else if (diff <= 60) b.d60.push(inv);
      else if (diff <= 90) b.d90.push(inv);
      else b.over90.push(inv);
    }
    return b;
  }, [invoices, todayMs]);

  const rows = useMemo(() => {
    const defs: Array<{ key: Bucket; label: string; range: string }> = [
      { key: "current", label: "Current", range: "Not due" },
      { key: "d30", label: "1–30 Days", range: "1–30" },
      { key: "d60", label: "31–60 Days", range: "31–60" },
      { key: "d90", label: "61–90 Days", range: "61–90" },
      { key: "over90", label: "90+ Days", range: "90+" },
    ];
    return defs.map((d) => {
      const list = buckets[d.key];
      const gross = list.reduce((s, i) => s + Number(i.total || 0), 0);
      const rate = Number(rates[d.key] || 0);
      const ecl = gross * (rate / 100);
      return { ...d, count: list.length, gross, rate, ecl };
    });
  }, [buckets, rates]);

  const totals = useMemo(() => {
    const gross = rows.reduce((s, r) => s + r.gross, 0);
    const ecl = rows.reduce((s, r) => s + r.ecl, 0);
    const coverage = gross > 0 ? (ecl / gross) * 100 : 0;
    return { gross, ecl, coverage };
  }, [rows]);

  const handleExport = () => {
    exportToExcel(
      rows.map((r) => ({
        Bucket: r.label,
        "Days Range": r.range,
        Invoices: r.count,
        "Gross AR": r.gross,
        "Loss Rate %": r.rate,
        "ECL Provision": r.ecl,
      })),
      "ECL",
      `ecl-provision-${new Date().toISOString().slice(0, 10)}`,
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-primary" />
            Expected Credit Loss
          </h1>
          <p className="text-muted-foreground">IFRS 9 — Provision matrix on trade receivables</p>
        </div>
        <Button variant="outline" onClick={handleExport}><Download className="w-4 h-4 mr-1" />Export</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Total Gross AR</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{fmt(totals.gross)}</div></CardContent>
        </Card>
        <Card className="border-primary">
          <CardHeader className="pb-2"><CardTitle className="text-sm">ECL Provision</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-primary">{fmt(totals.ecl)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Coverage Ratio</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{totals.coverage.toFixed(2)}%</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Provision Matrix</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading receivables…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aging Bucket</TableHead>
                  <TableHead>Days Range</TableHead>
                  <TableHead className="text-right">Invoices</TableHead>
                  <TableHead className="text-right">Gross AR</TableHead>
                  <TableHead className="w-32">Loss Rate %</TableHead>
                  <TableHead className="text-right">ECL Provision</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.key}>
                    <TableCell className="font-medium">{r.label}</TableCell>
                    <TableCell>{r.range}</TableCell>
                    <TableCell className="text-right">{r.count}</TableCell>
                    <TableCell className="text-right">{fmt(r.gross)}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.1"
                        value={r.rate}
                        onChange={(e) => setRates((prev) => ({ ...prev, [r.key]: Number(e.target.value) || 0 }))}
                      />
                    </TableCell>
                    <TableCell className="text-right text-primary font-medium">{fmt(r.ecl)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/50">
                  <TableCell colSpan={3}>Total</TableCell>
                  <TableCell className="text-right">{fmt(totals.gross)}</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right text-primary">{fmt(totals.ecl)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
          <p className="text-xs text-muted-foreground mt-4">
            Rates are indicative defaults. Adjust to reflect historical loss experience and forward-looking macro factors per IFRS 9 simplified approach.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
