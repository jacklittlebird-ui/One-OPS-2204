import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { Play, Plus } from "lucide-react";

type Schedule = {
  id: string;
  name: string;
  frequency: string;
  target_currency: string;
  account_scope: string;
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
};

export default function FxRevaluationSchedulesPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [currency, setCurrency] = useState("EGP");

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["fx_revaluation_schedules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fx_revaluation_schedules")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Schedule[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Name is required");
      const { error } = await supabase.from("fx_revaluation_schedules").insert({
        name: name.trim(),
        frequency,
        target_currency: currency,
        account_scope: "ar_ap_bank",
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Schedule created");
      setName("");
      qc.invalidateQueries({ queryKey: ["fx_revaluation_schedules"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const run = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("run_scheduled_fx_revaluation", {
        _schedule_id: id,
        _as_of: format(new Date(), "yyyy-MM-dd"),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Revaluation run posted");
      qc.invalidateQueries({ queryKey: ["fx_revaluation_schedules"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">FX Revaluation Automation</h1>
        <p className="text-muted-foreground">
          Schedule automatic period-end revaluation of AR, AP and bank balances.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> New schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Month-end EGP reval" />
          </div>
          <div>
            <Label>Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Target currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="EGP">EGP</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
                <SelectItem value="SAR">SAR</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={() => create.mutate()} disabled={create.isPending}>
              Create schedule
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Schedules</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div>Loading…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Last run</TableHead>
                  <TableHead>Next run</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="capitalize">{s.frequency}</TableCell>
                    <TableCell>{s.target_currency}</TableCell>
                    <TableCell>{s.last_run_at ? format(new Date(s.last_run_at), "dd/MM/yyyy HH:mm") : "—"}</TableCell>
                    <TableCell>{s.next_run_at ? format(new Date(s.next_run_at), "dd/MM/yyyy HH:mm") : "—"}</TableCell>
                    <TableCell>
                      <Badge variant={s.is_active ? "default" : "secondary"}>
                        {s.is_active ? "Active" : "Paused"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => run.mutate(s.id)} disabled={run.isPending}>
                        <Play className="h-3 w-3 mr-1" /> Run now
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {schedules.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No schedules yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
