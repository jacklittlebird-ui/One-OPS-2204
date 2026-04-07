import { FileText, X, Mail, User, Calendar, DollarSign, Building2 } from "lucide-react";
import { formatDateDMY } from "@/lib/utils";
import type { ContractRow } from "./ContractTypes";
import { ContractStatusBadge, ContractTypeBadge } from "./ContractStatusBadge";
import { daysUntilExpiry } from "./ContractTypes";

type Props = {
  contract: ContractRow;
  onClose: () => void;
};

function InfoRow({ label, value, icon }: { label: string; value: string | React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      {icon && <span className="text-muted-foreground mt-0.5">{icon}</span>}
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
        <div className="text-sm font-medium text-foreground mt-0.5">{value || "—"}</div>
      </div>
    </div>
  );
}

export function ContractDetailModal({ contract: c, onClose }: Props) {
  const days = daysUntilExpiry(c.end_date);
  const duration = Math.ceil((new Date(c.end_date).getTime() - new Date(c.start_date).getTime()) / 86400000);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm">
      <div className="bg-card rounded-xl border shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
          <div>
            <h2 className="font-bold text-foreground text-lg flex items-center gap-2">
              <FileText size={18} className="text-primary" />
              {c.contract_no}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">{c.airline}</p>
          </div>
          <div className="flex items-center gap-2">
            <ContractTypeBadge type={c.contract_type} />
            <ContractStatusBadge status={c.status} />
            <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-full text-muted-foreground ml-2"><X size={18} /></button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Timeline */}
          {c.status === "Active" && days > 0 && days <= 90 && (
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-sm text-warning font-medium">
              ⚠ Contract expires in {days} days — consider renewal
            </div>
          )}

          <div className="grid grid-cols-2 gap-x-8 gap-y-1">
            <InfoRow label="Airline IATA" value={c.airline_iata || "—"} icon={<Building2 size={14} />} />
            <InfoRow label="SGHA Reference" value={c.sgha_ref || "—"} icon={<FileText size={14} />} />
            <InfoRow label="Contact Person" value={c.contact_person || "—"} icon={<User size={14} />} />
            <InfoRow label="Contact Email" value={c.contact_email || "—"} icon={<Mail size={14} />} />
          </div>

          <div className="border-t pt-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Duration</h3>
            <div className="grid grid-cols-3 gap-x-8 gap-y-1">
              <InfoRow label="Start Date" value={formatDateDMY(c.start_date)} icon={<Calendar size={14} />} />
              <InfoRow label="End Date" value={formatDateDMY(c.end_date)} icon={<Calendar size={14} />} />
              <InfoRow label="Duration" value={`${duration} days`} />
              <InfoRow label="Auto-Renew" value={c.auto_renew ? "✔ Yes" : "No"} />
              <InfoRow label="Days Remaining" value={days > 0 ? `${days} days` : "Expired"} />
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Services & Coverage</h3>
            <div className="grid grid-cols-1 gap-y-1">
              <InfoRow label="Services (Annex A)" value={c.services || "—"} />
              <InfoRow label="Stations (Annex B)" value={c.stations || "—"} />
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Financial Terms</h3>
            <div className="grid grid-cols-3 gap-x-8 gap-y-1">
              <InfoRow label="Annual Value" value={`${c.currency} ${c.annual_value.toLocaleString()}`} icon={<DollarSign size={14} />} />
              <InfoRow label="Payment Terms" value={c.payment_terms} />
              <InfoRow label="Billing Frequency" value={c.billing_frequency} />
            </div>
          </div>

          {c.notes && (
            <div className="border-t pt-4">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Notes</h3>
              <p className="text-sm text-foreground whitespace-pre-wrap">{c.notes}</p>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-card border-t px-6 py-4 flex justify-end rounded-b-xl">
          <button onClick={onClose} className="toolbar-btn-outline">Close</button>
        </div>
      </div>
    </div>
  );
}
