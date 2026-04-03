import { X, FileText, DollarSign, Plane, Calendar, MapPin, ShieldCheck, Printer, Clock, CheckCircle, AlertCircle, XCircle, BookOpen, CreditCard } from "lucide-react";

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

function ChargeRow({ label, amount, currency }: { label: string; amount: number; currency: string }) {
  if (!amount) return null;
  return (
    <div className="flex justify-between items-center py-2 border-b border-border/30 last:border-0">
      <span className="text-sm text-foreground">{label}</span>
      <span className="text-sm font-mono font-semibold text-foreground">{currency} {amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
    </div>
  );
}

export default function InvoiceDetailModal({ invoice: inv, onClose, onEdit, onFinalize, onPrint }: Props) {
  const st = statusStyles[inv.status] || statusStyles.Draft;
  const daysUntilDue = Math.ceil((new Date(inv.due_date).getTime() - Date.now()) / 86400000);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card rounded-xl border shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto m-4" onClick={e => e.stopPropagation()}>
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
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-primary/5 rounded-lg p-3 text-center">
              <DollarSign size={16} className="mx-auto text-primary mb-1" />
              <div className="text-xl font-bold text-foreground">{inv.currency} {inv.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              <div className="text-[10px] text-muted-foreground uppercase font-semibold">Total Amount</div>
            </div>
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
            <DetailRow label="Invoice Date" value={inv.date} />
            <DetailRow label="Due Date" value={inv.due_date} />
            {inv.finalized_at && <DetailRow label="Finalized At" value={new Date(inv.finalized_at).toLocaleDateString()} />}
            {inv.sent_at && <DetailRow label="Sent At" value={new Date(inv.sent_at).toLocaleDateString()} />}
            {inv.payment_date && <DetailRow label="Payment Date" value={inv.payment_date} />}
          </div>

          {/* Charges Breakdown */}
          <div className="bg-muted/30 rounded-lg p-4">
            <h3 className="text-xs font-bold text-success uppercase tracking-wider mb-2 flex items-center gap-1.5"><DollarSign size={12} /> Charges Breakdown</h3>
            <ChargeRow label="Civil Aviation Authority Fees" amount={inv.civil_aviation} currency={inv.currency} />
            <ChargeRow label="Ground Handling Fee" amount={inv.handling} currency={inv.currency} />
            <ChargeRow label="Airport Charges" amount={inv.airport_charges} currency={inv.currency} />
            <ChargeRow label="Catering" amount={inv.catering} currency={inv.currency} />
            <ChargeRow label="Other Charges" amount={inv.other} currency={inv.currency} />
            <div className="flex justify-between items-center py-2 border-t-2 border-border mt-1">
              <span className="text-sm font-semibold text-muted-foreground">Subtotal</span>
              <span className="text-sm font-mono font-bold text-foreground">{inv.currency} {inv.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">VAT</span>
              <span className="text-sm font-mono text-foreground">{inv.currency} {inv.vat.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center py-3 bg-primary/5 rounded-lg px-3 -mx-1 mt-1">
              <span className="text-base font-bold text-primary">Total</span>
              <span className="text-xl font-mono font-bold text-primary">{inv.currency} {inv.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
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
