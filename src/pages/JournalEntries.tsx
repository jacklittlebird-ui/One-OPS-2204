import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Pencil, Trash2, BookOpen, Check, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type JournalEntry = { id: string; entry_no: string; entry_date: string; description: string; reference: string; reference_type: string; status: string; total_debit: number; total_credit: number; created_by: string; };
type JournalLine = { id: string; entry_id: string; account_id: string; debit: number; credit: number; description: string; sort_order: number; };
type AccountRow = { id: string; code: string; name: string; account_type: string; is_group: boolean; };

const STATUS_COLORS: Record<string, string> = { Draft: "bg-yellow-100 text-yellow-800", Posted: "bg-green-100 text-green-800", Void: "bg-red-100 text-red-800" };

export default function JournalEntriesPage() {
  const queryClient = useQueryClient();
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["journal_entries"],
    queryFn: async () => { const { data, error } = await supabase.from("journal_entries" as any).select("*").order("entry_date", { ascending: false }); if (error) throw error; return (data || []) as unknown as JournalEntry[]; },
  });
  const { data: accounts = [] } = useQuery({
    queryKey: ["chart_of_accounts"],
    queryFn: async () => { const { data } = await supabase.from("chart_of_accounts" as any).select("id,code,name,account_type,is_group").order("code"); return (data || []) as unknown as AccountRow[]; },
  });

  const leafAccounts = accounts.filter(a => !a.is_group);
  const accountMap = Object.fromEntries(accounts.map(a => [a.id, a]));

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<JournalEntry | null>(null);
  const [lines, setLines] = useState<Partial<JournalLine>[]>([{ account_id: "", debit: 0, credit: 0, description: "" }]);
  const [form, setForm] = useState({ entry_no: "", entry_date: new Date().toISOString().slice(0, 10), description: "", reference: "", reference_type: "", status: "Draft", created_by: "" });

  // Load lines for edit
  const loadLines = async (entryId: string) => {
    const { data } = await supabase.from("journal_entry_lines" as any).select("*").eq("entry_id", entryId).order("sort_order");
    setLines((data as unknown as JournalLine[])?.length ? (data as unknown as JournalLine[]) : [{ account_id: "", debit: 0, credit: 0, description: "" }]);
  };

  const filtered = entries.filter(e => {
    const ms = e.entry_no.toLowerCase().includes(search.toLowerCase()) || e.description.toLowerCase().includes(search.toLowerCase());
    const mst = statusFilter === "all" || e.status === statusFilter;
    return ms && mst;
  });

  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const addLine = () => setLines([...lines, { account_id: "", debit: 0, credit: 0, description: "" }]);
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: string, value: any) => {
    const newLines = [...lines];
    (newLines[i] as any)[field] = value;
    setLines(newLines);
  };

  const openAdd = () => {
    setEditEntry(null);
    const nextNo = `JE-${String(entries.length + 1).padStart(4, "0")}`;
    setForm({ entry_no: nextNo, entry_date: new Date().toISOString().slice(0, 10), description: "", reference: "", reference_type: "", status: "Draft", created_by: "" });
    setLines([{ account_id: "", debit: 0, credit: 0, description: "" }, { account_id: "", debit: 0, credit: 0, description: "" }]);
    setDialogOpen(true);
  };

  const openEdit = async (e: JournalEntry) => {
    setEditEntry(e);
    setForm({ entry_no: e.entry_no, entry_date: e.entry_date, description: e.description, reference: e.reference, reference_type: e.reference_type, status: e.status, created_by: e.created_by });
    await loadLines(e.id);
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.entry_no || !isBalanced) throw new Error("Entry must be balanced");
      const validLines = lines.filter(l => l.account_id && ((Number(l.debit) || 0) + (Number(l.credit) || 0) > 0));
      if (validLines.length < 2) throw new Error("At least 2 lines required");

      if (editEntry) {
        await supabase.from("journal_entries" as any).update({ ...form, total_debit: totalDebit, total_credit: totalCredit } as any).eq("id", editEntry.id);
        await supabase.from("journal_entry_lines" as any).delete().eq("entry_id", editEntry.id);
        await supabase.from("journal_entry_lines" as any).insert(validLines.map((l, i) => ({ entry_id: editEntry.id, account_id: l.account_id, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0, description: l.description || "", sort_order: i })) as any);
      } else {
        const { data: entry, error } = await supabase.from("journal_entries" as any).insert({ ...form, total_debit: totalDebit, total_credit: totalCredit } as any).select().single();
        if (error) throw error;
        const entryId = (entry as any).id;
        await supabase.from("journal_entry_lines" as any).insert(validLines.map((l, i) => ({ entry_id: entryId, account_id: l.account_id, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0, description: l.description || "", sort_order: i })) as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal_entries"] });
      toast({ title: "Saved", description: "Journal entry saved." });
      setDialogOpen(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await supabase.from("journal_entries" as any).delete().eq("id", id); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["journal_entries"] }); toast({ title: "Deleted" }); },
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Journal Entries</h1>
          <p className="text-muted-foreground text-sm">القيود اليومية · {entries.length} entries</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button onClick={openAdd}><Plus size={16} className="mr-1" /> New Entry</Button></DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editEntry ? "Edit Journal Entry" : "New Journal Entry"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2">
                <Input placeholder="Entry No" value={form.entry_no} onChange={e => setForm({ ...form, entry_no: e.target.value })} />
                <Input type="date" value={form.entry_date} onChange={e => setForm({ ...form, entry_date: e.target.value })} />
                <Input placeholder="Reference" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} />
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Draft">Draft</SelectItem><SelectItem value="Posted">Posted</SelectItem><SelectItem value="Void">Void</SelectItem></SelectContent>
                </Select>
              </div>
              <Input placeholder="Description / البيان" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />

              {/* Lines */}
              <div className="border rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium text-sm">Entry Lines</h3>
                  <Button size="sm" variant="outline" onClick={addLine}><Plus size={14} className="mr-1" /> Add Line</Button>
                </div>
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-muted-foreground"><th className="pb-1">Account</th><th className="pb-1 w-28">Debit</th><th className="pb-1 w-28">Credit</th><th className="pb-1">Note</th><th className="w-8"></th></tr></thead>
                  <tbody>
                    {lines.map((line, i) => (
                      <tr key={i} className="border-t">
                        <td className="py-1 pr-1">
                          <Select value={line.account_id || ""} onValueChange={v => updateLine(i, "account_id", v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select account" /></SelectTrigger>
                            <SelectContent>{leafAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>)}</SelectContent>
                          </Select>
                        </td>
                        <td className="py-1 pr-1"><Input type="number" className="h-8 text-xs" value={line.debit || ""} onChange={e => updateLine(i, "debit", e.target.value)} /></td>
                        <td className="py-1 pr-1"><Input type="number" className="h-8 text-xs" value={line.credit || ""} onChange={e => updateLine(i, "credit", e.target.value)} /></td>
                        <td className="py-1 pr-1"><Input className="h-8 text-xs" value={line.description || ""} onChange={e => updateLine(i, "description", e.target.value)} /></td>
                        <td><Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeLine(i)}><X size={12} /></Button></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t font-medium">
                      <td className="py-2 text-right pr-2">Total:</td>
                      <td className="py-2 font-mono text-sm">{totalDebit.toLocaleString()}</td>
                      <td className="py-2 font-mono text-sm">{totalCredit.toLocaleString()}</td>
                      <td className="py-2">
                        {isBalanced
                          ? <span className="text-green-600 flex items-center gap-1 text-xs"><Check size={12} /> Balanced</span>
                          : <span className="text-red-600 text-xs">Diff: {Math.abs(totalDebit - totalCredit).toLocaleString()}</span>
                        }
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={!isBalanced || saveMutation.isPending}>
                {saveMutation.isPending ? "Saving…" : editEntry ? "Update Entry" : "Save Entry"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1"><Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} /><Input placeholder="Search entries…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="Draft">Draft</SelectItem><SelectItem value="Posted">Posted</SelectItem><SelectItem value="Void">Void</SelectItem></SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entry No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(e => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium font-mono"><BookOpen size={14} className="inline mr-1.5 text-muted-foreground" />{e.entry_no}</TableCell>
                  <TableCell>{e.entry_date}</TableCell>
                  <TableCell className="max-w-xs truncate">{e.description}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.reference || "—"}</TableCell>
                  <TableCell className="text-right font-mono">{e.total_debit.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono">{e.total_credit.toLocaleString()}</TableCell>
                  <TableCell><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[e.status] || ""}`}>{e.status}</span></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(e)}><Pencil size={14} /></Button>
                      {e.status === "Draft" && <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(e.id)}><Trash2 size={14} /></Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No journal entries</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
