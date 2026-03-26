import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  Search, Plus, Download, Upload, FileText, DollarSign,
  Pencil, Trash2, X, ChevronLeft, ChevronRight, CheckCircle,
  Clock, XCircle, AlertCircle, Printer, ShieldCheck
} from "lucide-react";
import { useLocation } from "react-router-dom";
import * as XLSX from "xlsx";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import InvoicePrintView from "@/components/InvoicePrintView";

type InvoiceStatus = "Draft" | "Sent" | "Paid" | "Overdue" | "Cancelled";
type InvoiceCurrency = "USD" | "EUR" | "EGP";
type InvoiceType = "Preliminary" | "Final";

type InvoiceRow = {
  id: string; invoice_no: string; date: string; due_date: string;
  operator: string; airline_iata: string; flight_ref: string; description: string;
  civil_aviation: number; handling: number; airport_charges: number;
  catering: number; other: number; subtotal: number; vat: number; total: number;
  currency: InvoiceCurrency; status: InvoiceStatus; notes: string;
  invoice_type: InvoiceType; finalized_at: string | null; finalized_by: string | null;
  journal_entry_id: string | null; sent_at: string | null; sent_to: string | null;
  payment_date: string | null; payment_ref: string; billing_period: string;
  credit_note_ref: string; station: string;
};

const statusConfig: Record<InvoiceStatus, { icon: React.ReactNode; cls: string }> = {
  Draft:     { icon: <Clock size={11} />,       cls: "bg-muted text-muted-foreground" },
  Sent:      { icon: <AlertCircle size={11} />, cls: "bg-info/15 text-info" },
  Paid:      { icon: <CheckCircle size={11} />, cls: "bg-success/15 text-success" },
  Overdue:   { icon: <XCircle size={11} />,     cls: "bg-destructive/15 text-destructive" },
  Cancelled: { icon: <X size={11} />,           cls: "bg-warning/15 text-warning" },
};

const StatusBadge = ({ s }: { s: InvoiceStatus }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${statusConfig[s]?.cls || ""}`}>
    {statusConfig[s]?.icon}{s}
  </span>
);

const inputCls = "text-sm border rounded px-2 py-1.5 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground w-full";
const selectCls = "text-sm border rounded px-2 py-1.5 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full";

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</label>{children}</div>;
}

const emptyInvoice = (): Partial<InvoiceRow> => ({
  invoice_no: `LNK-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
  date: new Date().toISOString().slice(0, 10),
  due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  operator: "", airline_iata: "", flight_ref: "", description: "",
  civil_aviation: 0, handling: 0, airport_charges: 0, catering: 0, other: 0,
  subtotal: 0, vat: 0, total: 0, currency: "USD" as InvoiceCurrency, status: "Draft" as InvoiceStatus, notes: "",
  invoice_type: "Preliminary" as InvoiceType,
});

function InvoiceForm({ data, onChange, onSave, onCancel, title }: { data: Partial<InvoiceRow>; onChange: (d: Partial<InvoiceRow>) => void; onSave: () => void; onCancel: () => void; title: string; }) {
  const set = (key: string, val: any) => {
    const updated = { ...data, [key]: val };
    const sub = (Number(updated.civil_aviation) || 0) + (Number(updated.handling) || 0) + (Number(updated.airport_charges) || 0) + (Number(updated.catering) || 0) + (Number(updated.other) || 0);
    const total = sub + (Number(updated.vat) || 0);
    onChange({ ...updated, subtotal: sub, total });
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm">
      <div className="bg-card rounded-xl border shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
          <h2 className="font-bold text-foreground text-lg flex items-center gap-2"><FileText size={18} className="text-primary" />{title}</h2>
          <button onClick={onCancel} className="p-1.5 hover:bg-muted rounded-full text-muted-foreground"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-5">
          <div><h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-3">Invoice Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <FormField label="Invoice No."><input className={inputCls} value={data.invoice_no || ""} onChange={e => set("invoice_no", e.target.value)} /></FormField>
              <FormField label="Date"><input type="date" className={inputCls} value={data.date || ""} onChange={e => set("date", e.target.value)} /></FormField>
              <FormField label="Due Date"><input type="date" className={inputCls} value={data.due_date || ""} onChange={e => set("due_date", e.target.value)} /></FormField>
              <FormField label="Operator"><input className={inputCls} value={data.operator || ""} onChange={e => set("operator", e.target.value)} placeholder="Air Cairo" /></FormField>
              <FormField label="IATA Code"><input className={inputCls} value={data.airline_iata || ""} onChange={e => set("airline_iata", e.target.value)} /></FormField>
              <FormField label="Flight Ref."><input className={inputCls} value={data.flight_ref || ""} onChange={e => set("flight_ref", e.target.value)} /></FormField>
              <div className="col-span-2 md:col-span-3"><FormField label="Description"><input className={inputCls} value={data.description || ""} onChange={e => set("description", e.target.value)} /></FormField></div>
            </div>
          </div>
          <div><h3 className="text-xs font-bold text-info uppercase tracking-wider mb-3">Charges</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <FormField label="Civil Aviation ($)"><input type="number" className={inputCls} value={data.civil_aviation || 0} onChange={e => set("civil_aviation", +e.target.value)} /></FormField>
              <FormField label="Handling ($)"><input type="number" className={inputCls} value={data.handling || 0} onChange={e => set("handling", +e.target.value)} /></FormField>
              <FormField label="Airport Charges ($)"><input type="number" className={inputCls} value={data.airport_charges || 0} onChange={e => set("airport_charges", +e.target.value)} /></FormField>
              <FormField label="Catering ($)"><input type="number" className={inputCls} value={data.catering || 0} onChange={e => set("catering", +e.target.value)} /></FormField>
              <FormField label="Other ($)"><input type="number" className={inputCls} value={data.other || 0} onChange={e => set("other", +e.target.value)} /></FormField>
              <FormField label="VAT ($)"><input type="number" className={inputCls} value={data.vat || 0} onChange={e => set("vat", +e.target.value)} /></FormField>
            </div>
          </div>
          <div className="bg-muted rounded-lg p-4 grid grid-cols-3 gap-4">
            <div className="text-center"><div className="text-xs text-muted-foreground uppercase font-semibold">Subtotal</div><div className="text-lg font-bold text-foreground">${(data.subtotal || 0).toFixed(2)}</div></div>
            <div className="text-center"><div className="text-xs text-muted-foreground uppercase font-semibold">VAT</div><div className="text-lg font-bold text-foreground">${(data.vat || 0).toFixed(2)}</div></div>
            <div className="text-center border-l"><div className="text-xs text-primary uppercase font-bold">Total</div><div className="text-2xl font-bold text-primary">${(data.total || 0).toFixed(2)}</div></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Status"><select className={selectCls} value={data.status || "Draft"} onChange={e => set("status", e.target.value)}>{(["Draft","Sent","Paid","Overdue","Cancelled"] as InvoiceStatus[]).map(s => <option key={s}>{s}</option>)}</select></FormField>
            <FormField label="Currency"><select className={selectCls} value={data.currency || "USD"} onChange={e => set("currency", e.target.value)}>{(["USD","EUR","EGP"] as InvoiceCurrency[]).map(c => <option key={c}>{c}</option>)}</select></FormField>
            <FormField label="Invoice Type"><select className={selectCls} value={data.invoice_type || "Preliminary"} onChange={e => set("invoice_type", e.target.value)}>{(["Preliminary","Final"] as InvoiceType[]).map(t => <option key={t}>{t}</option>)}</select></FormField>
          </div>
          <div>
            <FormField label="Notes"><textarea className={inputCls + " resize-none"} rows={2} value={data.notes || ""} onChange={e => set("notes", e.target.value)} /></FormField>
          </div>
        </div>
        <div className="sticky bottom-0 bg-card border-t px-6 py-4 flex gap-3 justify-end rounded-b-xl">
          <button onClick={onCancel} className="toolbar-btn-outline">Cancel</button>
          <button onClick={onSave} className="toolbar-btn-primary">Save Invoice</button>
        </div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 15;

export default function InvoicesPage() {
  const queryClient = useQueryClient();
  const { data: invoices, isLoading, add, update, remove, bulkInsert } = useSupabaseTable<InvoiceRow>("invoices");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [newInvoice, setNewInvoice] = useState<Partial<InvoiceRow>>(emptyInvoice());
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<InvoiceRow>>({});
  const [printInvoice, setPrintInvoice] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const operator = params.get("operator");
    if (operator) {
      const prefilled: Partial<InvoiceRow> = {
        ...emptyInvoice(), operator,
        airline_iata: params.get("airlineIATA") || "",
        flight_ref: params.get("flightRef") || "",
        description: params.get("description") || "",
        civil_aviation: Number(params.get("civilAviation") || 0),
        handling: Number(params.get("handling") || 0),
        airport_charges: Number(params.get("airportCharges") || 0),
      };
      const sub = (prefilled.civil_aviation || 0) + (prefilled.handling || 0) + (prefilled.airport_charges || 0);
      prefilled.subtotal = sub; prefilled.total = sub;
      setNewInvoice(prefilled); setShowAdd(true);
    }
  }, [location.search]);

  const filtered = useMemo(() => {
    let r = invoices;
    if (statusFilter !== "All") r = r.filter(i => i.status === statusFilter);
    if (search) { const s = search.toLowerCase(); r = r.filter(i => i.invoice_no.toLowerCase().includes(s) || i.operator.toLowerCase().includes(s) || i.flight_ref.toLowerCase().includes(s)); }
    return r;
  }, [invoices, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPaid = invoices.filter(i => i.status === "Paid").reduce((s, i) => s + i.total, 0);
  const totalPending = invoices.filter(i => i.status === "Sent").reduce((s, i) => s + i.total, 0);
  const totalOverdue = invoices.filter(i => i.status === "Overdue").reduce((s, i) => s + i.total, 0);

  const saveNew = async () => {
    if (!newInvoice.operator) return;
    await add(newInvoice as any);
    setShowAdd(false); setNewInvoice(emptyInvoice());
  };
  const startEdit = (inv: InvoiceRow) => { setEditId(inv.id); setEditData({ ...inv }); };
  const saveEdit = async () => {
    if (!editId) return;
    const { id, ...rest } = editData;
    await update({ id: editId, ...rest } as any);
    setEditId(null);
  };

  // Finalize: convert Preliminary → Final and auto-create journal entry
  const handleFinalize = async (inv: InvoiceRow) => {
    if (!confirm(`Finalize invoice ${inv.invoice_no}? This will create a journal entry.`)) return;
    try {
      // 1. Fetch receivable & revenue accounts
      const { data: accounts } = await supabase.from("chart_of_accounts").select("id,code,name").in("code", ["1210", "4100", "4200", "4300", "4400"]);
      const acctMap: Record<string, string> = {};
      (accounts || []).forEach((a: any) => { acctMap[a.code] = a.id; });
      const receivableId = acctMap["1210"];
      if (!receivableId) { toast({ title: "Error", description: "Receivable account (1210) not found in Chart of Accounts", variant: "destructive" }); return; }

      // 2. Create journal entry
      const entryNo = `JE-INV-${inv.invoice_no}`;
      const { data: je, error: jeErr } = await supabase.from("journal_entries").insert({
        entry_no: entryNo, entry_date: inv.date, description: `Invoice ${inv.invoice_no} - ${inv.operator}`,
        reference: inv.invoice_no, reference_type: "Invoice", reference_id: inv.id,
        status: "Posted", total_debit: inv.total, total_credit: inv.total, created_by: "System",
        posted_at: new Date().toISOString(),
      } as any).select().single();
      if (jeErr) throw jeErr;
      const entryId = (je as any).id;

      // 3. Create journal lines - debit receivable, credit revenue accounts
      const lines: any[] = [];
      lines.push({ entry_id: entryId, account_id: receivableId, debit: inv.total, credit: 0, description: `A/R - ${inv.operator}`, sort_order: 0 });
      let sortOrder = 1;
      if (inv.civil_aviation > 0 && acctMap["4200"]) { lines.push({ entry_id: entryId, account_id: acctMap["4200"], debit: 0, credit: inv.civil_aviation, description: "Civil Aviation Revenue", sort_order: sortOrder++ }); }
      if (inv.handling > 0 && acctMap["4100"]) { lines.push({ entry_id: entryId, account_id: acctMap["4100"], debit: 0, credit: inv.handling, description: "Handling Revenue", sort_order: sortOrder++ }); }
      if (inv.airport_charges > 0 && acctMap["4300"]) { lines.push({ entry_id: entryId, account_id: acctMap["4300"], debit: 0, credit: inv.airport_charges, description: "Airport Charges Revenue", sort_order: sortOrder++ }); }
      if (inv.catering > 0 && acctMap["4400"]) { lines.push({ entry_id: entryId, account_id: acctMap["4400"], debit: 0, credit: inv.catering, description: "Catering Revenue", sort_order: sortOrder++ }); }
      // Remaining amount to first revenue account
      const creditTotal = lines.filter(l => l.credit > 0).reduce((s: number, l: any) => s + l.credit, 0);
      const remaining = inv.total - creditTotal;
      if (remaining > 0) {
        const fallbackAcct = acctMap["4100"] || Object.values(acctMap).find(id => id !== receivableId);
        if (fallbackAcct) lines.push({ entry_id: entryId, account_id: fallbackAcct, debit: 0, credit: remaining, description: "Other Revenue", sort_order: sortOrder++ });
      }
      await supabase.from("journal_entry_lines").insert(lines as any);

      // 4. Update invoice to Final
      await supabase.from("invoices").update({
        invoice_type: "Final", finalized_at: new Date().toISOString(), finalized_by: "System",
        journal_entry_id: entryId, status: "Sent",
      } as any).eq("id", inv.id);

      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["journal_entries"] });
      toast({ title: "✅ Invoice Finalized", description: `Journal entry ${entryNo} created and posted.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map(i => ({
      "Invoice No": i.invoice_no, Date: i.date, "Due Date": i.due_date,
      Operator: i.operator, IATA: i.airline_iata, "Flight Ref": i.flight_ref,
      Description: i.description, "Civil Aviation": i.civil_aviation,
      Handling: i.handling, "Airport Charges": i.airport_charges,
      Catering: i.catering, Other: i.other, VAT: i.vat,
      Subtotal: i.subtotal, Total: i.total, Currency: i.currency, Status: i.status, Notes: i.notes,
    })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Invoices"); XLSX.writeFile(wb, "Link_Invoices_Export.xlsx");
  };

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: "binary" });
      const json = XLSX.utils.sheet_to_json<any>(wb.Sheets[wb.SheetNames[0]]);
      const rows = json.map((row: any) => ({
        invoice_no: row["Invoice No"] || "", date: row["Date"] || "", due_date: row["Due Date"] || "",
        operator: row["Operator"] || "", airline_iata: row["IATA"] || "", flight_ref: row["Flight Ref"] || "",
        description: row["Description"] || "", civil_aviation: Number(row["Civil Aviation"] || 0),
        handling: Number(row["Handling"] || 0), airport_charges: Number(row["Airport Charges"] || 0),
        catering: Number(row["Catering"] || 0), other: Number(row["Other"] || 0), vat: Number(row["VAT"] || 0),
        currency: row["Currency"] || "USD", status: row["Status"] || "Draft", notes: row["Notes"] || "",
      }));
      await bulkInsert(rows); setPage(1);
    };
    reader.readAsBinaryString(file); e.target.value = "";
  }, [bulkInsert]);

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  // Convert for print view compatibility
  const toPrintFormat = (inv: InvoiceRow) => ({
    id: inv.id, invoiceNo: inv.invoice_no, date: inv.date, dueDate: inv.due_date,
    operator: inv.operator, airlineIATA: inv.airline_iata, flightRef: inv.flight_ref,
    description: inv.description, civilAviation: inv.civil_aviation, handling: inv.handling,
    airportCharges: inv.airport_charges, catering: inv.catering, other: inv.other,
    subtotal: inv.subtotal, vat: inv.vat, total: inv.total, currency: inv.currency,
    status: inv.status, notes: inv.notes,
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><FileText size={22} className="text-primary" /> Invoices</h1>
        <p className="text-muted-foreground text-sm mt-1">Airline invoicing & financial records</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card"><div className="stat-card-icon bg-primary"><FileText size={20} /></div><div><div className="text-2xl font-bold text-foreground">{invoices.length}</div><div className="text-xs text-muted-foreground">Total Invoices</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-success"><CheckCircle size={20} /></div><div><div className="text-2xl font-bold text-foreground">${totalPaid.toLocaleString()}</div><div className="text-xs text-muted-foreground">Paid</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-info"><Clock size={20} /></div><div><div className="text-2xl font-bold text-foreground">${totalPending.toLocaleString()}</div><div className="text-xs text-muted-foreground">Pending</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-destructive"><AlertCircle size={20} /></div><div><div className="text-2xl font-bold text-foreground">${totalOverdue.toLocaleString()}</div><div className="text-xs text-muted-foreground">Overdue</div></div></div>
      </div>

      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="p-4 border-b flex flex-wrap items-center gap-3">
          <h2 className="text-base font-semibold text-foreground mr-auto">Invoice Records</h2>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Search…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-8 pr-3 py-1.5 text-sm border rounded bg-card text-foreground placeholder:text-muted-foreground w-52 focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground">
            <option>All</option>{(["Draft","Sent","Paid","Overdue","Cancelled"] as InvoiceStatus[]).map(s => <option key={s}>{s}</option>)}
          </select>
          <button onClick={() => { setNewInvoice(emptyInvoice()); setShowAdd(true); }} className="toolbar-btn-primary"><Plus size={14} /> New Invoice</button>
          <button onClick={() => fileInputRef.current?.click()} className="toolbar-btn-success"><Upload size={14} /> Upload</button>
          <button onClick={handleExport} className="toolbar-btn-outline"><Download size={14} /> Export</button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleUpload} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr>{["#","INVOICE NO","DATE","DUE","OPERATOR","FLIGHT REF","TYPE","SUBTOTAL","VAT","TOTAL","CURRENCY","STATUS","ACTIONS"].map(h => (
              <th key={h} className="data-table-header px-3 py-3 text-left whitespace-nowrap">{h}</th>
            ))}</tr></thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr><td colSpan={13} className="text-center py-16"><FileText size={40} className="mx-auto text-muted-foreground/30 mb-3" /><p className="font-semibold text-foreground">No Invoices</p></td></tr>
              ) : pageData.map((inv, i) => (
                <tr key={inv.id} className="data-table-row">
                  <td className="px-3 py-2.5 text-muted-foreground text-xs">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td className="px-3 py-2.5 font-mono text-xs font-semibold text-foreground">{inv.invoice_no}</td>
                  <td className="px-3 py-2.5 text-foreground whitespace-nowrap">{inv.date}</td>
                  <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{inv.due_date}</td>
                  <td className="px-3 py-2.5 font-semibold text-foreground">{inv.operator}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{inv.flight_ref}</td>
                  <td className="px-3 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${inv.invoice_type === "Final" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>
                      {inv.invoice_type || "Preliminary"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-foreground">${(inv.subtotal || 0).toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">${(inv.vat || 0).toLocaleString()}</td>
                  <td className="px-3 py-2.5 font-bold text-success">${(inv.total || 0).toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{inv.currency}</td>
                  <td className="px-3 py-2.5"><StatusBadge s={inv.status} /></td>
                  <td className="px-3 py-2.5 flex gap-1.5">
                    {inv.invoice_type !== "Final" && (
                      <button onClick={() => handleFinalize(inv)} className="text-success hover:text-success/80" title="Finalize"><ShieldCheck size={13} /></button>
                    )}
                    <button onClick={() => setPrintInvoice(toPrintFormat(inv))} className="text-primary hover:text-primary/80"><Printer size={13} /></button>
                    <button onClick={() => startEdit(inv)} className="text-info hover:text-info/80"><Pencil size={13} /></button>
                    <button onClick={() => remove(inv.id)} className="text-destructive hover:text-destructive/80"><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="p-3 border-t flex items-center justify-between text-sm text-muted-foreground">
            <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded border hover:bg-muted disabled:opacity-40"><ChevronLeft size={14} /></button>
              <span className="text-foreground font-medium">Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded border hover:bg-muted disabled:opacity-40"><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>

      {showAdd && <InvoiceForm title="New Invoice" data={newInvoice} onChange={setNewInvoice} onSave={saveNew} onCancel={() => setShowAdd(false)} />}
      {editId && <InvoiceForm title="Edit Invoice" data={editData} onChange={setEditData} onSave={saveEdit} onCancel={() => setEditId(null)} />}
      {printInvoice && <InvoicePrintView invoice={printInvoice} onClose={() => setPrintInvoice(null)} />}
    </div>
  );
}
