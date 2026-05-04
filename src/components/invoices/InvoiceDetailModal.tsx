import { useEffect, useState } from "react";
import { X, FileText, DollarSign, Plane, Calendar, ShieldCheck, Printer, Clock, CheckCircle, AlertCircle, XCircle, BookOpen, CreditCard } from "lucide-react";
import { formatDateDMY } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export type InvoiceRow = {
  id: string; invoice_no: string; date: string; due_date: string;
  operator: string; airline_iata: string; flight_ref: string; description: string;
  civil_aviation: number; handling: number; airport_charges: number;
  catering: number; other: number; subtotal: number; vat: number; total: number;
  currency: string; status: string; notes: string;
  invoice_type: string; finalized_at: string | null; finalized_by: string | null;
  journal_entry_id: string | null; sent_at: string | null; sent_to: string | null;
  payment_date: string | null; payment_ref: string; billing_period: string;
  credit_note_ref: string; station: string;
};

const statusStyles: Record<string, { cls: string; icon: React.ReactNode }> = {
  Draft:     { cls: "bg-muted text-muted-foreground", icon: <Clock size={14} /> },
  Sent:      { cls: "bg-info/15 text-info", icon: <AlertCircle size={14} /> },
  Paid:      { cls: "bg-success/15 text-success", icon: <CheckCircle size={14} /> },
  Overdue:   { cls: "bg-destructive/15 text-destructive", icon: <XCircle size={14} /> },
  Cancelled: { cls: "bg-warning/15 text-warning", icon: <X size={14} /> },
};

interface Props {
  invoice: InvoiceRow;
  onClose: () => void;
  onEdit: (inv: InvoiceRow) => void;
  onFinalize: (inv: InvoiceRow) => void;
  onPrint: (inv: InvoiceRow) => void;
}

function DetailRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className={`text-sm text-foreground font-medium ${mono ? "font-mono" : ""}`}>{value || "—"}</span>
    </div>
  );
}

// Charge labels mirroring the Edit Service Report form fields
const REPORT_CHARGE_FIELDS: { key: keyof ReportLite; label: string }[] = [
  { key: "civil_aviation_fee", label: "Civil Aviation Fee" },
  { key: "handling_fee",       label: "Handling Fee" },
  { key: "landing_charge",     label: "Landing Charge" },
  { key: "parking_charge",     label: "Parking Charge" },
  { key: "housing_charge",     label: "Housing Charge" },
  { key: "airport_charge",     label: "Airport Charge" },
  { key: "catering_charge",    label: "Catering" },
  { key: "hotac_charge",       label: "HOTAC" },
  { key: "fuel_charge",        label: "Fuel" },
];

type ReportLite = {
  id: string;
  flight_no: string;
  registration: string;
  arrival_date: string | null;
  route: string;
  station: string;
  currency: string;
  civil_aviation_fee: number;
  handling_fee: number;
  landing_charge: number;
  parking_charge: number;
  housing_charge: number;
  airport_charge: number;
  catering_charge: number;
  hotac_charge: number;
  fuel_charge: number;
  total_cost: number;
};

export default function InvoiceDetailModal({ invoice: inv, onClose, onEdit, onFinalize, onPrint }: Props) {
  const st = statusStyles[inv.status] || statusStyles.Draft;
  const daysUntilDue = Math.ceil((new Date(inv.due_date).getTime() - Date.now()) / 86400000);

  const [reports, setReports] = useState<ReportLite[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  // Fetch the underlying service reports for every flight number on this invoice
  // so we can show the same detailed charge breakdown as the Edit Service Report view.
  useEffect(() => {
    const flightNos = (inv.flight_ref || "")
      .split(",").map(s => s.trim()).filter(Boolean);
    if (flightNos.length === 0) { setReports([]); return; }
    setLoadingReports(true);
    (async () => {
      const { data } = await supabase
        .from("service_reports")
        .select("id,flight_no,registration,arrival_date,route,station,currency,civil_aviation_fee,handling_fee,landing_charge,parking_charge,housing_charge,airport_charge,catering_charge,hotac_charge,fuel_charge,total_cost")
        .in("flight_no", flightNos);
      setReports((data as ReportLite[]) || []);
      setLoadingReports(false);
    })();
  }, [inv.flight_ref]);

  const fmt = (n: number) => `${inv.currency} ${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card rounded-xl border shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto m-4" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-card border-b px-4 md:px-6 py-3 md:py-4 flex items-center justify-between rounded-t-xl z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-lg">{inv.invoice_no}</h2>
              <p className="text-xs text-muted-foreground">{inv.operator} · {inv.station}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${st.cls}`}>
              {st.icon} {inv.status}
            </span>
            <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-full text-muted-foreground"><X size={18} /></button>
          </div>
        </div>

        <div className="p-4 md:p-6 space-y-5 md:space-y-6">
          {/* Quick Stats — Total Amount intentionally hidden on draft view */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-info/5 rounded-lg p-3 text-center">
              <Calendar size={16} className="mx-auto text-info mb-1" />
              <div className="text-xl font-bold text-foreground">{daysUntilDue > 0 ? daysUntilDue : 0}</div>
              <div className="text-[10px] text-muted-foreground uppercase font-semibold">{daysUntilDue < 0 ? "Days Overdue" : "Days Until Due"}</div>
            </div>
            <div className="bg-success/5 rounded-lg p-3 text-center">
              <ShieldCheck size={16} className="mx-auto text-success mb-1" />
              <div className={`text-xl font-bold ${inv.invoice_type === "Final" ? "text-success" : "text-warning"}`}>{inv.invoice_type || "Preliminary"}</div>
              <div className="text-[10px] text-muted-foreground uppercase font-semibold">Invoice Type</div>
            </div>
          </div>

          {/* Invoice Info */}
          <div className="bg-muted/30 rounded-lg p-4">
            <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-2 flex items-center gap-1.5"><Plane size={12} /> Flight & Billing</h3>
            <DetailRow label="Operator" value={inv.operator} />
            <DetailRow label="IATA Code" value={inv.airline_iata} mono />
            <DetailRow label="Flight Ref" value={inv.flight_ref} mono />
            <DetailRow label="Station" value={inv.station} mono />
            <DetailRow label="Billing Period" value={inv.billing_period} />
            <DetailRow label="Description" value={inv.description} />
          </div>

          {/* Dates */}
          <div className="bg-muted/30 rounded-lg p-4">
            <h3 className="text-xs font-bold text-info uppercase tracking-wider mb-2 flex items-center gap-1.5"><Calendar size={12} /> Dates</h3>
            <DetailRow label="Invoice Date" value={formatDateDMY(inv.date)} />
            <DetailRow label="Due Date" value={formatDateDMY(inv.due_date)} />
            {inv.finalized_at && <DetailRow label="Finalized At" value={formatDateDMY(inv.finalized_at)} />}
            {inv.sent_at && <DetailRow label="Sent At" value={formatDateDMY(inv.sent_at)} />}
            {inv.payment_date && <DetailRow label="Payment Date" value={formatDateDMY(inv.payment_date)} />}
          </div>

          {/* Charges Breakdown — mirrors Edit Service Report fields, per linked flight */}
          <div className="bg-muted/30 rounded-lg p-4">
            <h3 className="text-xs font-bold text-success uppercase tracking-wider mb-3 flex items-center gap-1.5"><DollarSign size={12} /> Charges Breakdown</h3>

            {loadingReports ? (
              <div className="text-sm text-muted-foreground py-4 text-center">Loading charge details…</div>
            ) : reports.length === 0 ? (
              <div className="text-xs text-muted-foreground py-3 text-center">
                No linked Service Report found for flight(s) <span className="font-mono">{inv.flight_ref || "—"}</span>.
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map(r => (
                  <div key={r.id} className="bg-card border border-border rounded-lg p-3">
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-2 pb-2 border-b border-border/60">
                      <div className="flex items-center gap-2">
                        <Plane size={14} className="text-primary" />
                        <span className="font-mono font-bold text-foreground text-sm">{r.flight_no}</span>
                        {r.registration && <span className="text-xs text-muted-foreground font-mono">· {r.registration}</span>}
                        {r.route && <span className="text-xs text-muted-foreground">· {r.route}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {r.arrival_date ? formatDateDMY(r.arrival_date) : ""} {r.station && `· ${r.station}`}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                      {REPORT_CHARGE_FIELDS.map(f => {
                        const val = (r[f.key] as number) || 0;
                        if (!val) return null;
                        return (
                          <div key={f.key as string} className="flex justify-between items-center py-1.5 border-b border-border/30">
                            <span className="text-xs text-foreground">{f.label}</span>
                            <span className="text-xs font-mono font-semibold text-foreground">
                              {(r.currency || inv.currency)} {val.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between items-center pt-2 mt-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Flight Total</span>
                      <span className="text-sm font-mono font-bold text-foreground">
                        {(r.currency || inv.currency)} {(r.total_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Aggregated buckets stored on the invoice (kept for transparency) */}
            <div className="mt-4 pt-3 border-t border-border/60">
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Invoice Buckets</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                {[
                  { l: "Civil Aviation Authority Fees", v: inv.civil_aviation },
                  { l: "Ground Handling Fee",           v: inv.handling },
                  { l: "Airport Charges",               v: inv.airport_charges },
                  { l: "Catering",                      v: inv.catering },
                  { l: "Other Charges",                 v: inv.other },
                ].filter(x => x.v).map(x => (
                  <div key={x.l} className="flex justify-between items-center py-1.5 border-b border-border/30">
                    <span className="text-xs text-foreground">{x.l}</span>
                    <span className="text-xs font-mono font-semibold text-foreground">{fmt(x.v)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-2 mt-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Subtotal</span>
                <span className="text-sm font-mono font-semibold text-foreground">{fmt(inv.subtotal)}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-xs text-muted-foreground">VAT</span>
                <span className="text-xs font-mono text-foreground">{fmt(inv.vat)}</span>
              </div>
              {/* Total amount intentionally not displayed on this view */}
            </div>
          </div>

          {/* Payment Info */}
          {(inv.payment_ref || inv.credit_note_ref || inv.journal_entry_id) && (
            <div className="bg-muted/30 rounded-lg p-4">
              <h3 className="text-xs font-bold text-amber uppercase tracking-wider mb-2 flex items-center gap-1.5"><CreditCard size={12} /> Payment & Accounting</h3>
              {inv.payment_ref && <DetailRow label="Payment Reference" value={inv.payment_ref} mono />}
              {inv.credit_note_ref && <DetailRow label="Credit Note Ref" value={inv.credit_note_ref} mono />}
              {inv.finalized_by && <DetailRow label="Finalized By" value={inv.finalized_by} />}
              {inv.sent_to && <DetailRow label="Sent To" value={inv.sent_to} />}
              {inv.journal_entry_id && <DetailRow label="Journal Entry" value={<span className="flex items-center gap-1"><BookOpen size={12} className="text-success" /> Linked</span>} />}
            </div>
          )}

          {/* Notes */}
          {inv.notes && (
            <div className="bg-muted/30 rounded-lg p-4">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Notes</h3>
              <p className="text-sm text-foreground">{inv.notes}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-card border-t px-4 md:px-6 py-3 md:py-4 flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-between rounded-b-xl">
          <button onClick={onClose} className="toolbar-btn-outline w-full sm:w-auto">Close</button>
          <div className="flex gap-2 flex-wrap">
            {inv.invoice_type !== "Final" && (
              <button onClick={() => { onClose(); onFinalize(inv); }} className="toolbar-btn-success flex items-center gap-1.5 flex-1 sm:flex-none justify-center"><ShieldCheck size={14} /> Finalize</button>
            )}
            <button onClick={() => { onClose(); onPrint(inv); }} className="toolbar-btn-outline flex items-center gap-1.5 flex-1 sm:flex-none justify-center"><Printer size={14} /> Print</button>
            <button onClick={() => { onClose(); onEdit(inv); }} className="toolbar-btn-primary flex items-center gap-1.5 flex-1 sm:flex-none justify-center"><FileText size={14} /> Edit</button>
          </div>
        </div>
      </div>
    </div>
  );
}
