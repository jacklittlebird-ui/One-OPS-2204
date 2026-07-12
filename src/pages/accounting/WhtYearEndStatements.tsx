import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Cert = {
  id: string;
  certificate_no: string | null;
  vendor_name: string;
  vendor_tax_id: string | null;
  issue_date: string;
  period_start: string;
  period_end: string;
  gross_amount: number;
  wht_rate: number;
  wht_amount: number;
  net_amount: number;
  currency: string;
  status: string;
};

export default function WhtYearEndStatementsPage() {
  const qc = useQueryClient();
  const [year, setYear] = useState(new Date().getFullYear());

  const { data: certs = [], isLoading } = useQuery({
    queryKey: ["wht_year_end", year],
    queryFn: async () => {
      const from = `${year}-01-01`;
      const to = `${year}-12-31`;
      const { data, error } = await supabase
        .from("wht_certificates")
        .select("*")
        .gte("issue_date", from)
        .lte("issue_date", to)
        .order("vendor_name");
      if (error) throw error;
      return data as Cert[];
    },
  });

  const byVendor = useMemo(() => {
    const map = new Map<string, { vendor: string; taxId: string | null; gross: number; wht: number; net: number; count: number; ids: string[] }>();
    for (const c of certs) {
      const k = `${c.vendor_name}||${c.vendor_tax_id || ""}`;
      const prev = map.get(k) || { vendor: c.vendor_name, taxId: c.vendor_tax_id, gross: 0, wht: 0, net: 0, count: 0, ids: [] };
      prev.gross += Number(c.gross_amount || 0);
      prev.wht += Number(c.wht_amount || 0);
      prev.net += Number(c.net_amount || 0);
      prev.count += 1;
      prev.ids.push(c.id);
      map.set(k, prev);
    }
    return Array.from(map.values()).sort((a, b) => b.wht - a.wht);
  }, [certs]);

  const totals = useMemo(
    () => byVendor.reduce((a, v) => ({ gross: a.gross + v.gross, wht: a.wht + v.wht, net: a.net + v.net }), { gross: 0, wht: 0, net: 0 }),
    [byVendor]
  );

  const issueAll = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("wht_certificates")
        .update({ status: "issued" })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Certificates issued");
      qc.invalidateQueries({ queryKey: ["wht_year_end"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const exportCsv = () => {
    const rows = [["Vendor", "Tax ID", "Certificates", "Gross", "WHT", "Net"]];
    for (const v of byVendor) rows.push([v.vendor, v.taxId || "", String(v.count), v.gross.toFixed(2), v.wht.toFixed(2), v.net.toFixed(2)]);
    rows.push(["TOTAL", "", "", totals.gross.toFixed(2), totals.wht.toFixed(2), totals.net.toFixed(2)]);
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `WHT_YearEnd_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Vendor WHT Year-End Statements</h1>
          <p className="text-muted-foreground">Annual withholding tax summary per vendor for statutory reporting.</p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <Label>Tax year</Label>
            <Input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value) || year)} className="w-32" />
          </div>
          <Button variant="outline" onClick={exportCsv}>Export CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader><CardTitle className="text-sm">Gross Payments</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{totals.gross.toLocaleString(undefined, { maximumFractionDigits: 2 })}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Withheld Tax</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{totals.wht.toLocaleString(undefined, { maximumFractionDigits: 2 })}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Net Paid</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{totals.net.toLocaleString(undefined, { maximumFractionDigits: 2 })}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Vendors — {year}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div>Loading…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Tax ID</TableHead>
                  <TableHead className="text-right">Certificates</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">WHT</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byVendor.map((v) => (
                  <TableRow key={v.vendor + (v.taxId || "")}>
                    <TableCell className="font-medium">{v.vendor}</TableCell>
                    <TableCell>{v.taxId || <Badge variant="secondary">missing</Badge>}</TableCell>
                    <TableCell className="text-right">{v.count}</TableCell>
                    <TableCell className="text-right">{v.gross.toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right font-semibold">{v.wht.toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right">{v.net.toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => issueAll.mutate(v.ids)}>Mark issued</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {byVendor.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No withholding activity for {year}.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
