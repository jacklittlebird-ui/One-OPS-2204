import { useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import { Shield, Plane, FileBarChart2, Download, ExternalLink } from "lucide-react";
import { getTypeBadgeClass } from "@/lib/typeColors";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

type StatRow = { key: string; count: number; extra?: Record<string, number | string> };

function groupBy<T>(rows: T[], pick: (r: T) => string): Record<string, T[]> {
  const m: Record<string, T[]> = {};
  rows.forEach(r => {
    const k = (pick(r) || "Unspecified").trim() || "Unspecified";
    (m[k] ||= []).push(r);
  });
  return m;
}

function uniqSorted(rows: any[], pick: (r: any) => string): string[] {
  const s = new Set<string>();
  rows.forEach(r => { const v = (pick(r) || "").trim(); if (v) s.add(v); });
  return Array.from(s).sort();
}

function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const esc = (v: any) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.map(esc).join(","), ...rows.map(r => r.map(esc).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function StatsTable({ title, rows, valueCols, onDrill, onExport }: {
  title: string;
  rows: StatRow[];
  valueCols: { key: string; label: string; format?: (v: any) => string }[];
  onDrill?: (key: string) => void;
  onExport?: () => void;
}) {
  const sorted = [...rows].sort((a, b) => b.count - a.count);
  const total = sorted.reduce((s, r) => s + r.count, 0);
  const chartData = sorted.slice(0, 12).map(r => ({ name: r.key, count: r.count }));
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Total: <b className="text-foreground">{total}</b></span>
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport} className="h-7 gap-1">
              <Download size={13} /> CSV
            </Button>
          )}
        </div>
      </div>
      {sorted.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">No data available</div>
      ) : (
        <div className="space-y-4">
          <div className="w-full h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }}
                  cursor={{ fill: "hsl(var(--muted) / 0.5)" }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Item</th>
                  <th className="text-right px-3 py-2 font-medium">Count</th>
                  <th className="text-right px-3 py-2 font-medium">Share</th>
                  {valueCols.map(c => (
                    <th key={c.key} className="text-right px-3 py-2 font-medium">{c.label}</th>
                  ))}
                  {onDrill && <th className="px-3 py-2"></th>}
                </tr>
              </thead>
              <tbody>
                {sorted.map(r => (
                  <tr key={r.key} className="border-t border-border hover:bg-muted/30">
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeClass(r.key)}`}>
                        {r.key}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-foreground">{r.count}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">
                      {total ? `${((r.count / total) * 100).toFixed(1)}%` : "—"}
                    </td>
                    {valueCols.map(c => (
                      <td key={c.key} className="px-3 py-2 text-right text-foreground">
                        {c.format ? c.format(r.extra?.[c.key]) : (r.extra?.[c.key] ?? "—")}
                      </td>
                    ))}
                    {onDrill && (
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => onDrill(r.key)}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          title="View underlying rows"
                        >
                          View <ExternalLink size={11} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function OperationsReportsPage() {
  const navigate = useNavigate();
  const { data: serviceReports = [] } = useSupabaseTable<any>("service_reports", { stationFilter: true });
  const { data: dispatches = [] } = useSupabaseTable<any>("dispatch_assignments", { stationFilter: true });

  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [stationFilter, setStationFilter] = useState<string>("all");
  const [airlineFilter, setAirlineFilter] = useState<string>("all");

  const typeOptions = useMemo(() => {
    const a = uniqSorted(serviceReports, (r: any) => r.handling_type);
    const b = uniqSorted(dispatches, (r: any) => r.clearance_type || r.service_type);
    return Array.from(new Set([...a, ...b])).sort();
  }, [serviceReports, dispatches]);

  const stationOptions = useMemo(() => {
    const a = uniqSorted(serviceReports, (r: any) => r.station);
    const b = uniqSorted(dispatches, (r: any) => r.station);
    return Array.from(new Set([...a, ...b])).sort();
  }, [serviceReports, dispatches]);

  const airlineOptions = useMemo(() => {
    const a = uniqSorted(serviceReports, (r: any) => r.operator);
    const b = uniqSorted(dispatches, (r: any) => r.airline);
    return Array.from(new Set([...a, ...b])).sort();
  }, [serviceReports, dispatches]);

  // Apply filters
  const filteredHandling = useMemo(() => serviceReports.filter((r: any) => {
    if (typeFilter !== "all" && r.handling_type !== typeFilter) return false;
    if (stationFilter !== "all" && r.station !== stationFilter) return false;
    if (airlineFilter !== "all" && r.operator !== airlineFilter) return false;
    return true;
  }), [serviceReports, typeFilter, stationFilter, airlineFilter]);

  const filteredSecurity = useMemo(() => dispatches.filter((r: any) => {
    const t = r.clearance_type || r.service_type;
    if (typeFilter !== "all" && t !== typeFilter) return false;
    if (stationFilter !== "all" && r.station !== stationFilter) return false;
    if (airlineFilter !== "all" && r.airline !== airlineFilter) return false;
    return true;
  }), [dispatches, typeFilter, stationFilter, airlineFilter]);

  // Handling stats
  const handlingByType = useMemo<StatRow[]>(() => {
    const g = groupBy(filteredHandling, (r: any) => r.handling_type);
    return Object.entries(g).map(([key, rows]) => {
      const pax = rows.reduce((s, r: any) =>
        s + Number(r.pax_in_adult_i || 0) + Number(r.pax_in_adult_d || 0) +
        Number(r.pax_in_inf_i || 0) + Number(r.pax_in_inf_d || 0) +
        Number(r.pax_transit || 0), 0);
      return { key, count: rows.length, extra: { pax } };
    });
  }, [filteredHandling]);

  const handlingByStation = useMemo<StatRow[]>(() => {
    const g = groupBy(filteredHandling, (r: any) => r.station);
    return Object.entries(g).map(([key, rows]) => ({ key, count: rows.length }));
  }, [filteredHandling]);

  const handlingByDayNight = useMemo<StatRow[]>(() => {
    const g = groupBy(filteredHandling, (r: any) => r.day_night === "N" ? "Night" : "Day");
    return Object.entries(g).map(([key, rows]) => ({ key, count: rows.length }));
  }, [filteredHandling]);

  const handlingByAirline = useMemo<StatRow[]>(() => {
    const g = groupBy(filteredHandling, (r: any) => r.operator);
    return Object.entries(g).map(([key, rows]) => ({ key, count: rows.length }));
  }, [filteredHandling]);

  // Security stats
  const secByType = useMemo<StatRow[]>(() => {
    const g = groupBy(filteredSecurity, (r: any) => r.clearance_type || r.service_type);
    return Object.entries(g).map(([key, rows]) => ({
      key, count: rows.length,
      extra: { completed: rows.filter((r: any) => (r.status || "").toLowerCase() === "completed").length },
    }));
  }, [filteredSecurity]);

  const secByStatus = useMemo<StatRow[]>(() => {
    const g = groupBy(filteredSecurity, (r: any) => r.status || "Pending");
    return Object.entries(g).map(([key, rows]) => ({ key, count: rows.length }));
  }, [filteredSecurity]);

  const secByStation = useMemo<StatRow[]>(() => {
    const g = groupBy(filteredSecurity, (r: any) => r.station);
    return Object.entries(g).map(([key, rows]) => ({ key, count: rows.length }));
  }, [filteredSecurity]);

  const secByAirline = useMemo<StatRow[]>(() => {
    const g = groupBy(filteredSecurity, (r: any) => r.airline);
    return Object.entries(g).map(([key, rows]) => ({ key, count: rows.length }));
  }, [filteredSecurity]);

  const fmtNum = (v: any) => v ? Number(v).toLocaleString() : "—";

  // Drill-down navigation: opens Service Report page with the relevant tab + a search term
  const drill = (tab: "security" | "handling", search: string) => {
    const params = new URLSearchParams({ tab, search });
    navigate(`/service-report?${params.toString()}`);
  };

  const exportCSV = (
    name: string,
    rows: StatRow[],
    extraCols: { key: string; label: string }[] = [],
  ) => {
    const headers = ["Item", "Count", "Share %", ...extraCols.map(c => c.label)];
    const total = rows.reduce((s, r) => s + r.count, 0);
    const body = [...rows].sort((a, b) => b.count - a.count).map(r => [
      r.key,
      r.count,
      total ? ((r.count / total) * 100).toFixed(1) : "0",
      ...extraCols.map(c => r.extra?.[c.key] ?? ""),
    ]);
    downloadCSV(`${name}.csv`, headers, body);
  };

  const activeFilters = (typeFilter !== "all" ? 1 : 0) + (stationFilter !== "all" ? 1 : 0) + (airlineFilter !== "all" ? 1 : 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <FileBarChart2 className="text-primary" size={22} />
        <div>
          <h1 className="text-xl font-bold text-foreground">Operations Reports</h1>
          <p className="text-sm text-muted-foreground">Statistics for Security and Handling activity, broken down by item.</p>
        </div>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1 min-w-[180px]">
            <label className="text-xs font-medium text-muted-foreground">Type</label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {typeOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1 min-w-[160px]">
            <label className="text-xs font-medium text-muted-foreground">Station</label>
            <Select value={stationFilter} onValueChange={setStationFilter}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stations</SelectItem>
                {stationOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1 min-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground">Airline</label>
            <Select value={airlineFilter} onValueChange={setAirlineFilter}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Airlines</SelectItem>
                {airlineOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {activeFilters > 0 && (
            <Button
              variant="ghost" size="sm" className="h-9"
              onClick={() => { setTypeFilter("all"); setStationFilter("all"); setAirlineFilter("all"); }}
            >
              Clear ({activeFilters})
            </Button>
          )}
        </div>
      </Card>

      <Tabs defaultValue="security" className="w-full">
        <TabsList>
          <TabsTrigger value="security" className="gap-1.5"><Shield size={14} /> Security</TabsTrigger>
          <TabsTrigger value="handling" className="gap-1.5"><Plane size={14} /> Handling</TabsTrigger>
        </TabsList>

        <TabsContent value="security" className="space-y-4 mt-4">
          <StatsTable
            title="Security — By Service Type"
            rows={secByType}
            valueCols={[{ key: "completed", label: "Completed", format: fmtNum }]}
            onDrill={(k) => drill("security", k)}
            onExport={() => exportCSV("security_by_type", secByType, [{ key: "completed", label: "Completed" }])}
          />
          <StatsTable
            title="Security — By Airline"
            rows={secByAirline}
            valueCols={[]}
            onDrill={(k) => drill("security", k)}
            onExport={() => exportCSV("security_by_airline", secByAirline)}
          />
          <div className="grid md:grid-cols-2 gap-4">
            <StatsTable
              title="Security — By Status"
              rows={secByStatus}
              valueCols={[]}
              onExport={() => exportCSV("security_by_status", secByStatus)}
            />
            <StatsTable
              title="Security — By Station"
              rows={secByStation}
              valueCols={[]}
              onDrill={(k) => drill("security", k)}
              onExport={() => exportCSV("security_by_station", secByStation)}
            />
          </div>
        </TabsContent>

        <TabsContent value="handling" className="space-y-4 mt-4">
          <StatsTable
            title="Handling — By Handling Type"
            rows={handlingByType}
            valueCols={[{ key: "pax", label: "PAX", format: fmtNum }]}
            onDrill={(k) => drill("handling", k)}
            onExport={() => exportCSV("handling_by_type", handlingByType, [{ key: "pax", label: "PAX" }])}
          />
          <StatsTable
            title="Handling — By Airline"
            rows={handlingByAirline}
            valueCols={[]}
            onDrill={(k) => drill("handling", k)}
            onExport={() => exportCSV("handling_by_airline", handlingByAirline)}
          />
          <div className="grid md:grid-cols-2 gap-4">
            <StatsTable
              title="Handling — By Station"
              rows={handlingByStation}
              valueCols={[]}
              onDrill={(k) => drill("handling", k)}
              onExport={() => exportCSV("handling_by_station", handlingByStation)}
            />
            <StatsTable
              title="Handling — Day vs Night"
              rows={handlingByDayNight}
              valueCols={[]}
              onExport={() => exportCSV("handling_day_night", handlingByDayNight)}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
