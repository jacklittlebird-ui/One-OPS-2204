import { useState, useMemo, useRef, useCallback } from "react";
import {
  Search, Plus, Download, Upload, FileBarChart2, Plane, Building2,
  DollarSign, Users, X, ChevronLeft, ChevronRight, Eye, Pencil, Trash2, Link2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import {
  ServiceReport, HandlingType, handlingTypes, sampleReports
} from "@/data/serviceReportData";

const PAGE_SIZE = 15;

const statusColor: Record<string, string> = {
  "Turn Around":           "bg-primary/10 text-primary",
  "Night Stop":            "bg-info/10 text-info",
  "Transit":               "bg-success/10 text-success",
  "Technical":             "bg-warning/10 text-warning",
  "Ferry In":              "bg-accent/10 text-accent",
  "Ferry Out":             "bg-accent/10 text-accent",
  "VIP Hall":              "bg-destructive/10 text-destructive",
  "Overflying":            "bg-muted text-muted-foreground",
};

const dayNightOptions = ["D", "N", "D/N"] as const;
const currencyOptions = ["USD", "EUR", "EGP"] as const;
const stationOptions = [
  { name: "Cairo", iata: "CAI", icao: "HECA" },
  { name: "Hurghada", iata: "HRG", icao: "HEHR" },
  { name: "Sharm El Sheikh", iata: "SSH", icao: "HESH" },
  { name: "Luxor", iata: "LXR", icao: "HELX" },
  { name: "Aswan", iata: "ASW", icao: "HEAS" },
];

const emptyReport = (): Partial<ServiceReport> => ({
  operator: "", handlingType: "Turn Around",
  station: "Cairo", stationIATA: "CAI", stationICAO: "HECA",
  aircraftType: "", registration: "", flightNo: "",
  airlineIATA: "", airlineICAO: "", mtow: "", route: "",
  arrivalDate: "", departureDate: "", dayNight: "D",
  sta: "", std: "", ata: "", atd: "", groundTime: "", landingTime: "",
  dly: "", dlyExplanation: "",
  paxIn: 0, paxOut: 0, paxTransit: 0,
  projectTags: "", checkInSystem: "", performedBy: "Link Egypt",
  civilAviationFee: 0, handlingFee: 0, airportCharge: 0, totalCost: 0, currency: "USD",
});

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "text-sm border rounded px-2 py-1.5 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground";
const selectCls = "text-sm border rounded px-2 py-1.5 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary";

interface ReportFormProps {
  data: Partial<ServiceReport>;
  onChange: (d: Partial<ServiceReport>) => void;
  onSave: () => void;
  onCancel: () => void;
  title: string;
}

function ReportForm({ data, onChange, onSave, onCancel, title }: ReportFormProps) {
  const set = (key: keyof ServiceReport, val: any) => onChange({ ...data, [key]: val });

  const handleStationChange = (name: string) => {
    const s = stationOptions.find(o => o.name === name);
    if (s) onChange({ ...data, station: s.name, stationIATA: s.iata, stationICAO: s.icao });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm">
      <div className="bg-card rounded-xl border shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
          <h2 className="font-bold text-foreground text-lg flex items-center gap-2"><FileBarChart2 size={18} className="text-primary" />{title}</h2>
          <button onClick={onCancel} className="p-1.5 hover:bg-muted rounded-full text-muted-foreground"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-6">
          {/* Flight Data */}
          <div>
            <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-3 flex items-center gap-2"><Plane size={14} />Flight Data</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FormField label="Operator"><input className={inputCls} value={data.operator || ""} onChange={e => set("operator", e.target.value)} placeholder="Air Cairo" /></FormField>
              <FormField label="Flight No."><input className={inputCls} value={data.flightNo || ""} onChange={e => set("flightNo", e.target.value)} placeholder="SM123/124" /></FormField>
              <FormField label="Airline IATA"><input className={inputCls} value={data.airlineIATA || ""} onChange={e => set("airlineIATA", e.target.value)} placeholder="SM" /></FormField>
              <FormField label="Airline ICAO"><input className={inputCls} value={data.airlineICAO || ""} onChange={e => set("airlineICAO", e.target.value)} placeholder="MSC" /></FormField>
              <FormField label="Aircraft Type"><input className={inputCls} value={data.aircraftType || ""} onChange={e => set("aircraftType", e.target.value)} placeholder="A320/200" /></FormField>
              <FormField label="Registration"><input className={inputCls} value={data.registration || ""} onChange={e => set("registration", e.target.value)} placeholder="SU-CAI" /></FormField>
              <FormField label="MTOW"><input className={inputCls} value={data.mtow || ""} onChange={e => set("mtow", e.target.value)} placeholder="77 TON" /></FormField>
              <FormField label="Route"><input className={inputCls} value={data.route || ""} onChange={e => set("route", e.target.value)} placeholder="AMS/CAI/AMS" /></FormField>
              <FormField label="Station">
                <select className={selectCls} value={data.station || "Cairo"} onChange={e => handleStationChange(e.target.value)}>
                  {stationOptions.map(s => <option key={s.name}>{s.name}</option>)}
                </select>
              </FormField>
              <FormField label="Station IATA"><input className={inputCls} value={data.stationIATA || ""} readOnly /></FormField>
              <FormField label="Station ICAO"><input className={inputCls} value={data.stationICAO || ""} readOnly /></FormField>
              <FormField label="Handling Type">
                <select className={selectCls} value={data.handlingType} onChange={e => set("handlingType", e.target.value as HandlingType)}>
                  {handlingTypes.map(h => <option key={h}>{h}</option>)}
                </select>
              </FormField>
            </div>
          </div>

          {/* Operation Data */}
          <div>
            <h3 className="text-sm font-bold text-info uppercase tracking-wider mb-3 flex items-center gap-2"><Building2 size={14} />Operation Data</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FormField label="Arrival Date"><input type="date" className={inputCls} value={data.arrivalDate || ""} onChange={e => set("arrivalDate", e.target.value)} /></FormField>
              <FormField label="Departure Date"><input type="date" className={inputCls} value={data.departureDate || ""} onChange={e => set("departureDate", e.target.value)} /></FormField>
              <FormField label="Day / Night">
                <select className={selectCls} value={data.dayNight} onChange={e => set("dayNight", e.target.value as "D"|"N"|"D/N")}>
                  {dayNightOptions.map(o => <option key={o}>{o}</option>)}
                </select>
              </FormField>
              <FormField label="Ground Time"><input className={inputCls} value={data.groundTime || ""} onChange={e => set("groundTime", e.target.value)} placeholder="1:15" /></FormField>
              <FormField label="STA"><input type="time" className={inputCls} value={data.sta || ""} onChange={e => set("sta", e.target.value)} /></FormField>
              <FormField label="STD"><input type="time" className={inputCls} value={data.std || ""} onChange={e => set("std", e.target.value)} /></FormField>
              <FormField label="ATA"><input type="time" className={inputCls} value={data.ata || ""} onChange={e => set("ata", e.target.value)} /></FormField>
              <FormField label="ATD"><input type="time" className={inputCls} value={data.atd || ""} onChange={e => set("atd", e.target.value)} /></FormField>
              <FormField label="Landing Time"><input className={inputCls} value={data.landingTime || ""} onChange={e => set("landingTime", e.target.value)} placeholder="2:05" /></FormField>
              <FormField label="DLY Code"><input className={inputCls} value={data.dly || ""} onChange={e => set("dly", e.target.value)} placeholder="93/89" /></FormField>
              <div className="col-span-2 md:col-span-2">
                <FormField label="DLY Explanation"><input className={inputCls + " w-full"} value={data.dlyExplanation || ""} onChange={e => set("dlyExplanation", e.target.value)} placeholder="Reason for delay…" /></FormField>
              </div>
            </div>
          </div>

          {/* PAX + Services */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-bold text-warning uppercase tracking-wider mb-3 flex items-center gap-2"><Users size={14} />Passengers</h3>
              <div className="grid grid-cols-3 gap-4">
                <FormField label="PAX In"><input type="number" className={inputCls} value={data.paxIn || 0} onChange={e => set("paxIn", +e.target.value)} /></FormField>
                <FormField label="PAX Out"><input type="number" className={inputCls} value={data.paxOut || 0} onChange={e => set("paxOut", +e.target.value)} /></FormField>
                <FormField label="PAX Transit"><input type="number" className={inputCls} value={data.paxTransit || 0} onChange={e => set("paxTransit", +e.target.value)} /></FormField>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-accent uppercase tracking-wider mb-3">Services & Tags</h3>
              <div className="grid grid-cols-1 gap-4">
                <FormField label="Project Tags (Services)"><input className={inputCls + " w-full"} value={data.projectTags || ""} onChange={e => set("projectTags", e.target.value)} placeholder="AVSEC, Full Handling…" /></FormField>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Check-In System"><input className={inputCls} value={data.checkInSystem || ""} onChange={e => set("checkInSystem", e.target.value)} placeholder="Amadeus" /></FormField>
                  <FormField label="Performed By"><input className={inputCls} value={data.performedBy || ""} onChange={e => set("performedBy", e.target.value)} placeholder="Link Egypt" /></FormField>
                </div>
              </div>
            </div>
          </div>

          {/* Financials */}
          <div>
            <h3 className="text-sm font-bold text-success uppercase tracking-wider mb-3 flex items-center gap-2"><DollarSign size={14} />Financials</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <FormField label="Civil Aviation ($)"><input type="number" className={inputCls} value={data.civilAviationFee || 0} onChange={e => set("civilAviationFee", +e.target.value)} /></FormField>
              <FormField label="Handling Fee ($)"><input type="number" className={inputCls} value={data.handlingFee || 0} onChange={e => set("handlingFee", +e.target.value)} /></FormField>
              <FormField label="Airport Charge ($)"><input type="number" className={inputCls} value={data.airportCharge || 0} onChange={e => set("airportCharge", +e.target.value)} /></FormField>
              <FormField label="Total Cost ($)"><input type="number" className={inputCls} value={data.totalCost || 0} onChange={e => set("totalCost", +e.target.value)} /></FormField>
              <FormField label="Currency">
                <select className={selectCls} value={data.currency} onChange={e => set("currency", e.target.value as "USD"|"EUR"|"EGP")}>
                  {currencyOptions.map(c => <option key={c}>{c}</option>)}
                </select>
              </FormField>
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 bg-card border-t px-6 py-4 flex gap-3 justify-end rounded-b-xl">
          <button onClick={onCancel} className="toolbar-btn-outline">Cancel</button>
          <button onClick={onSave} className="toolbar-btn-primary">Save Report</button>
        </div>
      </div>
    </div>
  );
}

export default function ServiceReportPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<ServiceReport[]>(sampleReports);
  const [search, setSearch] = useState("");
  const [handlingFilter, setHandlingFilter] = useState("All Types");
  const [stationFilter, setStationFilter] = useState("All Stations");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [newReport, setNewReport] = useState<Partial<ServiceReport>>(emptyReport());
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<ServiceReport>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allStations = useMemo(() => [...new Set(reports.map(r => r.station))], [reports]);
  const allHandlingTypes = useMemo(() => [...new Set(reports.map(r => r.handlingType))], [reports]);

  const filtered = useMemo(() => {
    let r = reports;
    if (handlingFilter !== "All Types") r = r.filter(x => x.handlingType === handlingFilter);
    if (stationFilter !== "All Stations") r = r.filter(x => x.station === stationFilter);
    if (dateFrom) r = r.filter(x => x.arrivalDate >= dateFrom);
    if (dateTo) r = r.filter(x => x.arrivalDate <= dateTo);
    if (search) {
      const s = search.toLowerCase();
      r = r.filter(x =>
        x.operator.toLowerCase().includes(s) ||
        x.flightNo.toLowerCase().includes(s) ||
        x.route.toLowerCase().includes(s) ||
        x.airlineIATA.toLowerCase().includes(s)
      );
    }
    return r;
  }, [reports, handlingFilter, stationFilter, dateFrom, dateTo, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Summary stats
  const totalFlights = filtered.length;
  const totalPax = filtered.reduce((s, r) => s + r.paxIn + r.paxOut, 0);
  const totalRevenue = filtered.reduce((s, r) => s + r.totalCost, 0);
  const totalHandlingFees = filtered.reduce((s, r) => s + r.handlingFee, 0);

  const saveNew = () => {
    if (!newReport.flightNo || !newReport.operator) return;
    setReports(prev => [...prev, { ...newReport, id: `SR${String(Date.now()).slice(-4)}` } as ServiceReport]);
    setShowAdd(false);
    setNewReport(emptyReport());
  };

  const startEdit = (r: ServiceReport) => { setEditId(r.id); setEditData({ ...r }); };
  const saveEdit = () => {
    if (!editId) return;
    setReports(prev => prev.map(r => r.id === editId ? { ...r, ...editData } as ServiceReport : r));
    setEditId(null);
  };
  const deleteReport = (id: string) => setReports(prev => prev.filter(r => r.id !== id));

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map(r => ({
      "ID": r.id,
      "Operator": r.operator,
      "Type of Service": r.handlingType,
      "Station": r.station,
      "Station IATA code": r.stationIATA,
      "Station ICAO code": r.stationICAO,
      "Aircraft Type": r.aircraftType,
      "Registration": r.registration,
      "Flight No.": r.flightNo,
      "AIRLINE IATA": r.airlineIATA,
      "AIRLINE ICAO": r.airlineICAO,
      "MTOW": r.mtow,
      "ROUTE": r.route,
      "ARRIVAL Date": r.arrivalDate,
      "DEPARTURE Date": r.departureDate,
      "DAY/NIGHT": r.dayNight,
      "STA": r.sta,
      "STD": r.std,
      "ATA": r.ata,
      "ATD": r.atd,
      "GROUND TIME": r.groundTime,
      "LANDING TIME": r.landingTime,
      "DLY": r.dly,
      "DLY EXPLANATION": r.dlyExplanation,
      "PAX IN": r.paxIn,
      "PAX OUT": r.paxOut,
      "PAX TRANSIT": r.paxTransit,
      "Project Tags": r.projectTags,
      "CHECK IN SYSTEM": r.checkInSystem,
      "PERFORMED BY": r.performedBy,
      "Civil Aviation Fee": r.civilAviationFee,
      "Handling Fee": r.handlingFee,
      "Airport Charge": r.airportCharge,
      "Total Cost": r.totalCost,
      "Currency": r.currency,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Service Report");
    XLSX.writeFile(wb, "Link_Service_Report_Export.xlsx");
  };

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<any>(ws);
      const imported: ServiceReport[] = json.map((row: any, i: number) => ({
        id: row["ID"] || `SR${Date.now()}${i}`,
        operator: row["Operator"] || "",
        handlingType: row["Type of Service"] || "Turn Around",
        station: row["Station"] || "",
        stationIATA: row["Station IATA code"] || "",
        stationICAO: row["Station ICAO code"] || "",
        aircraftType: row["Aircraft Type"] || "",
        registration: row["Registration"] || "",
        flightNo: row["Flight No."] || "",
        airlineIATA: row["AIRLINE IATA"] || "",
        airlineICAO: row["AIRLINE ICAO"] || "",
        mtow: row["MTOW"] || "",
        route: row["ROUTE"] || "",
        arrivalDate: row["ARRIVAL Date"] || "",
        departureDate: row["DEPARTURE Date"] || "",
        dayNight: row["DAY/NIGHT"] || "D",
        sta: row["STA"] || "",
        std: row["STD"] || "",
        ata: row["ATA"] || "",
        atd: row["ATD"] || "",
        groundTime: row["GROUND TIME"] || "",
        landingTime: row["LANDING TIME"] || "",
        dly: row["DLY"] || "",
        dlyExplanation: row["DLY EXPLANATION"] || "",
        paxIn: Number(row["PAX IN"] || 0),
        paxOut: Number(row["PAX OUT"] || 0),
        paxTransit: Number(row["PAX TRANSIT"] || 0),
        projectTags: row["Project Tags"] || "",
        checkInSystem: row["CHECK IN SYSTEM"] || "",
        performedBy: row["PERFORMED BY"] || "Link Egypt",
        civilAviationFee: Number(row["Civil Aviation Fee"] || 0),
        handlingFee: Number(row["Handling Fee"] || 0),
        airportCharge: Number(row["Airport Charge"] || 0),
        totalCost: Number(row["Total Cost"] || 0),
        currency: row["Currency"] || "USD",
      }));
      setReports(imported);
      setPage(1);
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  }, []);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileBarChart2 size={22} className="text-primary" /> Service Report
            <Link2 size={16} className="text-primary" />
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Linked from <span className="font-semibold">Link_Service_Report.xlsx</span> ·{" "}
            <button onClick={() => navigate("/flight-schedule")} className="text-primary hover:underline">Flight Schedule</button>
            {" · "}
            <button onClick={() => navigate("/airport-charges")} className="text-primary hover:underline">Airport Charges</button>
            {" · "}
            <button onClick={() => navigate("/services")} className="text-primary hover:underline">Chart of Services</button>
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-card-icon bg-primary"><Plane size={20} /></div>
          <div><div className="text-2xl font-bold text-foreground">{totalFlights}</div><div className="text-xs text-muted-foreground">Total Flights</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon bg-info"><Users size={20} /></div>
          <div><div className="text-2xl font-bold text-foreground">{totalPax.toLocaleString()}</div><div className="text-xs text-muted-foreground">Total Passengers</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon bg-success"><DollarSign size={20} /></div>
          <div><div className="text-2xl font-bold text-foreground">${totalRevenue.toLocaleString()}</div><div className="text-xs text-muted-foreground">Total Revenue</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon bg-warning"><Building2 size={20} /></div>
          <div><div className="text-2xl font-bold text-foreground">${totalHandlingFees.toLocaleString()}</div><div className="text-xs text-muted-foreground">Handling Fees</div></div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b flex flex-wrap items-center gap-3">
          <h2 className="text-base font-semibold text-foreground mr-auto">Flight Service Records</h2>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text" placeholder="Search operator, flight, route…"
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-8 pr-3 py-1.5 text-sm border rounded bg-card text-foreground placeholder:text-muted-foreground w-56 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <select value={handlingFilter} onChange={e => { setHandlingFilter(e.target.value); setPage(1); }} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground">
            <option>All Types</option>
            {allHandlingTypes.map(h => <option key={h}>{h}</option>)}
          </select>
          <select value={stationFilter} onChange={e => { setStationFilter(e.target.value); setPage(1); }} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground">
            <option>All Stations</option>
            {allStations.map(s => <option key={s}>{s}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground" title="From" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground" title="To" />
          <button onClick={() => setShowAdd(true)} className="toolbar-btn-primary"><Plus size={14} /> New Report</button>
          <button onClick={() => fileInputRef.current?.click()} className="toolbar-btn-success"><Upload size={14} /> Upload Excel</button>
          <button onClick={handleExport} className="toolbar-btn-outline"><Download size={14} /> Export</button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleUpload} />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {["#", "OPERATOR", "FLIGHT", "TYPE", "STATION", "ROUTE", "ARR DATE", "A/C TYPE", "MTOW", "D/N", "STA", "ATD", "PAX IN", "PAX OUT", "TOTAL ($)", "ACTIONS"].map(h => (
                  <th key={h} className="data-table-header px-3 py-3 text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr>
                  <td colSpan={16} className="text-center py-16">
                    <FileBarChart2 size={40} className="mx-auto text-muted-foreground/30 mb-3" />
                    <p className="font-semibold text-foreground">No Service Reports Found</p>
                    <p className="text-muted-foreground text-sm mt-1">Add a new report or upload an Excel file</p>
                  </td>
                </tr>
              ) : pageData.map((r, i) => (
                <tr key={r.id} className="data-table-row">
                  <td className="px-3 py-2.5 text-muted-foreground text-xs">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td className="px-3 py-2.5 font-semibold text-foreground whitespace-nowrap">{r.operator}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-foreground">{r.flightNo}</td>
                  <td className="px-3 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${statusColor[r.handlingType] || "bg-muted text-muted-foreground"}`}>
                      {r.handlingType}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-foreground">{r.stationIATA}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{r.route}</td>
                  <td className="px-3 py-2.5 text-foreground whitespace-nowrap">{r.arrivalDate}</td>
                  <td className="px-3 py-2.5 text-foreground">{r.aircraftType}</td>
                  <td className="px-3 py-2.5 text-foreground">{r.mtow}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${r.dayNight === "N" ? "bg-info/15 text-info" : "bg-warning/15 text-warning"}`}>
                      {r.dayNight}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-foreground">{r.sta}</td>
                  <td className="px-3 py-2.5 text-foreground">{r.atd || "—"}</td>
                  <td className="px-3 py-2.5 text-foreground">{r.paxIn}</td>
                  <td className="px-3 py-2.5 text-foreground">{r.paxOut}</td>
                  <td className="px-3 py-2.5 font-semibold text-success">{r.totalCost.toLocaleString()}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1.5">
                      <button onClick={() => startEdit(r)} className="text-info hover:text-info/80"><Pencil size={13} /></button>
                      <button onClick={() => deleteReport(r.id)} className="text-destructive hover:text-destructive/80"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
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

      {/* Add/Edit Modals */}
      {showAdd && (
        <ReportForm
          title="New Service Report"
          data={newReport}
          onChange={setNewReport}
          onSave={saveNew}
          onCancel={() => setShowAdd(false)}
        />
      )}
      {editId && (
        <ReportForm
          title="Edit Service Report"
          data={editData}
          onChange={setEditData}
          onSave={saveEdit}
          onCancel={() => setEditId(null)}
        />
      )}
    </div>
  );
}
