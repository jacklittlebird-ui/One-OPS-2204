// Depreciation Scheduler (Phase 2c)
// -------------------------------------------------------------
// Central place to:
//   * Preview the monthly depreciation schedule for every active asset
//     (straight-line: (cost - salvage) / useful_life_months).
//   * Post depreciation for a chosen period across all companies (or one),
//     creating a balanced journal entry + a depreciation_entries row and
//     bumping fixed_assets.accumulated_depreciation.
//   * Review the historical posting log.
//
// Reuses the same JE routing as FixedAssets (depreciation_account_code /
// accumulated_depr_account_code, defaulting to 5500 / 1590).

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { CalendarClock, Play, Download, TrendingDown } from "lucide-react";
import { exportToExcel } from "@/lib/exportExcel";
import { format } from "date-fns";

interface Company { id: string; name: string; }
interface FixedAsset {
  id: string;
  asset_code: string;
  asset_name: string;
  category: string | null;
  company_id: string | null;
  currency: string;
  purchase_cost: number;
  salvage_value: number;
  useful_life_months: number;
  accumulated_depreciation: number;
  depreciation_method: string;
  depreciation_account_code: string | null;
  accumulated_depr_account_code: string | null;
  status: string;
  in_service_date: string | null;
}
interface DepreciationEntry {
  id: string;
  asset_id: string;
  period_year: number;
  period_month: number;
  depreciation_amount: number;
  posted_at: string;
  journal_entry_id: string | null;
  fixed_assets?: { asset_code: string; asset_name: string; company_id: string | null } | null;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const today = new Date();

export default function DepreciationSchedulerPage() {
  const qc = useQueryClient();
  const [runYear, setRunYear] = useState(today.getFullYear());
  const [runMonth, setRunMonth] = useState(today.getMonth() + 1);
  const [companyFilter, setCompanyFilter] = useState<string>("all");

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies" as any)
        .select("id,name")
        .order("name");
      if (error) throw error;
      return (data as any as Company[]) ?? [];
    },
  });

  const { data: assets = [] } = useQuery({
    queryKey: ["fixed_assets", "for-depreciation"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fixed_assets" as any)
        .select("*")
        .order("asset_code");
      if (error) throw error;
      return (data as any as FixedAsset[]) ?? [];
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["depreciation_entries", "history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("depreciation_entries" as any)
        .select("*, fixed_assets:asset_id(asset_code,asset_name,company_id)")
        .order("period_year", { ascending: false })
        .order("period_month", { ascending: false })
        .order("posted_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data as any as DepreciationEntry[]) ?? [];
    },
  });

  const monthly = (a: FixedAsset) => {
    if (!a.useful_life_months || a.useful_life_months <= 0) return 0;
    const base = Math.max(0, (a.purchase_cost || 0) - (a.salvage_value || 0));
    return base / a.useful_life_months;
  };
  const nbv = (a: FixedAsset) => (a.purchase_cost || 0) - (a.accumulated_depreciation || 0);
  const remainingMonths = (a: FixedAsset) => {
    const m = monthly(a);
    if (m <= 0) return 0;
    const rem = Math.max(0, (a.purchase_cost || 0) - (a.salvage_value || 0) - (a.accumulated_depreciation || 0));
    return Math.ceil(rem / m);
  };

  const filteredAssets = useMemo(() => {
    return assets.filter((a) =>
      a.status === "Active" &&
      (companyFilter === "all" || a.company_id === companyFilter),
    );
  }, [assets, companyFilter]);

  const scheduledTotal = useMemo(
    () => filteredAssets.reduce((sum, a) => {
      const m = monthly(a);
      const rem = Math.max(0, (a.purchase_cost || 0) - (a.salvage_value || 0) - (a.accumulated_depreciation || 0));
      return sum + Math.min(m, rem);
    }, 0),
    [filteredAssets],
  );

  const alreadyPosted = useMemo(() => {
    const set = new Set<string>();
    history.forEach((h) => {
      if (h.period_year === runYear && h.period_month === runMonth) set.add(h.asset_id);
    });
    return set;
  }, [history, runYear, runMonth]);

  const pendingCount = filteredAssets.filter((a) => !alreadyPosted.has(a.id) && monthly(a) > 0 && nbv(a) > (a.salvage_value || 0)).length;

  const postRunMut = useMutation({
    mutationFn: async () => {
      const runDate = `${runYear}-${String(runMonth).padStart(2, "0")}-01`;

      const { data: coa } = await supabase.from("chart_of_accounts").select("id,code");
      const codeToId = new Map<string, string>();
      (coa ?? []).forEach((c: any) => codeToId.set(c.code, c.id));

      let posted = 0;
      let skipped = 0;
      for (const a of filteredAssets) {
        const m = monthly(a);
        if (m <= 0) { skipped++; continue; }
        const rem = Math.max(0, (a.purchase_cost || 0) - (a.salvage_value || 0) - (a.accumulated_depreciation || 0));
        if (rem <= 0) { skipped++; continue; }

        const { data: existing } = await supabase
          .from("depreciation_entries" as any)
          .select("id")
          .eq("asset_id", a.id)
          .eq("period_year", runYear)
          .eq("period_month", runMonth)
          .maybeSingle();
        if (existing) { skipped++; continue; }

        const amount = Math.min(m, rem);
        const deprCode = a.depreciation_account_code || "5500";
        const accumCode = a.accumulated_depr_account_code || "1590";
        const deprId = codeToId.get(deprCode);
        const accumId = codeToId.get(accumCode);
        if (!deprId || !accumId) {
          throw new Error(`Chart of Accounts missing code(s): ${!deprId ? deprCode : ""} ${!accumId ? accumCode : ""}`);
        }

        const entryNo = `DEP-${runYear}${String(runMonth).padStart(2, "0")}-${a.asset_code}`;
        const { data: je, error: jeErr } = await supabase
          .from("journal_entries" as any)
          .insert({
            entry_no: entryNo,
            entry_date: runDate,
            description: `Depreciation ${a.asset_name} (${runYear}-${String(runMonth).padStart(2, "0")})`,
            reference: a.asset_code,
            reference_type: "Depreciation",
            status: "Posted",
            total_debit: amount,
            total_credit: amount,
          })
          .select("id")
          .single();
        if (jeErr) throw jeErr;
        const entryId = (je as any).id as string;

        const { error: linesErr } = await supabase.from("journal_entry_lines" as any).insert([
          { entry_id: entryId, account_id: deprId, debit: amount, credit: 0, description: `Depreciation - ${a.asset_name}`, sort_order: 0 },
          { entry_id: entryId, account_id: accumId, debit: 0, credit: amount, description: `Accumulated depreciation - ${a.asset_name}`, sort_order: 1 },
        ]);
        if (linesErr) throw linesErr;

        await supabase.from("depreciation_entries" as any).insert({
          asset_id: a.id,
          period_year: runYear,
          period_month: runMonth,
          depreciation_amount: amount,
          journal_entry_id: entryId,
        });
        await supabase
          .from("fixed_assets" as any)
          .update({ accumulated_depreciation: (a.accumulated_depreciation || 0) + amount })
          .eq("id", a.id);

        posted++;
      }
      return { posted, skipped };
    },
    onSuccess: ({ posted, skipped }) => {
      qc.invalidateQueries({ queryKey: ["fixed_assets", "for-depreciation"] });
      qc.invalidateQueries({ queryKey: ["depreciation_entries", "history"] });
      toast.success(`Posted ${posted} entries · Skipped ${skipped}`);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to post depreciation"),
  });

  const totalPostedYtd = useMemo(() => {
    return history
      .filter((h) => h.period_year === runYear)
      .reduce((sum, h) => sum + Number(h.depreciation_amount || 0), 0);
  }, [history, runYear]);

  const totalNbv = useMemo(
    () => filteredAssets.reduce((s, a) => s + nbv(a), 0),
    [filteredAssets],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Depreciation Scheduler</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Label className="text-xs">Company</Label>
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All companies</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs">Period</Label>
            <Select value={String(runMonth)} onValueChange={(v) => setRunMonth(Number(v))}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(runYear)} onValueChange={(v) => setRunYear(Number(v))}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 8 }, (_, i) => today.getFullYear() - 3 + i).map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => postRunMut.mutate()}
            disabled={postRunMut.isPending || pendingCount === 0}
          >
            <Play className="h-4 w-4 mr-2" />
            {postRunMut.isPending ? "Posting..." : `Post depreciation (${pendingCount})`}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Active assets</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{filteredAssets.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Scheduled this period</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{scheduledTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Posted YTD {runYear}</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{totalPostedYtd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Net book value</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{totalNbv.toLocaleString(undefined, { maximumFractionDigits: 2 })}</CardContent>
        </Card>
      </div>

      <Tabs defaultValue="schedule" className="space-y-3">
        <TabsList>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="history">Posting History</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                Monthly plan · {MONTHS[runMonth - 1]} {runYear}
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportToExcel(
                  filteredAssets.map((a) => ({
                    Code: a.asset_code,
                    Name: a.asset_name,
                    Category: a.category ?? "",
                    Currency: a.currency,
                    Cost: a.purchase_cost,
                    Salvage: a.salvage_value,
                    "Life (months)": a.useful_life_months,
                    "Monthly depr.": Number(monthly(a).toFixed(2)),
                    "Accum. depr.": a.accumulated_depreciation,
                    "Net book value": Number(nbv(a).toFixed(2)),
                    "Remaining months": remainingMonths(a),
                    "Posted this period": alreadyPosted.has(a.id) ? "Yes" : "No",
                  })),
                  "Schedule", `depreciation-schedule-${runYear}-${String(runMonth).padStart(2, "0")}`,
                )}
              >
                <Download className="h-4 w-4 mr-2" /> Export
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Salvage</TableHead>
                    <TableHead className="text-right">Life (mo)</TableHead>
                    <TableHead className="text-right">Monthly</TableHead>
                    <TableHead className="text-right">Accum.</TableHead>
                    <TableHead className="text-right">NBV</TableHead>
                    <TableHead className="text-right">Rem. mo</TableHead>
                    <TableHead>This period</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssets.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center text-muted-foreground">
                        No active assets for this filter.
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredAssets.map((a) => {
                    const done = alreadyPosted.has(a.id);
                    const rem = Math.max(0, (a.purchase_cost || 0) - (a.salvage_value || 0) - (a.accumulated_depreciation || 0));
                    const willPost = Math.min(monthly(a), rem);
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-mono text-xs">{a.asset_code}</TableCell>
                        <TableCell>{a.asset_name}</TableCell>
                        <TableCell className="text-muted-foreground">{a.category ?? "—"}</TableCell>
                        <TableCell className="text-right">{a.purchase_cost.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{a.salvage_value.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{a.useful_life_months}</TableCell>
                        <TableCell className="text-right">
                          {willPost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">{a.accumulated_depreciation.toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right">{nbv(a).toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right">{remainingMonths(a)}</TableCell>
                        <TableCell>
                          {done
                            ? <Badge variant="default">Posted</Badge>
                            : willPost > 0
                              ? <Badge variant="secondary">Pending</Badge>
                              : <Badge variant="outline">—</Badge>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="h-4 w-4" /> Posting history
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportToExcel(
                  history.map((h) => ({
                    Period: `${h.period_year}-${String(h.period_month).padStart(2, "0")}`,
                    "Asset code": h.fixed_assets?.asset_code ?? "",
                    "Asset name": h.fixed_assets?.asset_name ?? "",
                    Amount: h.depreciation_amount,
                    "Posted at": h.posted_at,
                    "Journal entry": h.journal_entry_id ?? "",
                  })),
                  "History", "depreciation-history",
                )}
              >
                <Download className="h-4 w-4 mr-2" /> Export
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Posted</TableHead>
                    <TableHead>Journal Entry</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No depreciation entries posted yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {history.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell>{h.period_year}-{String(h.period_month).padStart(2, "0")}</TableCell>
                      <TableCell>
                        <div className="font-medium">{h.fixed_assets?.asset_name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground font-mono">{h.fixed_assets?.asset_code ?? ""}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(h.depreciation_amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {h.posted_at ? format(new Date(h.posted_at), "dd/MM/yyyy HH:mm") : ""}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{h.journal_entry_id ?? ""}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
