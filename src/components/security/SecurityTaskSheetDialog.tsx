import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield, Printer, Download } from "lucide-react";
import { Json } from "@/integrations/supabase/types";

interface TaskSheetData {
  flight_type: string; // Maintenance | T/A | ARR | DEP | ADHOC
  delay: string;
  shift_start: string;
  shift_end: string;
  cargo_observer_1: string;
  cargo_observer_2: string;
  hold_baggage_observer_1: string;
  hold_baggage_observer_2: string;
  gate_door_observer_1: string;
  aircraft_door_observer_1: string;
  aircraft_door_observer_2: string;
  aircraft_ramp_observer_1: string;
  catering_accompanied: string;
  cargo_accompanied: string;
  baggage_accompanied: string;
  remarks: string;
  security_supervisor: string;
}

const emptyTaskSheet = (): TaskSheetData => ({
  flight_type: "T/A",
  delay: "",
  shift_start: "",
  shift_end: "",
  cargo_observer_1: "",
  cargo_observer_2: "",
  hold_baggage_observer_1: "",
  hold_baggage_observer_2: "",
  gate_door_observer_1: "",
  aircraft_door_observer_1: "",
  aircraft_door_observer_2: "",
  aircraft_ramp_observer_1: "",
  catering_accompanied: "",
  cargo_accompanied: "",
  baggage_accompanied: "",
  remarks: "",
  security_supervisor: "",
});

interface DispatchRow {
  id: string;
  station: string;
  airline: string;
  flight_no: string;
  flight_date: string;
  service_type: string;
  staff_names: string;
  staff_count: number;
  scheduled_start: string;
  scheduled_end: string;
  actual_start: string;
  actual_end: string;
  contract_duration_hours: number;
  actual_duration_hours: number;
  overtime_hours: number;
  overtime_rate: number;
  base_fee: number;
  service_rate: number;
  overtime_charge: number;
  total_charge: number;
  status: string;
  notes: string;
  review_status: string;
  task_sheet_data?: Json;
  [key: string]: any;
}

interface Props {
  row: DispatchRow | null;
  onClose: () => void;
  onSave: (row: DispatchRow, taskSheet: TaskSheetData) => void;
  // Additional info from flight schedule
  registration?: string;
  route?: string;
  sta?: string;
  std?: string;
  ata?: string;
  atd?: string;
}

const FLIGHT_TYPES = ["Maintenance", "T/A", "ARR", "DEP", "ADHOC"];

const inputCls = "text-sm border border-border rounded px-2.5 py-2 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground w-full";
const readOnlyCls = "text-sm border border-border rounded px-2.5 py-2 bg-muted/50 text-foreground w-full cursor-default";
const sectionHeaderCls = "bg-primary/10 text-primary font-bold text-sm px-3 py-2 rounded-t border border-primary/20";

export default function SecurityTaskSheetDialog({ row, onClose, onSave, registration, route, sta, std, ata, atd }: Props) {
  const [sheet, setSheet] = useState<TaskSheetData>(emptyTaskSheet());
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (row) {
      const saved = row.task_sheet_data as Record<string, any> | null;
      if (saved && typeof saved === "object") {
        setSheet({ ...emptyTaskSheet(), ...saved } as TaskSheetData);
      } else {
        setSheet({
          ...emptyTaskSheet(),
          shift_start: row.actual_start || row.scheduled_start || "",
          shift_end: row.actual_end || row.scheduled_end || "",
          remarks: row.notes || "",
        });
      }
    }
  }, [row]);

  if (!row) return null;

  const update = (field: keyof TaskSheetData, value: string) => {
    setSheet(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(row, sheet);
  };

  const formatDate = (d: string) => {
    if (!d) return "";
    try {
      const dt = new Date(d);
      return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }).toUpperCase();
    } catch { return d; }
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>${row.airline} Security Task Sheet - ${row.flight_no}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #111; padding: 20px; }
        table { width: 100%; border-collapse: collapse; }
        td, th { border: 1px solid #333; padding: 6px 8px; text-align: left; }
        th { background: #e8e8e8; font-weight: bold; }
        .section-header { background: #d0d8e8; font-weight: bold; padding: 6px 8px; border: 1px solid #333; }
        .title { text-align: center; font-size: 16px; font-weight: bold; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .footer { margin-top: 16px; display: flex; justify-content: space-between; font-size: 10px; color: #666; border-top: 1px solid #ccc; padding-top: 6px; }
        input, textarea { border: none; background: transparent; font-size: 12px; font-family: inherit; width: 100%; }
        @media print { body { padding: 10px; } }
      </style></head><body>${content.innerHTML}
      </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
  };

  return (
    <Dialog open={!!row} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0">
        {/* Title bar styled like the PDF header */}
        <div className="bg-primary/5 border-b px-6 py-4">
          <DialogTitle className="text-center text-lg font-bold uppercase tracking-wide text-foreground">
            {row.airline} AIRLINES SECURITY TASK SHEET
          </DialogTitle>
        </div>

        <div className="px-6 py-4 space-y-4" ref={printRef}>
          {/* Flight Info Table */}
          <div className="border rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/60">
                  <th className="px-3 py-2 text-left font-semibold text-foreground border-r">Flight Number</th>
                  <th className="px-3 py-2 text-left font-semibold text-foreground border-r">Date</th>
                  <th className="px-3 py-2 text-left font-semibold text-foreground border-r">Registration</th>
                  <th className="px-3 py-2 text-left font-semibold text-foreground">Route</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-3 py-2 font-bold text-foreground border-r">{row.flight_no}</td>
                  <td className="px-3 py-2 text-foreground border-r">{formatDate(row.flight_date)}</td>
                  <td className="px-3 py-2 font-mono text-foreground border-r">{registration || "—"}</td>
                  <td className="px-3 py-2 text-foreground">{route || "—"}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Timing & Flight Type Row */}
          <div className="border rounded overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b">
                  <td className="px-3 py-2 font-semibold text-foreground border-r bg-muted/40 w-16">STA</td>
                  <td className="px-3 py-2 text-foreground border-r w-20 font-mono">{sta || "—"}</td>
                  <td className="px-3 py-2 font-semibold text-foreground border-r bg-muted/40 w-16">ATA</td>
                  <td className="px-3 py-2 text-foreground border-r w-20 font-mono">{ata || row.actual_start || "—"}</td>
                  <td className="px-3 py-2 font-semibold text-foreground border-r bg-muted/40 w-24">Flight Type</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      {FLIGHT_TYPES.map(ft => (
                        <label key={ft} className="flex items-center gap-1 text-xs cursor-pointer">
                          <input
                            type="radio"
                            name="flight_type"
                            checked={sheet.flight_type === ft}
                            onChange={() => update("flight_type", ft)}
                            className="accent-primary"
                          />
                          {ft}
                        </label>
                      ))}
                    </div>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="px-3 py-2 font-semibold text-foreground border-r bg-muted/40">STD</td>
                  <td className="px-3 py-2 text-foreground border-r font-mono">{std || "—"}</td>
                  <td className="px-3 py-2 font-semibold text-foreground border-r bg-muted/40">ATD</td>
                  <td className="px-3 py-2 text-foreground border-r font-mono">{atd || row.actual_end || "—"}</td>
                  <td className="px-3 py-2 font-semibold text-foreground border-r bg-muted/40">Delay</td>
                  <td className="px-3 py-2">
                    <input
                      className={inputCls}
                      value={sheet.delay}
                      onChange={e => update("delay", e.target.value)}
                      placeholder="Delay info"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-semibold text-foreground border-r bg-muted/40" colSpan={2}>ARR/DEP SHIFT START</td>
                  <td className="px-3 py-2 border-r" colSpan={2}>
                    <input
                      className={inputCls}
                      value={sheet.shift_start}
                      onChange={e => update("shift_start", e.target.value)}
                      placeholder="HH:MM"
                      maxLength={5}
                    />
                  </td>
                  <td className="px-3 py-2 font-semibold text-foreground border-r bg-muted/40">ARR/DEP SHIFT END</td>
                  <td className="px-3 py-2">
                    <input
                      className={inputCls}
                      value={sheet.shift_end}
                      onChange={e => update("shift_end", e.target.value)}
                      placeholder="HH:MM"
                      maxLength={5}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Observer Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cargo Observer */}
            <ObserverSection
              title="Cargo Observer"
              fields={[
                { label: "1", value: sheet.cargo_observer_1, onChange: v => update("cargo_observer_1", v) },
                { label: "2", value: sheet.cargo_observer_2, onChange: v => update("cargo_observer_2", v) },
              ]}
            />
            {/* Hold Baggage Observer */}
            <ObserverSection
              title="Hold Baggage Observer"
              fields={[
                { label: "1", value: sheet.hold_baggage_observer_1, onChange: v => update("hold_baggage_observer_1", v) },
                { label: "2", value: sheet.hold_baggage_observer_2, onChange: v => update("hold_baggage_observer_2", v) },
              ]}
            />
            {/* Gate Door Observer */}
            <ObserverSection
              title="Gate Door Observer"
              fields={[
                { label: "1", value: sheet.gate_door_observer_1, onChange: v => update("gate_door_observer_1", v) },
              ]}
            />
            {/* Aircraft Door Observer */}
            <ObserverSection
              title="Aircraft Door Observer"
              fields={[
                { label: "1", value: sheet.aircraft_door_observer_1, onChange: v => update("aircraft_door_observer_1", v) },
                { label: "2", value: sheet.aircraft_door_observer_2, onChange: v => update("aircraft_door_observer_2", v) },
              ]}
            />
            {/* Aircraft Ramp Observer */}
            <ObserverSection
              title="Aircraft Ramp Observer"
              fields={[
                { label: "1", value: sheet.aircraft_ramp_observer_1, onChange: v => update("aircraft_ramp_observer_1", v) },
              ]}
            />
          </div>

          {/* Cargo, Baggage & Catering Accompanied By */}
          <div className="border rounded overflow-hidden">
            <div className={sectionHeaderCls}>CARGO AND BAGGAGE & CATERING ACCOMPANIED BY:</div>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b">
                  <td className="px-3 py-2 font-semibold text-foreground border-r bg-muted/40 w-28">Catering</td>
                  <td className="px-3 py-2">
                    <input className={inputCls} value={sheet.catering_accompanied} onChange={e => update("catering_accompanied", e.target.value)} placeholder="Name" />
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="px-3 py-2 font-semibold text-foreground border-r bg-muted/40">Cargo</td>
                  <td className="px-3 py-2">
                    <input className={inputCls} value={sheet.cargo_accompanied} onChange={e => update("cargo_accompanied", e.target.value)} placeholder="Name or NIL" />
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-semibold text-foreground border-r bg-muted/40">Baggage</td>
                  <td className="px-3 py-2">
                    <input className={inputCls} value={sheet.baggage_accompanied} onChange={e => update("baggage_accompanied", e.target.value)} placeholder="Name" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Remarks */}
          <div className="border rounded overflow-hidden">
            <div className={sectionHeaderCls}>REMARKS</div>
            <div className="p-3">
              <textarea
                className={inputCls + " min-h-[60px]"}
                value={sheet.remarks}
                onChange={e => update("remarks", e.target.value)}
                placeholder="Enter any remarks, incidents, or notes…"
              />
            </div>
          </div>

          {/* Security Supervisor */}
          <div className="border rounded overflow-hidden">
            <div className={sectionHeaderCls}>{row.airline.toUpperCase()} (SECURITY SUPERVISOR ON-DUTY)</div>
            <div className="p-3">
              <input
                className={inputCls}
                value={sheet.security_supervisor}
                onChange={e => update("security_supervisor", e.target.value)}
                placeholder="Supervisor name"
              />
            </div>
          </div>

          {/* Footer matching the PDF */}
          <div className="flex justify-between items-center text-xs text-muted-foreground pt-3 border-t">
            <span>{row.airline} Security Task Sheet</span>
            <span>V.03 22Jan2023</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center gap-2 px-6 pb-4">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer size={14} className="mr-1" /> Print
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Download size={14} className="mr-1" /> Download PDF
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave}>Save Task Sheet</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ObserverSection({ title, fields }: { title: string; fields: { label: string; value: string; onChange: (v: string) => void }[] }) {
  const inputCls = "text-sm border border-border rounded px-2.5 py-2 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground w-full";
  return (
    <div className="border rounded overflow-hidden">
      <div className="bg-primary/10 text-primary font-bold text-sm px-3 py-2 border-b border-primary/20">{title}</div>
      <table className="w-full text-sm">
        <tbody>
          {fields.map(f => (
            <tr key={f.label} className="border-b last:border-0">
              <td className="px-3 py-2 font-semibold text-foreground border-r bg-muted/40 w-10 text-center">{f.label}</td>
              <td className="px-3 py-2">
                <input className={inputCls} value={f.value} onChange={e => f.onChange(e.target.value)} placeholder="Name or NIL" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
