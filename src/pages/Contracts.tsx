import { useState, useMemo, useRef, useCallback } from "react";
import {
  Search, Plus, Download, Upload, FileText, ChevronLeft, ChevronRight,
  Pencil, Trash2, AlertTriangle, CheckCircle, Clock, Calendar, Eye
} from "lucide-react";
import * as XLSX from "xlsx";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import type { ContractRow, ContractStatus } from "@/components/contracts/ContractTypes";
import { daysUntilExpiry, emptyContract, STATUSES } from "@/components/contracts/ContractTypes";
import { ContractStatusBadge, ContractTypeBadge } from "@/components/contracts/ContractStatusBadge";
import { ContractForm } from "@/components/contracts/ContractForm";
import { ContractDetailModal } from "@/components/contracts/ContractDetailModal";

const PAGE_SIZE = 15;

export default function ContractsPage() {
  const { data: contracts, isLoading, add, update, remove, bulkInsert, isAdding, isUpdating } = useSupabaseTable<ContractRow>("contracts");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [newContract, setNewContract] = useState<Partial<ContractRow>>(emptyContract());
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<ContractRow>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewContract, setViewContract] = useState<ContractRow | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    let r = contracts;
    if (statusFilter !== "All") r = r.filter(c => c.status === statusFilter);
    if (typeFilter !== "All") r = r.filter(c => c.contract_type === typeFilter);
    if (search) {
      const s = search.toLowerCase();
      r = r.filter(c =>
        c.airline.toLowerCase().includes(s) ||
        c.contract_no.toLowerCase().includes(s) ||
        (c.services || "").toLowerCase().includes(s) ||
        (c.contact_person || "").toLowerCase().includes(s) ||
        (c.sgha_ref || "").toLowerCase().includes(s)
      );
    }
    return r;
  }, [contracts, statusFilter, typeFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const expiringCount = contracts.filter(c => c.status === "Active" && daysUntilExpiry(c.end_date) <= 90 && daysUntilExpiry(c.end_date) > 0).length;
  const activeValue = contracts.filter(c => c.status === "Active").reduce((s, c) => s + c.annual_value, 0);
  const contractTypes = [...new Set(contracts.map(c => c.contract_type).filter(Boolean))];

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
      "Contract No": c.contract_no, "Type": c.contract_type, "SGHA Ref": c.sgha_ref,
      "Airline": c.airline, "IATA": c.airline_iata || "",
      "Contact Person": c.contact_person, "Contact Email": c.contact_email,
      "Start Date": c.start_date, "End Date": c.end_date,
      "Services": c.services || "", "Stations": c.stations || "",
      "Currency": c.currency, "Annual Value": c.annual_value,
      "Payment Terms": c.payment_terms, "Billing Frequency": c.billing_frequency,
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
        contract_no: row["Contract No"] || "", contract_type: row["Type"] || "SGHA",
        sgha_ref: row["SGHA Ref"] || "", airline: row["Airline"] || "",
        airline_iata: row["IATA"] || "", contact_person: row["Contact Person"] || "",
        contact_email: row["Contact Email"] || "",
        start_date: row["Start Date"] || "", end_date: row["End Date"] || "",
        services: row["Services"] || "", stations: row["Stations"] || "",
        currency: row["Currency"] || "USD", annual_value: Number(row["Annual Value"] || 0),
        payment_terms: row["Payment Terms"] || "Net 30",
        billing_frequency: row["Billing Frequency"] || "Monthly",
        status: row["Status"] || "Pending", auto_renew: row["Auto-Renew"] === "Yes",
        notes: row["Notes"] || "",
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
        <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2"><FileText size={22} className="text-primary" /> Contracts</h1>
        <p className="text-muted-foreground text-sm mt-1">SGHA-compliant airline service agreements & contract management</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="stat-card"><div className="stat-card-icon bg-primary"><FileText size={20} /></div><div><div className="text-xl md:text-2xl font-bold text-foreground">{contracts.length}</div><div className="text-xs text-muted-foreground">Total Contracts</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-success"><CheckCircle size={20} /></div><div><div className="text-xl md:text-2xl font-bold text-foreground">{contracts.filter(c => c.status === "Active").length}</div><div className="text-xs text-muted-foreground">Active</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-warning"><AlertTriangle size={20} /></div><div><div className="text-xl md:text-2xl font-bold text-foreground">{expiringCount}</div><div className="text-xs text-muted-foreground">Expiring ≤90d</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-info"><Calendar size={20} /></div><div><div className="text-xl md:text-2xl font-bold text-foreground">${activeValue.toLocaleString()}</div><div className="text-xs text-muted-foreground">Active Annual Value</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-muted"><Clock size={20} /></div><div><div className="text-xl md:text-2xl font-bold text-foreground">{contracts.filter(c => c.status === "Pending").length}</div><div className="text-xs text-muted-foreground">Pending Approval</div></div></div>
      </div>

      {/* Renewal Alerts */}
      {expiringCount > 0 && (
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
          <h3 className="text-sm font-bold text-warning flex items-center gap-2 mb-2"><AlertTriangle size={14} /> Renewal Alerts</h3>
          <div className="space-y-1">
            {contracts.filter(c => c.status === "Active" && daysUntilExpiry(c.end_date) <= 90 && daysUntilExpiry(c.end_date) > 0).map(c => (
              <p key={c.id} className="text-sm text-foreground">
                <span className="font-semibold">{c.airline}</span> ({c.contract_no}) —{" "}
                <span className="font-bold text-warning">{daysUntilExpiry(c.end_date)} days</span>
                {c.contact_person && <span className="text-muted-foreground ml-2">• Contact: {c.contact_person}</span>}
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
            <option>All</option>{STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          {contractTypes.length > 1 && (
            <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground">
              <option value="All">All Types</option>{contractTypes.map(t => <option key={t}>{t}</option>)}
            </select>
          )}
          <button onClick={() => { setNewContract(emptyContract()); setShowAdd(true); }} className="toolbar-btn-primary"><Plus size={14} /> New Contract</button>
          <button onClick={() => fileInputRef.current?.click()} className="toolbar-btn-success"><Upload size={14} /> Upload</button>
          <button onClick={handleExport} className="toolbar-btn-outline"><Download size={14} /> Export</button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleUpload} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr>{["#","CONTRACT NO","TYPE","AIRLINE","STATIONS","VALUE","BILLING","PAYMENT","STATUS","RENEW","ACTIONS"].map(h => (
              <th key={h} className="data-table-header px-3 py-3 text-left whitespace-nowrap">{h}</th>
            ))}</tr></thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-16"><FileText size={40} className="mx-auto text-muted-foreground/30 mb-3" /><p className="font-semibold text-foreground">No Contracts Found</p></td></tr>
              ) : pageData.map((c, i) => {
                const days = daysUntilExpiry(c.end_date);
                const expiringSoon = c.status === "Active" && days <= 90 && days > 0;
                return (
                  <tr key={c.id} className={`data-table-row ${expiringSoon ? "bg-warning/5" : ""}`}>
                    <td className="px-3 py-2.5 text-muted-foreground text-xs">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td className="px-3 py-2.5">
                      <button onClick={() => setViewContract(c)} className="font-mono text-xs font-semibold text-primary hover:underline cursor-pointer">{c.contract_no}</button>
                      {expiringSoon && <span className="ml-1 text-warning text-xs font-bold">⚠ {days}d</span>}
                    </td>
                    <td className="px-3 py-2.5"><ContractTypeBadge type={c.contract_type} /></td>
                    <td className="px-3 py-2.5">
                      <div className="font-semibold text-foreground">{c.airline}</div>
                      {c.airline_iata && <div className="text-xs text-muted-foreground">{c.airline_iata}</div>}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{c.stations || "—"}</td>
                    <td className="px-3 py-2.5 font-semibold text-success">{c.currency} {c.annual_value.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{c.billing_frequency}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{c.payment_terms}</td>
                    <td className="px-3 py-2.5"><ContractStatusBadge status={c.status} /></td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{c.auto_renew ? "✔️" : "—"}</td>
                    <td className="px-3 py-2.5 flex gap-1.5">
                      <button onClick={() => setViewContract(c)} className="text-primary hover:text-primary/80" title="View"><Eye size={13} /></button>
                      <button onClick={() => startEdit(c)} className="text-info hover:text-info/80" title="Edit"><Pencil size={13} /></button>
                      <button onClick={() => setDeleteId(c.id)} className="text-destructive hover:text-destructive/80" title="Delete"><Trash2 size={13} /></button>
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

      {/* Modals */}
      {showAdd && <ContractForm title="New Contract" data={newContract} onChange={setNewContract} onSave={saveNew} onCancel={() => setShowAdd(false)} isSaving={isAdding} />}
      {editId && <ContractForm title="Edit Contract" data={editData} onChange={setEditData} onSave={saveEdit} onCancel={() => setEditId(null)} isSaving={isUpdating} />}
      {viewContract && <ContractDetailModal contract={viewContract} onClose={() => setViewContract(null)} />}

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
