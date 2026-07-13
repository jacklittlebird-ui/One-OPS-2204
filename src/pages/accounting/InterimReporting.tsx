import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CalendarRange, Plus, Trash2, Download, CheckCircle2, XCircle } from "lucide-react";
import { exportToExcel } from "@/lib/exportExcel";

type Period = "Q1" | "Q2" | "Q3" | "H1" | "H2" | "9M" | "FY";

type LineItem = {
  id: string;
  section: "PL" | "BS" | "CF";
  caption: string;
  currentPeriod: number;
  priorPeriodComparative: number;
  ytdCurrent: number;
  ytdPrior: number;
};

const uid = () => Math.random().toString(36).slice(2, 10);
const KEY = "ias34.items.v1";
const CFG = "ias34.cfg.v1";
const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const empty = (section: LineItem["section"] = "PL"): LineItem => ({
  id: uid(), section, caption: "",
  currentPeriod: 0, priorPeriodComparative: 0, ytdCurrent: 0, ytdPrior: 0,
});

const DISCLOSURE_CHECKLIST: { id: string; ref: string; text: string }[] = [
  { id: "d1", ref: "IAS 34.15", text: "Explanation of events and transactions significant to understanding changes" },
  { id: "d2", ref: "IAS 34.15B(a)", text: "Write-downs of inventory to NRV and reversals" },
  { id: "d3", ref: "IAS 34.15B(b)", text: "Recognition/reversal of impairment losses" },
  { id: "d4", ref: "IAS 34.15B(c)", text: "Reversal of provisions for restructuring" },
  { id: "d5", ref: "IAS 34.15B(d)", text: "Acquisitions/disposals of PPE" },
  { id: "d6", ref: "IAS 34.15B(e)", text: "Commitments for purchase of PPE" },
  { id: "d7", ref: "IAS 34.15B(f)", text: "Litigation settlements" },
  { id: "d8", ref: "IAS 34.15B(g)", text: "Corrections of prior-period errors" },
  { id: "d9", ref: "IAS 34.15B(h)", text: "Changes in business/economic circumstances affecting FV of assets/liabilities" },
  { id: "d10", ref: "IAS 34.15B(i)", text: "Loan defaults or breaches not remedied" },
  { id: "d11", ref: "IAS 34.15B(j)", text: "Related-party transactions" },
  { id: "d12", ref: "IAS 34.15B(k)", text: "Transfers between FV hierarchy levels or classification changes" },
  { id: "d13", ref: "IAS 34.15B(l)", text: "Changes in contingent liabilities/assets" },
  { id: "d14", ref: "IAS 34.16A", text: "Accounting policies same as latest annual FS (or describe changes)" },
  { id: "d15", ref: "IAS 34.16A(c)", text: "Seasonality/cyclicality of interim operations" },
  { id: "d16", ref: "IAS 34.16A(g)", text: "Segment revenue and result disclosure" },
  { id: "d17", ref: "IAS 34.16A(i)", text: "Events after the interim reporting period" },
  { id: "d18", ref: "IAS 34.16A(j)", text: "Business combinations, obtaining/losing control of subsidiaries" },
  { id: "d19", ref: "IAS 34.16A(h)", text: "Dividends paid (aggregate or per share)" },
];

export default function InterimReportingPage() {
  const [period, setPeriod] = useState<Period>("Q1");
  const [entity, setEntity] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [notApplicable, setNotApplicable] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const c = localStorage.getItem(CFG);
      if (c) { const p = JSON.parse(c); if (p.period) setPeriod(p.period); if (p.entity) setEntity(p.entity); if (p.checked) setChecked(p.checked); if (p.notApplicable) setNotApplicable(p.notApplicable); }
      const raw = localStorage.getItem(KEY);
      if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) setItems(p); }
    } catch {}
  }, []);
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(items)); }, [items]);
  useEffect(() => { localStorage.setItem(CFG, JSON.stringify({ period, entity, checked, notApplicable })); }, [period, entity, checked, notApplicable]);

  const update = (id: string, patch: Partial<LineItem>) =>
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const totals = useMemo(() => {
    const g = { PL: 0, BS: 0, CF: 0 } as Record<LineItem["section"], number>;
    const gYtd = { PL: 0, BS: 0, CF: 0 } as Record<LineItem["section"], number>;
    for (const i of items) { g[i.section] += i.currentPeriod; gYtd[i.section] += i.ytdCurrent; }
    return { g, gYtd };
  }, [items]);

  const complianceStats = useMemo(() => {
    const total = DISCLOSURE_CHECKLIST.length;
    let done = 0, na = 0;
    for (const d of DISCLOSURE_CHECKLIST) {
      if (notApplicable[d.id]) na += 1;
      else if (checked[d.id]) done += 1;
    }
    const applicable = total - na;
    const pct = applicable === 0 ? 100 : Math.round((done / applicable) * 100);
    return { total, done, na, applicable, pct };
  }, [checked, notApplicable]);

  const handleExport = () => {
    exportToExcel(
      items.map((i) => ({
        Section: i.section,
        Caption: i.caption,
        [`Current ${period}`]: i.currentPeriod,
        [`Prior ${period}`]: i.priorPeriodComparative,
        "YTD Current": i.ytdCurrent,
        "YTD Prior": i.ytdPrior,
        "% Change": i.priorPeriodComparative ? ((i.currentPeriod - i.priorPeriodComparative) / i.priorPeriodComparative) * 100 : null,
      })),
      "IAS 34 Interim",
      `ias34-interim-${period}-${new Date().toISOString().slice(0, 10)}`,
    );
  };

  const grouped = { PL: items.filter((i) => i.section === "PL"), BS: items.filter((i) => i.section === "BS"), CF: items.filter((i) => i.section === "CF") };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CalendarRange className="w-7 h-7 text-primary" />
            Interim Financial Reporting
          </h1>
          <p className="text-muted-foreground">IAS 34 — Condensed interim FS with prior-period comparatives and required disclosures</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}><Download className="w-4 h-4 mr-1" />Export</Button>
          <Button onClick={() => setItems((x) => [...x, empty("PL")])}><Plus className="w-4 h-4 mr-1" />Add Line</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Interim Period</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Entity / Segment</Label>
            <Input value={entity} onChange={(e) => setEntity(e.target.value)} placeholder="e.g. Link Aviation Services SAE" />
          </div>
          <div>
            <Label>Interim Period</Label>
            <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["Q1", "Q2", "Q3", "H1", "H2", "9M", "FY"] as Period[]).map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">P&L Total ({period})</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-primary">{fmt(totals.g.PL)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Balance Sheet Total</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-emerald-600">{fmt(totals.g.BS)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Cash Flow Total</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-amber-600">{fmt(totals.g.CF)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Disclosure Compliance</CardTitle></CardHeader><CardContent><div className={`text-2xl font-bold ${complianceStats.pct >= 80 ? "text-emerald-600" : complianceStats.pct >= 50 ? "text-amber-600" : "text-rose-600"}`}>{complianceStats.pct}%</div><div className="text-xs text-muted-foreground">{complianceStats.done}/{complianceStats.applicable} applicable</div></CardContent></Card>
      </div>

      {(["PL", "BS", "CF"] as const).map((section) => (
        <Card key={section}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{section === "PL" ? "Statement of Profit or Loss" : section === "BS" ? "Statement of Financial Position" : "Statement of Cash Flows"}</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setItems((x) => [...x, empty(section)])}><Plus className="w-3 h-3 mr-1" />Add</Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Caption</TableHead>
                    <TableHead className="text-right">Current {period}</TableHead>
                    <TableHead className="text-right">Prior {period}</TableHead>
                    <TableHead className="text-right">% Change</TableHead>
                    <TableHead className="text-right">YTD Current</TableHead>
                    <TableHead className="text-right">YTD Prior</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grouped[section].length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No lines</TableCell></TableRow>
                  )}
                  {grouped[section].map((i) => {
                    const change = i.priorPeriodComparative ? ((i.currentPeriod - i.priorPeriodComparative) / Math.abs(i.priorPeriodComparative)) * 100 : null;
                    return (
                      <TableRow key={i.id}>
                        <TableCell><Input value={i.caption} onChange={(v) => update(i.id, { caption: v.target.value })} placeholder="Line caption" /></TableCell>
                        <TableCell><Input type="number" className="w-28 text-right" value={i.currentPeriod} onChange={(v) => update(i.id, { currentPeriod: Number(v.target.value) || 0 })} /></TableCell>
                        <TableCell><Input type="number" className="w-28 text-right" value={i.priorPeriodComparative} onChange={(v) => update(i.id, { priorPeriodComparative: Number(v.target.value) || 0 })} /></TableCell>
                        <TableCell className={`text-right text-sm ${change === null ? "" : change >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{change === null ? "—" : `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`}</TableCell>
                        <TableCell><Input type="number" className="w-28 text-right" value={i.ytdCurrent} onChange={(v) => update(i.id, { ytdCurrent: Number(v.target.value) || 0 })} /></TableCell>
                        <TableCell><Input type="number" className="w-28 text-right" value={i.ytdPrior} onChange={(v) => update(i.id, { ytdPrior: Number(v.target.value) || 0 })} /></TableCell>
                        <TableCell><Button size="icon" variant="ghost" onClick={() => setItems((xs) => xs.filter((x) => x.id !== i.id))}><Trash2 className="w-4 h-4" /></Button></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader><CardTitle>Required Disclosures Checklist (IAS 34.15-16A)</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-1">
            {DISCLOSURE_CHECKLIST.map((d) => {
              const isNa = !!notApplicable[d.id];
              const isDone = !!checked[d.id] && !isNa;
              return (
                <div key={d.id} className="flex items-start gap-3 p-2 rounded hover:bg-muted/40">
                  <div className="pt-0.5">
                    {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : isNa ? <XCircle className="w-4 h-4 text-muted-foreground" /> : <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/40" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm"><Badge variant="outline" className="mr-2">{d.ref}</Badge>{d.text}</div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" checked={isDone} disabled={isNa} onChange={(v) => setChecked((c) => ({ ...c, [d.id]: v.target.checked }))} />
                      Done
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" checked={isNa} onChange={(v) => setNotApplicable((c) => ({ ...c, [d.id]: v.target.checked }))} />
                      N/A
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Guidance Notes</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2">
          <div><strong>Same accounting policies</strong> (IAS 34.28) as most recent annual FS; frequency of reporting does not affect measurement of annual results.</div>
          <div><strong>Income taxes</strong> (IAS 34.30) — accrued using tax rate that would apply to full-year expected earnings (effective tax rate approach).</div>
          <div><strong>Seasonal revenues</strong> not anticipated or deferred at interim date unless it would be appropriate at year-end (IAS 34.37).</div>
          <div><strong>Materiality</strong> (IAS 34.23) assessed in relation to the interim period, not annual data.</div>
        </CardContent>
      </Card>
    </div>
  );
}
