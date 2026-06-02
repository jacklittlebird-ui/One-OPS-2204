import { useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import { Shield, Plane, FileBarChart2, Download, ExternalLink, X } from "lucide-react";
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

function StatsTable({ title, rows, valueCols, onDrill, onExport, chart = true }: {
  title: string;
  rows: StatRow[];
  valueCols: { key: string; label: string; format?: (v: any) => string }[];
  onDrill?: (key: string) => void;
  onExport?: () => void;
  chart?: boolean;
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
          {chart && (
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
          )}
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

  // Filter options derived from both datasets so a single filter bar works for both tabs
  const typeOptions = useMemo(() => {
    const a = uniqSorted(serviceReports, (r: any) => r.handling_type);
    const b = uniqSorted(dispatches, (r: any) => r.clearance_type || r.service_type