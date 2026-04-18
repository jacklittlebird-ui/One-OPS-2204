import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield, Printer, Download, Plane, Clock, Eye, Package, MessageSquare, UserCheck, AlertTriangle } from "lucide-react";
import PipelineStepper, { derivePipelineStage } from "@/components/serviceReport/PipelineStepper";
import { SKD_TYPES, SECURITY_CLEARANCE_TYPES } from "@/components/clearances/ClearanceTypes";
import { Json } from "@/integrations/supabase/types";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChannel } from "@/contexts/ChannelContext";

/** Auto-format time input as HH:MM */
function formatTimeInput(value: string, prevValue: string): string {
  let v = value.replace(/[^0-9:]/g, "");
  if (v.length === 2 && !v.includes(":") && prevValue?.length !== 3) v += ":";
  if (v.length > 5) v = v.slice(0, 5);
  return v;
}

interface TaskSheetData {
  flight_type: string;
  delay: string;
  shift_start: string;
  shift_end: string;
  sta: string;
  std: string;
  ata: string;
  atd: string;
  registration: string;
  route: string;
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
  sta: "",
  std: "",
  ata: "",
  atd: "",
  registration: "",
  route: "",
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
  isNew?: boolean;
}

const FLIGHT_TYPES = SKD_TYPES;

const inputCls = "text-sm border border-border rounded-md px-2.5 py-2 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary placeholder:text-muted-foreground w-full transition-colors";
const readOnlyCls = "text-sm border border-border rounded-md px-2.5 py-2 bg-muted/50 text-foreground w-full cursor-default";
const sectionHeaderCls = "bg-primary/10 text-primary font-bold text-sm px-3 py-2 rounded-t border border-primary/20";

interface SectionProps {
  title: string;
  icon?: React.ReactNode;
  accent?: string;
  iconBg?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}

function Section({ title, icon, accent = "text-primary", iconBg = "bg-primary/10", children, right }: SectionProps) {
  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b bg-muted/30">
        <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${accent}`}>
          {icon && <span className={`h-6 w-6 rounded-md ${iconBg} flex items-center justify-center`}>{icon}</span>}
          {title}
        </h3>
        {right}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Chip({ icon, label, value, accent = "bg-white/15" }: { icon?: React.ReactNode; label: string; value: string; accent?: string }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 ${accent} backdrop-blur-sm`}>
      {icon && <span className="opacity-90">{icon}</span>}
      <div className="flex flex-col leading-tight">
        <span className="text-[10px] uppercase tracking-wider opacity-75">{label}</span>
        <span className="text-xs font-semibold">{value || "—"}</span>
      </div>
    </div>
  );
}

export default function SecurityTaskSheetDialog({ row, onClose, onSave, registration, route, sta, std, ata, atd, skdType, serviceType, isNew }: Props) {
  const { activeChannel } = useChannel();
  const [sheet, setSheet] = useState<TaskSheetData>(emptyTaskSheet());
  const [editableRow, setEditableRow] = useState<DispatchRow | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const { data: airlines = [] } = useQuery({
    queryKey: ["airlines-for-task-sheet"],
    queryFn: async () => {
      const { data } = await supabase.from("airlines").select("id,name,iata_code,code").order("name");
      return data || [];
    },
  });

  useEffect(() => {
    if (row) {
      setEditableRow({ ...row });
      const saved = row.task_sheet_data as Record<string, any> | null;
      if (saved && typeof saved === "object") {
        const restored = { ...emptyTaskSheet(), ...saved } as TaskSheetData;
        if (!restored.flight_type && skdType) restored.flight_type = skdType;
        if (!restored.sta && sta) restored.sta = sta;
        if (!restored.std && std) restored.std = std;
        if (!restored.ata && ata) restored.ata = ata;
        if (!restored.atd && atd) restored.atd = atd;
        if (!restored.registration && registration) restored.registration = registration;
        if (!restored.route && route) restored.route = route;
        setSheet(restored);
      } else {
        setSheet({
          ...emptyTaskSheet(),
          flight_type: skdType || "",
          sta: sta || "",
          std: std || "",
          ata: ata || "",
          atd: atd || "",
          registration: registration || "",
          route: route || "",
          remarks: row.notes || "",
        });
      }
    }
  }, [row, skdType, sta, std, ata, atd, registration, route]);

  if (!row || !editableRow) return null;

  const currentRow = isNew ? editableRow : row;

  const updateRow = (field: string, value: any) => {
    setEditableRow(prev => prev ? { ...prev, [field]: value } : prev);
  };

  const update = (field: keyof TaskSheetData, value: string) => {
    setSheet(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(isNew ? editableRow : row, sheet);
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
    const reg = v.registration || registration || "—";
    const rt = v.route || route || "—";
    const staVal = v.sta || sta || "—";
    const stdVal = v.std || std || "—";
    const ataVal = v.ata || ata || "—";
    const atdVal = v.atd || atd || "—";

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
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 gap-0">
        {/* Gradient hero header */}
        <div className="relative bg-gradient-to-r from-primary via-primary to-primary/80 text-primary-foreground px-6 py-5 overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
          <div className="relative flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                  <Shield size={20} />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold uppercase tracking-wide leading-tight">
                    {isNew ? "New" : currentRow.airline} Airlines Security Task Sheet
                  </DialogTitle>
                  <p className="text-[11px] uppercase tracking-widest opacity-80 mt-0.5">
                    {isNew ? "Create new report" : "Edit report"} • {currentRow.station || "—"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Chip icon={<Plane size={13} />} label="Flight" value={currentRow.flight_no || "—"} />
                <Chip icon={<Clock size={13} />} label="Date" value={formatDate(currentRow.flight_date)} />
                <Chip label="Reg" value={sheet.registration || registration || "—"} />
                <Chip label="Service" value={serviceType || currentRow.service_type || "—"} />
              </div>
            </div>
          </div>
        </div>

        {/* Pipeline stepper - hidden in print/download */}
        <div className="px-6 py-3 border-b bg-muted/20 flex items-center justify-center print:hidden no-print">
          <PipelineStepper
            currentStage={derivePipelineStage({
              isLinked: !isNew,
              reviewStatus: (currentRow as any)?.review_status || "pending",
              dispatchStatus: (currentRow as any)?.status || "Pending",
              channel: activeChannel,
            })}
          />
        </div>

        <div className="px-6 py-4 space-y-4 bg-muted/10" ref={printRef}>
          {/* Airline & Station (editable for new) */}
          {isNew && (
            <Section title="Assignment" icon={<Plane size={14} />} accent="text-primary" iconBg="bg-primary/10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Airline</label>
                  <select className={inputCls} value={editableRow.airline} onChange={e => updateRow("airline", e.target.value)}>
                    <option value="">Select Airline</option>
                    {airlines.map((a: any) => (
                      <option key={a.id} value={a.name}>{a.name} ({a.iata_code || a.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Station</label>
                  <input className={inputCls} value={editableRow.station} onChange={e => updateRow("station", e.target.value)} placeholder="CAI" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Service Type</label>
                  <select className={inputCls} value={editableRow.service_type} onChange={e => updateRow("service_type", e.target.value)}>
                    {SECURITY_CLEARANCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </Section>
          )}

          {/* Flight Info */}
          <Section title="Flight Information" icon={<Plane size={14} />} accent="text-primary" iconBg="bg-primary/10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Flight No</label>
                {isNew ? (
                  <input className={inputCls} value={editableRow.flight_no} onChange={e => updateRow("flight_no", e.target.value.toUpperCase())} placeholder="Flight No" />
                ) : (
                  <div className="text-sm font-bold text-foreground py-2">{currentRow.flight_no}</div>
                )}
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Date</label>
                {isNew ? (
                  <input className={inputCls} type="date" value={editableRow.flight_date} onChange={e => updateRow("flight_date", e.target.value)} />
                ) : (
                  <div className="text-sm text-foreground py-2">{formatDate(currentRow.flight_date)}</div>
                )}
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Registration</label>
                <input className={inputCls + " font-mono uppercase"} value={sheet.registration} onChange={e => update("registration", e.target.value.toUpperCase())} placeholder="Registration" />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Route</label>
                <input className={inputCls + " uppercase"} value={sheet.route} onChange={e => update("route", e.target.value.toUpperCase())} placeholder="CAI-JFK-CAI" />
              </div>
            </div>
          </Section>

          {/* Timings */}
          <Section title="Timings & Schedule" icon={<Clock size={14} />} accent="text-info" iconBg="bg-info/10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">STA</label>
                <input className={inputCls + " font-mono"} value={sheet.sta} onChange={e => update("sta", formatTimeInput(e.target.value, sheet.sta))} placeholder="HH:MM" maxLength={5} />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">ATA</label>
                <input className={inputCls + " font-mono"} value={sheet.ata} onChange={e => update("ata", formatTimeInput(e.target.value, sheet.ata))} placeholder="HH:MM" maxLength={5} />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">STD</label>
                <input className={inputCls + " font-mono"} value={sheet.std} onChange={e => update("std", formatTimeInput(e.target.value, sheet.std))} placeholder="HH:MM" maxLength={5} />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">ATD</label>
                <input className={inputCls + " font-mono"} value={sheet.atd} onChange={e => update("atd", formatTimeInput(e.target.value, sheet.atd))} placeholder="HH:MM" maxLength={5} />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Skd Type</label>
                {isNew ? (
                  <select className={inputCls} value={sheet.flight_type} onChange={e => update("flight_type", e.target.value)}>
                    <option value="">Select...</option>
                    {FLIGHT_TYPES.map(ft => <option key={ft} value={ft}>{ft}</option>)}
                  </select>
                ) : (
                  <div className="text-sm font-semibold text-foreground py-2">{skdType || sheet.flight_type || "—"}</div>
                )}
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Service Type</label>
                <div className="text-sm font-semibold text-foreground py-2 whitespace-nowrap">{serviceType || currentRow.service_type || "—"}</div>
              </div>
              <div className="col-span-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Delay</label>
                <input className={inputCls} value={sheet.delay} onChange={e => update("delay", e.target.value)} placeholder="Delay info" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-3 border-t">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">ARR/DEP Shift Start</label>
                <input className={inputCls + " font-mono"} value={sheet.shift_start} onChange={e => update("shift_start", formatTimeInput(e.target.value, sheet.shift_start))} placeholder="HH:MM" maxLength={5} />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">ARR/DEP Shift End</label>
                <input className={inputCls + " font-mono"} value={sheet.shift_end} onChange={e => update("shift_end", formatTimeInput(e.target.value, sheet.shift_end))} placeholder="HH:MM" maxLength={5} />
              </div>
            </div>
          </Section>

          {/* Observers */}
          <Section title="Security Observers" icon={<Eye size={14} />} accent="text-success" iconBg="bg-success/10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ObserverSection
                title="Cargo Observer"
                fields={[
                  { label: "1", value: sheet.cargo_observer_1, onChange: v => update("cargo_observer_1", v) },
                  { label: "2", value: sheet.cargo_observer_2, onChange: v => update("cargo_observer_2", v) },
                ]}
              />
              <ObserverSection
                title="Hold Baggage Observer"
                fields={[
                  { label: "1", value: sheet.hold_baggage_observer_1, onChange: v => update("hold_baggage_observer_1", v) },
                  { label: "2", value: sheet.hold_baggage_observer_2, onChange: v => update("hold_baggage_observer_2", v) },
                ]}
              />
              <ObserverSection
                title="Gate Door Observer"
                fields={[
                  { label: "1", value: sheet.gate_door_observer_1, onChange: v => update("gate_door_observer_1", v) },
                ]}
              />
              <ObserverSection
                title="Aircraft Door Observer"
                fields={[
                  { label: "1", value: sheet.aircraft_door_observer_1, onChange: v => update("aircraft_door_observer_1", v) },
                  { label: "2", value: sheet.aircraft_door_observer_2, onChange: v => update("aircraft_door_observer_2", v) },
                ]}
              />
              <ObserverSection
                title="Aircraft Ramp Observer"
                fields={[
                  { label: "1", value: sheet.aircraft_ramp_observer_1, onChange: v => update("aircraft_ramp_observer_1", v) },
                ]}
              />
            </div>
          </Section>

          {/* Accompanied By */}
          <Section title="Cargo, Baggage & Catering Accompanied By" icon={<Package size={14} />} accent="text-accent-foreground" iconBg="bg-accent">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Catering</label>
                <input className={inputCls} value={sheet.catering_accompanied} onChange={e => update("catering_accompanied", e.target.value)} placeholder="Name" />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Cargo</label>
                <input className={inputCls} value={sheet.cargo_accompanied} onChange={e => update("cargo_accompanied", e.target.value)} placeholder="Name or NIL" />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Baggage</label>
                <input className={inputCls} value={sheet.baggage_accompanied} onChange={e => update("baggage_accompanied", e.target.value)} placeholder="Name" />
              </div>
            </div>
          </Section>

          {/* Remarks */}
          <Section title="Remarks" icon={<MessageSquare size={14} />} accent="text-warning" iconBg="bg-warning/10">
            <textarea
              className={inputCls + " min-h-[80px]"}
              value={sheet.remarks}
              onChange={e => update("remarks", e.target.value)}
              placeholder="Enter any remarks, incidents, or notes…"
            />
          </Section>

          {/* Security Supervisor */}
          <Section title={`${currentRow.airline.toUpperCase()} — Security Supervisor on Duty`} icon={<UserCheck size={14} />} accent="text-primary" iconBg="bg-primary/10">
            <input
              className={inputCls}
              value={sheet.security_supervisor}
              onChange={e => update("security_supervisor", e.target.value)}
              placeholder="Supervisor name"
            />
          </Section>

          {/* Footer matching the PDF */}
          <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-3 border-t">
            <span className="flex items-center gap-1.5"><Shield size={12} /> {currentRow.airline} Security Task Sheet</span>
            <span className="font-mono">V.03 22Jan2023</span>
          </div>
        </div>

        {/* Sticky action bar */}
        <div className="sticky bottom-0 flex flex-wrap justify-between items-center gap-2 px-6 py-3 border-t bg-card/95 backdrop-blur-sm">
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
            <Button onClick={handleSave} className="shadow-sm">
              <Shield size={14} className="mr-1" /> Save Task Sheet
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ObserverSection({ title, fields }: { title: string; fields: { label: string; value: string; onChange: (v: string) => void }[] }) {
  const inputCls = "text-sm border border-border rounded-md px-2.5 py-1.5 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary placeholder:text-muted-foreground w-full transition-colors";
  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <div className="bg-success/10 text-success font-semibold text-xs uppercase tracking-wider px-3 py-2 border-b border-success/20 flex items-center gap-1.5">
        <Eye size={12} /> {title}
      </div>
      <div className="p-2 space-y-1.5">
        {fields.map(f => (
          <div key={f.label} className="flex items-center gap-2">
            <span className="h-7 w-7 rounded-md bg-muted text-foreground text-xs font-bold flex items-center justify-center shrink-0">{f.label}</span>
            <input className={inputCls} value={f.value} onChange={e => f.onChange(e.target.value)} placeholder="Name or NIL" />
          </div>
        ))}
      </div>
    </div>
  );
}
