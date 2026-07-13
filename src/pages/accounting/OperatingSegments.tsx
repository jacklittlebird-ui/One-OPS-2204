import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Layers, Plus, Trash2, Download, AlertTriangle, CheckCircle2 } from "lucide-react";
import { exportToExcel } from "@/lib/exportExcel";

type Segment = {
  id: string;
  name: string;
  externalRevenue: number;
  intersegmentRevenue: number;
  segmentResult: number;
  segmentAssets: number;
  segmentLiabilities: number;
  depreciation: number;
  interestIncome: number;
  interestExpense: number;
  taxExpense: number;
  capex: number;
  employees: number;
};

const uid = () => Math.random().toString(36).slice(2, 10);
const KEY = "ifrs8.segments.v1";
const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (n: number) => `${n.toFixed(1)}%`;

const empty = (): Segment => ({
  id: uid(), name: "",
  externalRevenue: 0, intersegmentRevenue: 0, segmentResult: 0,
  segmentAssets: 0, segmentLiabilities: 0, depreciation: 0,
  interestIncome: 0, interestExpense: 0, taxExpense: 0, capex: 0, employees: 0,
});

export default function OperatingSegmentsPage() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [totalEntityRevenue, setTotalEntityRevenue] = useState(0);
  const [totalEntityAssets, setTotalEntityAssets] = useState(0);
  const [totalEntityResult, setTotalEntityResult] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (Array.isArray(p?.segments)) setSegments(p.segments);
        if (typeof p?.totalEntityRevenue === "number") setTotalEntityRevenue(p.totalEntityRevenue);
        if (typeof p?.totalEntityAssets === "number") setTotalEntityAssets(p.totalEntityAssets);
        if (typeof p?.totalEntityResult === "number") setTotalEntityResult(p.totalEntityResult);
      }
    } catch {}
  }, []);
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify({ segments, totalEntityRevenue, totalEntityAssets, totalEntityResult }));
  }, [segments, totalEntityRevenue, totalEntityAssets, totalEntityResult]);

  const update = (id: string, patch: Partial<Segment>) =>
    setSegments((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const analysis = useMemo(() => {
    const totalRevenue = segments.reduce((a, s) => a + s.externalRevenue + s.intersegmentRevenue, 0);
    const totalExternal = segments.reduce((a, s) => a + s.externalRevenue, 0);
    const totalAssets = segments.reduce((a, s) => a + s.segmentAssets, 0);
    const absResults = segments.reduce((a, s) => a + Math.abs(s.segmentResult), 0);

    const enriched = segments.map((s) => {
      const totalSegRev = s.externalRevenue + s.intersegmentRevenue;
      const revPct = totalRevenue ? (totalSegRev / totalRevenue) * 100 : 0;
      const resPct = absResults ? (Math.abs(s.segmentResult) / absResults) * 100 : 0;
      const asstPct = totalAssets ? (s.segmentAssets / totalAssets) * 100 : 0;
      // IFRS 8.13 quantitative thresholds — reportable if any >= 10%
      const reportable = revPct >= 10 || resPct >= 10 || asstPct >= 10;
      return { ...s, totalSegRev, revPct, resPct, asstPct, reportable };
    });

    // 75% external revenue rule (IFRS 8.15)
    const reportableExternal = enriched.filter((s) => s.reportable).reduce((a, s) => a + s.externalRevenue, 0);
    const externalCoverage = totalExternal ? (reportableExternal / totalExternal) * 100 : 0;
    const meets75 = externalCoverage >= 75;

    return { enriched, totalRevenue, totalExternal, totalAssets, externalCoverage, meets75, reportableCount: enriched.filter((s) => s.reportable).length };
  }, [segments]);

  // Reconciliation to entity totals (IFRS 8.28)
  const reconciliation = useMemo(() => {
    const segExternal = segments.reduce((a, s) => a + s.externalRevenue, 0);
    const segResult = segments.reduce((a, s) => a + s.segmentResult, 0);
    const segAssets = segments.reduce((a, s) => a + s.segmentAssets, 0);
    return {
      revenueDiff: totalEntityRevenue - segExternal,
      resultDiff: totalEntityResult - segResult,
      assetsDiff: totalEntityAssets - segAssets,
    };
  }, [segments, totalEntityRevenue, totalEntityResult, totalEntityAssets]);

  const handleExport = () => {
    exportToExcel(
      analysis.enriched.map((s) => ({
        Segment: s.name,
        "External Revenue": s.externalRevenue,
        "Intersegment Revenue": s.intersegmentRevenue,
        "Segment Result": s.segmentResult,
        "Segment Assets": s.segmentAssets,
        "Segment Liabilities": s.segmentLiabilities,
        "Revenue %": s.revPct,
        "Result %": s.resPct,
        "Assets %": s.asstPct,
        Reportable: s.reportable ? "Yes" : "No",
        Depreciation: s.depreciation,
        "Interest Income": s.interestIncome,
        "Interest Expense": s.interestExpense,
        "Tax Expense": s.taxExpense,
        CAPEX: s.capex,
        Employees: s.employees,
      })),
      "IFRS 8 Segments",
      `ifrs8-segments-${new Date().toISOString().slice(0, 10)}`,
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Layers className="w-7 h-7 text-primary" />
            Operating Segments
          </h1>
          <p className="text-muted-foreground">IFRS 8 — Segment reporting under the management approach with quantitative thresholds</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}><Download className="w-4 h-4 mr-1" />Export</Button>
          <Button onClick={() => setSegments((x) => [...x, empty()])}><Plus className="w-4 h-4 mr-1" />Add Segment</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Segments</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{segments.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Reportable</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-primary">{analysis.reportableCount}</div><div className="text-xs text-muted-foreground">≥10% threshold</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">External Revenue Coverage</CardTitle></CardHeader><CardContent><div className={`text-2xl font-bold ${analysis.meets75 ? "text-emerald-600" : "text-rose-600"}`}>{pct(analysis.externalCoverage)}</div><div className="text-xs text-muted-foreground">75% rule (IFRS 8.15)</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Revenue</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{fmt(analysis.totalRevenue)}</div></CardContent></Card>
      </div>

      {!analysis.meets75 && segments.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded border border-amber-300 bg-amber-50 dark:bg-amber-950/30 text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
          <div>
            External revenue of reportable segments is <strong>{pct(analysis.externalCoverage)}</strong> — below the 75% threshold.
            Identify additional operating segments as reportable until at least 75% of external revenue is included (IFRS 8.15).
          </div>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Segment Data</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[160px]">Segment</TableHead>
                  <TableHead className="text-right">External Rev.</TableHead>
                  <TableHead className="text-right">Intersegment</TableHead>
                  <TableHead className="text-right">Result</TableHead>
                  <TableHead className="text-right">Assets</TableHead>
                  <TableHead className="text-right">Liabilities</TableHead>
                  <TableHead className="text-right">Rev %</TableHead>
                  <TableHead className="text-right">Res %</TableHead>
                  <TableHead className="text-right">Ast %</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysis.enriched.length === 0 && (
                  <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground">No segments — click Add to begin</TableCell></TableRow>
                )}
                {analysis.enriched.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell><Input value={s.name} onChange={(v) => update(s.id, { name: v.target.value })} placeholder="e.g. Ground Handling" /></TableCell>
                    <TableCell><Input type="number" className="w-28 text-right" value={s.externalRevenue} onChange={(v) => update(s.id, { externalRevenue: Number(v.target.value) || 0 })} /></TableCell>
                    <TableCell><Input type="number" className="w-28 text-right" value={s.intersegmentRevenue} onChange={(v) => update(s.id, { intersegmentRevenue: Number(v.target.value) || 0 })} /></TableCell>
                    <TableCell><Input type="number" className="w-28 text-right" value={s.segmentResult} onChange={(v) => update(s.id, { segmentResult: Number(v.target.value) || 0 })} /></TableCell>
                    <TableCell><Input type="number" className="w-28 text-right" value={s.segmentAssets} onChange={(v) => update(s.id, { segmentAssets: Number(v.target.value) || 0 })} /></TableCell>
                    <TableCell><Input type="number" className="w-28 text-right" value={s.segmentLiabilities} onChange={(v) => update(s.id, { segmentLiabilities: Number(v.target.value) || 0 })} /></TableCell>
                    <TableCell className={`text-right text-sm ${s.revPct >= 10 ? "text-emerald-600 font-medium" : ""}`}>{pct(s.revPct)}</TableCell>
                    <TableCell className={`text-right text-sm ${s.resPct >= 10 ? "text-emerald-600 font-medium" : ""}`}>{pct(s.resPct)}</TableCell>
                    <TableCell className={`text-right text-sm ${s.asstPct >= 10 ? "text-emerald-600 font-medium" : ""}`}>{pct(s.asstPct)}</TableCell>
                    <TableCell>{s.reportable ? <Badge className="bg-emerald-600"><CheckCircle2 className="w-3 h-3 mr-1" />Reportable</Badge> : <Badge variant="secondary">Aggregated</Badge>}</TableCell>
                    <TableCell><Button size="icon" variant="ghost" onClick={() => setSegments((xs) => xs.filter((x) => x.id !== s.id))}><Trash2 className="w-4 h-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Additional Disclosures per Segment (IFRS 8.23)</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Segment</TableHead>
                  <TableHead className="text-right">Depreciation</TableHead>
                  <TableHead className="text-right">Interest Inc.</TableHead>
                  <TableHead className="text-right">Interest Exp.</TableHead>
                  <TableHead className="text-right">Tax Expense</TableHead>
                  <TableHead className="text-right">CAPEX</TableHead>
                  <TableHead className="text-right">Employees</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {segments.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name || "(unnamed)"}</TableCell>
                    <TableCell><Input type="number" className="w-24 text-right" value={s.depreciation} onChange={(v) => update(s.id, { depreciation: Number(v.target.value) || 0 })} /></TableCell>
                    <TableCell><Input type="number" className="w-24 text-right" value={s.interestIncome} onChange={(v) => update(s.id, { interestIncome: Number(v.target.value) || 0 })} /></TableCell>
                    <TableCell><Input type="number" className="w-24 text-right" value={s.interestExpense} onChange={(v) => update(s.id, { interestExpense: Number(v.target.value) || 0 })} /></TableCell>
                    <TableCell><Input type="number" className="w-24 text-right" value={s.taxExpense} onChange={(v) => update(s.id, { taxExpense: Number(v.target.value) || 0 })} /></TableCell>
                    <TableCell><Input type="number" className="w-24 text-right" value={s.capex} onChange={(v) => update(s.id, { capex: Number(v.target.value) || 0 })} /></TableCell>
                    <TableCell><Input type="number" className="w-24 text-right" value={s.employees} onChange={(v) => update(s.id, { employees: Number(v.target.value) || 0 })} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Reconciliation to Entity Totals (IFRS 8.28)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Entity Total Revenue (external)</Label>
              <Input type="number" value={totalEntityRevenue} onChange={(e) => setTotalEntityRevenue(Number(e.target.value) || 0)} />
            </div>
            <div>
              <Label>Entity Total Profit/(Loss)</Label>
              <Input type="number" value={totalEntityResult} onChange={(e) => setTotalEntityResult(Number(e.target.value) || 0)} />
            </div>
            <div>
              <Label>Entity Total Assets</Label>
              <Input type="number" value={totalEntityAssets} onChange={(e) => setTotalEntityAssets(Number(e.target.value) || 0)} />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Segment Total</TableHead>
                <TableHead className="text-right">Entity Total</TableHead>
                <TableHead className="text-right">Reconciling Diff.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>External Revenue</TableCell>
                <TableCell className="text-right">{fmt(analysis.totalExternal)}</TableCell>
                <TableCell className="text-right">{fmt(totalEntityRevenue)}</TableCell>
                <TableCell className="text-right">{fmt(reconciliation.revenueDiff)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Profit / (Loss)</TableCell>
                <TableCell className="text-right">{fmt(segments.reduce((a, s) => a + s.segmentResult, 0))}</TableCell>
                <TableCell className="text-right">{fmt(totalEntityResult)}</TableCell>
                <TableCell className="text-right">{fmt(reconciliation.resultDiff)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Assets</TableCell>
                <TableCell className="text-right">{fmt(analysis.totalAssets)}</TableCell>
                <TableCell className="text-right">{fmt(totalEntityAssets)}</TableCell>
                <TableCell className="text-right">{fmt(reconciliation.assetsDiff)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Guidance Notes</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <div><strong>Management approach</strong> (IFRS 8.5) — segments identified based on internal reporting reviewed by the Chief Operating Decision Maker.</div>
          <div><strong>Aggregation criteria</strong> (IFRS 8.12) — similar economic characteristics, products, processes, customers, distribution, regulatory environment.</div>
          <div><strong>Quantitative thresholds</strong> (IFRS 8.13) — a segment is reportable if any of the three tests (revenue, result, assets) reaches 10%.</div>
          <div><strong>75% coverage</strong> (IFRS 8.15) — if reportable segments' external revenue &lt; 75% of entity total, add more segments even if below 10%.</div>
          <div><strong>Entity-wide disclosures</strong> (IFRS 8.31-34) — products/services, geography, major customers (≥10% revenue).</div>
        </CardContent>
      </Card>
    </div>
  );
}
