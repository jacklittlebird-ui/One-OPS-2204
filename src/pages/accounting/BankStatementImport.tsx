// Phase 3c: Bank Statement Import & Auto-Matching
// -------------------------------------------------------------
// Upload/paste bank statement CSV → parse → save as import batch →
// one-click auto-match against posted payments/receipts by amount+date.

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Upload, Wand2, RefreshCw, FileText, Trash2, Plus } from "lucide-react";
import { format } from "date-fns";

const money = (n: number, c = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: c || "USD" }).format(n || 0);

interface ParsedLine {
  line_date: string;
  description: string;
  reference?: string;
  amount: number;
  running_balance?: number;
}

export default function BankStatementImportPage() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState("import");
  const [bankAccountId, setBankAccountId] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [pasteText, setPasteText] = useState("");
  const [parsed, setParsed] = useState<ParsedLine[]>([]);
  const [selectedImport, setSelectedImport] = useState<string | null>(null);

  // Rule editor state
  const [ruleName, setRuleName] = useState("");
  const [ruleKeyword, setRuleKeyword] = useState("");
  const [ruleParty, setRuleParty] = useState("");
  const [ruleTol, setRuleTol] = useState(0.01);
  const [ruleWindow, setRuleWindow] = useState(5);

  const banks = useQuery({
    queryKey: ["bank-accounts-active"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("id, account_name, bank_name, currency")
        .order("account_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const imports = useQuery({
    queryKey: ["bank-statement-imports"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_statement_imports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const importLines = useQuery({
    queryKey: ["bank-statement-lines", selectedImport],
    enabled: !!selectedImport,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_statement_lines")
        .select("*")
        .eq("import_id", selectedImport!)
        .order("line_date");
      if (error) throw error;
      return data ?? [];
    },
  });

  const rules = useQuery({
    queryKey: ["bank-match-rules"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_match_rules")
        .select("*")
        .order("priority");
      if (error) throw error;
      return data ?? [];
    },
  });

  const parsePaste = () => {
    const lines = pasteText.split(/\r?\n/).filter((l) => l.trim());
    const out: ParsedLine[] = [];
    for (const l of lines) {
      const parts = l.split(/[,\t;]/).map((s) => s.trim());
      if (parts.length < 3) continue;
      const [date, description, amountStr, ref] = parts;
      const amount = Number(amountStr.replace(/[^0-9.\-]/g, ""));
      if (isNaN(amount) || !date) continue;
      out.push({ line_date: date, description, amount, reference: ref });
    }
    if (!out.length) {
      toast.error("Could not parse. Format: YYYY-MM-DD, description, amount [, reference]");
      return;
    }
    setParsed(out);
    toast.success(`Parsed ${out.length} lines`);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    const txt = await f.text();
    setPasteText(txt);
    setTimeout(parsePaste, 0);
  };

  const saveImport = useMutation({
    mutationFn: async () => {
      if (!bankAccountId) throw new Error("Select a bank account");
      if (!parsed.length) throw new Error("Nothing to import — parse lines first");
      const dates = parsed.map((p) => p.line_date).sort();
      const { data: imp, error } = await supabase
        .from("bank_statement_imports")
        .insert({
          bank_account_id: bankAccountId,
          file_name: fileName || "pasted",
          source_format: "csv",
          period_start: dates[0],
          period_end: dates[dates.length - 1],
          line_count: parsed.length,
          status: "pending",
          imported_by: session?.user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      const rows = parsed.map((p) => ({ ...p, import_id: imp.id }));
      const { error: e2 } = await supabase.from("bank_statement_lines").insert(rows);
      if (e2) throw e2;
      return imp;
    },
    onSuccess: (imp: any) => {
      setSelectedImport(imp.id);
      setParsed([]);
      setPasteText("");
      setFileName("");
      qc.invalidateQueries({ queryKey: ["bank-statement-imports"] });
      setTab("history");
      toast.success("Import saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const runAutoMatch = useMutation({
    mutationFn: async (importId: string) => {
      const { data, error } = await supabase.rpc("auto_match_statement_lines", { _import: importId });
      if (error) throw error;
      return data;
    },
    onSuccess: (n: any) => {
      qc.invalidateQueries({ queryKey: ["bank-statement-imports"] });
      qc.invalidateQueries({ queryKey: ["bank-statement-lines", selectedImport] });
      toast.success(`Auto-matched ${n ?? 0} lines`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteImport = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bank_statement_imports").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setSelectedImport(null);
      qc.invalidateQueries({ queryKey: ["bank-statement-imports"] });
      toast.success("Import removed");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addRule = useMutation({
    mutationFn: async () => {
      if (!ruleName.trim()) throw new Error("Rule name required");
      const { error } = await supabase.from("bank_match_rules").insert({
        name: ruleName,
        bank_account_id: bankAccountId || null,
        keyword: ruleKeyword || null,
        party_name: ruleParty || null,
        amount_tolerance: ruleTol,
        date_window_days: ruleWindow,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setRuleName(""); setRuleKeyword(""); setRuleParty("");
      qc.invalidateQueries({ queryKey: ["bank-match-rules"] });
      toast.success("Rule added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleRule = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("bank_match_rules").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bank-match-rules"] }),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bank_match_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bank-match-rules"] });
      toast.success("Rule removed");
    },
  });

  const bank = banks.data?.find((b: any) => b.id === bankAccountId);
  const currency = bank?.currency || "USD";

  const parsedIn = useMemo(() => parsed.filter((p) => p.amount > 0).reduce((s, p) => s + p.amount, 0), [parsed]);
  const parsedOut = useMemo(() => parsed.filter((p) => p.amount < 0).reduce((s, p) => s + p.amount, 0), [parsed]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bank Statement Import & Auto-Match</h1>
        <p className="text-sm text-muted-foreground">
          Upload or paste bank statements. Auto-match lines to posted payments and receipts by amount
          and date, and manage custom match rules.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="import">Import</TabsTrigger>
          <TabsTrigger value="history">Import History</TabsTrigger>
          <TabsTrigger value="rules">Match Rules</TabsTrigger>
        </TabsList>

        {/* IMPORT */}
        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">1. Statement Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Bank Account</Label>
                <Select value={bankAccountId} onValueChange={setBankAccountId}>
                  <SelectTrigger><SelectValue placeholder="Select bank account" /></SelectTrigger>
                  <SelectContent>
                    {(banks.data ?? []).map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.account_name} — {b.bank_name} ({b.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Upload CSV File</Label>
                <Input type="file" accept=".csv,.txt" onChange={handleFile} />
              </div>
              <div>
                <Label>File Name</Label>
                <Input value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="statement-jul-2026.csv" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">2. Paste / Review Lines</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Label>Format: YYYY-MM-DD, description, amount [, reference] (negative for debits)</Label>
              <Textarea
                rows={5}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="2026-07-01, WIRE ACME LTD, -1250.00, INV-001&#10;2026-07-02, INCOMING SWIFT, 4500.00"
              />
              <div className="flex gap-2">
                <Button onClick={parsePaste} variant="outline"><Upload className="h-4 w-4 mr-1" /> Parse</Button>
                <Button onClick={() => { setParsed([]); setPasteText(""); }} variant="ghost">Clear</Button>
                <div className="flex-1" />
                <Button onClick={() => saveImport.mutate()} disabled={!bankAccountId || !parsed.length}>
                  <FileText className="h-4 w-4 mr-1" /> Save Import
                </Button>
              </div>
              {parsed.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {parsed.length} lines · In {money(parsedIn, currency)} · Out {money(parsedOut, currency)} · Net{" "}
                  {money(parsedIn + parsedOut, currency)}
                </p>
              )}
            </CardContent>
          </Card>

          {parsed.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Parsed Preview</CardTitle></CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Ref</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsed.slice(0, 200).map((p, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{p.line_date}</TableCell>
                        <TableCell className="text-xs">{p.description}</TableCell>
                        <TableCell className="text-xs font-mono">{p.reference || "-"}</TableCell>
                        <TableCell className={`text-right ${p.amount < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                          {money(p.amount, currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* HISTORY */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Import Batches ({imports.data?.length ?? 0})</CardTitle>
              <Button variant="outline" size="sm" onClick={() => imports.refetch()}>
                <RefreshCw className="h-3 w-3 mr-1" /> Refresh
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Lines</TableHead>
                    <TableHead className="text-right">Matched</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(imports.data ?? []).map((imp: any) => (
                    <TableRow
                      key={imp.id}
                      className={selectedImport === imp.id ? "bg-muted/50" : "cursor-pointer"}
                      onClick={() => setSelectedImport(imp.id)}
                    >
                      <TableCell className="text-xs">{format(new Date(imp.created_at), "yyyy-MM-dd HH:mm")}</TableCell>
                      <TableCell className="text-xs">{imp.file_name}</TableCell>
                      <TableCell className="text-xs">{imp.period_start} → {imp.period_end}</TableCell>
                      <TableCell className="text-right">{imp.line_count}</TableCell>
                      <TableCell className="text-right">{imp.matched_count}</TableCell>
                      <TableCell><Badge variant={imp.status === "matched" ? "default" : "outline"}>{imp.status}</Badge></TableCell>
                      <TableCell className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); runAutoMatch.mutate(imp.id); }}>
                          <Wand2 className="h-3 w-3 mr-1" /> Auto-Match
                        </Button>
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); if (confirm("Delete this import?")) deleteImport.mutate(imp.id); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!imports.data?.length && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No imports yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {selectedImport && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Lines ({importLines.data?.length ?? 0})</CardTitle></CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Ref</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Match</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(importLines.data ?? []).map((l: any) => (
                      <TableRow key={l.id}>
                        <TableCell className="text-xs">{l.line_date}</TableCell>
                        <TableCell className="text-xs">{l.description}</TableCell>
                        <TableCell className="text-xs font-mono">{l.reference || "-"}</TableCell>
                        <TableCell className={`text-right ${l.amount < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                          {money(Number(l.amount), currency)}
                        </TableCell>
                        <TableCell>
                          {l.matched_payment_id || l.matched_receipt_id ? (
                            <Badge className="bg-emerald-600">
                              {l.matched_payment_id ? "Payment" : "Receipt"} · {Math.round((l.match_confidence ?? 0) * 100)}%
                            </Badge>
                          ) : (
                            <Badge variant="outline">Unmatched</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* RULES */}
        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Add Rule</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <div className="md:col-span-2">
                <Label>Name</Label>
                <Input value={ruleName} onChange={(e) => setRuleName(e.target.value)} />
              </div>
              <div>
                <Label>Keyword</Label>
                <Input value={ruleKeyword} onChange={(e) => setRuleKeyword(e.target.value)} placeholder="SWIFT" />
              </div>
              <div>
                <Label>Party Name</Label>
                <Input value={ruleParty} onChange={(e) => setRuleParty(e.target.value)} />
              </div>
              <div>
                <Label>Tolerance</Label>
                <Input type="number" step="0.01" value={ruleTol} onChange={(e) => setRuleTol(Number(e.target.value))} />
              </div>
              <div>
                <Label>Days ±</Label>
                <Input type="number" value={ruleWindow} onChange={(e) => setRuleWindow(Number(e.target.value))} />
              </div>
              <div className="md:col-span-6">
                <Button onClick={() => addRule.mutate()}><Plus className="h-4 w-4 mr-1" /> Add Rule</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Rules ({rules.data?.length ?? 0})</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Keyword</TableHead>
                    <TableHead>Party</TableHead>
                    <TableHead className="text-right">Tol.</TableHead>
                    <TableHead className="text-right">± Days</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(rules.data ?? []).map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{r.name}</TableCell>
                      <TableCell className="text-xs">{r.keyword || "-"}</TableCell>
                      <TableCell className="text-xs">{r.party_name || "-"}</TableCell>
                      <TableCell className="text-right text-xs">{r.amount_tolerance}</TableCell>
                      <TableCell className="text-right text-xs">{r.date_window_days}</TableCell>
                      <TableCell>
                        <Button size="sm" variant={r.is_active ? "default" : "outline"}
                          onClick={() => toggleRule.mutate({ id: r.id, is_active: !r.is_active })}>
                          {r.is_active ? "Active" : "Off"}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => deleteRule.mutate(r.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!rules.data?.length && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No rules defined.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
