import { useEffect, useState } from "react";
import { format, parse } from "date-fns";
import { CalendarIcon, ChevronsUpDown, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { CLEARANCE_TYPES, SKD_TYPES } from "./ClearanceTypes";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Flight Schedule" : "New Flight Schedule"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {/* Account & Station */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Account (Airline)</label>
              <Popover open={airlineOpen} onOpenChange={setAirlineOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={airlineOpen} className="w-full justify-between font-normal">
                    {form.airline_id ? (airlines || []).find((a: any) => a.id === form.airline_id)?.name || "Select Airline" : "Select Airline"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0" align="start">
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
              <label className="text-xs font-medium text-muted-foreground">Station</label>
              <Popover open={stationOpen} onOpenChange={setStationOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={stationOpen} className="w-full justify-between font-normal">
                    {form.authority || "Select Station"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0" align="start">
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

          {/* FLIGHT DETAILS Section */}
          <div className="border-t pt-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Flight Details</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Flight</label>
                <Input placeholder="Flight No" value={form.flight_no} onChange={e => setForm({ ...form, flight_no: e.target.value.toUpperCase() })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Route</label>
                <Input placeholder="e.g. CAI-JFK-CAI" value={form.route} onChange={e => setForm({ ...form, route: e.target.value.toUpperCase() })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Reg No</label>
                <Input placeholder="Registration" value={form.registration} onChange={e => setForm({ ...form, registration: e.target.value.toUpperCase() })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Config</label>
                <Input type="number" placeholder="0" value={form.config} onChange={e => setForm({ ...form, config: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">A/C Type</label>
                <Input placeholder="Aircraft Type" value={form.aircraft_type} onChange={e => setForm({ ...form, aircraft_type: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Departure Flight</label>
                <Input placeholder="Departure Flight" value={form.departure_flight} onChange={e => setForm({ ...form, departure_flight: e.target.value.toUpperCase() })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Arrival Flight</label>
                <Input placeholder="Arrival Flight" value={form.arrival_flight} onChange={e => setForm({ ...form, arrival_flight: e.target.value.toUpperCase() })} />
              </div>
              <DatePickerField label="Departure Date" value={form.departure_date} onChange={v => setForm({ ...form, departure_date: v })} />
              <DatePickerField label="Arrival Date" value={form.arrival_date} onChange={v => setForm({ ...form, arrival_date: v })} />
              <div>
                <label className="text-xs text-muted-foreground">STA (24h)</label>
                <Input type="time" step="60" value={form.sta} onChange={e => setForm({ ...form, sta: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">STD (24h)</label>
                <Input type="time" step="60" value={form.std} onChange={e => setForm({ ...form, std: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Skd Type</label>
                <Select value={form.skd_type || "none"} onValueChange={v => setForm({ ...form, skd_type: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">—</SelectItem>{SKD_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-5">
                <Checkbox checked={form.royalty} onCheckedChange={v => setForm({ ...form, royalty: !!v })} />
                <label className="text-sm">Royalty</label>
              </div>
            </div>
          </div>

          {/* DAY OF WEEK & PERIOD */}
          <div className="grid grid-cols-2 gap-6 border-t pt-3">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Day of Week</h4>
              <div className="flex flex-wrap gap-1">
                {WEEK_DAYS.map(d => (
                  <button key={d} type="button" onClick={() => toggleDay(d)}
                    className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${selectedDays.includes(d) ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:bg-accent"}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Period of Schedule</h4>
              <div className="space-y-2">
                <DatePickerField label="From" value={form.period_from} onChange={v => setForm({ ...form, period_from: v })} />
                <DatePickerField label="To" value={form.period_to} onChange={v => setForm({ ...form, period_to: v })} />
                <div><label className="text-xs text-muted-foreground">No of Flights (auto)</label><Input type="number" value={form.no_of_flights} readOnly className="bg-muted" /></div>
              </div>
            </div>
          </div>

          {/* Clearance-specific */}
          <div className="border-t pt-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Clearance Info</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Permit No</label>
                <Input placeholder="Permit No" value={form.permit_no} onChange={e => setForm({ ...form, permit_no: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Clearance Type</label>
                <Select value={form.clearance_type} onValueChange={v => setForm({ ...form, clearance_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CLEARANCE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
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
          </div>

          {/* OTHER INFO */}
          <div className="border-t pt-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Other Info</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Ref#</label>
                <Input placeholder="Reference" value={form.ref_no} onChange={e => setForm({ ...form, ref_no: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Notes</label>
                <Input placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className="mt-3">
              <label className="text-xs text-muted-foreground">Remarks</label>
              <Input placeholder="Remarks" value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} />
            </div>
          </div>

          <Button className="w-full" onClick={onSave}>{isEdit ? "Update" : "Submit"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
