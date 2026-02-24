import { useState, useMemo, useRef, useEffect } from "react";
import { Search, X, Plane, DollarSign, FileText, UtensilsCrossed, Shield, BookOpen, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Import all searchable data
import { cateringItems, tubeCharges, airportTaxItems, basicRampItems, vendorEquipmentItems, hallVvipItems, abbreviationsList, aircraftTypesRef, sampleBulletins, sampleManualsAndForms, trafficRightsData, securityItems, fuelItems, vipItems, overflyItems } from "@/data/servicesData";
import { sampleAirlines } from "@/data/airlinesData";
import { sampleAircrafts } from "@/data/aircraftsData";
import { sampleFlights } from "@/data/flightScheduleData";

interface SearchResult {
  title: string;
  subtitle: string;
  module: string;
  path: string;
  icon: React.ReactNode;
}

function buildIndex(): { text: string; result: SearchResult }[] {
  const entries: { text: string; result: SearchResult }[] = [];

  sampleAirlines.forEach(a => entries.push({ text: `${a.code} ${a.name} ${a.country}`, result: { title: a.name, subtitle: `${a.code} · ${a.country}`, module: "Airlines", path: "/airlines", icon: <Plane size={14} /> } }));
  sampleAircrafts.forEach(a => entries.push({ text: `${a.registration} ${a.type} ${a.airline}`, result: { title: a.registration, subtitle: `${a.type} · ${a.airline}`, module: "Aircrafts", path: "/aircrafts", icon: <Plane size={14} /> } }));
  sampleFlights.forEach(f => entries.push({ text: `${f.flightNo} ${f.airline} ${f.origin} ${f.destination}`, result: { title: f.flightNo, subtitle: `${f.airline} · ${f.origin}→${f.destination}`, module: "Flights", path: "/flight-schedule", icon: <Plane size={14} /> } }));
  cateringItems.forEach(c => entries.push({ text: `${c.item} ${c.category}`, result: { title: c.item, subtitle: `${c.price} · ${c.category}`, module: "Catering", path: "/catering", icon: <UtensilsCrossed size={14} /> } }));
  tubeCharges.forEach(t => entries.push({ text: `${t.service} ${t.airport}`, result: { title: t.service, subtitle: `${t.price} · ${t.airport}`, module: "Tube", path: "/tube", icon: <Building2 size={14} /> } }));
  airportTaxItems.forEach(t => entries.push({ text: `${t.tax} ${t.applicability}`, result: { title: t.tax, subtitle: t.amount, module: "Airport Tax", path: "/airport-tax", icon: <DollarSign size={14} /> } }));
  basicRampItems.forEach(r => entries.push({ text: `${r.service}`, result: { title: r.service, subtitle: r.price, module: "Basic Ramp", path: "/basic-ramp", icon: <DollarSign size={14} /> } }));
  vendorEquipmentItems.forEach(v => entries.push({ text: `${v.equipment} ${v.vendor}`, result: { title: v.equipment, subtitle: `${v.vendor} · ${v.rate}`, module: "Vendor Equipment", path: "/vendor-equipment", icon: <DollarSign size={14} /> } }));
  hallVvipItems.forEach(h => entries.push({ text: `${h.service} ${h.terminal}`, result: { title: h.service, subtitle: `${h.price} · ${h.terminal}`, module: "Hall & VVIP", path: "/hall-vvip", icon: <Shield size={14} /> } }));
  abbreviationsList.forEach(a => entries.push({ text: `${a.abbr} ${a.full}`, result: { title: a.abbr, subtitle: a.full, module: "Abbreviations", path: "/abbreviations", icon: <BookOpen size={14} /> } }));
  aircraftTypesRef.forEach(a => entries.push({ text: `${a.icao} ${a.iata} ${a.name}`, result: { title: a.name, subtitle: `${a.icao}/${a.iata} · ${a.category}`, module: "Aircraft Types", path: "/aircraft-types", icon: <Plane size={14} /> } }));
  sampleBulletins.forEach(b => entries.push({ text: `${b.id} ${b.title} ${b.type}`, result: { title: b.title, subtitle: `${b.id} · ${b.type}`, module: "Bulletins", path: "/bulletins", icon: <FileText size={14} /> } }));
  sampleManualsAndForms.forEach(m => entries.push({ text: `${m.id} ${m.title} ${m.category}`, result: { title: m.title, subtitle: `${m.id} · ${m.category}`, module: "Manuals", path: "/manuals-forms", icon: <BookOpen size={14} /> } }));
  trafficRightsData.forEach(t => entries.push({ text: `${t.right} ${t.description}`, result: { title: t.right, subtitle: t.description.slice(0, 60), module: "Traffic Rights", path: "/traffic-rights", icon: <Shield size={14} /> } }));
  securityItems.forEach(s => entries.push({ text: `${s.service}`, result: { title: s.service, subtitle: s.price, module: "Security", path: "/services", icon: <Shield size={14} /> } }));
  fuelItems.forEach(f => entries.push({ text: `${f.grade}`, result: { title: f.grade, subtitle: f.price, module: "Fuel", path: "/services", icon: <DollarSign size={14} /> } }));
  vipItems.forEach(v => entries.push({ text: `${v.service} ${v.category}`, result: { title: v.service, subtitle: `${v.price} · ${v.category}`, module: "VIP", path: "/services", icon: <Shield size={14} /> } }));
  overflyItems.forEach(o => entries.push({ text: `${o.permit}`, result: { title: o.permit, subtitle: o.price, module: "Overfly", path: "/services", icon: <DollarSign size={14} /> } }));

  return entries;
}

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const index = useMemo(() => buildIndex(), []);

  const results = useMemo(() => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return index.filter(e => e.text.toLowerCase().includes(q)).map(e => e.result).slice(0, 12);
  }, [query, index]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Keyboard shortcut: Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm text-muted-foreground hover:bg-muted transition-colors"
      >
        <Search size={14} />
        <span className="hidden sm:inline">Search…</span>
        <kbd className="hidden sm:inline text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded border">⌘K</kbd>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[400px] bg-card border rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b">
            <Search size={14} className="text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search across all modules…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            {query && <button onClick={() => setQuery("")}><X size={14} className="text-muted-foreground" /></button>}
          </div>
          <div className="max-h-[320px] overflow-y-auto">
            {results.length === 0 && query.length >= 2 && (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">No results found</div>
            )}
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => { navigate(r.path); setOpen(false); setQuery(""); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted transition-colors text-left"
              >
                <span className="text-primary shrink-0">{r.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{r.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{r.subtitle}</div>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium shrink-0">{r.module}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
