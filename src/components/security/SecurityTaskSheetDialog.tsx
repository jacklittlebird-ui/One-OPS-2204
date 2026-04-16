import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield, Printer, Download } from "lucide-react";
import { SKD_TYPES } from "@/components/clearances/ClearanceTypes";
import { Json } from "@/integrations/supabase/types";

interface TaskSheetData {
  flight_type: string; // SKD Type value
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
  flight_type: "",
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
  registration?: string;
  route?: string;
  sta?: string;
  std?: string;
  ata?: string;
  atd?: string;
  skdType?: string;
  serviceType?: string;
}

const FLIGHT_TYPES = SKD_TYPES;

const inputCls = "text-sm border border-border rounded px-2.5 py-2 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground w-full";
const readOnlyCls = "text-sm border border-border rounded px-2.5 py-2 bg-muted/50 text-foreground w-full cursor-default";
const sectionHeaderCls = "bg-primary/10 text-primary font-bold text-sm px-3 py-2 rounded-t border border-primary/20";

export default function SecurityTaskSheetDialog({ row, onClose, onSave, registration, route, sta, std, ata, atd, skdType, serviceType }: Props) {
  const [sheet, setSheet] = useState<TaskSheetData>(emptyTaskSheet());
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (row) {
      const saved = row.task_sheet_data as Record<string, any> | null;
      if (saved && typeof saved === "object") {
        const restored = { ...emptyTaskSheet(), ...saved } as TaskSheetData;
        // If skdType from flight schedule and not already saved, use it
        if (!restored.flight_type && skdType) restored.flight_type = skdType;
        setSheet(restored);
      } else {
        setSheet({
          ...emptyTaskSheet(),
          flight_type: skdType || "",
          shift_start: row.actual_start || row.scheduled_start || "",
          shift_end: row.actual_end || row.scheduled_end || "",
          remarks: row.notes || "",
        });
      }
    }
  }, [row, skdType]);

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
    if (!row) return;
    const v = sheet;
    const flightDate = formatDate(row.flight_date);
    const reg = registration || "—";
    const rt = route || "—";
    const staVal = sta || "—";
    const stdVal = std || "—";
    const ataVal = ata || row.actual_start || "—";
    const atdVal = atd || row.actual_end || "—";

    const ftChecks = FLIGHT_TYPES.map(ft =>
      `<td style="text-align:center;border:1px solid #333;padding:4px 6px;font-size:11px;">${ft === v.flight_type ? "☒" : "☐"} ${ft}</td>`
    ).join("");

    const obsSection = (title: string, rows: [string, string][]) => {
      const rowsHtml = rows.map(([label, val]) =>
        `<tr><td class="obs-label">${label}</td><td class="obs-val">${val || ""}</td></tr>`
      ).join("");
      return `<table style="width:100%;border-collapse:collapse;margin-bottom:0;">
        <tr><td colspan="2" class="obs-title">${title}</td></tr>
        ${rowsHtml}</table>`;
    };

    const html = `<!DOCTYPE html><html><head>
<title>${row.airline} Security Task Sheet - ${row.flight_no}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #000; padding: 30px 40px; }
  table { width:100%; border-collapse:collapse; }
  td, th { border:2px solid #222; padding:7px 10px; text-align:left; font-size:13px; }
  .title { text-align:center; font-size:18px; font-weight:900; text-transform:uppercase; letter-spacing:2px; margin-bottom:16px; padding:12px 0; border-bottom:3px solid #000; }
  .label { background:#e8e8e8; font-weight:bold; font-size:13px; }
  .section { background:#b8c8e0; font-weight:bold; font-size:13px; text-transform:uppercase; letter-spacing:0.5px; }
  .obs-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin:10px 0; }
  .footer { display:flex; justify-content:space-between; font-size:11px; color:#444; border-top:2px solid #666; padding-top:10px; margin-top:24px; font-weight:600; }
  .header-row th { background:#c0c8d8; font-weight:bold; font-size:13px; text-transform:uppercase; letter-spacing:0.3px; }
  .value-cell { font-size:14px; font-weight:600; min-height:28px; }
  .mono { font-family: 'Courier New', Courier, monospace; font-weight:700; font-size:14px; letter-spacing:1px; }
  .ft-cell { text-align:center; font-size:13px; font-weight:600; }
  .obs-title { border:2px solid #222; padding:6px 10px; font-weight:bold; background:#b8c8e0; font-size:13px; text-transform:uppercase; }
  .obs-label { border:2px solid #222; padding:6px 10px; width:35px; text-align:center; font-weight:bold; background:#e8e8e8; font-size:14px; }
  .obs-val { border:2px solid #222; padding:6px 10px; font-size:14px; font-weight:500; min-height:28px; }
  .remark-cell { min-height:60px; padding:10px; font-size:14px; line-height:1.5; }
  @media print {
    body { padding:15px 25px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @page { margin:12mm; }
  }
</style>
</head><body>

<div class="title">${row.airline} AIRLINES SECURITY TASK SHEET</div>

<table style="margin-bottom:10px;">
  <tr class="header-row">
    <th>Flight Number</th>
    <th>Date</th>
    <th>Registration</th>
    <th>Route</th>
  </tr>
  <tr>
    <td class="value-cell" style="font-weight:800;font-size:15px;">${row.flight_no}</td>
    <td class="value-cell">${flightDate}</td>
    <td class="value-cell mono">${reg}</td>
    <td class="value-cell">${rt}</td>
  </tr>
</table>

<table style="margin-bottom:10px;">
  <tr>
    <td class="label" style="width:55px;">STA</td>
    <td class="mono" style="width:75px;">${staVal}</td>
    <td class="label" style="width:55px;">ATA</td>
    <td class="mono" style="width:75px;">${ataVal}</td>
     <td class="label" style="width:85px;">Skd Type</td>
     <td colspan="${FLIGHT_TYPES.length}" class="value-cell" style="font-size:13px;font-weight:600;">${v.flight_type || "—"}</td>
  </tr>
  <tr>
    <td class="label">STD</td>
    <td class="mono">${stdVal}</td>
    <td class="label">ATD</td>
    <td class="mono">${atdVal}</td>
    <td class="label">Service Type</td>
    <td colspan="5" class="value-cell" style="font-size:13px;font-weight:600;">${serviceType || row.service_type || "—"}</td>
  </tr>
  <tr>
    <td class="label" colspan="2"></td>
    <td colspan="2"></td>
    <td class="label">Delay</td>
    <td colspan="5" class="value-cell">${v.delay || ""}</td>
  </tr>
  <tr>
    <td class="label" colspan="2">ARR/DEP SHIFT START</td>
    <td colspan="2" class="mono">${v.shift_start || ""}</td>
    <td class="label">ARR/DEP SHIFT END</td>
    <td colspan="5" class="mono">${v.shift_end || ""}</td>
  </tr>
</table>

<div class="obs-grid">
  ${obsSection("Cargo Observer", [["1", v.cargo_observer_1], ["2", v.cargo_observer_2]])}
  ${obsSection("Hold Baggage Observer", [["1", v.hold_baggage_observer_1], ["2", v.hold_baggage_observer_2]])}
  ${obsSection("Gate Door Observer", [["1", v.gate_door_observer_1]])}
  ${obsSection("Aircraft Door Observer", [["1", v.aircraft_door_observer_1], ["2", v.aircraft_door_observer_2]])}
  ${obsSection("Aircraft Ramp Observer", [["1", v.aircraft_ramp_observer_1]])}
</div>

<table style="margin-bottom:10px;">
  <tr><td colspan="2" class="section">CARGO AND BAGGAGE & CATERING ACCOMPANIED BY:</td></tr>
  <tr><td class="label" style="width:110px;">Catering</td><td class="value-cell">${v.catering_accompanied || ""}</td></tr>
  <tr><td class="label">Cargo</td><td class="value-cell">${v.cargo_accompanied || ""}</td></tr>
  <tr><td class="label">Baggage</td><td class="value-cell">${v.baggage_accompanied || ""}</td></tr>
</table>

<table style="margin-bottom:10px;">
  <tr><td class="section">REMARKS</td></tr>
  <tr><td class="remark-cell">${v.remarks || ""}</td></tr>
</table>

<table style="margin-bottom:10px;">
  <tr><td class="section">${row.airline.toUpperCase()} (SECURITY SUPERVISOR ON-DUTY)</td></tr>
  <tr><td class="value-cell" style="padding:10px;">${v.security_supervisor || ""}</td></tr>
</table>

<div class="footer">
  <span>${row.airline} Security Task Sheet</span>
  <span>V.03 22Jan2023</span>
</div>

</body></html>`;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 400);
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

          {/* Timing & Skd Type Row */}
          <div className="border rounded overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b">
                  <td className="px-3 py-2 font-semibold text-foreground border-r bg-muted/40 w-16">STA</td>
                  <td className="px-3 py-2 text-foreground border-r w-20 font-mono">{sta || "—"}</td>
                  <td className="px-3 py-2 font-semibold text-foreground border-r bg-muted/40 w-16">ATA</td>
                  <td className="px-3 py-2 text-foreground border-r w-20 font-mono">{ata || row.actual_start || "—"}</td>
                   <td className="px-3 py-2 font-semibold text-foreground border-r bg-muted/40 w-24">Skd Type</td>
                   <td className="px-3 py-2">
                     <span className="text-xs font-semibold text-foreground">{skdType || sheet.flight_type || "—"}</span>
                   </td>
                </tr>
                 <tr className="border-b">
                   <td className="px-3 py-2 font-semibold text-foreground border-r bg-muted/40">STD</td>
                   <td className="px-3 py-2 text-foreground border-r font-mono">{std || "—"}</td>
                   <td className="px-3 py-2 font-semibold text-foreground border-r bg-muted/40">ATD</td>
                   <td className="px-3 py-2 text-foreground border-r font-mono">{atd || row.actual_end || "—"}</td>
                   <td className="px-3 py-2 font-semibold text-foreground border-r bg-muted/40">Service Type</td>
                   <td className="px-3 py-2">
                     <span className="text-xs font-semibold text-foreground">{serviceType || row.service_type || "—"}</span>
                   </td>
                 </tr>
                 <tr className="border-b">
                   <td className="px-3 py-2 font-semibold text-foreground border-r bg-muted/40" colSpan={2}></td>
                   <td className="px-3 py-2 border-r" colSpan={2}></td>
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
