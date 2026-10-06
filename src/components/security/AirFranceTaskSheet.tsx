import airFranceLogo from "@/assets/air-france-security-logo.png.asset.json";
import linkLogo from "@/assets/air-france-link-aero-logo.png.asset.json";

export const isAirFranceAirline = (name: unknown) => /\bair\s*france\b/i.test(String(name || ""));

export const AIR_FRANCE_SECTIONS = [
  { title: "AF Arrival (Security Briefing)", fields: [
    ["af_arr_cat", "CAT Observer (Tray Setup – Sealing Integrity - Escorting)"],
    ["af_arr_eqpt", "A/C EQPT Inspection done by"],
    ["af_arr_logbook", "Logbook"],
    ["af_arr_l1", "L1 Observer (FWD Galley Seals)"],
    ["af_arr_l2", "L2 Observer (MID Galley Seals)"],
    ["af_arr_left", "A/C Left side Observer (Hand-search cleaning staff)"],
    ["af_arr_l4", "L4 Observer (Blankets Packs Seals - AFT Galley Seals)"],
    ["af_arr_cpt12", "CPT1,2 Observer (CPT, CAT Vehicle Visual Inspection)"],
    ["af_arr_cpt345", "CPT3,4,5 Observer (CPT, LAV Truck Visual Inspection)"],
  ] },
  { title: "AF Departure (Security Briefing)", fields: [
    ["af_dep_sorting", "Sorting Area (Baggage ULDs Inspection - Sealing Integrity)"],
    ["af_dep_logbook", "Logbook (ULDs Sealing Inspection)"],
    ["af_dep_l1", "L1 Observer"],
    ["af_dep_l2", "L2 Observer"],
    ["af_dep_gate", "Boarding Gate Observer"],
    ["af_dep_cpt12", "CPT1,2 Observer (CAT Vehicle Visual Inspection)"],
    ["af_dep_left", "A/C Left side observer (Fuel Truck Inspection)"],
    ["af_dep_cpt345", "CPT3,4,5 Observer"],
    ["af_dep_cgo", "CGO escorted by"],
    ["af_dep_baggage", "Baggage ULDs escorted by"],
  ] },
] as const;

export type AirFranceField = typeof AIR_FRANCE_SECTIONS[number]["fields"][number][0];
export type AirFranceData = Record<AirFranceField, string>;
export const emptyAirFranceData = (): AirFranceData => Object.fromEntries(
  AIR_FRANCE_SECTIONS.flatMap(section => Array.from(section.fields as readonly (readonly [AirFranceField, string])[]).map(field => [field[0], ""])),
) as AirFranceData;

const boxedField = "w-full min-w-0 rounded-sm border border-input bg-card px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-default";

interface Props {
  sheet: AirFranceData & Record<string, string>;
  flight: { flight_no?: string | null; flight_date?: string | null; departure_date?: string | null };
  update: (field: AirFranceField | "registration" | "route" | "sta" | "std" | "ata" | "atd" | "delay" | "remarks" | "security_supervisor", value: string) => void;
  updateFlight: (field: string, value: string) => void;
  dateDisplay: (value: string) => string;
  dateInput: (value: string, previous: string) => string;
  timeInput: (value: string, previous: string) => string;
  dualTimeInput: (value: string, previous: string) => string;
}

export function AirFranceHeader() {
  return <>
    <div className="flex items-start justify-between gap-4">
      <img src={linkLogo.url} alt="Link Aero" className="h-24 w-auto object-contain" />
      <img src={airFranceLogo.url} alt="Air France Security Services" className="mt-2 h-auto w-48 max-w-[50%] object-contain" />
    </div>
    <h3 className="mt-2 text-center text-xl font-bold text-foreground">AF Staff Distribution</h3>
    <div className="mt-4" />
  </>;
}

export default function AirFranceTaskSheet({ sheet, flight, update, updateFlight, dateDisplay, dateInput, timeInput, dualTimeInput }: Props) {
  const field = (key: "registration" | "route" | "sta" | "std" | "ata" | "atd" | "delay", label: string) => (
    <div className="min-w-0">
      <label htmlFor={`af-${key}`} className="mb-1 block text-xs font-bold text-foreground">{label}</label>
      <input id={`af-${key}`} className={boxedField} value={sheet[key] || ""} maxLength={key === "sta" || key === "std" ? 5 : key === "ata" || key === "atd" ? 11 : undefined}
        onChange={e => update(key, key === "sta" || key === "std" ? timeInput(e.target.value, sheet[key]) : key === "ata" || key === "atd" ? dualTimeInput(e.target.value, sheet[key]) : e.target.value)} />
    </div>
  );
  return <div className="space-y-4" data-testid="air-france-task-sheet">
    <h3 className="text-center text-xl font-bold text-foreground">AF Staff Distribution</h3>
    <div className="grid grid-cols-1 gap-3 border border-border p-3 sm:grid-cols-2 md:grid-cols-4">
      <div><label htmlFor="af-flight-no" className="mb-1 block text-xs font-bold">Flight Number</label><input id="af-flight-no" className={boxedField} value={flight.flight_no || ""} onChange={e => updateFlight("flight_no", e.target.value.toUpperCase())} /></div>
      <div><label htmlFor="af-flight-date" className="mb-1 block text-xs font-bold">Arrival Date</label><input id="af-flight-date" className={boxedField} maxLength={10} value={dateDisplay(flight.flight_date || "")} onChange={e => updateFlight("flight_date", dateInput(e.target.value, flight.flight_date || ""))} /></div>
      {field("registration", "Registration")}{field("route", "Route")}
      {field("sta", "STA")}{field("ata", "ATA 00:00/00:00")}{field("std", "STD")}{field("atd", "ATD 00:00/00:00")}
      <div><label htmlFor="af-departure-date" className="mb-1 block text-xs font-bold">Departure Date</label><input id="af-departure-date" className={boxedField} maxLength={10} value={dateDisplay(flight.departure_date || "")} onChange={e => updateFlight("departure_date", dateInput(e.target.value, flight.departure_date || ""))} /></div>
      {field("delay", "Delay")}
    </div>
    {AIR_FRANCE_SECTIONS.map(section => <section key={section.title} className="border border-border">
      <h4 className="bg-secondary px-3 py-2 text-center text-sm font-bold text-secondary-foreground">{section.title}</h4>
      <div className="grid grid-cols-2 bg-primary px-3 py-1.5 text-center text-xs font-bold text-primary-foreground"><span>Position</span><span>Security Staff</span></div>
      <div className="space-y-3 p-3">{section.fields.map(([key, label]) => <div key={key}>
        <label htmlFor={`af-${key}`} className="mb-1 block text-sm font-semibold text-foreground">{label}</label>
        <input id={`af-${key}`} className={boxedField} value={sheet[key] || ""} onChange={e => update(key, e.target.value)} />
      </div>)}</div>
    </section>)}
    <div><label htmlFor="af-remarks" className="mb-1 block text-sm font-bold">Remarks</label><textarea id="af-remarks" className={`${boxedField} min-h-20`} value={sheet.remarks || ""} onChange={e => update("remarks", e.target.value)} /></div>
    <div><label htmlFor="af-representative" className="mb-1 block bg-primary px-3 py-2 text-sm font-bold text-primary-foreground">AIRFRANCE Representative</label><input id="af-representative" className={boxedField} value={sheet.security_supervisor || ""} onChange={e => update("security_supervisor", e.target.value)} /></div>
    <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span>Quality and Safety Dept.</span><span>AF Staff Distribution V.06 07Aug2024</span></div>
  </div>;
}

const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c));

export function buildAirFrancePrintHtml(data: Record<string, unknown>, tokens: string, origin: string): string {
  const value = (key: string) => escapeHtml(data[key]);
  const asset = (url: string) => escapeHtml(new URL(url, origin).href);
  const staffTable = (section: typeof AIR_FRANCE_SECTIONS[number]) => `<table class="staff-table"><colgroup><col style="width:50%"><col style="width:50%"></colgroup><tr><th colspan="2" class="briefing">${section.title}</th></tr><tr><th>Position</th><th>Security Staff</th></tr>${section.fields.map(([key, label]) => `<tr><td>${escapeHtml(label)}</td><td class="entry">${value(key)}</td></tr>`).join("")}</table>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>AF Staff Distribution - ${value("flight_no")}</title><style>
  :root { ${tokens} }
  * { box-sizing:border-box; } body { margin:0; background:hsl(var(--document-paper)); color:hsl(var(--document-ink)); font-family:Arial,sans-serif; }
  .page { width:210mm; min-height:297mm; padding:6mm 10mm 8mm; margin:auto; }
  .logos { height:24mm; display:flex; align-items:flex-start; justify-content:space-between; } .link { height:24mm; } .af { width:48mm; margin-top:4mm; }
  h1 { text-align:center; font-size:16pt; margin:-4mm 0 4mm; }
  table { border-collapse:collapse; table-layout:fixed; width:100%; margin-bottom:4mm; } th,td { border:0.25mm solid hsl(var(--document-border)); padding:0.7mm 1.5mm; font-size:9pt; line-height:1.2; overflow-wrap:anywhere; }
  th { background:hsl(var(--document-heading)); color:hsl(var(--document-paper)); text-align:center; } .briefing { background:hsl(var(--document-briefing)); color:hsl(var(--document-ink)); } .entry { white-space:pre-wrap; }
  .staff-table td { height:5.6mm; font-size:8.5pt; } .remarks td { height:19mm; vertical-align:top; } .remarks th { text-align:left; } .representative th { text-align:left; }
  footer { display:flex; justify-content:space-between; font-size:7pt; margin-top:8mm; }
  @page { size:A4 portrait; margin:0; } @media print { body { print-color-adjust:exact; -webkit-print-color-adjust:exact; } .page { margin:0; } table { break-inside:avoid; } }
  </style></head><body><div class="page"><div class="logos"><img class="link" src="${asset(linkLogo.url)}" alt="Link Aero"><img class="af" src="${asset(airFranceLogo.url)}" alt="Air France Security Services"></div><h1>AF Staff Distribution</h1>
  <table><colgroup><col style="width:19%"><col style="width:31%"><col style="width:16%"><col style="width:34%"></colgroup><tr><th>Flight Number</th><th>Date</th><th>Registration</th><th>Route</th></tr><tr><td>${value("flight_no")}</td><td>${value("date")}</td><td>${value("registration")}</td><td>${value("route")}</td></tr></table>
  <table style="margin-top:-4mm"><colgroup><col style="width:7%"><col style="width:12%"><col style="width:7%"><col style="width:24%"><col style="width:50%"></colgroup><tr><th>STA</th><td>${value("sta")}</td><th>ATA</th><td>${value("ata")}</td><th>Delay</th></tr><tr><th>STD</th><td>${value("std")}</td><th>ATD</th><td>${value("atd")}</td><td>${value("delay")}</td></tr></table>
  ${AIR_FRANCE_SECTIONS.map(staffTable).join("")}<table class="remarks"><tr><th>Remarks</th></tr><tr><td class="entry">${value("remarks")}</td></tr></table><table class="representative"><tr><th style="width:52%">AIRFRANCE Representative</th><td>${value("security_supervisor")}</td></tr></table><footer><span>Quality and Safety Dept.</span><span>AF Staff Distribution V.06 07Aug2024</span></footer></div></body></html>`;
}