// Phase 3t: Contract Lifecycle & Renewal Automation
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Zap, FileClock } from "lucide-react";
import { toast } from "sonner";
import { formatDateDMY } from "@/lib/utils";

export default function ContractLifecycleAutomation() {
  const qc = useQueryClient();
  const [lastScan, setLastScan] = useState<any[]>([]);

  const eventsQ = useQuery({
    queryKey: ["contract-renewal-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_renewal_events")
        .select("*, contracts(contract_no, airline, end_date, auto_renew)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const scanMut = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase as any).rpc("scan_contract_renewals");
      if (error) throw error;
      return data as any[];
    },
    onSuccess: (rows) => {
      setLastScan(rows ?? []);
      toast.success(`Scan complete: ${rows?.length ?? 0} contract(s) within notice window`);
      qc.invalidateQueries({ queryKey: ["contract-renewal-events"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Scan failed"),
  });

  const autoRenewMut = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase as any).rpc("auto_renew_contracts");
      if (error) throw error;
      return data as number;
    },
    onSuccess: (n) => {
      toast.success(`${n ?? 0} contract(s) auto-renewed`);
      qc.invalidateQueries({ queryKey: ["contract-renewal-events"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Auto-renew failed"),
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Contract Lifecycle Automation</h1>
          <p className="text-sm text-muted-foreground">
            Scan contracts entering their renewal notice window and auto-renew flagged agreements.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => scanMut.mutate()} disabled={scanMut.isPending}>
            <RefreshCw size={16} className="mr-1" />
            {scanMut.isPending ? "Scanning..." : "Scan Expiring"}
          </Button>
          <Button onClick={() => autoRenewMut.mutate()} disabled={autoRenewMut.isPending}>
            <Zap size={16} className="mr-1" />
            {autoRenewMut.isPending ? "Renewing..." : "Run Auto-Renew"}
          </Button>
        </div>
      </div>

      {lastScan.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Latest Scan Results</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contract No.</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Days Remaining</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lastScan.map((r: any) => (
                  <TableRow key={r.contract_id}>
                    <TableCell className="font-medium">{r.contract_no}</TableCell>
                    <TableCell>{formatDateDMY(r.end_date)}</TableCell>
                    <TableCell>
                      <Badge variant={r.days_remaining <= 14 ? "destructive" : "outline"}>
                        {r.days_remaining} days
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileClock size={16} /> Renewal Event History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Contract</TableHead>
                <TableHead>Airline</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Previous End</TableHead>
                <TableHead>New End</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {eventsQ.isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : (eventsQ.data?.length ?? 0) === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No events yet — run a scan to begin.</TableCell></TableRow>
              ) : eventsQ.data!.map((e: any) => (
                <TableRow key={e.id}>
                  <TableCell>{formatDateDMY(e.event_date)}</TableCell>
                  <TableCell className="font-medium">{e.contracts?.contract_no ?? "—"}</TableCell>
                  <TableCell>{e.contracts?.airline ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={e.event_type === "auto_renewed" ? "default" : "outline"}>
                      {e.event_type}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDateDMY(e.previous_end_date)}</TableCell>
                  <TableCell>{formatDateDMY(e.new_end_date)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.notes ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
