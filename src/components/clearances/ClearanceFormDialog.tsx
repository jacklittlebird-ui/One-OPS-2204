import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, ChevronsUpDown, Check, Plane, MapPin, ShieldCheck, CalendarRange, FileText, Building2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { CLEARANCE_TYPES, SKD_TYPES, SECURITY_CLEARANCE_TYPES, getServiceCategory, getClearanceTypesByCategory, type ServiceCategory } from "./ClearanceTypes";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import PipelineStepper, { derivePipelineStage } from "@/components/serviceReport/PipelineStepper";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  form: any;
  setForm: (f: any) => void;
  airlines: any[];
  isEdit: boolean;
  onSave: () => void;
}

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function calcNoOfFlights(periodFrom: string, periodTo: string, weekDays: string): number {
  if (!periodFrom || !periodTo || !weekDays) return 0;
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const selectedDays = weekDays.split(",").filter(Boolean).map(d => dayMap[d]).filter(n => n !== undefined);
  if (selectedDays.length === 0) return 0;
  let count = 0;
  const start = new Date(periodFrom);
  const end = new Date(periodTo);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (selectedDays.includes(d.getDay())) count++;
  }
  return count;
}

/** Convert ISO string (yyyy-mm-dd) to local Date (no TZ shift) or undefined */
function toDate(val: string | null | undefined): Date | undefined {
  if (!val) return undefined;
  const str = String(val).trim();
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);
  const dmy = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (dmy) {
    let y = parseInt(dmy[3]);
    if (y < 100) y += y < 50 ? 2000 : 1900;
    return new Date(y, parseInt(dmy[2]) - 1, parseInt(dmy[1]));
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? undefined : d;
}

/** Convert Date to ISO string (yyyy-mm-dd) for storage */
function toISO(d: Date | undefined): string {
  if (!d) return "";
  return format(d, "yyyy-MM-dd");
}

/** Display date as DD/MM/YYYY (TZ-safe) */
function displayDate(val: string | null | undefined): string {
  if (!val) return "";
  const str = String(val).trim();
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const dmy = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (dmy) {
    let [, d, m, y] = dmy;
    if (y.length === 2) y = (parseInt(y) < 50 ? "20" : "19") + y;
    return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
  }
  const d = toDate(str);
  return d ? format(d, "dd/MM/yyyy") : "";
}

function DatePickerField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground")}>
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
    </div>
  );
}

export default function ClearanceFormDialog({ open, onOpenChange, form, setForm, airlines, isEdit, onSave }: Props) {
  const currentCategory = getServiceCategory(form.clearance_type || "Arrival Security");
  const [serviceTab, setServiceTab] = useState<ServiceCategory>(currentCategory);

  useEffect(() => {
    if (open) {
      setServiceTab(getServiceCategory(form.clearance_type || "Arrival Security"));
    }
  }, [open, form.clearance_type]);

  const handleCategoryChange = (cat: ServiceCategory) => {
    setServiceTab(cat);
    const types = getClearanceTypesByCategory(cat);
    if (!types.includes(form.clearance_type)) {
      setForm({ ...form, clearance_type: types[0] });
    }
  };

  const availableTypes = getClearanceTypesByCategory(serviceTab);
  const [airlineOpen, setAirlineOpen] = useState(false);
  const [stationOpen, setStationOpen] = useState(false);
  const { data: airports } = useQuery({
    queryKey: ["airports-iata"],
    queryFn: async () => {
      const { data } = await supabase.from("airports").select("id,iata_code,name").order("iata_code");
      return data || [];
    },
  });

  useEffect(() => {
    const calc = calcNoOfFlights(form.period_from, form.period_to, form.week_days);
    if (calc !== Number(form.no_of_flights)) {
      setForm((prev: any) => ({ ...prev, no_of_flights: calc }));
    }
  }, [form.period_from, form.period_to, form.week_days]);

  const toggleDay = (day: string) => {
    const days = form.week_days ? form.week_days.split(",").filter(Boolean) : [];
    const updated = days.includes(day) ? days.filter((d: string) => d !== day) : [...days, day];
    setForm({ ...form, week_days: updated.join(",") });
  };
  const selectedDays = form.week_days ? form.week_days.split(",") : [];

  const validateAndSave = () => {
    const ct = form.clearance_type || "";
    const staLocked = ct === "Departure Security";
    const missing: string[] = [];
    if (!form.airline_id) missing.push("Account (Airline)");
    if (!form.skd_type) missing.push("Skd Type");
    if (!form.authority) missing.push("Station");
    if (!form.flight_no) missing.push("Flight");
    if (!form.route) missing.push("Route");
    if (!form.arrival_date) missing.push("Arrival Date");
    if (!form.departure_date) missing.push("Departure Date");
    if (!staLocked && !form.sta) missing.push("STA (24h)");
    if (!form.std) missing.push("STD (24h)");
    if (!form.clearance_type) missing.push("Service Type");
    if (missing.length > 0) {
      toast({ title: "Missing Required Fields", description: missing.join(", "), variant: "destructive" });
      return;
    }
    // Clear STA only when locked (Departure Security)
    if (staLocked && form.sta) setForm({ ...form, sta: "" });
    onSave();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] p-0 gap-0 overflow-hidden flex flex-col">
        {/* Gradient header */}
        <DialogHeader className="px-6 py-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b">
          <DialogTitle className="flex items-center gap-2.5 text-base">
            <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
              <Plane size={18} />
            </div>
            <div>
              <div className="text-base font-bold text-foreground">{isEdit ? "Edit Flight Schedule" : "New Flight Schedule"}</div>
              <div className="text-xs font-normal text-muted-foreground mt-0.5">
                {form.flight_no ? <span className="font-mono font-semibold text-primary">{form.flight_no}</span> : "Configure a new flight clearance"}
                {form.route && <span className="ml-2">· {form.route}</span>}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Pipeline stepper */}
        <div className="px-6 py-3 border-b bg-muted/20 flex items-center justify-center">
          <PipelineStepper
            currentStage={derivePipelineStage({
              isLinked: !!form.id,
              reviewStatus: "pending",
              clearanceStatus: form.status,
              dispatchStatus: "Pending",
            })}
          />
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 bg-muted/10">
          {/* Service Category Tabs */}
          <Tabs value={serviceTab} onValueChange={(v) => handleCategoryChange(v as ServiceCategory)}>
            <TabsList className="w-full max-w-sm mx-auto grid grid-cols-2">
              <TabsTrigger value="security" className="gap-1.5"><ShieldCheck size={14} /> Security</TabsTrigger>
              <TabsTrigger value="handling" className="gap-1.5"><Building2 size={14} /> Handling</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Account & Station */}
          <section className="bg-card rounded-lg border shadow-sm overflow-hidden">
            <header className="px-4 py-2.5 bg-muted/40 border-b flex items-center gap-2">
              <Building2 size={14} className="text-primary" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Account & Station</h4>
            </header>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Account (Airline) <span className="text-destructive">*</span></label>
                <Popover open={airlineOpen} onOpenChange={setAirlineOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={airlineOpen} className="w-full justify-between font-normal mt-1">
                      {form.airline_id ? (airlines || []).find((a: any) => a.id === form.airline_id)?.name || "Select Airline" : "Select Airline"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[320px] p-0 pointer-events-auto z-[9999]" align="start" sideOffset={4} onOpenAutoFocus={(e) => e.preventDefault()}>
                    <Command>
                      <CommandInput placeholder="Search airline..." />
                      <CommandList>
                        <CommandEmpty>No airline found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem onSelect={() => { setForm({ ...form, airline_id: "" }); setAirlineOpen(false); }}>
                            <Check className={cn("mr-2 h-4 w-4", !form.airline_id ? "opacity-100" : "opacity-0")} />
                            No Airline
                          </CommandItem>
                          {(airlines || []).map((a: any) => (
                            <CommandItem key={a.id} value={`${a.name} ${a.code}`} onSelect={() => { setForm({ ...form, airline_id: a.id }); setAirlineOpen(false); }}>
                              <Check className={cn("mr-2 h-4 w-4", form.airline_id === a.id ? "opacity-100" : "opacity-0")} />
                              {a.name} ({a.code})
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Station <span className="text-destructive">*</span></label>
                <Popover open={stationOpen} onOpenChange={setStationOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={stationOpen} className="w-full justify-between font-normal mt-1">
                      <span className="flex items-center gap-1.5"><MapPin size={13} className="text-muted-foreground" />{form.authority || "Select Station"}</span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[320px] p-0 pointer-events-auto z-[9999]" align="start" sideOffset={4} onOpenAutoFocus={(e) => e.preventDefault()}>
                    <Command>
                      <CommandInput placeholder="Search station..." />
                      <CommandList>
                        <CommandEmpty>No station found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem onSelect={() => { setForm({ ...form, authority: "" }); setStationOpen(false); }}>
                            <Check className={cn("mr-2 h-4 w-4", !form.authority ? "opacity-100" : "opacity-0")} />
                            —
                          </CommandItem>
                          {(airports || []).map((a: any) => (
                            <CommandItem key={a.id} value={`${a.iata_code} ${a.name}`} onSelect={() => { setForm({ ...form, authority: a.iata_code }); setStationOpen(false); }}>
                              <Check className={cn("mr-2 h-4 w-4", form.authority === a.iata_code ? "opacity-100" : "opacity-0")} />
                              {a.iata_code} — {a.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </section>

          {/* FLIGHT DETAILS Section */}
          <section className="bg-card rounded-lg border shadow-sm overflow-hidden">
            <header className="px-4 py-2.5 bg-muted/40 border-b flex items-center gap-2">
              <Plane size={14} className="text-info" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Flight Details</h4>
            </header>
            <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Flight <span className="text-destructive">*</span></label>
                <Input placeholder="Flight No" value={form.flight_no} onChange={e => setForm({ ...form, flight_no: e.target.value.toUpperCase() })} className="font-mono" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground">Route <span className="text-destructive">*</span></label>
                <Input placeholder="e.g. CAI-JFK-CAI" value={form.route} onChange={e => setForm({ ...form, route: e.target.value.toUpperCase() })} className="font-mono" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Reg No</label>
                <Input placeholder="Registration" value={form.registration} onChange={e => setForm({ ...form, registration: e.target.value.toUpperCase() })} className="font-mono" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">A/C Type</label>
                <Input placeholder="Aircraft Type" value={form.aircraft_type} onChange={e => setForm({ ...form, aircraft_type: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Config</label>
                <Input type="number" placeholder="0" value={form.config} onChange={e => setForm({ ...form, config: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Departure Flight</label>
                <Input placeholder="Departure Flight" value={form.departure_flight} onChange={e => setForm({ ...form, departure_flight: e.target.value.toUpperCase() })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Arrival Flight</label>
                <Input placeholder="Arrival Flight" value={form.arrival_flight} onChange={e => setForm({ ...form, arrival_flight: e.target.value.toUpperCase() })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Skd Type <span className="text-destructive">*</span></label>
                <Select value={form.skd_type || "none"} onValueChange={v => setForm({ ...form, skd_type: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">—</SelectItem>{SKD_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <DatePickerField label="Arrival Date *" value={form.arrival_date} onChange={v => setForm({ ...form, arrival_date: v })} />
              <DatePickerField label="Departure Date *" value={form.departure_date} onChange={v => setForm({ ...form, departure_date: v })} />
              <div className="flex items-center gap-2 pt-5 px-2 rounded-md bg-muted/40 border border-dashed">
                <Checkbox checked={form.royalty} onCheckedChange={v => setForm({ ...form, royalty: !!v })} />
                <label className="text-sm font-medium">Royalty</label>
              </div>
              {(() => {
                const ct = form.clearance_type || "";
                // Departure Security: STA locked & cleared. STD always editable.
                const staLocked = ct === "Departure Security";
                return (
                  <>
                    <div>
                      <label className="text-xs text-muted-foreground">STA (24h) {!staLocked && <span className="text-destructive">*</span>}</label>
                      <Input
                        placeholder={staLocked ? "—" : "HH:MM"}
                        maxLength={5}
                        readOnly={staLocked}
                        disabled={staLocked}
                        className={cn("font-mono", staLocked && "bg-muted text-muted-foreground")}
                        value={staLocked ? "" : (form.sta || "")}
                        onChange={e => {
                          if (staLocked) return;
                          let v = e.target.value.replace(/[^0-9:]/g, "");
                          if (v.length === 2 && !v.includes(":") && form.sta?.length !== 3) v += ":";
                          if (v.length > 5) v = v.slice(0, 5);
                          setForm({ ...form, sta: v });
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">STD (24h) <span className="text-destructive">*</span></label>
                      <Input
                        placeholder="HH:MM"
                        maxLength={5}
                        className="font-mono"
                        value={form.std || ""}
                        onChange={e => {
                          let v = e.target.value.replace(/[^0-9:]/g, "");
                          if (v.length === 2 && !v.includes(":") && form.std?.length !== 3) v += ":";
                          if (v.length > 5) v = v.slice(0, 5);
                          setForm({ ...form, std: v });
                        }}
                      />
                    </div>
                  </>
                );
              })()}
            </div>
          </section>

          {/* DAY OF WEEK & PERIOD */}
          <section className="bg-card rounded-lg border shadow-sm overflow-hidden">
            <header className="px-4 py-2.5 bg-muted/40 border-b flex items-center gap-2">
              <CalendarRange size={14} className="text-violet" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Recurrence & Period</h4>
            </header>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">Days of Week</label>
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => {
                    const allSelected = WEEK_DAYS.every(d => selectedDays.includes(d));
                    setForm({ ...form, week_days: allSelected ? "" : WEEK_DAYS.join(",") });
                  }}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${WEEK_DAYS.every(d => selectedDays.includes(d)) ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}>
                    All
                  </button>
                  {WEEK_DAYS.map(d => (
                    <button key={d} type="button" onClick={() => toggleDay(d)}
                      className={`w-10 py-1 rounded-md text-xs font-semibold border transition-colors ${selectedDays.includes(d) ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-background border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}>
                      {d}
                    </button>
                  ))}
                </div>
                {selectedDays.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">{selectedDays.length} day{selectedDays.length > 1 ? "s" : ""} selected</p>
                )}
              </div>
              <div className="space-y-2">
                <DatePickerField label="From" value={form.period_from} onChange={v => setForm({ ...form, period_from: v })} />
                <DatePickerField label="To" value={form.period_to} onChange={v => setForm({ ...form, period_to: v })} />
                <div>
                  <label className="text-xs text-muted-foreground">No of Flights (auto)</label>
                  <Input type="number" value={form.no_of_flights} readOnly className="bg-muted font-semibold text-primary" />
                </div>
              </div>
            </div>
          </section>

          {/* Clearance Info */}
          <section className="bg-card rounded-lg border shadow-sm overflow-hidden">
            <header className="px-4 py-2.5 bg-muted/40 border-b flex items-center gap-2">
              <ShieldCheck size={14} className="text-success" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Clearance Info</h4>
            </header>
            <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Permit No</label>
                <Input placeholder="Permit No" value={form.permit_no} onChange={e => setForm({ ...form, permit_no: e.target.value })} className="font-mono" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Service Type <span className="text-destructive">*</span></label>
                <Select value={form.clearance_type} onValueChange={v => setForm({ ...form, clearance_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{availableTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Status</label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                    <SelectItem value="Expired">Expired</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DatePickerField label="Requested Date" value={form.requested_date} onChange={v => setForm({ ...form, requested_date: v })} />
              <DatePickerField label="Valid From" value={form.valid_from} onChange={v => setForm({ ...form, valid_from: v })} />
              <DatePickerField label="Valid To" value={form.valid_to} onChange={v => setForm({ ...form, valid_to: v })} />
              <div>
                <label className="text-xs text-muted-foreground">Handling Agent</label>
                <Input placeholder="Handling Agent" value={form.handling_agent} onChange={e => setForm({ ...form, handling_agent: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Passengers</label>
                <Input type="number" placeholder="0" value={form.passengers} onChange={e => setForm({ ...form, passengers: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Cargo (kg)</label>
                <Input type="number" placeholder="0" value={form.cargo_kg} onChange={e => setForm({ ...form, cargo_kg: e.target.value })} />
              </div>
            </div>
          </section>

          {/* OTHER INFO */}
          <section className="bg-card rounded-lg border shadow-sm overflow-hidden">
            <header className="px-4 py-2.5 bg-muted/40 border-b flex items-center gap-2">
              <FileText size={14} className="text-amber" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Other Info</h4>
            </header>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Ref#</label>
                  <Input placeholder="Reference" value={form.ref_no} onChange={e => setForm({ ...form, ref_no: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Notes</label>
                  <Input placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Remarks</label>
                <Input placeholder="Remarks" value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} />
              </div>
            </div>
          </section>
        </div>

        {/* Sticky footer */}
        <div className="px-6 py-3 border-t bg-card flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            <span className="text-destructive">*</span> Required fields
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={validateAndSave} className="min-w-[120px]">
              {isEdit ? "Update" : "Submit"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
