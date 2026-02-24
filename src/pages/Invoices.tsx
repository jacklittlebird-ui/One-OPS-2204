import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  Search, Plus, Download, Upload, FileText, DollarSign,
  Pencil, Trash2, X, ChevronLeft, ChevronRight, CheckCircle,
  Clock, XCircle, AlertCircle, Eye, Printer
} from "lucide-react";
import { useLocation } from "react-router-dom";
import * as XLSX from "xlsx";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import InvoicePrintView from "@/components/InvoicePrintView";

export type InvoiceStatus = "Draft" | "Sent" | "Paid" | "Overdue" | "Cancelled";
export type InvoiceCurrency = "USD" | "EUR" | "EGP";

export interface Invoice {
  id: string;
  invoiceNo: string;
  date: string;
  dueDate: string;
  operator: string;
  airlineIATA: string;
  flightRef: string;
  description: string;
  civilAviation: number;
  handling: number;
  airportCharges: number;
  catering: number;
  other: number;
  subtotal: number;
  vat: number;
  total: number;
  currency: InvoiceCurrency;
  status: InvoiceStatus;
  notes: string;
}

const sampleInvoices: Invoice[] = [
  {
    id: "INV001", invoiceNo: "LNK-2024-0001", date: "2024-01-11", dueDate: "2024-02-10",
    operator: "Air Cairo", airlineIATA: "SM", flightRef: "SM123/124",
    description: "Ground Handling – Turn Around (AMS/CAI/AMS)",
    civilAviation: 190.14, handling: 850, airportCharges: 710.33, catering: 0, other: 0,
    subtotal: 1750.47, vat: 0, total: 1750.47, currency: "USD", status: "Paid", notes: ""
  },
  {
    id: "INV002", invoiceNo: "LNK-2024-0002", date: "2024-01-11", dueDate: "2024-02-10",
    operator: "EgyptAir", airlineIATA: "MS", flightRef: "MS456/457",
    description: "Ground Handling – Transit (LHR/HRG/CAI)",
    civilAviation: 165.09, handling: 620, airportCharges: 580.45, catering: 0, other: 0,
    subtotal: 1365.54, vat: 0, total: 1365.54, currency: "USD", status: "Sent", notes: ""
  },
  {
    id: "INV003", invoiceNo: "LNK-2024-0003", date: "2024-01-12", dueDate: "2024-02-11",
    operator: "Air France", airlineIATA: "AF", flightRef: "AF200/201",
    description: "Full Handling + VIP – Turn Around (CDG/CAI/CDG)",
    civilAviation: 1240.50, handling: 1800, airportCharges: 2250.80, catering: 350, other: 0,
    subtotal: 5641.30, vat: 0, total: 5641.30, currency: "USD", status: "Overdue", notes: "Follow up required"
  },
  {
    id: "INV004", invoiceNo: "LNK-2024-0004", date: "2024-01-13", dueDate: "2024-02-12",
    operator: "Lufthansa", airlineIATA: "LH", flightRef: "LH301",
    description: "Technical Stop – Luxor",
    civilAviation: 0, handling: 320, airportCharges: 660.20, catering: 0, other: 0,
    subtotal: 980.20, vat: 0, total: 980.20, currency: "USD", status: "Draft", notes: ""
  },
  {
    id: "INV005", invoiceNo: "LNK-2024-0005", date: "2024-01-14", dueDate: "2024-02-13",
    operator: "Nile Air", airlineIATA: "XY", flightRef: "XY789",
    description: "Ramp Handling – Night Stop (DXB/SSH)",
    civilAviation: 195.71, handling: 480, airportCharges: 635.12, catering: 0, other: 50,
    subtotal: 1360.83, vat: 0, total: 1360.83, currency: "USD", status: "Cancelled", notes: "Flight cancelled"
  },
];

const statusConfig: Record<InvoiceStatus, { icon: React.ReactNode; cls: string }> = {
  Draft:     { icon: <Clock size={11} />,       cls: "bg-muted text-muted-foreground" },
  Sent:      { icon: <AlertCircle size={11} />, cls: "bg-info/15 text-info" },
  Paid:      { icon: <CheckCircle size={11} />, cls: "bg-success/15 text-success" },
  Overdue:   { icon: <XCircle size={11} />,     cls: "bg-destructive/15 text-destructive" },
  Cancelled: { icon: <X size={11} />,           cls: "bg-warning/15 text-warning" },
};

const StatusBadge = ({ s }: { s: InvoiceStatus }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${statusConfig[s].cls}`}>
    {statusConfig[s].icon}{s}
  </span>
);

const inputCls = "text-sm border rounded px-2 py-1.5 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground w-full";
const selectCls = "text-sm border rounded px-2 py-1.5 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full";

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

const emptyInvoice = (): Partial<Invoice> => ({
  invoiceNo: `LNK-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
  date: new Date().toISOString().slice(0, 10),
  dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  operator: "", airlineIATA: "", flightRef: "", description: "",
  civilAviation: 0, handling: 0, airportCharges: 0, catering: 0, other: 0,
  subtotal: 0, vat: 0, total: 0, currency: "USD", status: "Draft", notes: "",
});

interface InvoiceFormProps {
  data: Partial<Invoice>;
  onChange: (d: Partial<Invoice>) => void;
  onSave: () => void;
  onCancel: () => void;
  title: string;
}

function InvoiceForm({ data, onChange, onSave, onCancel, title }: InvoiceFormProps) {
  const set = (key: keyof Invoice, val: any) => {
    const updated = { ...data, [key]: val };
    // Auto-calc subtotal & total
    const sub = (Number(updated.civilAviation) || 0) + (Number(updated.handling) || 0)
      + (Number(updated.airportCharges) || 0) + (Number(updated.catering) || 0) + (Number(updated.other) || 0);
    const total = sub + (Number(updated.vat) || 0);
    onChange({ ...updated, subtotal: sub, total });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm">
      <div className="bg-card rounded-xl border shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
          <h2 className="font-bold text-foreground text-lg flex items-center gap-2">
            <FileText size={18} className="text-primary" />{title}
          </h2>
          <button onClick={onCancel} className="p-1.5 hover:bg-muted rounded-full text-muted-foreground"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-5">
          {/* Invoice Meta */}
          <div>
            <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-3">Invoice Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <FormField label="Invoice No."><input className={inputCls} value={data.invoiceNo || ""} onChange={e => set("invoiceNo", e.target.value)} /></FormField>
              <FormField label="Date"><input type="date" className={inputCls} value={data.date || ""} onChange={e => set("date", e.target.value)} /></FormField>
              <FormField label="Due Date"><input type="date" className={inputCls} value={data.dueDate || ""} onChange={e => set("dueDate", e.target.value)} /></FormField>
              <FormField label="Operator / Airline"><input className={inputCls} value={data.operator || ""} onChange={e => set("operator", e.target.value)} placeholder="Air Cairo" /></FormField>
              <FormField label="IATA Code"><input className={inputCls} value={data.airlineIATA || ""} onChange={e => set("airlineIATA", e.target.value)} placeholder="SM" /></FormField>
              <FormField label="Flight Ref."><input className={inputCls} value={data.flightRef || ""} onChange={e => set("flightRef", e.target.value)} placeholder="SM123/124" /></FormField>
              <div className="col-span-2 md:col-span-3">
                <FormField label="Description"><input className={inputCls} value={data.description || ""} onChange={e => set("description", e.target.value)} placeholder="Ground Handling – Turn Around…" /></FormField>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <h3 className="text-xs font-bold text-info uppercase tracking-wider mb-3">Charges Breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <FormField label="Civil Aviation ($)"><input type="number" className={inputCls} value={data.civilAviation || 0} onChange={e => set("civilAviation", +e.target.value)} /></FormField>
              <FormField label="Handling Fee ($)"><input type="number" className={inputCls} value={data.handling || 0} onChange={e => set("handling", +e.target.value)} /></FormField>
              <FormField label="Airport Charges ($)"><input type="number" className={inputCls} value={data.airportCharges || 0} onChange={e => set("airportCharges", +e.target.value)} /></FormField>
              <FormField label="Catering ($)"><input type="number" className={inputCls} value={data.catering || 0} onChange={e => set("catering", +e.target.value)} /></FormField>
              <FormField label="Other ($)"><input type="number" className={inputCls} value={data.other || 0} onChange={e => set("other", +e.target.value)} /></FormField>
              <FormField label="VAT ($)"><input type="number" className={inputCls} value={data.vat || 0} onChange={e => set("vat", +e.target.value)} /></FormField>
            </div>
          </div>

          {/* Totals */}
          <div className="bg-muted rounded-lg p-4 grid grid-cols-3 gap-4">
            <div className="text-center"><div className="text-xs text-muted-foreground uppercase font-semibold">Subtotal</div><div className="text-lg font-bold text-foreground">${(data.subtotal || 0).toFixed(2)}</div></div>
            <div className="text-center"><div className="text-xs text-muted-foreground uppercase font-semibold">VAT</div><div className="text-lg font-bold text-foreground">${(data.vat || 0).toFixed(2)}</div></div>
            <div className="text-center border-l"><div className="text-xs text-primary uppercase font-bold">Total</div><div className="text-2xl font-bold text-primary">${(data.total || 0).toFixed(2)}</div></div>
          </div>

          {/* Status & Notes */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Status">
              <select className={selectCls} value={data.status || "Draft"} onChange={e => set("status", e.target.value as InvoiceStatus)}>
                {(["Draft","Sent","Paid","Overdue","Cancelled"] as InvoiceStatus[]).map(s => <option key={s}>{s}</option>)}
              </select>
            </FormField>
            <FormField label="Currency">
              <select className={selectCls} value={data.currency || "USD"} onChange={e => set("currency", e.target.value as InvoiceCurrency)}>
                {(["USD","EUR","EGP"] as InvoiceCurrency[]).map(c => <option key={c}>{c}</option>)}
              </select>
            </FormField>
            <div className="col-span-2">
              <FormField label="Notes"><textarea className={inputCls + " resize-none"} rows={2} value={data.notes || ""} onChange={e => set("notes", e.target.value)} placeholder="Internal notes…" /></FormField>
            </div>
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
  const location = useLocation();
  const [invoices, setInvoices] = useLocalStorage<Invoice[]>("link_invoices", sampleInvoices);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [newInvoice, setNewInvoice] = useState<Partial<Invoice>>(emptyInvoice());
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Invoice>>({});
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-fill from Service Report query params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const operator = params.get("operator");
    if (operator) {
      const prefilled: Partial<Invoice> = {
        ...emptyInvoice(),
        operator,
        airlineIATA: params.get("airlineIATA") || "",
        flightRef: params.get("flightRef") || "",
        description: params.get("description") || "",
        civilAviation: Number(params.get("civilAviation") || 0),
        handling: Number(params.get("handling") || 0),
        airportCharges: Number(params.get("airportCharges") || 0),
      };
      const sub = (prefilled.civilAviation || 0) + (prefilled.handling || 0) + (prefilled.airportCharges || 0);
      prefilled.subtotal = sub;
      prefilled.total = sub;
      setNewInvoice(prefilled);
      setShowAdd(true);
    }
  }, [location.search]);

  const filtered = useMemo(() => {
    let r = invoices;
    if (statusFilter !== "All") r = r.filter(i => i.status === statusFilter);
    if (search) {
      const s = search.toLowerCase();
      r = r.filter(i => i.invoiceNo.toLowerCase().includes(s) || i.operator.toLowerCase().includes(s) || i.flightRef.toLowerCase().includes(s));
    }
    return r;
  }, [invoices, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalPaid = invoices.filter(i => i.status === "Paid").reduce((s, i) => s + i.total, 0);
  const totalPending = invoices.filter(i => i.status === "Sent").reduce((s, i) => s + i.total, 0);
  const totalOverdue = invoices.filter(i => i.status === "Overdue").reduce((s, i) => s + i.total, 0);

  const saveNew = () => {
    if (!newInvoice.operator) return;
    setInvoices(prev => [...prev, { ...newInvoice, id: `INV${String(Date.now()).slice(-5)}` } as Invoice]);
    setShowAdd(false);
    setNewInvoice(emptyInvoice());
  };

  const startEdit = (inv: Invoice) => { setEditId(inv.id); setEditData({ ...inv }); };
  const saveEdit = () => {
    if (!editId) return;
    setInvoices(prev => prev.map(i => i.id === editId ? { ...i, ...editData } as Invoice : i));
    setEditId(null);
  };
  const deleteInvoice = (id: string) => setInvoices(prev => prev.filter(i => i.id !== id));

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map(i => ({
      "Invoice No": i.invoiceNo, "Date": i.date, "Due Date": i.dueDate,
      "Operator": i.operator, "IATA": i.airlineIATA, "Flight Ref": i.flightRef,
      "Description": i.description, "Civil Aviation": i.civilAviation,
      "Handling": i.handling, "Airport Charges": i.airportCharges,
      "Catering": i.catering, "Other": i.other, "VAT": i.vat,
      "Subtotal": i.subtotal, "Total": i.total, "Currency": i.currency, "Status": i.status, "Notes": i.notes,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invoices");
    XLSX.writeFile(wb, "Link_Invoices_Export.xlsx");
  };

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: "binary" });
      const json = XLSX.utils.sheet_to_json<any>(wb.Sheets[wb.SheetNames[0]]);
      const imported: Invoice[] = json.map((row: any, i: number) => {
        const sub = (Number(row["Civil Aviation"]) || 0) + (Number(row["Handling"]) || 0) + (Number(row["Airport Charges"]) || 0) + (Number(row["Catering"]) || 0) + (Number(row["Other"]) || 0);
        const total = sub + (Number(row["VAT"]) || 0);
        return {
          id: `INV${Date.now()}${i}`, invoiceNo: row["Invoice No"] || "",
          date: row["Date"] || "", dueDate: row["Due Date"] || "",
          operator: row["Operator"] || "", airlineIATA: row["IATA"] || "",
          flightRef: row["Flight Ref"] || "", description: row["Description"] || "",
          civilAviation: Number(row["Civil Aviation"] || 0), handling: Number(row["Handling"] || 0),
          airportCharges: Number(row["Airport Charges"] || 0), catering: Number(row["Catering"] || 0),
          other: Number(row["Other"] || 0), subtotal: sub, vat: Number(row["VAT"] || 0), total,
          currency: row["Currency"] || "USD", status: row["Status"] || "Draft", notes: row["Notes"] || "",
        };
      });
      setInvoices(imported); setPage(1);
    };
    reader.readAsBinaryString(file); e.target.value = "";
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><FileText size={22} className="text-primary" /> Invoices</h1>
        <p className="text-muted-foreground text-sm mt-1">Airline invoicing & financial records · Linked from Service Reports</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-card-icon bg-primary"><FileText size={20} /></div>
          <div><div className="text-2xl font-bold text-foreground">{invoices.length}</div><div className="text-xs text-muted-foreground">Total Invoices</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon bg-success"><CheckCircle size={20} /></div>
          <div><div className="text-2xl font-bold text-foreground">${totalPaid.toLocaleString()}</div><div className="text-xs text-muted-foreground">Paid</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon bg-info"><Clock size={20} /></div>
          <div><div className="text-2xl font-bold text-foreground">${totalPending.toLocaleString()}</div><div className="text-xs text-muted-foreground">Pending</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon bg-destructive"><AlertCircle size={20} /></div>
          <div><div className="text-2xl font-bold text-foreground">${totalOverdue.toLocaleString()}</div><div className="text-xs text-muted-foreground">Overdue</div></div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="p-4 border-b flex flex-wrap items-center gap-3">
          <h2 className="text-base font-semibold text-foreground mr-auto">Invoice Records</h2>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Search invoices…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
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
            <thead>
              <tr>{["#","INVOICE NO","DATE","DUE DATE","OPERATOR","FLIGHT REF","DESCRIPTION","TOTAL","CURRENCY","STATUS","ACTIONS"].map(h => (
                <th key={h} className="data-table-header px-3 py-3 text-left whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-16">
                  <FileText size={40} className="mx-auto text-muted-foreground/30 mb-3" />
                  <p className="font-semibold text-foreground">No Invoices Found</p>
                  <p className="text-muted-foreground text-sm mt-1">Create a new invoice or upload an Excel file</p>
                </td></tr>
              ) : pageData.map((inv, i) => (
                <tr key={inv.id} className="data-table-row">
                  <td className="px-3 py-2.5 text-muted-foreground text-xs">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td className="px-3 py-2.5 font-mono text-xs font-semibold text-foreground">{inv.invoiceNo}</td>
                  <td className="px-3 py-2.5 text-foreground whitespace-nowrap">{inv.date}</td>
                  <td className="px-3 py-2.5 text-foreground whitespace-nowrap">{inv.dueDate}</td>
                  <td className="px-3 py-2.5 font-semibold text-foreground">{inv.operator}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{inv.flightRef}</td>
                  <td className="px-3 py-2.5 text-muted-foreground text-xs max-w-[180px] truncate">{inv.description}</td>
                  <td className="px-3 py-2.5 font-semibold text-success">{inv.total.toFixed(2)}</td>
                  <td className="px-3 py-2.5 text-muted-foreground text-xs">{inv.currency}</td>
                  <td className="px-3 py-2.5"><StatusBadge s={inv.status} /></td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1.5">
                      <button onClick={() => setPrintInvoice(inv)} className="text-primary hover:text-primary/80" title="Print"><Printer size={13} /></button>
                      <button onClick={() => startEdit(inv)} className="text-info hover:text-info/80"><Pencil size={13} /></button>
                      <button onClick={() => deleteInvoice(inv.id)} className="text-destructive hover:text-destructive/80"><Trash2 size={13} /></button>
                    </div>
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
