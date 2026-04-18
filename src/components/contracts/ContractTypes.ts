export type ContractStatus = "Active" | "Expired" | "Pending" | "Terminated";
export type ServiceCategory = "Handling" | "Security" | "Both";

export type ContractRow = {
  id: string;
  contract_no: string;
  airline: string;
  airline_iata: string | null;
  start_date: string;
  end_date: string;
  services: string | null;
  stations: string | null;
  currency: string;
  annual_value: number;
  status: ContractStatus;
  auto_renew: boolean;
  notes: string | null;
  contract_type: string;
  service_category: ServiceCategory;
  contact_person: string;
  contact_email: string;
  payment_terms: string;
  billing_frequency: string;
  sgha_ref: string;
};

export type SecurityRateRow = {
  id?: string;
  contract_id?: string;
  airport: string;
  flight_type: string;
  rate: number;
  included_hours: number;
  overtime_rate: number;
  currency: string;
  unit: string;
  notes: string;
  sort_order?: number;
  service_type?: string;
};

export const CONTRACT_TYPES = ["Ad-Hoc", "Bilateral", "Charter", "Interline", "SGHA"] as const;
export const SERVICE_CATEGORIES: ServiceCategory[] = ["Handling", "Security", "Both"];

export const SECURITY_FLIGHT_TYPES = [
  "Turnaround Departure",
  "Turnaround Arrival",
  "Night Stop",
  "ADHOC",
  "Short Notice ADHOC",
  "Additional Manpower",
  "Ramp Vehicle",
  "Return to Ramp (Load Change)",
  "Overtime",
] as const;

export const RATE_UNITS = ["Per Flight", "Per Hour", "Per Trip", "Per Person"] as const;
export const PAYMENT_TERMS = ["Net 15", "Net 30", "Net 45", "Net 60", "Net 90", "Prepaid"] as const;
export const BILLING_FREQUENCIES = ["Annual", "Bi-Weekly", "Monthly", "Per Flight", "Quarterly", "Weekly"] as const;
export const CURRENCIES = ["EGP", "EUR", "USD"] as const;
export const STATUSES: ContractStatus[] = ["Active", "Expired", "Pending", "Terminated"];

export function daysUntilExpiry(endDate: string): number {
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
}

export const emptyContract = (): Partial<ContractRow> => ({
  contract_no: `LNK-CTR-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
  airline: "", airline_iata: "", start_date: new Date().toISOString().slice(0, 10),
  end_date: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
  services: "", stations: "", currency: "USD", annual_value: 0,
  status: "Pending" as ContractStatus, auto_renew: false, notes: "",
  contract_type: "SGHA", service_category: "Handling" as ServiceCategory,
  contact_person: "", contact_email: "",
  payment_terms: "Net 30", billing_frequency: "Monthly", sgha_ref: "",
});
