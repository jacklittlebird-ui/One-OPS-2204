import { useState, useMemo, useCallback, useRef } from "react";
import {
  Search, Plus, Trash2, Upload, Download, Building2, Layers, Database,
  MonitorCog, Pencil, X, FileUp, ChevronLeft, ChevronRight
} from "lucide-react";
import {
  AirportCharge,
  generateAllCharges,
  getUniqueVendors,
  getUniqueMTOW,
} from "@/data/airportChargesData";
import * as XLSX from "xlsx";

const PAGE_SIZE = 25;

export default function AirportChargesPage() {
  const [data, setData] = useState<AirportCharge[]>(() => generateAllCharges());
  const [search, setSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState("All Vendors");
  const [mtowFilter, setMtowFilter] = useState("All MTOW");
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<Partial<AirportCharge>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newRow, setNewRow] = useState<Partial<AirportCharge>>({
    vendorName: "", mtow: "", landingDay: 0, landingNight: 0,
    parkingDay: 0, parkingNight: 0, housing: 0, airNavigation: 0,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const vendors = useMemo(() => getUniqueVendors(data), [data]);
  const mtows = useMemo(() => getUniqueMTOW(data), [data]);

  const filtered = useMemo(() => {
    let result = data;
    if (vendorFilter !== "All Vendors") result = result.filter(r => r.vendorName === vendorFilter);
    if (mtowFilter !== "All MTOW") result = result.filter(r => r.mtow === mtowFilter);
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(r =>
        r.vendorName.toLowerCase().includes(s) ||
        r.mtow.toLowerCase().includes(s) ||
        String(r.landingDay).includes(s)
      );
    }
    return result;
  }, [data, vendorFilter, mtowFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const uniqueVendorCount = new Set(data.map(d => d.vendorName)).size;
  const uniqueMtowCount = new Set(data.map(d => d.mtow)).size;

  const startEdit = (row: AirportCharge) => {
    setEditingId(row.id);
    setEditRow({ ...row });
  };

  const saveEdit = () => {
    if (!editingId) return;
    setData(prev => prev.map(r => r.id === editingId ? { ...r, ...editRow } as AirportCharge : r));
    setEditingId(null);
  };

  const deleteRow = (id: string) => setData(prev => prev.filter(r => r.id !== id));

  const addRow = () => {
    if (!newRow.vendorName || !newRow.mtow) return;
    setData(prev => [...prev, { ...newRow, id: String(Date.now()) } as AirportCharge]);
    setShowAdd(false);
    setNewRow({ vendorName: "", mtow: "", landingDay: 0, landingNight: 0, parkingDay: 0, parkingNight: 0, housing: 0, airNavigation: 0 });
  };

  const clearAll = () => { setData([]); setPage(1); };

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<any>(ws);
      const imported: AirportCharge[] = json.map((row: any, i: number) => ({
        id: String(Date.now() + i),
        vendorName: row["Vendor Name"] || row.vendorName || "",
        mtow: row["MTOW"] || row.mtow || "",
        landingDay: Number(row["Landing Day"] || row.landingDay || 0),
        landingNight: Number(row["Landing Night"] || row.landingNight || 0),
        parkingDay: Number(row["Parking Day"] || row.parkingDay || 0),
        parkingNight: Number(row["Parking Night"] || row.parkingNight || 0),
        housing: Number(row["Housing"] || row.housing || 0),
        airNavigation: Number(row["Air Navigation"] || row.airNavigation || 0),
      }));
      setData(imported);
      setPage(1);
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  }, []);

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(
      filtered.map(r => ({
        "Vendor Name": r.vendorName, MTOW: r.mtow, "Landing Day": r.landingDay,
        "Landing Night": r.landingNight, "Parking Day": r.parkingDay,
        "Parking Night": r.parkingNight, Housing: r.housing, "Air Navigation": r.airNavigation,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Airport Charges");
    XLSX.writeFile(wb, "airport_charges.xlsx");
  };

  const columns = ["VENDOR NAME", "MTOW", "LANDING DAY", "LANDING NIGHT", "PARKING DAY", "PARKING NIGHT", "HOUSING", "AIR NAVIGATION", "ACTIONS"];

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Airport Charges</h1>
      <p className="text-muted-foreground text-sm mt-1 mb-6">Airport service fees by MTOW category</p>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <div className="stat-card-icon bg-primary"><Building2 size={20} /></div>
          <div><div className="text-2xl font-bold text-foreground">{uniqueVendorCount}</div><div className="text-xs text-muted-foreground">Vendors</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon bg-info"><Layers size={20} /></div>
          <div><div className="text-2xl font-bold text-foreground">{uniqueMtowCount}</div><div className="text-xs text-muted-foreground">MTOW Categories</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon bg-success"><Database size={20} /></div>
          <div><div className="text-2xl font-bold text-foreground">{data.length}</div><div className="text-xs text-muted-foreground">Total Records</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon bg-accent"><MonitorCog size={20} /></div>
          <div><div className="text-2xl font-bold text-foreground">6</div><div className="text-xs text-muted-foreground">Charge Types</div></div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-card rounded-lg border overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b flex flex-wrap items-center gap-3">
          <h2 className="text-base font-semibold text-foreground mr-auto">Airport Charges by MTOW</h2>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by Vendor, MTOW, or Charge…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-8 pr-3 py-1.5 text-sm border rounded bg-card text-foreground placeholder:text-muted-foreground w-64 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <select value={vendorFilter} onChange={e => { setVendorFilter(e.target.value); setPage(1); }} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground">
            <option>All Vendors</option>
            {vendors.map(v => <option key={v}>{v}</option>)}
          </select>
          <select value={mtowFilter} onChange={e => { setMtowFilter(e.target.value); setPage(1); }} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground">
            <option>All MTOW</option>
            {mtows.map(m => <option key={m}>{m}</option>)}
          </select>
          <button onClick={() => setShowAdd(true)} className="toolbar-btn-primary"><Plus size={14} /> Add Charge</button>
          <button onClick={clearAll} className="toolbar-btn-destructive"><Trash2 size={14} /> Clear All Data</button>
          <button onClick={() => fileInputRef.current?.click()} className="toolbar-btn-success"><Upload size={14} /> Upload Excel</button>
          <button onClick={handleExport} className="toolbar-btn-outline"><Download size={14} /> Export</button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleUpload} />
        </div>

        {/* Add Row Form */}
        {showAdd && (
          <div className="p-4 border-b bg-muted">
            <div className="grid grid-cols-9 gap-2 items-end">
              <input placeholder="Vendor Name" value={newRow.vendorName} onChange={e => setNewRow(p => ({ ...p, vendorName: e.target.value }))} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground" />
              <input placeholder="MTOW" value={newRow.mtow} onChange={e => setNewRow(p => ({ ...p, mtow: e.target.value }))} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground" />
              {(["landingDay", "landingNight", "parkingDay", "parkingNight", "housing", "airNavigation"] as const).map(f => (
                <input key={f} type="number" placeholder={f} value={newRow[f] || 0} onChange={e => setNewRow(p => ({ ...p, [f]: +e.target.value }))} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground" />
              ))}
              <div className="flex gap-1">
                <button onClick={addRow} className="toolbar-btn-success text-xs py-1">Save</button>
                <button onClick={() => setShowAdd(false)} className="toolbar-btn-outline text-xs py-1"><X size={12} /></button>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col} className="data-table-header px-4 py-3 text-left whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16">
                    <Database size={40} className="mx-auto text-muted-foreground/40 mb-3" />
                    <p className="font-semibold text-foreground">No Airport Charges Data</p>
                    <p className="text-muted-foreground text-sm mt-1">The system starts with 0 records by default.</p>
                    <p className="text-accent text-sm mt-2">↑ Click the "Upload Excel" button above to import your data</p>
                  </td>
                </tr>
              ) : (
                pageData.map(row => (
                  <tr key={row.id} className="data-table-row">
                    {editingId === row.id ? (
                      <>
                        <td className="px-4 py-2"><input value={editRow.vendorName || ""} onChange={e => setEditRow(p => ({ ...p, vendorName: e.target.value }))} className="text-sm border rounded px-1.5 py-0.5 w-full bg-card text-foreground" /></td>
                        <td className="px-4 py-2"><input value={editRow.mtow || ""} onChange={e => setEditRow(p => ({ ...p, mtow: e.target.value }))} className="text-sm border rounded px-1.5 py-0.5 w-24 bg-card text-foreground" /></td>
                        {(["landingDay", "landingNight", "parkingDay", "parkingNight", "housing", "airNavigation"] as const).map(f => (
                          <td key={f} className="px-4 py-2"><input type="number" value={editRow[f] ?? 0} onChange={e => setEditRow(p => ({ ...p, [f]: +e.target.value }))} className="text-sm border rounded px-1.5 py-0.5 w-20 bg-card text-foreground" /></td>
                        ))}
                        <td className="px-4 py-2 flex gap-1">
                          <button onClick={saveEdit} className="text-xs text-success hover:underline">Save</button>
                          <button onClick={() => setEditingId(null)} className="text-xs text-destructive hover:underline">Cancel</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-2.5 text-foreground">{row.vendorName}</td>
                        <td className="px-4 py-2.5 text-foreground">{row.mtow}</td>
                        <td className="px-4 py-2.5 text-foreground">{row.landingDay}</td>
                        <td className="px-4 py-2.5 text-foreground">{row.landingNight}</td>
                        <td className="px-4 py-2.5 text-foreground">{row.parkingDay}</td>
                        <td className="px-4 py-2.5 text-foreground">{row.parkingNight}</td>
                        <td className="px-4 py-2.5 text-foreground">{row.housing}</td>
                        <td className="px-4 py-2.5 text-foreground">{row.airNavigation}</td>
                        <td className="px-4 py-2.5 flex gap-2">
                          <button onClick={() => startEdit(row)} className="text-info hover:text-info/80"><Pencil size={14} /></button>
                          <button onClick={() => deleteRow(row.id)} className="text-destructive hover:text-destructive/80"><Trash2 size={14} /></button>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="p-3 border-t flex items-center justify-between text-sm text-muted-foreground">
            <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} records</span>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded border hover:bg-muted disabled:opacity-40"><ChevronLeft size={14} /></button>
              <span className="text-foreground font-medium">Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded border hover:bg-muted disabled:opacity-40"><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
