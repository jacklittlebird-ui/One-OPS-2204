// Phase 3p — Automated Dunning Runs
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Bell, Play, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface Policy { id: string; name: string; }
interface Run {
  id: string;
  run_date: string;
  policy_id: string | null;
  status: string;
  invoices_scanned: number;
  reminders_created: number;
  executed_at: string | null;
  created_at: string;
}
interface Item {
  id: string;
  run_id: string;
  customer_name: string | null;
  days_overdue: number | null;
  stage: number | null;
  amount: number | null;
  currency: string | null;
}

export default function DunningRunsPage() {
  const qc = useQueryClient();
  const [policyId, setPolicyId] = useState<string>("");
  const [selectedRun, setSelectedRun] = useState<string | null>(null);

  const { data: policies = [] } = useQuery({
    queryKey: ["dunning_policies_min"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dunning_policies").select("id,name").order("name");
      if (error) throw error;
      return (data ?? []) as Policy[];
    },
  });

  const { data: runs = [] } = useQuery({
    queryKey: ["dunning_runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dunning_runs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Run[];
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ["dunning_run_items", selectedRun],
    queryFn: async () => {
      if (!selectedRun) return [];
      const { data, error } = await supabase
        .from("dunning_run_items")
        .select("*")
        .eq("run_id", selectedRun)
        .order("days_overdue", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Item[];
    },
    enabled: !!selectedRun,
  });

  const execute = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("execute_dunning_run", {
        p_policy_id: policyId || null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["dunning_runs"] });
      setSelectedRun(id);
      toast.success("Dunning run completed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" /> Automated Dunning Runs
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Scan overdue invoices and generate staged reminder batches by policy.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={policyId} onValueChange={setPolicyId}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Optional policy" /></SelectTrigger>
            <SelectContent>
              {policies.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => execute.mutate()} disabled={execute.isPending}>
            <Play className="h-4 w-4 mr-2" />
            {execute.isPending ? "Running..." : "Execute Run"}
          </Button>
          <Button variant="outline" onClick={() => qc.invalidateQueries({ queryKey: ["dunning_runs"] })}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Runs</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Run Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Scanned</TableHead>
                <TableHead className="text-right">Reminders</TableHead>
                <TableHead>Executed</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No runs yet.</TableCell></TableRow>
              ) : runs.map((r) => (
                <TableRow key={r.id} className={selectedRun === r.id ? "bg-muted/50" : ""}>
                  <TableCell>{format(new Date(r.run_date), "dd/MM/yyyy")}</TableCell>
                  <TableCell><Badge variant={r.status === "completed" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
                  <TableCell className="text-right">{r.invoices_scanned}</TableCell>
                  <TableCell className="text-right">{r.reminders_created}</TableCell>
                  <TableCell>{r.executed_at ? format(new Date(r.executed_at), "dd/MM/yyyy HH:mm") : "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => setSelectedRun(r.id)}>View Items</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedRun && (
        <Card>
          <CardHeader><CardTitle>Run Items</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Days Overdue</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Currency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No items.</TableCell></TableRow>
                ) : items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell>{it.customer_name || "—"}</TableCell>
                    <TableCell className="text-right">{it.days_overdue}</TableCell>
                    <TableCell><Badge variant={it.stage === 3 ? "destructive" : "secondary"}>Stage {it.stage}</Badge></TableCell>
                    <TableCell className="text-right">{Number(it.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>{it.currency || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
