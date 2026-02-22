import { useState, useMemo, useRef, useCallback } from "react";
import {
  Search, Plus, Download, Upload, FileText, X, ChevronLeft, ChevronRight,
  Pencil, Trash2, AlertTriangle, CheckCircle, Clock, Calendar
} from "lucide-react";
import * as XLSX from "xlsx";

export type ContractStatus = "Active" | "Expired" | "Pending" | "Terminated";

export interface Contract {
  id: string;
  contractNo: string;
  airline: string;
  airlineIATA: string;
  startDate: string;
  endDate: string;
  services: string;
  stations: string;
  currency: "USD" | "EUR" | "EGP";
  annualValue: number;
  status: ContractStatus;
  autoRenew: boolean;
  notes: string;
}

const sampleContracts: Contract[] = [
  { id: "C001", contractNo: "LNK-CTR-2024-001", airline: "Air Cairo", airlineIATA: "SM", startDate: "2024-01-01", endDate: "2024-12-31", services: "Full Ground Handling, AVSEC", stations: "CAI, HRG", currency: "USD", annualValue: 120000, status: "Active", autoRenew: true, notes: "" },
  { id: "C002", contractNo: "LNK-CTR-2024-002", airline: "EgyptAir", airlineIATA: "MS", startDate: "2024-01-01", endDate: "2025-06-30", services: "Ramp Handling, Check-in", stations: "CAI, SSH, HRG, LXR", currency: "USD", annualValue: 350000, status: "Active", autoRenew: true, notes: "Largest contract" },
  { id: "C003", contractNo: "LNK-CTR-2023-015", airline: "Air France", airlineIATA: "AF", startDate: "2023-06-01", endDate: "2024-05-31", services: "Full Handling + VIP", stations: "CAI", currency: "EUR", annualValue: 95000, status: "Expired", autoRenew: false, notes: "Renewal pending negotiation" },
  { id: "C004", contractNo: "LNK-CTR-2024-003", airline: "Lufthansa", airlineIATA: "LH", startDate: "2024-03-01", endDate: "2025-02-28", services: "Technical Stop Handling", stations: "CAI, LXR", currency: "EUR", annualValue: 45000, status: "Active", autoRenew: true, notes: "" },
  { id: "C005", contractNo: "LNK-CTR-2024-004", airline: "Nile Air", airlineIATA: "XY", startDate: "2024-06-01", endDate: "2025-05-31", services: "Ramp Handling, Catering Coordination", stations: "SSH, HRG", currency: "USD", annualValue: 78000, status: "Pending", autoRenew: false, notes: "Awaiting board approval" },
];

const statusConfig: Record<ContractStatus, { icon: React.ReactNode; cls: string }> = {
  Active:     { icon: <CheckCircle size={11} />, cls: "bg-success/15 text-success" },
  Expired:    { icon: <AlertTriangle size={11} />, cls: "bg-destructive/15 text-destructive" },
  Pending:    { icon: <Clock size={11} />, cls: "bg-warning/15 text-warning" },
  Terminated: { icon: <X size={11} />, cls: "bg-muted text-muted-foreground" },
};

const StatusBadge = ({ s }: { s: ContractStatus }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${statusConfig[s].cls}`}>
    {statusConfig[s].icon}{s}
  </span>
);

function daysUntilExpiry(endDate: string): number {
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
}

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

const emptyContract = (): Partial<Contract> => ({
  contractNo: `LNK-CTR-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
  airline: "", airlineIATA: "", startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
  services: "", stations: "", currency: "USD", annualValue: 0,
  status: "Pending", autoRenew: false, notes: "",
});

interface ContractFormProps {
  data: Partial<Contract>;
  onChange: (d: Partial<Contract>) => void;
  onSave: () => void;
  onCancel: () => void;
  title: string;
}

function ContractForm({ data, onChange, onSave, onCancel, title }: ContractFormProps) {
  const set = (key: keyof Contract, val: any) => onChange({ ...data, [key]: val });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm">
      <div className="bg-card rounded-xl border shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
          <h2 className="font-bold text-foreground text-lg flex items-center gap-2"><FileText size={18} className="text-primary" />{title}</h2>
          <button onClick={onCancel} className="p-1.5 hover:bg-muted rounded-full text-muted-foreground"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Contract No."><input className={inputCls} value={data.contractNo || ""} onChange={e => set("contractNo", e.target.value)} /></FormField>
            <FormField label="Airline / Operator"><input className={inputCls} value={data.airline || ""} onChange={e => set("airline", e.target.value)} placeholder="Air Cairo" /></FormField>
            <FormField label="Airline IATA"><input className={inputCls} value={data.airlineIATA || ""} onChange={e => set("airlineIATA", e.target.value)} placeholder="SM" /></FormField>
            <FormField label="Status">
              <select className={selectCls} value={data.status || "Pending"} onChange={e => set("status", e.target.value)}>
                {(["Active","Pending","Expired","Terminated"] as ContractStatus[]).map(s => <option key={s}>{s}</option>)}
              </select>
            </FormField>
            <FormField label="Start Date"><input type="date" className={inputCls} value={data.startDate || ""} onChange={e => set("startDate", e.target.value)} /></FormField>
            <FormField label="End Date"><input type="date" className={inputCls} value={data.endDate || ""} onChange={e => set("endDate", e.target.value)} /></FormField>
            <div className="col-span-2"><FormField label="Services Covered"><input className={inputCls} value={data.services || ""} onChange={e => set("services", e.target.value)} placeholder="Full Ground Handling, AVSEC, VIP…" /></FormField></div>
            <FormField label="Stations"><input className={inputCls} value={data.stations || ""} onChange={e => set("stations", e.target.value)} placeholder="CAI, HRG, SSH" /></FormField>
            <FormField label="Currency">
              <select className={selectCls} value={data.currency || "USD"} onChange={e => set("currency", e.target.value)}>
                {["USD","EUR","EGP"].map(c => <option key={c}>{c}</option>)}
              </select>
            </FormField>
            <FormField label="Annual Value"><input type="number" className={inputCls} value={data.annualValue || 0} onChange={e => set("annualValue", +e.target.value)} /></FormField>
            <FormField label="Auto-Renew">
              <label className="flex items-center gap-2 cursor-pointer mt-1">
                <input type="checkbox" checked={data.autoRenew || false} onChange={e => set("autoRenew", e.target.checked)} className="rounded" />
                <span className="text-sm text-foreground">{data.autoRenew ? "Yes" : "No"}</span>
              </label>
            </FormField>
            <div className="col-span-2"><FormField label="Notes"><textarea className={inputCls + " resize-none"} rows={2} value={data.notes || ""} onChange={e => set("notes", e.target.value)} placeholder="Internal notes…" /></FormField></div>
          </div>
        </div>
        <div className="sticky bottom-0 bg-card border-t px-6 py-4 flex gap-3 justify-end rounded-b-xl">
          <button onClick={onCancel} className="toolbar-btn-outline">Cancel</button>
          <button onClick={onSave} className="toolbar-btn-primary">Save Contract</button>
        </div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 15;

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>(sampleContracts);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [newContract, setNewContract] = useState<Partial<Contract>>(emptyContract());
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Contract>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    let r = contracts;
    if (statusFilter !== "All") r = r.filter(c => c.status === statusFilter);
    if (search) {
      const s = search.toLowerCase();
      r = r.filter(c => c.airline.toLowerCase().includes(s) || c.contractNo.toLowerCase().includes(s) || c.services.toLowerCase().includes(s));
    }
    return r;
  }, [contracts, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const expiringCount = contracts.filter(c => c.status === "Active" && daysUntilExpiry(c.endDate) <= 90 && daysUntilExpiry(c.endDate) > 0).length;
  const activeValue = contracts.filter(c => c.status === "Active").reduce((s, c) => s + c.annualValue, 0);

  const saveNew = () => {
    if (!newContract.airline) return;
    setContracts(prev => [...prev, { ...newContract, id: `C${String(Date.now()).slice(-5)}` } as Contract]);
    setShowAdd(false); setNewContract(emptyContract());
  };
  const startEdit = (c: Contract) => { setEditId(c.id); setEditData({ ...c }); };
  const saveEdit = () => {
    if (!editId) return;
    setContracts(prev => prev.map(c => c.id === editId ? { ...c, ...editData } as Contract : c));
    setEditId(null);
  };
  const deleteContract = (id: string) => setContracts(prev => prev.filter(c => c.id !== id));

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map(c => ({
      "Contract No": c.contractNo, "Airline": c.airline, "IATA": c.airlineIATA,
      "Start Date": c.startDate, "End Date": c.endDate, "Services": c.services,
      "Stations": c.stations, "Currency": c.currency, "Annual Value": c.annualValue,
      "Status": c.status, "Auto-Renew": c.autoRenew ? "Yes" : "No", "Notes": c.notes,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contracts");
    XLSX.writeFile(wb, "Link_Contracts_Export.xlsx");
  };

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: "binary" });
      const json = XLSX.utils.sheet_to_json<any>(wb.Sheets[wb.SheetNames[0]]);
      const imported: Contract[] = json.map((row: any, i: number) => ({
        id: `C${Date.now()}${i}`, contractNo: row["Contract No"] || "", airline: row["Airline"] || "",
        airlineIATA: row["IATA"] || "", startDate: row["Start Date"] || "", endDate: row["End Date"] || "",
        services: row["Services"] || "", stations: row["Stations"] || "", currency: row["Currency"] || "USD",
        annualValue: Number(row["Annual Value"] || 0), status: row["Status"] || "Pending",
        autoRenew: row["Auto-Renew"] === "Yes", notes: row["Notes"] || "",
      }));
      setContracts(imported); setPage(1);
    };
    reader.readAsBinaryString(file); e.target.value = "";
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><FileText size={22} className="text-primary" /> Contracts</h1>
        <p className="text-muted-foreground text-sm mt-1">Airline service agreements & contract management</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-card-icon bg-primary"><FileText size={20} /></div>
          <div><div className="text-2xl font-bold text-foreground">{contracts.length}</div><div className="text-xs text-muted-foreground">Total Contracts</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon bg-success"><CheckCircle size={20} /></div>
          <div><div className="text-2xl font-bold text-foreground">{contracts.filter(c => c.status === "Active").length}</div><div className="text-xs text-muted-foreground">Active</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon bg-warning"><AlertTriangle size={20} /></div>
          <div><div className="text-2xl font-bold text-foreground">{expiringCount}</div><div className="text-xs text-muted-foreground">Expiring Soon (90d)</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon bg-info"><Calendar size={20} /></div>
          <div><div className="text-2xl font-bold text-foreground">${activeValue.toLocaleString()}</div><div className="text-xs text-muted-foreground">Active Annual Value</div></div>
        </div>
      </div>

      {/* Renewal Alerts */}
      {contracts.filter(c => c.status === "Active" && daysUntilExpiry(c.endDate) <= 90 && daysUntilExpiry(c.endDate) > 0).length > 0 && (
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
          <h3 className="text-sm font-bold text-warning flex items-center gap-2 mb-2"><AlertTriangle size={14} /> Renewal Alerts</h3>
          <div className="space-y-1">
            {contracts.filter(c => c.status === "Active" && daysUntilExpiry(c.endDate) <= 90 && daysUntilExpiry(c.endDate) > 0).map(c => (
              <p key={c.id} className="text-sm text-foreground">
                <span className="font-semibold">{c.airline}</span> ({c.contractNo}) expires in <span className="font-bold text-warning">{daysUntilExpiry(c.endDate)} days</span> — {c.endDate}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
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
            <thead>
              <tr>{["#","CONTRACT NO","AIRLINE","IATA","START","END","SERVICES","STATIONS","VALUE","STATUS","RENEW","ACTIONS"].map(h => (
                <th key={h} className="data-table-header px-3 py-3 text-left whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-16">
                  <FileText size={40} className="mx-auto text-muted-foreground/30 mb-3" />
                  <p className="font-semibold text-foreground">No Contracts Found</p>
                  <p className="text-muted-foreground text-sm mt-1">Create a new contract or upload an Excel file</p>
                </td></tr>
              ) : pageData.map((c, i) => {
                const days = daysUntilExpiry(c.endDate);
                const expiringSoon = c.status === "Active" && days <= 90 && days > 0;
                return (
                  <tr key={c.id} className={`data-table-row ${expiringSoon ? "bg-warning/5" : ""}`}>
                    <td className="px-3 py-2.5 text-muted-foreground text-xs">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td className="px-3 py-2.5 font-mono text-xs font-semibold text-foreground">{c.contractNo}</td>
                    <td className="px-3 py-2.5 font-semibold text-foreground">{c.airline}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{c.airlineIATA}</td>
                    <td className="px-3 py-2.5 text-foreground whitespace-nowrap">{c.startDate}</td>
                    <td className="px-3 py-2.5 text-foreground whitespace-nowrap">
                      {c.endDate}
                      {expiringSoon && <span className="ml-1 text-warning text-xs font-bold">⚠ {days}d</span>}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground text-xs max-w-[200px] truncate">{c.services}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{c.stations}</td>
                    <td className="px-3 py-2.5 font-semibold text-success">{c.currency} {c.annualValue.toLocaleString()}</td>
                    <td className="px-3 py-2.5"><StatusBadge s={c.status} /></td>
                    <td className="px-3 py-2.5 text-center">{c.autoRenew ? <span className="text-success text-xs font-bold">✓</span> : <span className="text-muted-foreground text-xs">—</span>}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1.5">
                        <button onClick={() => startEdit(c)} className="text-info hover:text-info/80"><Pencil size={13} /></button>
                        <button onClick={() => deleteContract(c.id)} className="text-destructive hover:text-destructive/80"><Trash2 size={13} /></button>
                      </div>
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

      {showAdd && <ContractForm title="New Contract" data={newContract} onChange={setNewContract} onSave={saveNew} onCancel={() => setShowAdd(false)} />}
      {editId && <ContractForm title="Edit Contract" data={editData} onChange={setEditData} onSave={saveEdit} onCancel={() => setEditId(null)} />}
    </div>
  );
}
