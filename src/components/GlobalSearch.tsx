import { useState, useMemo, useRef, useEffect } from "react";
import { Search, X, Plane, DollarSign, FileText, UtensilsCrossed, Shield, BookOpen, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SearchResult {
  title: string;
  subtitle: string;
  module: string;
  path: string;
  icon: React.ReactNode;
}

function useSearchData() {
  const airlines = useQuery({ queryKey: ["airlines"], queryFn: async () => { const { data } = await supabase.from("airlines").select("code,name,country"); return data || []; } });
  const aircrafts = useQuery({ queryKey: ["aircrafts"], queryFn: async () => { const { data } = await supabase.from("aircrafts").select("registration,type,airline"); return data || []; } });
  const flights = useQuery({ queryKey: ["flight_schedules"], queryFn: async () => { const { data } = await supabase.from("flight_schedules").select("flight_no,airline,origin,destination"); return data || []; } });
  const catering = useQuery({ queryKey: ["catering_items"], queryFn: async () => { const { data } = await supabase.from("catering_items").select("item,price,category"); return data || []; } });
  const tubes = useQuery({ queryKey: ["tube_charges"], queryFn: async () => { const { data } = await supabase.from("tube_charges").select("service,price,airport"); return data || []; } });
  const taxes = useQuery({ queryKey: ["airport_tax"], queryFn: async () => { const { data } = await supabase.from("airport_tax").select("tax,amount,applicability"); return data || []; } });
  const ramp = useQuery({ queryKey: ["basic_ramp"], queryFn: async () => { const { data } = await supabase.from("basic_ramp").select("service,price"); return data || []; } });
  const equipment = useQuery({ queryKey: ["vendor_equipment"], queryFn: async () => { const { data } = await supabase.from("vendor_equipment").select("equipment,vendor,rate"); return data || []; } });
  const hall = useQuery({ queryKey: ["hall_vvip"], queryFn: async () => { const { data } = await supabase.from("hall_vvip").select("service,price,terminal"); return data || []; } });
  const abbr = useQuery({ queryKey: ["abbreviations"], queryFn: async () => { const { data } = await supabase.from("abbreviations").select("abbr,full_text"); return data || []; } });
  const acTypes = useQuery({ queryKey: ["aircraft_types_ref"], queryFn: async () => { const { data } = await supabase.from("aircraft_types_ref").select("icao,iata,name,category"); return data || []; } });
  const bulletins = useQuery({ queryKey: ["bulletins"], queryFn: async () => { const { data } = await supabase.from("bulletins").select("bulletin_id,title,type"); return data || []; } });
  const manuals = useQuery({ queryKey: ["manuals_forms"], queryFn: async () => { const { data } = await supabase.from("manuals_forms").select("doc_id,title,category"); return data || []; } });
  const rights = useQuery({ queryKey: ["traffic_rights"], queryFn: async () => { const { data } = await supabase.from("traffic_rights").select("right_name,description"); return data || []; } });

  return { airlines, aircrafts, flights, catering, tubes, taxes, ramp, equipment, hall, abbr, acTypes, bulletins, manuals, rights };
}

function buildIndex(data: ReturnType<typeof useSearchData>): { text: string; result: SearchResult }[] {
  const entries: { text: string; result: SearchResult }[] = [];

  (data.airlines.data || []).forEach(a => entries.push({ text: `${a.code} ${a.name} ${a.country}`, result: { title: a.name, subtitle: `${a.code} · ${a.country}`, module: "Airlines", path: "/airlines", icon: <Plane size={14} /> } }));
  (data.aircrafts.data || []).forEach(a => entries.push({ text: `${a.registration} ${a.type} ${a.airline}`, result: { title: a.registration, subtitle: `${a.type} · ${a.airline}`, module: "Aircrafts", path: "/aircrafts", icon: <Plane size={14} /> } }));
  (data.flights.data || []).forEach(f => entries.push({ text: `${f.flight_no} ${f.airline} ${f.origin} ${f.destination}`, result: { title: f.flight_no, subtitle: `${f.airline} · ${f.origin}→${f.destination}`, module: "Flights", path: "/flight-schedule", icon: <Plane size={14} /> } }));
  (data.catering.data || []).forEach(c => entries.push({ text: `${c.item} ${c.category}`, result: { title: c.item, subtitle: `${c.price} · ${c.category}`, module: "Catering", path: "/catering", icon: <UtensilsCrossed size={14} /> } }));
  (data.tubes.data || []).forEach(t => entries.push({ text: `${t.service} ${t.airport}`, result: { title: t.service, subtitle: `${t.price} · ${t.airport}`, module: "Tube", path: "/tube", icon: <Building2 size={14} /> } }));
  (data.taxes.data || []).forEach(t => entries.push({ text: `${t.tax} ${t.applicability}`, result: { title: t.tax, subtitle: t.amount, module: "Airport Tax", path: "/airport-tax", icon: <DollarSign size={14} /> } }));
  (data.ramp.data || []).forEach(r => entries.push({ text: `${r.service}`, result: { title: r.service, subtitle: r.price, module: "Basic Ramp", path: "/basic-ramp", icon: <DollarSign size={14} /> } }));
  (data.equipment.data || []).forEach(v => entries.push({ text: `${v.equipment} ${v.vendor}`, result: { title: v.equipment, subtitle: `${v.vendor} · ${v.rate}`, module: "Vendor Equipment", path: "/vendor-equipment", icon: <DollarSign size={14} /> } }));
  (data.hall.data || []).forEach(h => entries.push({ text: `${h.service} ${h.terminal}`, result: { title: h.service, subtitle: `${h.price} · ${h.terminal}`, module: "Hall & VVIP", path: "/hall-vvip", icon: <Shield size={14} /> } }));
  (data.abbr.data || []).forEach(a => entries.push({ text: `${a.abbr} ${a.full_text}`, result: { title: a.abbr, subtitle: a.full_text, module: "Abbreviations", path: "/abbreviations", icon: <BookOpen size={14} /> } }));
  (data.acTypes.data || []).forEach(a => entries.push({ text: `${a.icao} ${a.iata} ${a.name}`, result: { title: a.name, subtitle: `${a.icao}/${a.iata} · ${a.category}`, module: "Aircraft Types", path: "/aircraft-types", icon: <Plane size={14} /> } }));
  (data.bulletins.data || []).forEach(b => entries.push({ text: `${b.bulletin_id} ${b.title} ${b.type}`, result: { title: b.title, subtitle: `${b.bulletin_id} · ${b.type}`, module: "Bulletins", path: "/bulletins", icon: <FileText size={14} /> } }));
  (data.manuals.data || []).forEach(m => entries.push({ text: `${m.doc_id} ${m.title} ${m.category}`, result: { title: m.title, subtitle: `${m.doc_id} · ${m.category}`, module: "Manuals", path: "/manuals-forms", icon: <BookOpen size={14} /> } }));
  (data.rights.data || []).forEach(t => entries.push({ text: `${t.right_name} ${t.description}`, result: { title: t.right_name, subtitle: t.description.slice(0, 60), module: "Traffic Rights", path: "/traffic-rights", icon: <Shield size={14} /> } }));

  return entries;
}

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const searchData = useSearchData();

  const index = useMemo(() => buildIndex(searchData), [
    searchData.airlines.data, searchData.aircrafts.data, searchData.flights.data,
    searchData.catering.data, searchData.tubes.data, searchData.taxes.data,
    searchData.ramp.data, searchData.equipment.data, searchData.hall.data,
    searchData.abbr.data, searchData.acTypes.data, searchData.bulletins.data,
    searchData.manuals.data, searchData.rights.data,
  ]);

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
        <div className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-[400px] max-w-[400px] bg-card border rounded-lg shadow-xl z-50 overflow-hidden">
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
