import { useState, useRef, useCallback, useMemo } from "react";
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, X, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ParsedRow, parseScheduleFile } from "@/lib/scheduleParser";
import { CLEARANCE_TYPES, SECURITY_CLEARANCE_TYPES, getServiceCategory, type ServiceCategory } from "@/components/clearances/ClearanceTypes";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultCategory?: ServiceCategory;
}

// Merge route segments: "SSH/HBE" + "HBE/SSH" -> "SSH/HBE/SSH"
function mergeRoutes(a: string, b: string): string {
  const segA = (a || "").split("/").map(s => s.trim()).filter(Boolean);
  const segB = (b || "").split("/").map(s => s.trim()).filter(Boolean);
  if (!segA.length) return segB.join("/");
  if (!segB.length) return segA.join("/");
  // If last of A === first of B, drop the duplicate
  if (segA[segA.length - 1].toUpperCase() === segB[0].toUpperCase()) {
    return [...segA, ...segB.slice(1)].join("/");
  }
  return [...segA, ...segB].join("/");
}

// Merge flight numbers: "SM 0034" + "SM 0035" -> "SM 0034/0035"
function mergeFlightNumbers(a: string, b: string): string {
  const A = (a || "").trim();
  const B = (b || "").trim();
  if (!A) return B;
  if (!B) return A;
  // Try to detect carrier prefix (letters/digits then space)
  const matchA = A.match(/^([A-Z0-9]{2,3})\s*(.+)$/i);
  const matchB = B.match(/^([A-Z0-9]{2,3})\s*(.+)$/i);
  if (matchA && matchB && matchA[1].toUpperCase() === matchB[1].toUpperCase()) {
    return `${matchA[1]} ${matchA[2]}/${matchB[2]}`;
  }
  return `${A}/${B}`;
}

// For Turnaround Security: pair each row with the next row (same date when possible),
// merging flight#, route, taking next.sta as current.std, and removing the next row.
function pairTurnaroundFlights(rows: ParsedRow[]): ParsedRow[] {
  const result: ParsedRow[] = [];
  const consumed = new Set<number>();
  for (let i = 0; i < rows.length; i++) {
    if (consumed.has(i)) continue;
    const cur = rows[i];
    if (cur.service_type !== "Turnaround Security") {
      result.push(cur);
      continue;
    }
    // Find next unconsumed turnaround row (prefer same arrival date)
    let nextIdx = -1;
    for (let j = i + 1; j < rows.length; j++) {
      if (consumed.has(j)) continue;
      if (rows[j].service_type !== "Turnaround Security") continue;
      nextIdx = j;
      if ((rows[j].arrival_date || "") === (cur.arrival_date || "")) break;
    }
    if (nextIdx === -1) {
      result.push(cur);
      continue;
    }
    const nxt = rows[nextIdx];
    consumed.add(nextIdx);
    result.push({
      ...cur,
      flight_number: mergeFlightNumbers(cur.flight_number, nxt.flight_number),
      route: mergeRoutes(cur.route, nxt.route),
      std: nxt.sta || cur.std,
      departure_date: nxt.arrival_date || cur.departure_date,
      departure_flight: nxt.flight_number || cur.departure_flight,
    });
  }
  return result;
}

export default function ScheduleUploadDialog({ open, onOpenChange, defaultCategory = "handling" }: Props) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"upload" | "preview" | "importing">("upload");
  const [flights, setFlights] = useState<ParsedRow[]>([]);
  const [isTrafficReport, setIsTrafficReport] = useState(false);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [selectedAirline, setSelectedAirline] = useState("");
  const [selectedStation, setSelectedStation] = useState("");
  const [dragging, setDragging] = useState(false);

  const { data: airports } = useQuery({
    queryKey: ["airports-iata-upload"],
    queryFn: async () => {
      const { data } = await supabase.from("airports").select("id,iata_code,name,city");
      return data || [];
    },
  });

  const { data: airlines } = useQuery({
    queryKey: ["airlines-upload"],
    queryFn: async () => {
      const { data } = await supabase.from("airlines").select("id,name,code,iata_code");
      return data || [];
    },
  });

  const processFile = useCallback(async (file: File) => {
    if (!selectedAirline) {
      toast({ title: "Airline required", description: "Please select an airline before uploading.", variant: "destructive" });
      return;
    }
    if (!selectedStation) {
      toast({ title: "Station required", description: "Please select a station before uploading.", variant: "destructive" });
      return;
    }

    setFileName(file.name);
    try {
      const result = await parseScheduleFile(file);
      if (result.rows.length === 0) {
        toast({ title: "Empty file", description: "No data rows found. Check the file format.", variant: "destructive" });
        return;
      }
      const defaultType = defaultCategory === "security" ? "Arrival Security" : "Full Handling";
      const normalized = result.rows.map(r => {
        const cat = getServiceCategory(r.service_type as any);
        // If parsed type doesn't match the active tab category, force the default
        return cat === defaultCategory ? r : { ...r, service_type: defaultType };
      });
      const paired = pairTurnaroundFlights(normalized);
      setFlights(paired);
      setIsTrafficReport(result.isTrafficReport);
      setStep("preview");
    } catch (err: any) {
      toast({ title: "Parse Error", description: err.message, variant: "destructive" });
    }
  }, [selectedAirline, selectedStation, defaultCategory]);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
    e.target.value = "";
  }, [processFile]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await processFile(file);
  }, [processFile]);

  const updateFlight = (idx: number, key: keyof ParsedRow, value: any) => {
    setFlights(prev => prev.map((f, i) => i === idx ? { ...f, [key]: value } : f));
  };

  const removeFlight = (idx: number) => {
    setFlights(prev => prev.filter((_, i) => i !== idx));
  };

  const handleImport = async () => {
    if (flights.length === 0) return;
    setImporting(true);
    setStep("importing");

    try {
      const records = flights.map(f => {
        const ct = f.service_type || "Full Handling";
        const clearSta = ct === "Departure Security";
        const clearStd = ct === "Arrival Security";
        return {
        flight_no: f.flight_number || f.arrival_flight || f.departure_flight,
        airline_id: selectedAirline || null,
        route: f.route,
        aircraft_type: f.aircraft_type,
        registration: f._ac_reg || f.config,
        sta: clearSta ? null : (f.sta || null),
        std: clearStd ? null : (f.std || null),
        arrival_date: f.arrival_date || null,
        departure_date: f.departure_date || null,
        arrival_flight: f.arrival_flight || null,
        departure_flight: f.departure_flight || null,
        passengers: 0,
        cargo_kg: 0,
        week_days: f.week_days?.join(",") || null,
        skd_type: "Schedule",
        clearance_type: ct,
        permit_no: "",
        handling_agent: "",
        config: parseInt(f.config) || null,
        authority: selectedStation,
        status: "Approved" as const,
        purpose: "Scheduled",
        period_from: f.period_from || null,
        period_to: f.period_to || null,
        no_of_flights: f.number_of_flights || null,
        ref_no: f.ref_number || null,
        notes: f.notes || null,
      };
      });

      // Remove duplicates: delete existing records matching same airline + station + flight_no + dates
      const uniqueKeys = [...new Set(records.map(r => r.flight_no).filter(Boolean))];
      if (uniqueKeys.length > 0 && selectedAirline) {
        let query = supabase
          .from("flight_schedules")
          .delete()
          .eq("airline_id", selectedAirline)
          .eq("authority", selectedStation)
          .in("flight_no", uniqueKeys as string[]);
        await query;
      }

      const { error } = await supabase.from("flight_schedules").insert(records);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["flight_schedules"] });
      toast({ title: "✅ Import Complete", description: `${records.length} flight records imported (duplicates replaced).` });
      handleClose();
    } catch (err: any) {
      toast({ title: "Import Error", description: err.message, variant: "destructive" });
      setStep("preview");
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setStep("upload");
    setFlights([]);
    setIsTrafficReport(false);
    setFileName("");
    setSelectedAirline("");
    setSelectedStation("");
    onOpenChange(false);
  };

  const formatBadges = [
    { label: "Excel (.xlsx)", ext: ".xlsx" },
    { label: "Word (.docx)", ext: ".docx" },
    { label: "PDF (.pdf)", ext: ".pdf" },
    { label: "CSV (.csv)", ext: ".csv" },
  ];

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-[95vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-primary" />
            Import Schedule
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Airline <span className="text-destructive">*</span>
                </Label>
                <Select value={selectedAirline} onValueChange={setSelectedAirline}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select airline" />
                  </SelectTrigger>
                  <SelectContent>
                    {(airlines || []).map((a: any) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.iata_code ? `${a.iata_code} — ` : ""}{a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Station <span className="text-destructive">*</span>
                </Label>
                <Select value={selectedStation} onValueChange={setSelectedStation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select station" />
                  </SelectTrigger>
                  <SelectContent>
                    {(airports || []).map((a: any) => (
                      <SelectItem key={a.id} value={a.iata_code?.toUpperCase() || a.id}>
                        {a.iata_code} — {a.name}{a.city ? `, ${a.city}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div
              className={`border-2 border-dashed rounded-lg py-10 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
                dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <Upload size={28} className="text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Drop a file or click to browse</p>
              <div className="flex gap-2 flex-wrap justify-center">
                {formatBadges.map(b => (
                  <Badge key={b.ext} variant="outline" className="text-xs font-normal">{b.label}</Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center max-w-md mt-1">
                Supports clearance formats (Flight No, Route, STA, STD) and traffic reports (FltId, DepStn, ArrStn, DatOp)
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv,.docx,.doc,.pdf,.txt,.tsv"
              className="hidden"
              onChange={handleFile}
            />
          </div>
        )}

        {step === "preview" && (
          <>
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <Badge variant="outline" className="gap-1">
                <FileSpreadsheet size={12} /> {fileName}
              </Badge>
              <Badge variant="secondary">
                Format: {isTrafficReport ? "Traffic Report" : "Clearance"}
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 size={12} /> {flights.length} records
              </Badge>
            </div>

            <ScrollArea className="flex-1 border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Flight</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>A/C Type</TableHead>
                    <TableHead>Reg</TableHead>
                    <TableHead>STA</TableHead>
                    <TableHead>STD</TableHead>
                    <TableHead>Arr Date</TableHead>
                    <TableHead>Dep Date</TableHead>
                    <TableHead>Service Type</TableHead>
                    <TableHead className="w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flights.map((f, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-mono font-medium text-sm">{f.flight_number || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{f.route || "—"}</TableCell>
                      <TableCell className="text-xs">{f.aircraft_type || "—"}</TableCell>
                      <TableCell className="text-xs font-mono">{f._ac_reg || "—"}</TableCell>
                      <TableCell className="text-xs">{f.sta || "—"}</TableCell>
                      <TableCell className="text-xs">{f.std || "—"}</TableCell>
                      <TableCell className="text-xs">{f.arrival_date || "—"}</TableCell>
                      <TableCell className="text-xs">{f.departure_date || "—"}</TableCell>
                      <TableCell>
                        <Select value={f.service_type || "Full Handling"} onValueChange={v => updateFlight(i, "service_type", v)}>
                          <SelectTrigger className="h-7 text-xs w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(defaultCategory === "security" ? SECURITY_CLEARANCE_TYPES : CLEARANCE_TYPES.filter(t => !SECURITY_CLEARANCE_TYPES.includes(t as any))).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeFlight(i)}>
                          <X size={12} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="flex justify-between items-center pt-3 border-t">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setStep("upload"); setFlights([]); }}>Re-upload</Button>
                <Button onClick={handleImport} disabled={flights.length === 0}>
                  <Upload size={14} className="mr-2" />
                  Import {flights.length} Records
                </Button>
              </div>
            </div>
          </>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 size={40} className="animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Importing {flights.length} records…</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
