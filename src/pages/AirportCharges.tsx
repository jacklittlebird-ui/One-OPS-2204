import { useState, useMemo, useCallback, useRef } from "react";
import { TablePagination, usePagination } from "@/components/ui/table-pagination";
import {
  Search, Plus, Trash2, Upload, Download, Building2, Layers, Database,
  MonitorCog, Pencil, X, FileUp, ChevronLeft, ChevronRight
} from "lucide-react";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import * as XLSX from "xlsx";

interface AirportChargeRow {
  id: string;
  vendor_name: string;
  mtow: string;
  landing_day: number;
  landing_night: number;
  parking_day: number;
  parking_night: number;
  housing: number;
  air_navigation: number;
  created_at: string;
}

const PAGE_SIZE = 25;

export default function AirportChargesPage() {
  const { data, isLoading, add, update, remove, bulkInsert } = useSupabaseTable<AirportChargeRow>("airport_charges", { orderBy: "created_at", ascending: true });
  const [search, setSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState("All Vendors");
  const [mtowFilter, setMtowFilter] = useState("All MTOW");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<Partial<AirportChargeRow>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newRow, setNewRow] = useState({
    vendor_name: "", mtow: "", landing_day: 0, landing_night: 0,
    parking_day: 0, parking_night: 0, housing: 0, air_navigation: 0,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const vendors = useMemo(() => [...new Set(data.map(d => d.vendor_name))], [data]);
  const mtows = useMemo(() => {
    const m = [...new Set(data.map(d => d.mtow))];
    return m.sort((a, b) => parseInt(a) - parseInt(b));
  }, [data]);

  const filtered = useMemo(() => {
    let result = data;
    if (vendorFilter !== "All Vendors") result = result.filter(r => r.vendor_name === vendorFilter);
    if (mtowFilter !== "All MTOW") result = result.filter(r => r.mtow === mtowFilter);
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(r =>
        r.vendor_name.toLowerCase().includes(s) ||
        r.mtow.toLowerCase().includes(s) ||
        String(r.landing_day).includes(s)
      );
    }
    return result;
  }, [data, vendorFilter, mtowFilter, search]);

  const { pageRows: pageData, ...pag } = usePagination(filtered, { resetKey: [search, vendorFilter, mtowFilter] });

  const uniqueVendorCount = new Set(data.map(d => d.vendor_name)).size;
  const uniqueMtowCount = new Set(data.map(d => d.mtow)).size;

  const startEdit = (row: AirportChargeRow) => {
    setEditingId(row.id);
    setEditRow({ ...row });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const { id, created_at, ...updates } = editRow as AirportChargeRow;
    await update({ id: editingId, ...updates });
    setEditingId(null);
  };

  const deleteRow = (id: string) => remove(id);

  const addRow = async () => {
    if (!newRow.vendor_name || !newRow.mtow) return;
    await add(newRow);
    setShowAdd(false);
    setNewRow({ vendor_name: "", mtow: "", landing_day: 0, landing_night: 0, parking_day: 0, parking_night: 0, housing: 0, air_navigation: 0 });
  };

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<any>(ws);
      const imported = json.map((row: any) => ({
        vendor_name: row["Vendor Name"] || row.vendor_name || "",
        mtow: row["MTOW"] || row.mtow || "",
        landing_day: Number(row["Landing Day"] || row.landing_day || 0),
        landing_night: Number(row["Landing Night"] || row.landing_night || 0),
        parking_day: Number(row["Parking Day"] || row.parking_day || 0),
        parking_night: Number(row["Parking Night"] || row.parking_night || 0),
        housing: Number(row["Housing"] || row.housing || 0),
        air_navigation: Number(row["Air Navigation"] || row.air_navigation || 0),
      }));
      await bulkInsert(imported);
      
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  }, [bulkInsert]);

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(
      filtered.map(r => ({
        "Vendor Name": r.vendor_name, MTOW: r.mtow, "Landing Day": r.landing_day,
        "Landing Night": r.landing_night, "Parking Day": r.parking_day,
        "Parking Night": r.parking_night, Housing: r.housing, "Air Navigation": r.air_navigation,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Airport Charges");
    XLSX.writeFile(wb, "airport_charges.xlsx");
  };

  const columns = ["VENDOR NAME", "MTOW", "LANDING DAY", "LANDING NIGHT", "PARKING DAY", "PARKING NIGHT", "HOUSING", "AIR NAVIGATION", "ACTIONS"];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

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
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm border rounded bg-card text-foreground placeholder:text-muted-foreground w-64 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <select value={vendorFilter} onChange={e => setVendorFilter(e.target.value)} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground">
            <option>All Vendors</option>
            {vendors.map(v => <option key={v}>{v}</option>)}
          </select>
          <select value={mtowFilter} onChange={e => setMtowFilter(e.target.value)} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground">
            <option>All MTOW</option>
            {mtows.map(m => <option key={m}>{m}</option>)}
          </select>
          <button onClick={() => setShowAdd(true)} className="toolbar-btn-primary"><Plus size={14} /> Add Charge</button>
          <button onClick={() => fileInputRef.current?.click()} className="toolbar-btn-success"><Upload size={14} /> Upload Excel</button>
          <button onClick={handleExport} className="toolbar-btn-outline"><Download size={14} /> Export</button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleUpload} />
        </div>

        {/* Add Row Form */}
        {showAdd && (
          <div className="p-4 border-b bg-muted">
            <div className="grid grid-cols-9 gap-2 items-end">
              <input placeholder="Vendor Name" value={newRow.vendor_name} onChange={e => setNewRow(p => ({ ...p, vendor_name: e.target.value }))} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground" />
              <input placeholder="MTOW" value={newRow.mtow} onChange={e => setNewRow(p => ({ ...p, mtow: e.target.value }))} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground" />
              {(["landing_day", "landing_night", "parking_day", "parking_night", "housing", "air_navigation"] as const).map(f => (
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
                        <td className="px-4 py-2"><input value={editRow.vendor_name || ""} onChange={e => setEditRow(p => ({ ...p, vendor_name: e.target.value }))} className="text-sm border rounded px-1.5 py-0.5 w-full bg-card text-foreground" /></td>
                        <td className="px-4 py-2"><input value={editRow.mtow || ""} onChange={e => setEditRow(p => ({ ...p, mtow: e.target.value }))} className="text-sm border rounded px-1.5 py-0.5 w-24 bg-card text-foreground" /></td>
                        {(["landing_day", "landing_night", "parking_day", "parking_night", "housing", "air_navigation"] as const).map(f => (
                          <td key={f} className="px-4 py-2"><input type="number" value={editRow[f] ?? 0} onChange={e => setEditRow(p => ({ ...p, [f]: +e.target.value }))} className="text-sm border rounded px-1.5 py-0.5 w-20 bg-card text-foreground" /></td>
                        ))}
                        <td className="px-4 py-2 flex gap-1">
                          <button onClick={saveEdit} className="text-xs text-success hover:underline">Save</button>
                          <button onClick={() => setEditingId(null)} className="text-xs text-destructive hover:underline">Cancel</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-2.5 text-foreground">{row.vendor_name}</td>
                        <td className="px-4 py-2.5 text-foreground">{row.mtow}</td>
                        <td className="px-4 py-2.5 text-foreground">{row.landing_day}</td>
                        <td className="px-4 py-2.5 text-foreground">{row.landing_night}</td>
                        <td className="px-4 py-2.5 text-foreground">{row.parking_day}</td>
                        <td className="px-4 py-2.5 text-foreground">{row.parking_night}</td>
                        <td className="px-4 py-2.5 text-foreground">{row.housing}</td>
                        <td className="px-4 py-2.5 text-foreground">{row.air_navigation}</td>
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
        <TablePagination {...pag} />
      </div>
    </div>
  );
}
