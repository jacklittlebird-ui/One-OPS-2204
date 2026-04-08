import { useState, useCallback } from "react";
import { format } from "date-fns";
import {
  FileBarChart2, X, Plane, Clock, Users, DollarSign, UtensilsCrossed,
  BedDouble, Fuel, Plus, Trash2, Building2, CalendarIcon
} from "lucide-react";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import { Constants } from "@/integrations/supabase/types";
import {
  ReportFormData, ReportTab, REPORT_TABS, FLIGHT_STATUSES,
  CateringLineItem, HotacLineItem, FuelLineItem, DelayEntry
} from "./ReportFormTypes";
import { supabase } from "@/integrations/supabase/client";
import { generateAllCharges } from "@/data/airportChargesData";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const handlingTypes = Constants.public.Enums.handling_type;
const currencyOptions = ["USD", "EUR", "EGP"] as const;

const stationOptions = [
  { name: "Cairo", vendor: "Cairo Airport Company" },
  { name: "Hurghada", vendor: "Egyptian Airports" },
  { name: "Sharm El Sheikh", vendor: "Egyptian Airports" },
  { name: "Luxor", vendor: "Egyptian Airports" },
  { name: "Aswan", vendor: "Egyptian Airports" },
];

const allCharges = generateAllCharges();

const inputCls = "text-sm border rounded px-2.5 py-2 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground w-full";
const selectCls = "text-sm border rounded px-2.5 py-2 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full";
const readOnlyCls = "text-sm border rounded px-2.5 py-2 bg-muted text-foreground w-full";

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

/** Convert ISO string (yyyy-mm-dd) to Date or undefined */
function toDate(val: string | null | undefined): Date | undefined {
  if (!val) return undefined;
  const d = new Date(val);
  return isNaN(d.getTime()) ? undefined : d;
}

/** Convert Date to ISO string (yyyy-mm-dd) for storage */
function toISO(d: Date | undefined): string {
  if (!d) return "";
  return format(d, "yyyy-MM-dd");
}

/** Display date as DD/MM/YYYY */
function displayDate(val: string | null | undefined): string {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return "";
  return format(d, "dd/MM/yyyy");
}

function DatePickerField({ label, value, onChange, readOnly }: { label: string; value: string; onChange: (v: string) => void; readOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  if (readOnly) {
    return (
      <FormField label={label}>
        <input className={readOnlyCls} value={displayDate(value)} readOnly />
      </FormField>
    );
  }
  return (
    <FormField label={label}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-sm h-[38px]", !value && "text-muted-foreground")}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? displayDate(value) : "DD/MM/YYYY"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={toDate(value)}
            onSelect={(d) => { onChange(toISO(d)); setOpen(false); }}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </FormField>
  );
}

function TimeField({ label, value, onChange, readOnly }: { label: string; value: string; onChange?: (v: string) => void; readOnly?: boolean }) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onChange) return;
    let v = e.target.value.replace(/[^0-9:]/g, "");
    if (v.length === 2 && !v.includes(":") && (value || "").length !== 3) v += ":";
    if (v.length > 5) v = v.slice(0, 5);
    onChange(v);
  };
  return (
    <FormField label={label}>
      <input
        className={readOnly ? readOnlyCls : inputCls}
        value={value || ""}
        onChange={handleChange}
        readOnly={readOnly}
        placeholder="HH:MM"
        maxLength={5}
      />
    </FormField>
  );
}

function isNightTime(timeStr: string, dateStr: string): boolean {
  if (!timeStr || !dateStr) return false;
  const [h] = timeStr.split(":").map(Number);
  if (isNaN(h)) return false;
  const month = new Date(dateStr).getMonth() + 1;
  return month >= 4 && month <= 10 ? (h >= 17 || h < 3) : (h >= 16 || h < 4);
}

function autoDayNight(td: string, arrivalDate: string): "D" | "N" {
  return (!td || !arrivalDate) ? "D" : isNightTime(td, arrivalDate) ? "N" : "D";
}

function calcGroundTime(co: string, ob: string): string {
  if (!co || !ob) return "";
  const [ch, cm] = co.split(":").map(Number);
  const [oh, om] = ob.split(":").map(Number);
  if (isNaN(ch) || isNaN(cm) || isNaN(oh) || isNaN(om)) return "";
  let diff = (oh * 60 + om) - (ch * 60 + cm);
  if (diff < 0) diff += 24 * 60;
  return `${Math.floor(diff / 60)}:${String(diff % 60).padStart(2, "0")}`;
}

function timeDiffMinutes(t1: string, t2: string): number {
  if (!t1 || !t2) return 0;
  const [h1, m1] = t1.split(":").map(Number);
  const [h2, m2] = t2.split(":").map(Number);
  if ([h1, m1, h2, m2].some(isNaN)) return 0;
  let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (diff < 0) diff += 24 * 60;
  return diff;
}

interface Props {
  data: Partial<ReportFormData>;
  onChange: (d: Partial<ReportFormData>) => void;
  onSave: () => void;
  onCancel: () => void;
  title: string;
}

const tabIcons: Record<ReportTab, React.ReactNode> = {
  "flight": <Plane size={14} />,
  "passengers": <Users size={14} />,
  "timing": <Clock size={14} />,
  "civil-aviation": <DollarSign size={14} />,
  "catering": <UtensilsCrossed size={14} />,
  "hotac": <BedDouble size={14} />,
  "fuel-handling": <Fuel size={14} />,
};

export default function TabbedReportForm({ data, onChange, onSave, onCancel, title }: Props) {
  const [activeTab, setActiveTab] = useState<ReportTab>("flight");

  type DelayCodeRow = { id: string; code: string; description: string; category: string; responsible: string; impact_level: string; avg_minutes: number; active: boolean };
  const { data: delayCodes } = useSupabaseTable<DelayCodeRow>("delay_codes", { orderBy: "code", ascending: true });

  const lookupMtowByReg = useCallback(async (reg: string) => {
    if (!reg || reg.length < 2) return;
    const { data: aircraft } = await supabase
      .from("aircrafts")
      .select("mtow")
      .eq("registration", reg.toUpperCase())
      .limit(1)
      .maybeSingle();
    if (aircraft && aircraft.mtow) {
      const updated = { ...data, registration: reg, mtow: `${aircraft.mtow}` };
      recalcFinancials(updated);
      onChange(updated);
    }
  }, [data, onChange]);

  const set = (key: keyof ReportFormData, val: any) => {
    const updated = { ...data, [key]: val };
    if (key === "co" || key === "ob") {
      updated.groundTime = calcGroundTime(
        key === "co" ? val : (data.co || ""),
        key === "ob" ? val : (data.ob || "")
      );
    }
    // Recalc financials on relevant changes
    const financialKeys: (keyof ReportFormData)[] = ["mtow", "station", "td", "co", "ob", "to", "arrivalDate"];
    const paxKeys: (keyof ReportFormData)[] = ["foreignPaxOut", "egyptianPaxOut", "infantOut"];
    if (financialKeys.includes(key) || paxKeys.includes(key) || key === "handlingFee") {
      recalcFinancials(updated);
    }
    onChange(updated);
  };

  const recalcFinancials = (d: Partial<ReportFormData>) => {
    // Estimated pax bills (always calculate regardless of MTOW)
    const totalOutPax = (d.foreignPaxOut || 0) + (d.egyptianPaxOut || 0) + (d.infantOut || 0);
    d.estimatedForeignBill = +(totalOutPax * 28).toFixed(2);
    d.estimatedLocalBill = +(totalOutPax * 115).toFixed(2);

    const mtowStr = d.mtow || "";
    const tonMatch = mtowStr.match(/(\d+)/);
    if (!tonMatch) return;
    const ton = parseInt(tonMatch[1]);
    const station = d.station || "Cairo";
    const vendor = stationOptions.find(s => s.name === station)?.vendor || "Egyptian Airports";
    const charge = allCharges.find(c => c.vendorName === vendor && c.mtow === `${ton} TON`);
    if (!charge) return;
    const isNight = isNightTime(d.td || "", d.arrivalDate || "");
    const landingFee = isNight ? charge.landingNight : charge.landingDay;
    const groundMin = timeDiffMinutes(d.co || "", d.ob || "");

    d.landingCharge = +landingFee.toFixed(2);
    let civTotal = landingFee;
    if (groundMin > 10 * 60) {
      const days = Math.ceil(groundMin / (24 * 60));
      d.housingDays = days;
      d.housingCharge = +(charge.housing * days).toFixed(2);
      d.parkingCharge = 0;
      civTotal += d.housingCharge;
    } else if (groundMin > 2 * 60) {
      d.parkingCharge = +charge.parkingDay.toFixed(2);
      d.housingCharge = 0;
      d.housingDays = 0;
      civTotal += d.parkingCharge;
    } else {
      d.parkingCharge = 0;
      d.housingCharge = 0;
      d.housingDays = 0;
    }
    d.civilAviationFee = +civTotal.toFixed(2);
    d.airportCharge = +landingFee.toFixed(2);

    // Parking hours
    if (groundMin > 0) {
      d.totalParkingHours = +(groundMin / 60).toFixed(2);
    }

    d.totalCost = +((d.civilAviationFee || 0) + (d.handlingFee || 0) + (d.airportCharge || 0)
      + (d.fuelCharge || 0) + (d.cateringCharge || 0) + (d.hotacCharge || 0)).toFixed(2);
  };

  // Delay handlers
  const delays = data.delays || [];
  const setDelay = (index: number, field: keyof DelayEntry, val: any) => {
    const newDelays = [...delays];
    newDelays[index] = { ...newDelays[index], [field]: val };
    if (field === "code") {
      const found = delayCodes.find(dc => dc.code === val);
      newDelays[index].explanation = found?.description || "";
    }
    onChange({ ...data, delays: newDelays });
  };

  // Line item helpers
  const addCateringLine = () => {
    const items = [...(data.cateringItems || []), { catering_item: "", supplier: "", quantity: 0, price_per_unit: 0, total: 0 }];
    onChange({ ...data, cateringItems: items });
  };
  const setCateringLine = (i: number, field: keyof CateringLineItem, val: any) => {
    const items = [...(data.cateringItems || [])];
    items[i] = { ...items[i], [field]: val };
    if (field === "quantity" || field === "price_per_unit") {
      items[i].total = items[i].quantity * items[i].price_per_unit;
    }
    const cateringCharge = items.reduce((s, item) => s + item.total, 0);
    onChange({ ...data, cateringItems: items, cateringCharge });
  };
  const removeCateringLine = (i: number) => {
    const items = (data.cateringItems || []).filter((_, idx) => idx !== i);
    const cateringCharge = items.reduce((s, item) => s + item.total, 0);
    onChange({ ...data, cateringItems: items, cateringCharge });
  };

  const addHotacLine = () => {
    const items = [...(data.hotacItems || []), { hotel_name: "", room_classification: "", type_of_service: "", quantity: 0, price_per_night: 0, total: 0 }];
    onChange({ ...data, hotacItems: items });
  };
  const setHotacLine = (i: number, field: keyof HotacLineItem, val: any) => {
    const items = [...(data.hotacItems || [])];
    items[i] = { ...items[i], [field]: val };
    if (field === "quantity" || field === "price_per_night") {
      items[i].total = items[i].quantity * items[i].price_per_night;
    }
    const hotacCharge = items.reduce((s, item) => s + item.total, 0);
    onChange({ ...data, hotacItems: items, hotacCharge });
  };
  const removeHotacLine = (i: number) => {
    const items = (data.hotacItems || []).filter((_, idx) => idx !== i);
    const hotacCharge = items.reduce((s, item) => s + item.total, 0);
    onChange({ ...data, hotacItems: items, hotacCharge });
  };

  const addFuelLine = () => {
    const items = [...(data.fuelItems || []), { fuel_type: "", supplier: "", quantity: 0, price_per_unit: 0, total: 0 }];
    onChange({ ...data, fuelItems: items });
  };
  const setFuelLine = (i: number, field: keyof FuelLineItem, val: any) => {
    const items = [...(data.fuelItems || [])];
    items[i] = { ...items[i], [field]: val };
    if (field === "quantity" || field === "price_per_unit") {
      items[i].total = items[i].quantity * items[i].price_per_unit;
    }
    const fuelCharge = items.reduce((s, item) => s + item.total, 0);
    onChange({ ...data, fuelItems: items, fuelCharge });
  };
  const removeFuelLine = (i: number) => {
    const items = (data.fuelItems || []).filter((_, idx) => idx !== i);
    const fuelCharge = items.reduce((s, item) => s + item.total, 0);
    onChange({ ...data, fuelItems: items, fuelCharge });
  };

  const flightLabel = data.flightNo ? `${data.flightNo}` : "New Report";
  const routeLabel = data.route || "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm">
      <div className="bg-card rounded-xl border shadow-2xl w-full max-w-5xl max-h-[94vh] overflow-hidden m-4 flex flex-col">
        {/* Header */}
        <div className="bg-card border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-foreground text-lg flex items-center gap-2">
              <FileBarChart2 size={18} className="text-primary" />{title}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              <span className="text-primary font-semibold">{flightLabel}</span>
              {routeLabel && <> · {routeLabel}</>}
            </p>
          </div>
          <button onClick={onCancel} className="p-1.5 hover:bg-muted rounded-full text-muted-foreground"><X size={18} /></button>
        </div>

        {/* Flight status bar */}
        <div className="px-6 py-2 border-b flex items-center gap-1 bg-muted/30">
          {FLIGHT_STATUSES.map((s, i) => (
            <button
              key={s}
              onClick={() => set("flightStatus", s)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                data.flightStatus === s
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Tab navigation */}
        <div className="px-6 py-2 border-b flex flex-wrap gap-1 bg-muted/20">
          {REPORT_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                activeTab === t.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {tabIcons[t.key]}{t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "flight" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-3 flex items-center gap-2"><Plane size={14} />Flight Info</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <FormField label="Account / Operator"><input className={inputCls} value={data.operator || ""} onChange={e => set("operator", e.target.value)} placeholder="TRANSAVIA FRANCE" /></FormField>
                  <FormField label="Flight Number"><input className={inputCls} value={data.flightNo || ""} onChange={e => set("flightNo", e.target.value)} placeholder="TO123/4" /></FormField>
                  <FormField label="Station">
                    <select className={selectCls} value={data.station || "Cairo"} onChange={e => set("station", e.target.value)}>
                      {stationOptions.map(s => <option key={s.name}>{s.name}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Route"><input className={inputCls} value={data.route || ""} onChange={e => set("route", e.target.value)} placeholder="ORY/CAI/ORY" /></FormField>
                  <FormField label="Reg No"><input className={inputCls} value={data.registration || ""} onChange={e => set("registration", e.target.value)} onBlur={e => lookupMtowByReg(e.target.value)} /></FormField>
                  <FormField label="A/C Type"><input className={inputCls} value={data.aircraftType || ""} onChange={e => set("aircraftType", e.target.value)} /></FormField>
                  <FormField label="MTOW"><input className={inputCls} value={data.mtow || ""} onChange={e => set("mtow", e.target.value)} /></FormField>
                  <FormField label="Config"><input type="number" className={inputCls} value={data.paxInAdultI || ""} onChange={e => set("paxInAdultI", +e.target.value)} /></FormField>
                  <TimeField label="STA" value={data.sta || ""} onChange={v => set("sta", v)} />
                  <TimeField label="STD" value={data.std || ""} onChange={v => set("std", v)} />
                  <DatePickerField label="Arrival Date" value={data.arrivalDate || ""} onChange={v => set("arrivalDate", v)} />
                  <DatePickerField label="Departure Date" value={data.departureDate || ""} onChange={v => set("departureDate", v)} />
                  <FormField label="Handling Type">
                    <select className={selectCls} value={data.handlingType} onChange={e => set("handlingType", e.target.value)}>
                      {handlingTypes.map(h => <option key={h}>{h}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Confirmation No"><input className={inputCls} value={data.confirmationNo || ""} onChange={e => set("confirmationNo", e.target.value)} /></FormField>
                  <FormField label="Performed By"><input className={inputCls} value={data.performedBy || ""} onChange={e => set("performedBy", e.target.value)} /></FormField>
                  <FormField label="Currency">
                    <select className={selectCls} value={data.currency} onChange={e => set("currency", e.target.value as any)}>
                      {currencyOptions.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </FormField>
                </div>
              </div>
              {/* Services & Tags */}
              <div>
                <h3 className="text-sm font-bold text-accent uppercase tracking-wider mb-3">Services & Tags</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <FormField label="Project Tags"><input className={inputCls} value={data.projectTags || ""} onChange={e => set("projectTags", e.target.value)} /></FormField>
                  <FormField label="Check-In System"><input className={inputCls} value={data.checkInSystem || ""} onChange={e => set("checkInSystem", e.target.value)} /></FormField>
                </div>
              </div>
            </div>
          )}

          {activeTab === "passengers" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-3 border-b pb-2">Foreign Passengers</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Foreign Pax IN"><input type="number" className={inputCls} value={data.foreignPaxIn || ""} onChange={e => set("foreignPaxIn", +e.target.value)} /></FormField>
                    <FormField label="Foreign Pax OUT"><input type="number" className={inputCls} value={data.foreignPaxOut || ""} onChange={e => set("foreignPaxOut", +e.target.value)} /></FormField>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-3 border-b pb-2">Egyptian Passengers</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Egyptian Pax IN"><input type="number" className={inputCls} value={data.egyptianPaxIn || ""} onChange={e => set("egyptianPaxIn", +e.target.value)} /></FormField>
                    <FormField label="Egyptian Pax OUT"><input type="number" className={inputCls} value={data.egyptianPaxOut || ""} onChange={e => set("egyptianPaxOut", +e.target.value)} /></FormField>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 border-b pb-2">Other</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <FormField label="Infant In"><input type="number" className={inputCls} value={data.infantIn || ""} onChange={e => set("infantIn", +e.target.value)} /></FormField>
                  <FormField label="Infant Out"><input type="number" className={inputCls} value={data.infantOut || ""} onChange={e => set("infantOut", +e.target.value)} /></FormField>
                  <FormField label="Crew"><input type="number" className={inputCls} value={data.crewCount || ""} onChange={e => set("crewCount", +e.target.value)} /></FormField>
                  <FormField label="PAX Transit"><input type="number" className={inputCls} value={data.paxTransit || ""} onChange={e => set("paxTransit", +e.target.value)} /></FormField>
                  <FormField label="Total Departing Pax"><input type="number" className={readOnlyCls} value={data.totalDepartingPax || ""} readOnly /></FormField>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-success uppercase tracking-wider mb-3 border-b pb-2">Estimated Billing (Preview Only)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Estimated Foreign Pax Bill (USD)"><input type="number" step="0.01" className={inputCls} value={data.estimatedForeignBill || ""} onChange={e => set("estimatedForeignBill", +e.target.value)} /></FormField>
                  <FormField label="Estimated Local Pax Bill (EGP)"><input type="number" step="0.01" className={inputCls} value={data.estimatedLocalBill || ""} onChange={e => set("estimatedLocalBill", +e.target.value)} /></FormField>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-warning uppercase tracking-wider mb-3 border-b pb-2">Optional Services (Qty — Included in Egyptian/EGP Bill)</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <FormField label="Fire Cart Qty"><input type="number" className={inputCls} value={data.fireCartQty || ""} onChange={e => set("fireCartQty", +e.target.value)} /></FormField>
                  <FormField label="Follow Me Qty"><input type="number" className={inputCls} value={data.followMeQty || ""} onChange={e => set("followMeQty", +e.target.value)} /></FormField>
                  <FormField label="Jetway Qty"><input type="number" className={inputCls} value={data.jetwayQty || ""} onChange={e => set("jetwayQty", +e.target.value)} /></FormField>
                  <FormField label="MET Folder Qty"><input type="number" className={inputCls} value={data.metFolderQty || ""} onChange={e => set("metFolderQty", +e.target.value)} /></FormField>
                  <FormField label="File FLT Plan Qty"><input type="number" className={inputCls} value={data.fileFltPlanQty || ""} onChange={e => set("fileFltPlanQty", +e.target.value)} /></FormField>
                  <FormField label="Print Operational FLT Plan Qty"><input type="number" className={inputCls} value={data.printOpsFltPlanQty || ""} onChange={e => set("printOpsFltPlanQty", +e.target.value)} /></FormField>
                </div>
              </div>
            </div>
          )}

          {activeTab === "timing" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-info uppercase tracking-wider mb-3 flex items-center gap-2"><Clock size={14} />Aircraft Movement Timings</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <TimeField label="Touch Down (T/D)" value={data.td || ""} onChange={v => set("td", v)} />
                  <TimeField label="Chocks On (C/O)" value={data.co || ""} onChange={v => set("co", v)} />
                  <TimeField label="Chocks Off (O/B)" value={data.ob || ""} onChange={v => set("ob", v)} />
                  <TimeField label="Take Off (T/O)" value={data.to || ""} onChange={v => set("to", v)} />
                  <TimeField label="ATA (Actual Arrival)" value={data.ata || ""} onChange={v => set("ata", v)} />
                  <TimeField label="ATD (Actual Departure)" value={data.atd || ""} onChange={v => set("atd", v)} />
                  <TimeField label="STA (Read-Only)" value={data.sta || ""} readOnly />
                  <TimeField label="STD (Read-Only)" value={data.std || ""} readOnly />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-warning uppercase tracking-wider mb-3">Parking / Housing Duration</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <FormField label="Landing Time">
                    <input className={readOnlyCls} value={autoDayNight(data.td || "", data.arrivalDate || "") === "D" ? "Day Landing" : "Night Landing"} readOnly />
                  </FormField>
                  <FormField label="Day / Night (auto)">
                    <span className={`inline-flex items-center px-2 py-2 rounded text-sm font-bold ${
                      autoDayNight(data.td || "", data.arrivalDate || "") === "N" ? "bg-info/15 text-info" : "bg-warning/15 text-warning"
                    }`}>
                      {autoDayNight(data.td || "", data.arrivalDate || "")}
                    </span>
                  </FormField>
                  <FormField label="Ground Time (HH:MM)"><input className={readOnlyCls} value={data.groundTime || calcGroundTime(data.co || "", data.ob || "")} readOnly /></FormField>
                  <FormField label="Parking Day Hours"><input type="number" step="0.01" className={inputCls} value={data.parkingDayHours || ""} onChange={e => set("parkingDayHours", +e.target.value)} /></FormField>
                  <FormField label="Parking Night Hours"><input type="number" step="0.01" className={inputCls} value={data.parkingNightHours || ""} onChange={e => set("parkingNightHours", +e.target.value)} /></FormField>
                  <FormField label="Total Parking Time (Hrs)"><input type="number" step="0.01" className={readOnlyCls} value={data.totalParkingHours || ""} readOnly /></FormField>
                  <FormField label="Housing (Days)"><input type="number" step="0.01" className={readOnlyCls} value={data.housingDays || ""} readOnly /></FormField>
                </div>
              </div>
              {/* Delay Codes */}
              <div>
                <h3 className="text-sm font-bold text-destructive uppercase tracking-wider mb-3">Delay Codes (up to 4)</h3>
                {delays.map((d, i) => (
                  <div key={i} className="grid grid-cols-[1fr_80px_2fr_auto] gap-2 mb-2 items-end">
                    <FormField label={`DLY Code ${i + 1}`}>
                      <select className={selectCls} value={d.code} onChange={e => setDelay(i, "code", e.target.value)}>
                        <option value="">— Select —</option>
                        {delayCodes.filter(dc => dc.active).map(dc => (
                          <option key={dc.id} value={dc.code}>{dc.code} – {dc.description.slice(0, 40)}</option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Min">
                      <input type="number" className={inputCls} value={d.timing || ""} onChange={e => setDelay(i, "timing", +e.target.value)} />
                    </FormField>
                    <FormField label="Explanation">
                      <input className={readOnlyCls} value={d.explanation} readOnly />
                    </FormField>
                    <button onClick={() => onChange({ ...data, delays: delays.filter((_, idx) => idx !== i) })} className="p-1.5 text-destructive hover:text-destructive/80 mb-0.5"><X size={14} /></button>
                  </div>
                ))}
                {delays.length < 4 && (
                  <button onClick={() => onChange({ ...data, delays: [...delays, { code: "", timing: 0, explanation: "" }] })} className="toolbar-btn-outline text-xs mt-1"><Plus size={12} /> Add Delay</button>
                )}
              </div>
            </div>
          )}

          {activeTab === "civil-aviation" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-3 flex items-center gap-2 border-b pb-2"><Building2 size={14} />Flight Details</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <FormField label="Flight No"><input className={readOnlyCls} value={data.flightNo || ""} readOnly /></FormField>
                  <FormField label="MTOW (Tons)"><input className={readOnlyCls} value={data.mtow || ""} readOnly /></FormField>
                  <FormField label="Station"><input className={readOnlyCls} value={data.station || ""} readOnly /></FormField>
                  <FormField label="Route"><input className={readOnlyCls} value={data.route || ""} readOnly /></FormField>
                  <DatePickerField label="Departure Date" value={data.departureDate || ""} onChange={() => {}} readOnly />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-success uppercase tracking-wider mb-3 border-b pb-2">Charges Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <FormField label="Landing Charge ($)"><input type="number" className={readOnlyCls} value={data.landingCharge || ""} readOnly /></FormField>
                  <FormField label="Parking Charge ($)"><input type="number" className={readOnlyCls} value={data.parkingCharge || ""} readOnly /></FormField>
                  <FormField label="Housing Charge ($)"><input type="number" className={readOnlyCls} value={data.housingCharge || ""} readOnly /></FormField>
                  <FormField label="Total Civil Aviation ($)"><input type="number" className={readOnlyCls + " font-bold"} value={data.civilAviationFee || ""} readOnly /></FormField>
                </div>
              </div>
            </div>
          )}

          {activeTab === "catering" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                  <UtensilsCrossed size={14} />Catering
                </h3>
                <span className="text-sm font-semibold text-foreground">Grand Total: {(data.cateringCharge || 0).toFixed(2)}</span>
              </div>
              <p className="text-xs text-primary font-semibold">{data.flightNo} / {data.route}</p>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="data-table-header px-4 py-2.5 text-left">Catering Item</th>
                      <th className="data-table-header px-4 py-2.5 text-left">Supplier</th>
                      <th className="data-table-header px-4 py-2.5 text-left w-24">Quantity</th>
                      <th className="data-table-header px-4 py-2.5 text-left w-28">Price / Unit</th>
                      <th className="data-table-header px-4 py-2.5 text-left w-28">Total</th>
                      <th className="data-table-header px-4 py-2.5 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.cateringItems || []).map((item, i) => (
                      <tr key={i} className="data-table-row">
                        <td className="px-4 py-2"><input className={inputCls} value={item.catering_item} onChange={e => setCateringLine(i, "catering_item", e.target.value)} /></td>
                        <td className="px-4 py-2"><input className={inputCls} value={item.supplier} onChange={e => setCateringLine(i, "supplier", e.target.value)} /></td>
                        <td className="px-4 py-2"><input type="number" className={inputCls} value={item.quantity} onChange={e => setCateringLine(i, "quantity", +e.target.value)} /></td>
                        <td className="px-4 py-2"><input type="number" step="0.01" className={inputCls} value={item.price_per_unit} onChange={e => setCateringLine(i, "price_per_unit", +e.target.value)} /></td>
                        <td className="px-4 py-2 font-semibold text-foreground">{item.total.toFixed(2)}</td>
                        <td className="px-4 py-2"><button onClick={() => removeCateringLine(i)} className="text-destructive hover:text-destructive/80"><Trash2 size={14} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={addCateringLine} className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"><Plus size={12} /> Add a line</button>
            </div>
          )}

          {activeTab === "hotac" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                  <BedDouble size={14} />HOTAC
                </h3>
                <span className="text-sm font-semibold text-foreground">Grand Total: {(data.hotacCharge || 0).toFixed(2)}</span>
              </div>
              <p className="text-xs text-primary font-semibold">{data.flightNo} / {data.route}</p>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="data-table-header px-4 py-2.5 text-left">Hotel Name</th>
                      <th className="data-table-header px-4 py-2.5 text-left">Room Classification</th>
                      <th className="data-table-header px-4 py-2.5 text-left">Type of Service</th>
                      <th className="data-table-header px-4 py-2.5 text-left w-24">Quantity</th>
                      <th className="data-table-header px-4 py-2.5 text-left w-28">Price / Night</th>
                      <th className="data-table-header px-4 py-2.5 text-left w-28">Total</th>
                      <th className="data-table-header px-4 py-2.5 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.hotacItems || []).map((item, i) => (
                      <tr key={i} className="data-table-row">
                        <td className="px-4 py-2"><input className={inputCls} value={item.hotel_name} onChange={e => setHotacLine(i, "hotel_name", e.target.value)} /></td>
                        <td className="px-4 py-2"><input className={inputCls} value={item.room_classification} onChange={e => setHotacLine(i, "room_classification", e.target.value)} /></td>
                        <td className="px-4 py-2"><input className={inputCls} value={item.type_of_service} onChange={e => setHotacLine(i, "type_of_service", e.target.value)} /></td>
                        <td className="px-4 py-2"><input type="number" className={inputCls} value={item.quantity} onChange={e => setHotacLine(i, "quantity", +e.target.value)} /></td>
                        <td className="px-4 py-2"><input type="number" step="0.01" className={inputCls} value={item.price_per_night} onChange={e => setHotacLine(i, "price_per_night", +e.target.value)} /></td>
                        <td className="px-4 py-2 font-semibold text-foreground">{item.total.toFixed(2)}</td>
                        <td className="px-4 py-2"><button onClick={() => removeHotacLine(i)} className="text-destructive hover:text-destructive/80"><Trash2 size={14} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={addHotacLine} className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"><Plus size={12} /> Add a line</button>
            </div>
          )}

          {activeTab === "fuel-handling" && (
            <div className="space-y-6">
              {/* Fuel */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2"><Fuel size={14} />Fuel</h3>
                  <span className="text-sm font-semibold text-foreground">Fuel Total: {(data.fuelCharge || 0).toFixed(2)}</span>
                </div>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="data-table-header px-4 py-2.5 text-left">Fuel Type</th>
                        <th className="data-table-header px-4 py-2.5 text-left">Supplier</th>
                        <th className="data-table-header px-4 py-2.5 text-left w-24">Quantity</th>
                        <th className="data-table-header px-4 py-2.5 text-left w-28">Price / Unit</th>
                        <th className="data-table-header px-4 py-2.5 text-left w-28">Total</th>
                        <th className="data-table-header px-4 py-2.5 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.fuelItems || []).map((item, i) => (
                        <tr key={i} className="data-table-row">
                          <td className="px-4 py-2"><input className={inputCls} value={item.fuel_type} onChange={e => setFuelLine(i, "fuel_type", e.target.value)} /></td>
                          <td className="px-4 py-2"><input className={inputCls} value={item.supplier} onChange={e => setFuelLine(i, "supplier", e.target.value)} /></td>
                          <td className="px-4 py-2"><input type="number" className={inputCls} value={item.quantity} onChange={e => setFuelLine(i, "quantity", +e.target.value)} /></td>
                          <td className="px-4 py-2"><input type="number" step="0.01" className={inputCls} value={item.price_per_unit} onChange={e => setFuelLine(i, "price_per_unit", +e.target.value)} /></td>
                          <td className="px-4 py-2 font-semibold text-foreground">{item.total.toFixed(2)}</td>
                          <td className="px-4 py-2"><button onClick={() => removeFuelLine(i)} className="text-destructive hover:text-destructive/80"><Trash2 size={14} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button onClick={addFuelLine} className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"><Plus size={12} /> Add a line</button>
              </div>

              {/* Handling */}
              <div>
                <h3 className="text-sm font-bold text-success uppercase tracking-wider mb-3 flex items-center gap-2 border-b pb-2"><DollarSign size={14} />Handling & Totals</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <FormField label="Handling Fee ($)"><input type="number" step="0.01" className={inputCls} value={data.handlingFee || ""} onChange={e => set("handlingFee", +e.target.value)} /></FormField>
                  <FormField label="Civil Aviation ($)"><input type="number" className={readOnlyCls} value={data.civilAviationFee || ""} readOnly /></FormField>
                  <FormField label="Airport Charge ($)"><input type="number" className={readOnlyCls} value={data.airportCharge || ""} readOnly /></FormField>
                  <FormField label="Catering ($)"><input type="number" className={readOnlyCls} value={data.cateringCharge || ""} readOnly /></FormField>
                  <FormField label="HOTAC ($)"><input type="number" className={readOnlyCls} value={data.hotacCharge || ""} readOnly /></FormField>
                  <FormField label="Fuel ($)"><input type="number" className={readOnlyCls} value={data.fuelCharge || ""} readOnly /></FormField>
                  <FormField label="Total Cost ($)">
                    <input type="number" className={readOnlyCls + " font-bold text-success"} value={
                      ((data.civilAviationFee || 0) + (data.handlingFee || 0) + (data.airportCharge || 0)
                      + (data.fuelCharge || 0) + (data.cateringCharge || 0) + (data.hotacCharge || 0)).toFixed(2)
                    } readOnly />
                  </FormField>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-card border-t px-6 py-4 flex gap-3 justify-end">
          <button onClick={onCancel} className="toolbar-btn-outline">Cancel</button>
          <button onClick={onSave} className="toolbar-btn-primary">Save Report</button>
        </div>
      </div>
    </div>
  );
}
