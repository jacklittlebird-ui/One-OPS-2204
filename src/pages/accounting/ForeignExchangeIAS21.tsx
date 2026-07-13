import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Globe, Plus, Trash2, Download } from "lucide-react";
import { exportToExcel } from "@/lib/exportExcel";

type ItemType = "monetary_asset" | "monetary_liability" | "non_monetary_hc" | "non_monetary_fv" | "income" | "expense" | "equity";

type FxItem = {
  id: string;
  description: string;
  itemType: ItemType;
  foreignCurrency: string;
  foreignAmount: number;
  historicalRate: number;
  averageRate: number;
  closingRate: number;
};

const uid = () => Math.random().toString(36).slice(2, 10);
const STORAGE_KEY = "ias21.items.v1";
const CFG_KEY = "ias21.cfg.v1";
const fmt = (n: number) => (Number.isFinite(n) ? n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—");

const empty = (): FxItem => ({
  id: uid(),
  description: "",
  itemType: "monetary_asset",
  foreignCurrency: "USD",
  foreignAmount: 0,
  historicalRate: 1,
  averageRate: 1,
  closingRate: 1,
});

const TYPE_LABEL: Record<ItemType, string> = {
  monetary_asset: "Monetary Asset",
  monetary_liability: "Monetary Liability",
  non_monetary_hc: "Non-Monetary (Hist. Cost)",
  non_monetary_fv: "Non-Monetary (Fair Value)",
  income: "Income (P&L)",
  expense: "Expense (P&L)",
  equity: "Equity",
};

// Rate rule per IAS 21.23 / .39
const rateFor = (t: ItemType, i: FxItem): { rate: number; ref: string } => {
  switch (t) {
    case "monetary_asset":
    case "monetary_liability":
      return { rate: i.closingRate, ref: "Closing rate (IAS 21.23a)" };
    case "non_monetary_hc":
      return { rate: i.historicalRate, ref: "Historical rate (IAS 21.23b)" };
    case "non_monetary_fv":
      return { rate: i.closingRate, ref: "Rate at FV date (IAS 21.23c)" };
    case "income":
    case "expense":
      return { rate: i.averageRate, ref: "Average rate (IAS 21.39b)" };
    case "equity":
      return { rate: i.historicalRate, ref: "Historical rate (IAS 21.39)" };
  }
};

export default function ForeignExchangeIAS21Page() {
  const [functionalCcy, setFunctionalCcy] = useState("EGP");
  const [presentationCcy, setPresentationCcy] = useState("EGP");
  const [items, setItems] = useState<FxItem[]>([]);

  useEffect(() => {
    try {
      const c = localStorage.getItem(CFG_KEY);
      if (c) { const p = JSON.parse(c); if (p.functionalCcy) setFunctionalCcy(p.functionalCcy); if (p.presentationCcy) setPresentationCcy(p.presentationCcy); }
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) setItems(p); }
    } catch {}
  }, []);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }, [items]);
  useEffect(() => { localStorage.setItem(CFG_KEY, JSON.stringify({ functionalCcy, presentationCcy })); }, [functionalCcy, presentationCcy]);

  const update = (id: string, patch: Partial<FxItem>) =>
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const rows = useMemo(() => items.map((i) => {
    const { rate, ref } = rateFor(i.itemType, i);
    const translated = i.foreignAmount * rate;
    const atClosing = i.foreignAmount * i.closingRate;
    const fxDiff = (i.itemType === "monetary_asset" || i.itemType === "monetary_liability")
      ? (i.foreignAmount * i.closingRate) - (i.foreignAmount * i.historicalRate)
      : 0;
    return { ...i, rate, ref, translated, atClosing, fxDiff };
  }), [items]);

  const totals = useMemo(() => {
    let assets = 0, liab = 0, income = 0, expense = 0, equity = 0, plFxGain = 0, ociFxGain = 0;
    for (const r of rows) {
      if (r.itemType === "monetary_asset" || r.itemType === "non_monetary_hc" || r.itemType === "non_monetary_fv") assets += r.translated;
      else if (r.itemType === "monetary_liability") liab += r.translated;
      else if (r.itemType === "income") income += r.translated;
      else if (r.itemType === "expense") expense += r.translated;
      else if (r.itemType === "equity") equity += r.translated;
      // Remeasurement diff on monetary items → P&L (IAS 21.28). Translation of foreign operation → OCI (IAS 21.39c).
      if (r.itemType === "monetary_asset") plFxGain += r.fxDiff;
      else if (r.itemType === "monetary_liability") plFxGain -= r.fxDiff;
    }
    return { assets, liab, income, expense, equity, plFxGain, ociFxGain };
  }, [rows]);

  const handleExport = () => {
    exportToExcel(
      rows.map((r) => ({
        Description: r.description,
        Type: TYPE_LABEL[r.itemType],
        Currency: r.foreignCurrency,
        "Foreign Amount": r.foreignAmount,
        "Rate Applied": r.rate,
        "Rate Basis": r.ref,
        [`Translated (${presentationCcy})`]: r.translated,
        "FX Difference": r.fxDiff,
      })),
      "IAS 21 FX",
      `ias21-fx-${new Date().toISOString().slice(0, 10)}`,
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Globe className="w-7 h-7 text-primary" />
            Foreign Exchange Translation
          </h1>
          <p className="text-muted-foreground">IAS 21 — Functional currency remeasurement and presentation currency translation</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}><Download className="w-4 h-4 mr-1" />Export</Button>
          <Button onClick={() => setItems((x) => [...x, empty()])}><Plus className="w-4 h-4 mr-1" />Add Item</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Currency Configuration</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Functional Currency</Label>
            <Input value={functionalCcy} onChange={(e) => setFunctionalCcy(e.target.value.toUpperCase())} maxLength={3} />
            <p className="text-xs text-muted-foreground mt-1">Primary economic environment (IAS 21.9-14)</p>
          </div>
          <div>
            <Label>Presentation Currency</Label>
            <Input value={presentationCcy} onChange={(e) => setPresentationCcy(e.target.value.toUpperCase())} maxLength={3} />
            <p className="text-xs text-muted-foreground mt-1">Currency in which FS are presented (IAS 21.38)</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Assets ({presentationCcy})</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-emerald-600">{fmt(totals.assets)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Liabilities ({presentationCcy})</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-rose-600">{fmt(totals.liab)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Net P&L Impact</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-primary">{fmt(totals.income - totals.expense)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">FX Gain / (Loss) — P&L</CardTitle></CardHeader><CardContent><div className={`text-2xl font-bold ${totals.plFxGain >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{fmt(totals.plFxGain)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>FX Register</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Ccy</TableHead>
                  <TableHead className="text-right">Foreign Amt</TableHead>
                  <TableHead className="text-right">Hist. Rate</TableHead>
                  <TableHead className="text-right">Avg. Rate</TableHead>
                  <TableHead className="text-right">Closing Rate</TableHead>
                  <TableHead className="text-right">Applied</TableHead>
                  <TableHead className="text-right">Translated</TableHead>
                  <TableHead className="text-right">FX Diff</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground">No items — click Add to begin</TableCell></TableRow>
                )}
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell><Input value={r.description} onChange={(v) => update(r.id, { description: v.target.value })} placeholder="e.g. USD receivable" /></TableCell>
                    <TableCell>
                      <Select value={r.itemType} onValueChange={(v) => update(r.id, { itemType: v as ItemType })}>
                        <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(TYPE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell><Input className="w-16" maxLength={3} value={r.foreignCurrency} onChange={(v) => update(r.id, { foreignCurrency: v.target.value.toUpperCase() })} /></TableCell>
                    <TableCell><Input type="number" className="w-28 text-right" value={r.foreignAmount} onChange={(v) => update(r.id, { foreignAmount: Number(v.target.value) || 0 })} /></TableCell>
                    <TableCell><Input type="number" step="0.0001" className="w-24 text-right" value={r.historicalRate} onChange={(v) => update(r.id, { historicalRate: Number(v.target.value) || 0 })} /></TableCell>
                    <TableCell><Input type="number" step="0.0001" className="w-24 text-right" value={r.averageRate} onChange={(v) => update(r.id, { averageRate: Number(v.target.value) || 0 })} /></TableCell>
                    <TableCell><Input type="number" step="0.0001" className="w-24 text-right" value={r.closingRate} onChange={(v) => update(r.id, { closingRate: Number(v.target.value) || 0 })} /></TableCell>
                    <TableCell className="text-right"><Badge variant="outline">{r.rate.toFixed(4)}</Badge></TableCell>
                    <TableCell className="text-right font-medium">{fmt(r.translated)}</TableCell>
                    <TableCell className={`text-right ${r.fxDiff > 0 ? "text-emerald-600" : r.fxDiff < 0 ? "text-rose-600" : ""}`}>{fmt(r.fxDiff)}</TableCell>
                    <TableCell><Button size="icon" variant="ghost" onClick={() => setItems((xs) => xs.filter((x) => x.id !== r.id))}><Trash2 className="w-4 h-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Rate Selection Rules (IAS 21)</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2">
          <div><strong>Monetary items</strong> — retranslate at closing rate; differences to P&L (IAS 21.23a, .28).</div>
          <div><strong>Non-monetary at historical cost</strong> — keep historical rate; no retranslation (IAS 21.23b).</div>
          <div><strong>Non-monetary at fair value</strong> — translate at rate on FV measurement date (IAS 21.23c).</div>
          <div><strong>Income & expenses</strong> — average rate for the period (IAS 21.39b).</div>
          <div><strong>Equity</strong> — historical rate at contribution.</div>
          <div><strong>Translation of foreign operation</strong> — exchange differences accumulate in OCI / FCTR (IAS 21.39c, .41), recycled to P&L on disposal (IAS 21.48).</div>
        </CardContent>
      </Card>
    </div>
  );
}
