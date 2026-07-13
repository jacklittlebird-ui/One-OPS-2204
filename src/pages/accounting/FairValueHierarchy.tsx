import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Layers3, Plus, Trash2, Download } from "lucide-react";
import { exportToExcel } from "@/lib/exportExcel";

type Level = "1" | "2" | "3";
type Category = "asset" | "liability";
type Basis = "recurring" | "non_recurring";

type Instrument = {
  id: string;
  name: string;
  category: Category;
  basis: Basis;
  level: Level;
  openingFv: number;
  purchases: number;
  sales: number;
  gainsPl: number; // through P&L
  gainsOci: number; // through OCI
  transferIn: number; // transfer into this level
  transferOut: number; // transfer out
  valuationTechnique: string;
  unobservableInputs: string;
};

const uid = () => Math.random().toString(36).slice(2, 10);
const STORAGE_KEY = "fv-hierarchy.instruments.v1";
const fmt = (n: number) => (Number.isFinite(n) ? n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—");

const empty = (): Instrument => ({
  id: uid(),
  name: "",
  category: "asset",
  basis: "recurring",
  level: "1",
  openingFv: 0,
  purchases: 0,
  sales: 0,
  gainsPl: 0,
  gainsOci: 0,
  transferIn: 0,
  transferOut: 0,
  valuationTechnique: "",
  unobservableInputs: "",
});

const closingFv = (i: Instrument) =>
  i.openingFv + i.purchases - i.sales + i.gainsPl + i.gainsOci + i.transferIn - i.transferOut;

const LEVEL_META: Record<Level, { label: string; desc: string; color: string }> = {
  "1": { label: "Level 1", desc: "Quoted prices in active markets", color: "bg-emerald-500" },
  "2": { label: "Level 2", desc: "Observable inputs other than quoted prices", color: "bg-amber-500" },
  "3": { label: "Level 3", desc: "Significant unobservable inputs", color: "bg-rose-500" },
};

export default function FairValueHierarchyPage() {
  const [items, setItems] = useState<Instrument[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const update = (id: string, patch: Partial<Instrument>) =>
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const summary = useMemo(() => {
    const byLevel: Record<Level, { assets: number; liabilities: number }> = {
      "1": { assets: 0, liabilities: 0 },
      "2": { assets: 0, liabilities: 0 },
      "3": { assets: 0, liabilities: 0 },
    };
    for (const i of items) {
      const c = closingFv(i);
      if (i.category === "asset") byLevel[i.level].assets += c;
      else byLevel[i.level].liabilities += c;
    }
    return byLevel;
  }, [items]);

  const level3Movements = useMemo(() => {
    const l3 = items.filter((i) => i.level === "3");
    const opening = l3.reduce((s, i) => s + i.openingFv, 0);
    const purchases = l3.reduce((s, i) => s + i.purchases, 0);
    const sales = l3.reduce((s, i) => s + i.sales, 0);
    const gainsPl = l3.reduce((s, i) => s + i.gainsPl, 0);
    const gainsOci = l3.reduce((s, i) => s + i.gainsOci, 0);
    const transferIn = l3.reduce((s, i) => s + i.transferIn, 0);
    const transferOut = l3.reduce((s, i) => s + i.transferOut, 0);
    const closing = opening + purchases - sales + gainsPl + gainsOci + transferIn - transferOut;
    return { opening, purchases, sales, gainsPl, gainsOci, transferIn, transferOut, closing };
  }, [items]);

  const handleExport = () => {
    exportToExcel(
      items.map((i) => ({
        Instrument: i.name,
        Category: i.category,
        Basis: i.basis,
        Level: i.level,
        Opening: i.openingFv,
        Purchases: i.purchases,
        Sales: i.sales,
        "Gains P&L": i.gainsPl,
        "Gains OCI": i.gainsOci,
        "Transfer In": i.transferIn,
        "Transfer Out": i.transferOut,
        Closing: closingFv(i),
        Technique: i.valuationTechnique,
        "Unobservable Inputs": i.unobservableInputs,
      })),
      "FV Hierarchy",
      `fv-hierarchy-${new Date().toISOString().slice(0, 10)}`,
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Layers3 className="w-7 h-7 text-primary" />
            Fair Value Hierarchy
          </h1>
          <p className="text-muted-foreground">IFRS 13 — Level 1/2/3 classification and Level 3 movement disclosure</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}><Download className="w-4 h-4 mr-1" />Export</Button>
          <Button onClick={() => setItems((x) => [...x, empty()])}><Plus className="w-4 h-4 mr-1" />Add Instrument</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(Object.keys(LEVEL_META) as Level[]).map((lvl) => (
          <Card key={lvl}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <span className={`inline-block w-3 h-3 rounded-full ${LEVEL_META[lvl].color}`} />
                <CardTitle className="text-sm">{LEVEL_META[lvl].label}</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground">{LEVEL_META[lvl].desc}</p>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between text-sm"><span>Assets</span><span className="font-mono font-medium">{fmt(summary[lvl].assets)}</span></div>
              <div className="flex justify-between text-sm"><span>Liabilities</span><span className="font-mono font-medium">{fmt(summary[lvl].liabilities)}</span></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Instruments Measured at Fair Value</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[160px]">Instrument</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Basis</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead className="text-right">Opening</TableHead>
                  <TableHead className="text-right">Purchases</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                  <TableHead className="text-right">P&L Gains</TableHead>
                  <TableHead className="text-right">OCI Gains</TableHead>
                  <TableHead className="text-right">Trf In</TableHead>
                  <TableHead className="text-right">Trf Out</TableHead>
                  <TableHead className="text-right">Closing</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 && (
                  <TableRow><TableCell colSpan={13} className="text-center text-muted-foreground">No instruments — click Add to begin</TableCell></TableRow>
                )}
                {items.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell><Input value={i.name} onChange={(e) => update(i.id, { name: e.target.value })} placeholder="e.g. FVOCI Bond" /></TableCell>
                    <TableCell>
                      <Select value={i.category} onValueChange={(v) => update(i.id, { category: v as Category })}>
                        <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asset">Asset</SelectItem>
                          <SelectItem value="liability">Liability</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={i.basis} onValueChange={(v) => update(i.id, { basis: v as Basis })}>
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="recurring">Recurring</SelectItem>
                          <SelectItem value="non_recurring">Non-recurring</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={i.level} onValueChange={(v) => update(i.id, { level: v as Level })}>
                        <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell><Input type="number" className="w-24" value={i.openingFv} onChange={(e) => update(i.id, { openingFv: Number(e.target.value) || 0 })} /></TableCell>
                    <TableCell><Input type="number" className="w-24" value={i.purchases} onChange={(e) => update(i.id, { purchases: Number(e.target.value) || 0 })} /></TableCell>
                    <TableCell><Input type="number" className="w-24" value={i.sales} onChange={(e) => update(i.id, { sales: Number(e.target.value) || 0 })} /></TableCell>
                    <TableCell><Input type="number" className="w-24" value={i.gainsPl} onChange={(e) => update(i.id, { gainsPl: Number(e.target.value) || 0 })} /></TableCell>
                    <TableCell><Input type="number" className="w-24" value={i.gainsOci} onChange={(e) => update(i.id, { gainsOci: Number(e.target.value) || 0 })} /></TableCell>
                    <TableCell><Input type="number" className="w-24" value={i.transferIn} onChange={(e) => update(i.id, { transferIn: Number(e.target.value) || 0 })} /></TableCell>
                    <TableCell><Input type="number" className="w-24" value={i.transferOut} onChange={(e) => update(i.id, { transferOut: Number(e.target.value) || 0 })} /></TableCell>
                    <TableCell className="text-right font-medium text-primary">{fmt(closingFv(i))}</TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => setItems((xs) => xs.filter((x) => x.id !== i.id))}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Badge className="bg-rose-500">Level 3</Badge>
            Movement Reconciliation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableBody>
              <TableRow><TableCell>Opening balance</TableCell><TableCell className="text-right font-mono">{fmt(level3Movements.opening)}</TableCell></TableRow>
              <TableRow><TableCell>Purchases</TableCell><TableCell className="text-right font-mono">{fmt(level3Movements.purchases)}</TableCell></TableRow>
              <TableRow><TableCell>Sales / settlements</TableCell><TableCell className="text-right font-mono">({fmt(level3Movements.sales)})</TableCell></TableRow>
              <TableRow><TableCell>Gains recognised in P&L</TableCell><TableCell className="text-right font-mono">{fmt(level3Movements.gainsPl)}</TableCell></TableRow>
              <TableRow><TableCell>Gains recognised in OCI</TableCell><TableCell className="text-right font-mono">{fmt(level3Movements.gainsOci)}</TableCell></TableRow>
              <TableRow><TableCell>Transfers into Level 3</TableCell><TableCell className="text-right font-mono">{fmt(level3Movements.transferIn)}</TableCell></TableRow>
              <TableRow><TableCell>Transfers out of Level 3</TableCell><TableCell className="text-right font-mono">({fmt(level3Movements.transferOut)})</TableCell></TableRow>
              <TableRow className="font-bold bg-muted/50"><TableCell>Closing balance</TableCell><TableCell className="text-right font-mono text-primary">{fmt(level3Movements.closing)}</TableCell></TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Level 3 Valuation Techniques & Unobservable Inputs</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {items.filter((i) => i.level === "3").length === 0 && (
            <p className="text-muted-foreground text-sm">No Level 3 instruments.</p>
          )}
          {items.filter((i) => i.level === "3").map((i) => (
            <div key={i.id} className="grid grid-cols-1 md:grid-cols-3 gap-3 border rounded p-3">
              <div><Label>Instrument</Label><div className="font-medium">{i.name || "—"}</div></div>
              <div>
                <Label>Valuation Technique</Label>
                <Input value={i.valuationTechnique} onChange={(e) => update(i.id, { valuationTechnique: e.target.value })} placeholder="e.g. DCF, market multiples" />
              </div>
              <div>
                <Label>Significant Unobservable Inputs</Label>
                <Input value={i.unobservableInputs} onChange={(e) => update(i.id, { unobservableInputs: e.target.value })} placeholder="e.g. WACC 12%, growth 3%" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
