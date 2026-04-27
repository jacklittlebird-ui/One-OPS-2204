import { FileText, X, Shield } from "lucide-react";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import type { ContractRow, ContractStatus } from "./ContractTypes";
import { CONTRACT_TYPES, PAYMENT_TERMS, BILLING_FREQUENCIES, CURRENCIES, STATUSES, SERVICE_CATEGORIES } from "./ContractTypes";

const inputCls = "text-sm border rounded px-2 py-1.5 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground w-full";
const selectCls = "text-sm border rounded px-2 py-1.5 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full";

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

type Props = {
  data: Partial<ContractRow>;
  onChange: (d: Partial<ContractRow>) => void;
  onSave: () => void;
  onCancel: () => void;
  title: string;
  isSaving?: boolean;
};

export function ContractForm({ data, onChange, onSave, onCancel, title, isSaving }: Props) {
  const set = (key: string, val: any) => onChange({ ...data, [key]: val });
  const { data: airlines } = useSupabaseTable<{ id: string; name: string; iata_code: string }>("airlines", { orderBy: "name", ascending: true });
  const { data: airports } = useSupabaseTable<{ id: string; name: string; iata_code: string; city: string; status: string }>("airports", { orderBy: "iata_code", ascending: true });

  const selectedStations = (data.stations || "")
    .split(",")
    .map(s => s.trim().toUpperCase())
    .filter(Boolean);

  const toggleStation = (iata: string) => {
    const code = iata.trim().toUpperCase();
    if (!code) return;
    const next = selectedStations.includes(code)
      ? selectedStations.filter(s => s !== code)
      : [...selectedStations, code];
    set("stations", next.join(", "));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm">
      <div className="bg-card rounded-xl border shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
          <h2 className="font-bold text-foreground text-lg flex items-center gap-2">
            <FileText size={18} className="text-primary" />{title}
          </h2>
          <button onClick={onCancel} className="p-1.5 hover:bg-muted rounded-full text-muted-foreground"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Contract Identity */}
          <div>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Contract Identity</h3>
            <div className="grid grid-cols-4 gap-4">
              <FormField label="Contract No.">
                <input className={inputCls} value={data.contract_no || ""} onChange={e => set("contract_no", e.target.value)} />
              </FormField>
              <FormField label="Contract Type">
                <select className={selectCls} value={data.contract_type || "Schedule"} onChange={e => set("contract_type", e.target.value)}>
                  {CONTRACT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </FormField>
              <FormField label="Service Category">
                <select className={selectCls} value={data.service_category || "Full Handling"} onChange={e => set("service_category", e.target.value)}>
                  {SERVICE_CATEGORIES.map(t => <option key={t}>{t}</option>)}
                </select>
              </FormField>
              <FormField label="SGHA Reference">
                <input className={inputCls} value={data.sgha_ref || ""} onChange={e => set("sgha_ref", e.target.value)} placeholder="AHM 810 / Annex B" />
              </FormField>
            </div>
            {(data.service_category === "Security" || data.service_category === "Both") && (
              <div className="mt-3 flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 p-3 text-xs text-foreground">
                <Shield size={14} className="text-primary mt-0.5" />
                <span>This contract has <b>Security</b> coverage. Security service rates (per airport, flight type, ADHOC, manpower, ramp vehicle, etc.) are managed in the Security Rates editor on the contract detail view.</span>
              </div>
            )}
          </div>

          {/* Airline & Contact */}
          <div>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Airline & Contact</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Airline">
                <select
                  className={selectCls}
                  value={data.airline || ""}
                  onChange={e => {
                    const a = airlines.find(x => x.name === e.target.value);
                    onChange({ ...data, airline: e.target.value, airline_iata: a?.iata_code || data.airline_iata || "" });
                  }}
                >
                  <option value="">Select airline</option>
                  {airlines.map(a => <option key={a.id} value={a.name}>{a.name}{a.iata_code ? ` (${a.iata_code})` : ""}</option>)}
                </select>
              </FormField>
              <FormField label="Airline IATA">
                <input className={inputCls} value={data.airline_iata || ""} onChange={e => set("airline_iata", e.target.value)} placeholder="SM" maxLength={3} />
              </FormField>
              <FormField label="Contact Person">
                <input className={inputCls} value={data.contact_person || ""} onChange={e => set("contact_person", e.target.value)} placeholder="John Smith" />
              </FormField>
              <FormField label="Contact Email">
                <input type="email" className={inputCls} value={data.contact_email || ""} onChange={e => set("contact_email", e.target.value)} placeholder="john@airline.com" />
              </FormField>
            </div>
          </div>

          {/* Duration & Status */}
          <div>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Duration & Status</h3>
            <div className="grid grid-cols-3 gap-4">
              <FormField label="Start Date">
                <input type="date" className={inputCls} value={data.start_date || ""} onChange={e => set("start_date", e.target.value)} />
              </FormField>
              <FormField label="End Date">
                <input type="date" className={inputCls} value={data.end_date || ""} onChange={e => set("end_date", e.target.value)} />
              </FormField>
              <FormField label="Status">
                <select className={selectCls} value={data.status || "Pending"} onChange={e => set("status", e.target.value)}>
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </FormField>
              <FormField label="Auto-Renew">
                <label className="flex items-center gap-2 cursor-pointer mt-1">
                  <input type="checkbox" checked={data.auto_renew || false} onChange={e => set("auto_renew", e.target.checked)} className="rounded" />
                  <span className="text-sm text-foreground">{data.auto_renew ? "Yes" : "No"}</span>
                </label>
              </FormField>
            </div>
          </div>

          {/* Services & Stations */}
          <div>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Services & Coverage</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <FormField label="Services (Annex A)">
                  <input className={inputCls} value={data.services || ""} onChange={e => set("services", e.target.value)} placeholder="Full Ground Handling, AVSEC, Ramp, Passenger…" />
                </FormField>
              </div>
              <FormField label="Stations (Annex B)">
                <div className="space-y-2">
                  {selectedStations.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedStations.map(code => (
                        <span
                          key={code}
                          className="inline-flex items-center gap-1 text-xs font-mono bg-primary/10 text-primary border border-primary/20 rounded px-2 py-0.5"
                        >
                          {code}
                          <button
                            type="button"
                            onClick={() => toggleStation(code)}
                            className="hover:text-destructive"
                            aria-label={`Remove ${code}`}
                          >
                            <X size={11} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <select
                    className={selectCls}
                    value=""
                    onChange={e => { if (e.target.value) toggleStation(e.target.value); }}
                  >
                    <option value="">+ Add station…</option>
                    {(airports || [])
                      .filter(a => a.status !== "Inactive" && a.iata_code && !selectedStations.includes(a.iata_code.toUpperCase()))
                      .map(a => (
                        <option key={a.id} value={a.iata_code}>
                          {a.iata_code} — {a.name}{a.city ? ` (${a.city})` : ""}
                        </option>
                      ))}
                  </select>
                </div>
              </FormField>
            </div>
          </div>

          {/* Financial Terms */}
          <div>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Financial Terms</h3>
            <div className="grid grid-cols-3 gap-4">
              <FormField label="Currency">
                <select className={selectCls} value={data.currency || "USD"} onChange={e => set("currency", e.target.value)}>
                  {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </FormField>
              <FormField label="Annual Value">
                <input type="number" className={inputCls} value={data.annual_value || 0} onChange={e => set("annual_value", +e.target.value)} />
              </FormField>
              <FormField label="Payment Terms">
                <select className={selectCls} value={data.payment_terms || "Net 30"} onChange={e => set("payment_terms", e.target.value)}>
                  {PAYMENT_TERMS.map(t => <option key={t}>{t}</option>)}
                </select>
              </FormField>
              <FormField label="Billing Frequency">
                <select className={selectCls} value={data.billing_frequency || "Monthly"} onChange={e => set("billing_frequency", e.target.value)}>
                  {BILLING_FREQUENCIES.map(f => <option key={f}>{f}</option>)}
                </select>
              </FormField>
            </div>
          </div>

          {/* Notes */}
          <FormField label="Notes">
            <textarea className={inputCls + " resize-none"} rows={2} value={data.notes || ""} onChange={e => set("notes", e.target.value)} />
          </FormField>
        </div>

        <div className="sticky bottom-0 bg-card border-t px-6 py-4 flex gap-3 justify-end rounded-b-xl">
          <button onClick={onCancel} className="toolbar-btn-outline">Cancel</button>
          <button onClick={onSave} disabled={isSaving} className="toolbar-btn-primary">
            {isSaving ? "Saving…" : "Save Contract"}
          </button>
        </div>
      </div>
    </div>
  );
}
