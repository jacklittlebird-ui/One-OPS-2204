import { useState, useMemo, useRef, useCallback } from "react";
import {
  Search, Plus, Download, Upload, FileText, X, ChevronLeft, ChevronRight,
  Pencil, Trash2, AlertTriangle, CheckCircle, Clock, Calendar
} from "lucide-react";
import * as XLSX from "xlsx";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

type ContractStatus = "Active" | "Expired" | "Pending" | "Terminated";

type ContractRow = {
  id: string; contract_no: string; airline: string; airline_iata: string | null;
  start_date: string; end_date: string; services: string | null; stations: string | null;
  currency: string; annual_value: number; status: ContractStatus;
  auto_renew: boolean; notes: string | null;
};

const statusConfig: Record<ContractStatus, { icon: React.ReactNode; cls: string }> = {
  Active:     { icon: <CheckCircle size={11} />, cls: "bg-success/15 text-success" },
  Expired:    { icon: <AlertTriangle size={11} />, cls: "bg-destructive/15 text-destructive" },
  Pending:    { icon: <Clock size={11} />, cls: "bg-warning/15 text-warning" },
  Terminated: { icon: <X size={11} />, cls: "bg-muted text-muted-foreground" },
};

const StatusBadge = ({ s }: { s: ContractStatus }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${statusConfig[s]?.cls || ""}`}>
    {statusConfig[s]?.icon}{s}
  </span>
);

function daysUntilExpiry(endDate: string): number {
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
}

const inputCls = "text-sm border rounded px-2 py-1.5 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground w-full";
const selectCls = "text-sm border rounded px-2 py-1.5 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full";

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-1"><label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</label>{children}</div>;
}

const emptyContract = (): Partial<ContractRow> => ({
  contract_no: `LNK-CTR-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
  airline: "", airline_iata: "", start_date: new Date().toISOString().slice(0, 10),
  end_date: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
  services: "", stations: "", currency: "USD", annual_value: 0,
  status: "Pending" as ContractStatus, auto_renew: false, notes: "",
});

function ContractForm({ data, onChange, onSave, onCancel, title, isSaving }: { data: Partial<ContractRow>; onChange: (d: Partial<ContractRow>) => void; onSave: () => void; onCancel: () => void; title: string; isSaving?: boolean }) {
  const set = (key: string, val: any) => onChange({ ...data, [key]: val });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm">
      <div className="bg-card rounded-xl border shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
          <h2 className="font-bold text-foreground text-lg flex items-center gap-2"><FileText size={18} className="text-primary" />{title}</h2>
          <button onClick={onCancel} className="p-1.5 hover:bg-muted rounded-full text-muted-foreground"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Contract No."><input className={inputCls} value={data.contract_no || ""} onChange={e => set("contract_no", e.target.value)} /></FormField>
            <FormField label="Airline"><input className={inputCls} value={data.airline || ""} onChange={e => set("airline", e.target.value)} placeholder="Air Cairo" /></FormField>
            <FormField label="Airline IATA"><input className={inputCls} value={data.airline_iata || ""} onChange={e => set("airline_iata", e.target.value)} placeholder="SM" /></FormField>
            <FormField label="Status">
              <select className={selectCls} value={data.status || "Pending"} onChange={e => set("status", e.target.value)}>
                {(["Active","Pending","Expired","Terminated"] as ContractStatus[]).map(s => <option key={s}>{s}</option>)}
              </select>
            </FormField>
            <FormField label="Start Date"><input type="date" className={inputCls} value={data.start_date || ""} onChange={e => set("start_date", e.target.value)} /></FormField>
            <FormField label="End Date"><input type="date" className={inputCls} value={data.end_date || ""} onChange={e => set("end_date", e.target.value)} /></FormField>
            <div className="col-span-2"><FormField label="Services"><input className={inputCls} value={data.services || ""} onChange={e => set("services", e.target.value)} placeholder="Full Ground Handling, AVSEC…" /></FormField></div>
            <FormField label="Stations"><input className={inputCls} value={data.stations || ""} onChange={e => set("stations", e.target.value)} placeholder="CAI, HRG" /></FormField>
            <FormField label="Currency">
              <select className={selectCls} value={data.currency || "USD"} onChange={e => set("currency", e.target.value)}>
                {["USD","EUR","EGP"].map(c => <option key={c}>{c}</option>)}
              </select>
            </FormField>
            <FormField label="Annual Value"><input type="number" className={inputCls} value={data.annual_value || 0} onChange={e => set("annual_value", +e.target.value)} /></FormField>
            <FormField label="Auto-Renew">
              <label className="flex items-center gap-2 cursor-pointer mt-1">
                <input type="checkbox" checked={data.auto_renew || false} onChange={e => set("auto_renew", e.target.checked)} className="rounded" />
                <span className="text-sm text-foreground">{data.auto_renew ? "Yes" : "No"}</span>
              </label>
            </FormField>
            <div className="col-span-2"><FormField label="Notes"><textarea className={inputCls + " resize-none"} rows={2} value={data.notes || ""} onChange={e => set("notes", e.target.value)} /></FormField></div>
          </div>
        </div>
        <div className="sticky bottom-0 bg-card border-t px-6 py-4 flex gap-3 justify-end rounded-b-xl">
          <button onClick={onCancel} className="toolbar-btn-outline">Cancel</button>
          <button onClick={onSave} disabled={isSaving} className="toolbar-btn-primary">{isSaving ? "Saving…" : "Save Contract"}</button>
        </div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 15;

export default function ContractsPage() {
  const { data: contracts, isLoading, add, update, remove, bulkInsert, isAdding, isUpdating } = useSupabaseTable<ContractRow>("contracts");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [newContract, setNewContract] = useState<Partial<ContractRow>>(emptyContract());
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<ContractRow>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    let r = contracts;
    if (statusFilter !== "All") r = r.filter(c => c.status === statusFilter);
    if (search) {
      const s = search.toLowerCase();
      r = r.filter(c =>
        c.airline.toLowerCase().includes(s) ||
        c.contract_no.toLowerCase().includes(s) ||
        (c.services || "").toLowerCase().includes(s)
      );
    }
    return r;
  }, [contracts, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const expiringCount = contracts.filter(c => c.status === "Active" && daysUntilExpiry(c.end_date) <= 90 && daysUntilExpiry(c.end_date) > 0).length;
  const activeValue = contracts.filter(c => c.status === "Active").reduce((s, c) => s + c.annual_value, 0);

  const saveNew = async () => {
    if (!newContract.airline) return;
    await add(newContract as any);
    setShowAdd(false); setNewContract(emptyContract());
  };
  const startEdit = (c: ContractRow) => { setEditId(c.id); setEditData({ ...c }); };
  const saveEdit = async () => {
    if (!editId) return;
    const { id, ...rest } = editData;
    await update({ id: editId, ...rest } as any);
    setEditId(null);
  };
  const confirmDelete = async () => {
    if (!deleteId) return;
    await remove(deleteId);
    setDeleteId(null);
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map(c => ({
      "Contract No": c.contract_no, "Airline": c.airline, "IATA": c.airline_iata || "",
      "Start Date": c.start_date, "End Date": c.end_date, "Services": c.services || "",
      "Stations": c.stations || "", "Currency": c.currency, "Annual Value": c.annual_value,
      "Status": c.status, "Auto-Renew": c.auto_renew ? "Yes" : "No", "Notes": c.notes || "",
    })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Contracts"); XLSX.writeFile(wb, "Link_Contracts_Export.xlsx");
  };

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: "binary" });
      const json = XLSX.utils.sheet_to_json<any>(wb.Sheets[wb.SheetNames[0]]);
      const rows = json.map((row: any) => ({
        contract_no: row["Contract No"] || "", airline: row["Airline"] || "",
        airline_iata: row["IATA"] || "", start_date: row["Start Date"] || "", end_date: row["End Date"] || "",
        services: row["Services"] || "", stations: row["Stations"] || "", currency: row["Currency"] || "USD",
        annual_value: Number(row["Annual Value"] || 0), status: row["Status"] || "Pending",
        auto_renew: row["Auto-Renew"] === "Yes", notes: row["Notes"] || "",
      }));
      await bulkInsert(rows);
      setPage(1);
    };
    reader.readAsBinaryString(file); e.target.value = "";
  }, [bulkInsert]);

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><FileText size={22} className="text-primary" /> Contracts</h1>
        <p className="text-muted-foreground text-sm mt-1">Airline service agreements & contract management</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card"><div className="stat-card-icon bg-primary"><FileText size={20} /></div><div><div className="text-2xl font-bold text-foreground">{contracts.length}</div><div className="text-xs text-muted-foreground">Total Contracts</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-success"><CheckCircle size={20} /></div><div><div className="text-2xl font-bold text-foreground">{contracts.filter(c => c.status === "Active").length}</div><div className="text-xs text-muted-foreground">Active</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-warning"><AlertTriangle size={20} /></div><div><div className="text-2xl font-bold text-foreground">{expiringCount}</div><div className="text-xs text-muted-foreground">Expiring Soon</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-info"><Calendar size={20} /></div><div><div className="text-2xl font-bold text-foreground">${activeValue.toLocaleString()}</div><div className="text-xs text-muted-foreground">Active Annual Value</div></div></div>
      </div>

      {expiringCount > 0 && (
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
          <h3 className="text-sm font-bold text-warning flex items-center gap-2 mb-2"><AlertTriangle size={14} /> Renewal Alerts</h3>
          <div className="space-y-1">
            {contracts.filter(c => c.status === "Active" && daysUntilExpiry(c.end_date) <= 90 && daysUntilExpiry(c.end_date) > 0).map(c => (
              <p key={c.id} className="text-sm text-foreground">
                <span className="font-semibold">{c.airline}</span> ({c.contract_no}) expires in <span className="font-bold text-warning">{daysUntilExpiry(c.end_date)} days</span>
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="p-4 border-b flex flex-wrap items-center gap-3">
          <h2 className="text-base font-semibold text-foreground mr-auto">Contract Records</h2>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Search contracts…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-8 pr-3 py-1.5 text-sm border rounded bg-card text-foreground placeholder:text-muted-foreground w-52 focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground">
            <option>All</option>{(["Active","Pending","Expired","Terminated"] as ContractStatus[]).map(s => <option key={s}>{s}</option>)}
          </select>
          <button onClick={() => { setNewContract(emptyContract()); setShowAdd(true); }} className="toolbar-btn-primary"><Plus size={14} /> New Contract</button>
          <button onClick={() => fileInputRef.current?.click()} className="toolbar-btn-success"><Upload size={14} /> Upload</button>
          <button onClick={handleExport} className="toolbar-btn-outline"><Download size={14} /> Export</button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleUpload} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr>{["#","CONTRACT NO","AIRLINE","IATA","START","END","SERVICES","STATIONS","VALUE","STATUS","RENEW","ACTIONS"].map(h => (
              <th key={h} className="data-table-header px-3 py-3 text-left whitespace-nowrap">{h}</th>
            ))}</tr></thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-16"><FileText size={40} className="mx-auto text-muted-foreground/30 mb-3" /><p className="font-semibold text-foreground">No Contracts Found</p></td></tr>
              ) : pageData.map((c, i) => {
                const days = daysUntilExpiry(c.end_date);
                const expiringSoon = c.status === "Active" && days <= 90 && days > 0;
                return (
                  <tr key={c.id} className={`data-table-row ${expiringSoon ? "bg-warning/5" : ""}`}>
                    <td className="px-3 py-2.5 text-muted-foreground text-xs">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td className="px-3 py-2.5 font-mono text-xs font-semibold text-foreground">{c.contract_no}</td>
                    <td className="px-3 py-2.5 font-semibold text-foreground">{c.airline}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{c.airline_iata || "—"}</td>
                    <td className="px-3 py-2.5 text-foreground whitespace-nowrap">{c.start_date}</td>
                    <td className="px-3 py-2.5 text-foreground whitespace-nowrap">{c.end_date}{expiringSoon && <span className="ml-1 text-warning text-xs font-bold">⚠ {days}d</span>}</td>
                    <td className="px-3 py-2.5 text-muted-foreground text-xs max-w-[200px] truncate">{c.services || "—"}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{c.stations || "—"}</td>
                    <td className="px-3 py-2.5 font-semibold text-success">{c.currency} {c.annual_value.toLocaleString()}</td>
                    <td className="px-3 py-2.5"><StatusBadge s={c.status} /></td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{c.auto_renew ? "✔️" : "—"}</td>
                    <td className="px-3 py-2.5 flex gap-1.5">
                      <button onClick={() => startEdit(c)} className="text-info hover:text-info/80"><Pencil size={13} /></button>
                      <button onClick={() => setDeleteId(c.id)} className="text-destructive hover:text-destructive/80"><Trash2 size={13} /></button>
                    </td>
                  </tr>
                );
              })}
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

      {showAdd && <ContractForm title="New Contract" data={newContract} onChange={setNewContract} onSave={saveNew} onCancel={() => setShowAdd(false)} isSaving={isAdding} />}
      {editId && <ContractForm title="Edit Contract" data={editData} onChange={setEditData} onSave={saveEdit} onCancel={() => setEditId(null)} isSaving={isUpdating} />}

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contract</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this contract? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
