// Phase 2s: Automated Payment Reminders (Dunning)
// - Pending queue: overdue invoices whose next dunning level should be sent
// - History: every reminder sent, with level/tone/status
// - Policies: 4 escalation levels editable inline
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Send, History, Settings2, AlertTriangle, Mail, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type PendingReminder = {
  invoice_id: string;
  invoice_no: string;
  airline_iata: string | null;
  operator: string | null;
  invoice_date: string;
  due_date: string;
  days_overdue: number;
  total: number;
  currency: string;
  next_level: number;
  next_level_name: string | null;
  last_reminder_at: string | null;
  last_reminder_level: number | null;
};

type Reminder = {
  id: string;
  invoice_id: string;
  airline_iata: string | null;
  level: number;
  method: string;
  status: string;
  recipient_email: string | null;
  subject: string | null;
  body: string | null;
  sent_at: string;
  error_message: string | null;
};

type Policy = {
  id: string;
  level: number;
  name: string;
  days_overdue: number;
  tone: string;
  email_subject: string;
  email_body: string;
  is_active: boolean;
};

const fmtDate = (d?: string | null) => (d ? format(new Date(d), "dd/MM/yyyy") : "—");
const fmtDateTime = (d?: string | null) => (d ? format(new Date(d), "dd/MM/yyyy HH:mm") : "—");
const fmtMoney = (n: number, c?: string) =>
  `${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${c ? " " + c : ""}`;

const levelBadge = (level: number): "default" | "secondary" | "destructive" | "outline" => {
  if (level >= 4) return "destructive";
  if (level === 3) return "destructive";
  if (level === 2) return "default";
  return "secondary";
};

const fillTemplate = (tpl: string, vars: Record<string, string>) =>
  Object.entries(vars).reduce((s, [k, v]) => s.split(`{{${k}}}`).join(v), tpl);

export default function PaymentReminders() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const [sendOpen, setSendOpen] = useState(false);
  const [current, setCurrent] = useState<PendingReminder | null>(null);
  const [draft, setDraft] = useState({ recipient: "", subject: "", body: "" });
  const [editPolicy, setEditPolicy] = useState<Policy | null>(null);

  const { data: pending = [], isLoading: pendLoading } = useQuery({
    queryKey: ["dunning-pending"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_pending_reminders");
      if (error) throw error;
      return (data || []) as PendingReminder[];
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["dunning-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_reminders")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as Reminder[];
    },
  });

  const { data: policies = [] } = useQuery({
    queryKey: ["dunning-policies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dunning_policies").select("*").order("level");
      if (error) throw error;
      return (data || []) as Policy[];
    },
  });

  const kpis = useMemo(() => {
    const totalOverdue = pending.reduce((s, p) => s + Number(p.total || 0), 0);
    const byLevel: Record<number, number> = {};
    pending.forEach((p) => { byLevel[p.next_level] = (byLevel[p.next_level] || 0) + 1; });
    return {
      pending: pending.length,
      totalOverdue,
      finalNotice: byLevel[4] || 0,
      sentToday: history.filter((h) =>
        new Date(h.sent_at).toDateString() === new Date().toDateString()).length,
    };
  }, [pending, history]);

  const openSend = (row: PendingReminder) => {
    const policy = policies.find((p) => p.level === row.next_level);
    const vars = {
      invoice_no: row.invoice_no,
      customer_name: row.operator || row.airline_iata || "Customer",
      amount: fmtMoney(row.total),
      currency: row.currency,
      due_date: fmtDate(row.due_date),
      days_overdue: String(row.days_overdue),
    };
    setCurrent(row);
    setDraft({
      recipient: "",
      subject: policy ? fillTemplate(policy.email_subject, vars) : `Payment reminder for invoice ${row.invoice_no}`,
      body: policy ? fillTemplate(policy.email_body, vars) : "",
    });
    setSendOpen(true);
  };

  const sendReminder = useMutation({
    mutationFn: async () => {
      if (!current) throw new Error("No invoice selected");
      const { error } = await supabase.from("payment_reminders").insert({
        invoice_id: current.invoice_id,
        airline_iata: current.airline_iata,
        level: current.next_level,
        method: draft.recipient ? "email" : "manual",
        status: "sent",
        recipient_email: draft.recipient || null,
        subject: draft.subject,
        body: draft.body,
        sent_by: user?.id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reminder logged");
      setSendOpen(false);
      setCurrent(null);
      qc.invalidateQueries({ queryKey: ["dunning-pending"] });
      qc.invalidateQueries({ queryKey: ["dunning-history"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to send reminder"),
  });

  const savePolicy = useMutation({
    mutationFn: async () => {
      if (!editPolicy) return;
      const { error } = await supabase.from("dunning_policies").update({
        name: editPolicy.name,
        days_overdue: editPolicy.days_overdue,
        tone: editPolicy.tone,
        email_subject: editPolicy.email_subject,
        email_body: editPolicy.email_body,
        is_active: editPolicy.is_active,
      }).eq("id", editPolicy.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Policy updated");
      setEditPolicy(null);
      qc.invalidateQueries({ queryKey: ["dunning-policies"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to save policy"),
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Mail className="h-8 w-8" /> Automated Payment Reminders
        </h1>
        <p className="text-muted-foreground mt-1">
          Escalate overdue invoices through four dunning levels, log every reminder, and track dunning history per customer.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Pending Reminders</div><div className="text-2xl font-bold mt-1">{kpis.pending}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Total Overdue</div><div className="text-2xl font-bold mt-1 text-orange-600">{fmtMoney(kpis.totalOverdue)}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Final Notice Due</div><div className="text-2xl font-bold mt-1 text-red-600">{kpis.finalNotice}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Sent Today</div><div className="text-2xl font-bold mt-1 text-green-600">{kpis.sentToday}</div></CardContent></Card>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending"><AlertTriangle className="h-4 w-4 mr-2" />Pending Queue</TabsTrigger>
          <TabsTrigger value="history"><History className="h-4 w-4 mr-2" />History</TabsTrigger>
          <TabsTrigger value="policies"><Settings2 className="h-4 w-4 mr-2" />Policies</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader><CardTitle>Reminders Due to Send</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Days Overdue</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Next Level</TableHead>
                      <TableHead>Last Sent</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendLoading && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>}
                    {!pendLoading && pending.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground"><CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600" />All invoices are up to date.</TableCell></TableRow>}
                    {pending.map((p) => (
                      <TableRow key={p.invoice_id}>
                        <TableCell className="font-mono">{p.invoice_no}</TableCell>
                        <TableCell>{p.operator || p.airline_iata || "—"}</TableCell>
                        <TableCell>{fmtDate(p.due_date)}</TableCell>
                        <TableCell className="text-right font-semibold text-orange-600">{p.days_overdue}</TableCell>
                        <TableCell className="text-right">{fmtMoney(p.total, p.currency)}</TableCell>
                        <TableCell>
                          <Badge variant={levelBadge(p.next_level)}>L{p.next_level} · {p.next_level_name}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {p.last_reminder_at ? `${fmtDateTime(p.last_reminder_at)} (L${p.last_reminder_level})` : "Never"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" onClick={() => openSend(p)}>
                            <Send className="h-4 w-4 mr-1" /> Send
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader><CardTitle>Reminder History</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sent</TableHead>
                      <TableHead>Airline</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Subject</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No reminders sent yet.</TableCell></TableRow>}
                    {history.map((h) => (
                      <TableRow key={h.id}>
                        <TableCell>{fmtDateTime(h.sent_at)}</TableCell>
                        <TableCell>{h.airline_iata || "—"}</TableCell>
                        <TableCell><Badge variant={levelBadge(h.level)}>L{h.level}</Badge></TableCell>
                        <TableCell><Badge variant="outline">{h.method}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={h.status === "sent" ? "default" : h.status === "failed" ? "destructive" : "outline"}>
                            {h.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{h.recipient_email || "—"}</TableCell>
                        <TableCell className="max-w-[280px] truncate">{h.subject || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies">
          <Card>
            <CardHeader><CardTitle>Dunning Escalation Policies</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Level</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Days Overdue</TableHead>
                    <TableHead>Tone</TableHead>
                    <TableHead>Subject Template</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policies.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell><Badge variant={levelBadge(p.level)}>L{p.level}</Badge></TableCell>
                      <TableCell>{p.name}</TableCell>
                      <TableCell className="text-right">≥ {p.days_overdue}</TableCell>
                      <TableCell><Badge variant="outline">{p.tone}</Badge></TableCell>
                      <TableCell className="max-w-[280px] truncate text-xs">{p.email_subject}</TableCell>
                      <TableCell>{p.is_active ? <Badge>Active</Badge> : <Badge variant="outline">Off</Badge>}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => setEditPolicy({ ...p })}>Edit</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground mt-4">
                Available template variables: <code>{"{{invoice_no}}"}</code>, <code>{"{{customer_name}}"}</code>, <code>{"{{amount}}"}</code>, <code>{"{{currency}}"}</code>, <code>{"{{due_date}}"}</code>, <code>{"{{days_overdue}}"}</code>.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Send dialog */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Send Reminder — {current?.invoice_no} · Level {current?.next_level}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Recipient Email (leave empty for manual log)</Label>
              <Input value={draft.recipient} onChange={(e) => setDraft((d) => ({ ...d, recipient: e.target.value }))} placeholder="finance@customer.com" />
            </div>
            <div>
              <Label className="text-xs">Subject</Label>
              <Input value={draft.subject} onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Message</Label>
              <Textarea rows={10} value={draft.body} onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))} />
            </div>
            <p className="text-xs text-muted-foreground">
              Logging the reminder records the escalation and unlocks the next level. Email delivery requires the app email domain to be configured — otherwise this stays as an internal manual log.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendOpen(false)}>Cancel</Button>
            <Button onClick={() => sendReminder.mutate()} disabled={sendReminder.isPending}>
              <Send className="h-4 w-4 mr-2" /> Log Reminder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Policy edit dialog */}
      <Dialog open={!!editPolicy} onOpenChange={(o) => !o && setEditPolicy(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Edit Policy — Level {editPolicy?.level}</DialogTitle></DialogHeader>
          {editPolicy && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input value={editPolicy.name} onChange={(e) => setEditPolicy({ ...editPolicy, name: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Days Overdue Threshold</Label>
                  <Input type="number" value={editPolicy.days_overdue} onChange={(e) => setEditPolicy({ ...editPolicy, days_overdue: Number(e.target.value) })} />
                </div>
                <div>
                  <Label className="text-xs">Tone</Label>
                  <select value={editPolicy.tone} onChange={(e) => setEditPolicy({ ...editPolicy, tone: e.target.value })}
                    className="h-10 border rounded-md px-2 w-full bg-background">
                    <option value="friendly">Friendly</option>
                    <option value="firm">Firm</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={editPolicy.is_active}
                      onChange={(e) => setEditPolicy({ ...editPolicy, is_active: e.target.checked })} />
                    Active
                  </label>
                </div>
              </div>
              <div>
                <Label className="text-xs">Email Subject</Label>
                <Input value={editPolicy.email_subject} onChange={(e) => setEditPolicy({ ...editPolicy, email_subject: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Email Body</Label>
                <Textarea rows={10} value={editPolicy.email_body} onChange={(e) => setEditPolicy({ ...editPolicy, email_body: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPolicy(null)}>Cancel</Button>
            <Button onClick={() => savePolicy.mutate()} disabled={savePolicy.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
