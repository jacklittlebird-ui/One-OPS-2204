import { useState } from "react";
import { Link2, DollarSign, Plane, UtensilsCrossed, Fuel, BedDouble, Shield, Crown, Map } from "lucide-react";
import { useNavigate } from "react-router-dom";

type ServiceTab =
  | "Civil Aviation"
  | "Handling Services"
  | "Catering"
  | "Fuel"
  | "Hotac"
  | "Security"
  | "VIP Services"
  | "Overflying & Permits";

const tabs: { key: ServiceTab; icon: React.ReactNode; color: string }[] = [
  { key: "Civil Aviation",       icon: <Plane size={15} />,            color: "hsl(var(--primary))" },
  { key: "Handling Services",    icon: <DollarSign size={15} />,       color: "hsl(var(--info))" },
  { key: "Catering",             icon: <UtensilsCrossed size={15} />,  color: "hsl(var(--warning))" },
  { key: "Fuel",                 icon: <Fuel size={15} />,             color: "hsl(var(--destructive))" },
  { key: "Hotac",                icon: <BedDouble size={15} />,        color: "hsl(var(--accent))" },
  { key: "Security",             icon: <Shield size={15} />,           color: "hsl(var(--success))" },
  { key: "VIP Services",         icon: <Crown size={15} />,            color: "hsl(208 60% 55%)" },
  { key: "Overflying & Permits", icon: <Map size={15} />,              color: "hsl(var(--muted-foreground))" },
];

// --- Civil Aviation data (Egyptian Airports landing fee per ton) ---
const civilAviationData = Array.from({ length: 30 }, (_, i) => {
  const ton = i + 1;
  let dayFee: number, nightFee: number;
  if (ton <= 18) { dayFee = 1.817 * ton; nightFee = 2.18 * ton; }
  else if (ton <= 25) { dayFee = 1.817 * 18 + (ton - 18) * 1.82; nightFee = 2.18 * 18 + (ton - 18) * 2.27; }
  else { dayFee = 1.817 * 18 + 7 * 1.82 + (ton - 25) * 2.78; nightFee = 2.18 * 18 + 7 * 2.27 + (ton - 25) * 3.48; }
  return { id: String(ton), ton, dayFee: +dayFee.toFixed(3), nightFee: +nightFee.toFixed(3), currency: "USD", airports: "HRG, SSH, LXR, ASW" };
});

// --- Handling services structure ---
const handlingTypes = [
  { type: "Turnaround", subTypes: ["Full Handling", "Ramp Handling"] },
  { type: "Transit", subTypes: ["Full Handling", "Ramp Handling"] },
  { type: "Night Stop", subTypes: ["Full Handling", "Ramp Handling"] },
  { type: "Ferry In / Out", subTypes: ["Basic Handling"] },
  { type: "Technical", subTypes: ["Ramp Handling"] },
  { type: "Cargo Handling", subTypes: ["Basic Handling"] },
  { type: "Ground Services", subTypes: ["Per Request"] },
];

const handlingEquipment = [
  { name: "Chocks", unit: "Per Unit", included: true },
  { name: "Marshaling", unit: "Per Unit", included: true },
  { name: "Water Services", unit: "Per Unit", included: true },
  { name: "Toilet Services", unit: "Per Unit", included: true },
  { name: "Internal Cabin Cleaning", unit: "Per Unit", included: true },
  { name: "Passenger Steps", unit: "Per Hour", included: true },
  { name: "Tractor", unit: "Per Hour", included: true },
  { name: "Baggage Cart", unit: "Per Hour", included: true },
  { name: "Belt Conveyor", unit: "Per Hour", included: true },
  { name: "Ground Power Unit (GPU)", unit: "Per Hour", included: false },
  { name: "Air Condition Unit (ACU)", unit: "Per Hour", included: false },
  { name: "Push Back", unit: "Per Unit", included: false },
  { name: "Towing Tractor", unit: "Per Unit", included: false },
  { name: "Passenger Bus (70 Pax)", unit: "Per Unit", included: false },
  { name: "VIP Microbus", unit: "Per Unit", included: false },
  { name: "Crew Microbus", unit: "Per Unit", included: false },
  { name: "Air Starter Unit (ASU)", unit: "Per Unit", included: false },
  { name: "Security Services", unit: "Per Unit", included: false },
  { name: "Baggage Identification", unit: "Per Unit", included: false },
  { name: "Wheelchair", unit: "Per Unit", included: false },
  { name: "Catering Highlift", unit: "Per Unit", included: false },
  { name: "Dispatching / Engine Start-up", unit: "Per Unit", included: false },
  { name: "Fork Lift (up to 20 ton)", unit: "Per Hour", included: false },
  { name: "Link Supervision", unit: "Per Hour", included: false },
];

// --- Catering ---
const cateringItems = [
  { item: "Standard Meal (Economy)", unit: "Per Pax", price: "TBD", notes: "Hot/Cold" },
  { item: "Business Class Meal", unit: "Per Pax", price: "TBD", notes: "Premium" },
  { item: "First Class Meal", unit: "Per Pax", price: "TBD", notes: "Luxury" },
  { item: "Special Meal (Halal/Kosher/Vegan)", unit: "Per Pax", price: "TBD", notes: "On Request" },
  { item: "Crew Meal", unit: "Per Crew", price: "TBD", notes: "" },
  { item: "Water (1.5L bottles)", unit: "Per Case (12)", price: "TBD", notes: "" },
  { item: "Soft Drinks", unit: "Per Case", price: "TBD", notes: "" },
  { item: "Galley Change (Belly to Cabin)", unit: "Per Flight", price: "TBD", notes: "" },
];

// --- Fuel ---
const fuelItems = [
  { grade: "JET A-1", unit: "Per Liter", price: "TBD", currency: "USD", notes: "Subject to market rates" },
  { grade: "JET A-1 (Into-plane)", unit: "Per Liter", price: "TBD", currency: "USD", notes: "Includes dispensing fee" },
  { grade: "AVGAS 100LL", unit: "Per Liter", price: "TBD", currency: "USD", notes: "GA only" },
];

// --- Hotac ---
const hotacItems = [
  { category: "Crew Hotel (3★)", unit: "Per Night/Room", price: "TBD", currency: "USD" },
  { category: "Crew Hotel (4★)", unit: "Per Night/Room", price: "TBD", currency: "USD" },
  { category: "Crew Hotel (5★)", unit: "Per Night/Room", price: "TBD", currency: "USD" },
  { category: "Crew Transport (Hotel ↔ Airport)", unit: "Per Trip", price: "TBD", currency: "USD" },
  { category: "Crew Per Diem", unit: "Per Day/Person", price: "TBD", currency: "USD" },
];

// --- Security ---
const securityItems = [
  { service: "Arrival Security Check", unit: "Per Flight", price: "TBD" },
  { service: "Departure Security Check", unit: "Per Flight", price: "TBD" },
  { service: "Turn Around Security", unit: "Per Flight", price: "TBD" },
  { service: "Ad-Hoc Security", unit: "Per Hour", price: "TBD" },
  { service: "Maintenance Security", unit: "Per Hour", price: "TBD" },
  { service: "Baggage Screening", unit: "Per Bag", price: "TBD" },
  { service: "Cargo Screening", unit: "Per KG", price: "TBD" },
];

// --- VIP ---
const vipItems = [
  { service: "VIP Hall (Arrival)", unit: "Per Pax", price: "TBD" },
  { service: "VIP Hall (Departure)", unit: "Per Pax", price: "TBD" },
  { service: "VVIP Suite", unit: "Per Flight", price: "TBD" },
  { service: "VIP Escort / Meet & Assist", unit: "Per Pax", price: "TBD" },
  { service: "VIP Microbus", unit: "Per Trip", price: "TBD" },
  { service: "Private Lounge", unit: "Per Hour", price: "TBD" },
];

// --- Overflying ---
const overflyItems = [
  { permit: "Overfly Permit (Single)", unit: "Per Permit", price: "TBD", validity: "Single Use" },
  { permit: "Overfly Permit (Multiple – Monthly)", unit: "Per Month", price: "TBD", validity: "30 Days" },
  { permit: "Landing Permit (Commercial)", unit: "Per Landing", price: "TBD", validity: "Single Use" },
  { permit: "Landing Permit (Private/Charter)", unit: "Per Landing", price: "TBD", validity: "Single Use" },
  { permit: "Special Permit (Military/State)", unit: "Per Flight", price: "TBD", validity: "As Approved" },
  { permit: "Traffic Rights (T2)", unit: "Per Season", price: "TBD", validity: "IATA Season" },
];

function CivilAviationTab() {
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">Egyptian Airports – Civil Aviation / Landing Fees. Linked from: <span className="font-semibold text-primary">Link Egypt Chart of Services Cost.xlsx → Civil Aviation</span></p>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {["TON", "Day Fee (USD)", "Night Fee (USD)", "Currency", "Airports"].map(h => (
                <th key={h} className="data-table-header px-4 py-3 text-left whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {civilAviationData.map(r => (
              <tr key={r.id} className="data-table-row">
                <td className="px-4 py-2.5 font-semibold text-foreground">{r.ton}</td>
                <td className="px-4 py-2.5 text-foreground">{r.dayFee.toFixed(3)}</td>
                <td className="px-4 py-2.5 text-foreground">{r.nightFee.toFixed(3)}</td>
                <td className="px-4 py-2.5 text-foreground">{r.currency}</td>
                <td className="px-4 py-2.5 text-muted-foreground text-xs">{r.airports}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HandlingServicesTab() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">Linked from: <span className="font-semibold text-primary">Link Egypt Chart of Services Cost.xlsx → Handling Services</span></p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {handlingTypes.map(h => (
          <div key={h.type} className="bg-card border rounded-lg p-4">
            <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
              <Plane size={14} className="text-primary" />{h.type}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {h.subTypes.map(s => (
                <span key={s} className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">{s}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div>
        <h3 className="font-bold text-foreground mb-3">Ground Equipment & Services</h3>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {["SERVICE / EQUIPMENT", "BILLING UNIT", "INCLUDED IN BASIC"].map(h => (
                  <th key={h} className="data-table-header px-4 py-3 text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {handlingEquipment.map(e => (
                <tr key={e.name} className="data-table-row">
                  <td className="px-4 py-2.5 text-foreground">{e.name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{e.unit}</td>
                  <td className="px-4 py-2.5">
                    {e.included
                      ? <span className="px-2 py-0.5 rounded-full text-xs bg-success/15 text-success font-medium">✓ Included</span>
                      : <span className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground font-medium">On Request</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SimpleServiceTab({ items, columns, sourceSheet }: { items: Record<string, any>[]; columns: string[]; sourceSheet: string }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">Linked from: <span className="font-semibold text-primary">Link Egypt Chart of Services Cost.xlsx → {sourceSheet}</span></p>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr>{columns.map(c => <th key={c} className="data-table-header px-4 py-3 text-left whitespace-nowrap">{c.toUpperCase()}</th>)}</tr>
          </thead>
          <tbody>
            {items.map((row, i) => (
              <tr key={i} className="data-table-row">
                {Object.values(row).map((v, j) => (
                  <td key={j} className="px-4 py-2.5 text-foreground text-sm">{String(v)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ServicesPage() {
  const [activeTab, setActiveTab] = useState<ServiceTab>("Civil Aviation");
  const navigate = useNavigate();

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <h1 className="text-2xl font-bold text-foreground">Chart of Services Cost</h1>
        <Link2 size={18} className="text-primary" />
      </div>
      <p className="text-muted-foreground text-sm mb-5">
        Linked from <span className="font-semibold">Link Egypt Chart of Services Cost.xlsx</span> · Cross-referenced with{" "}
        <button onClick={() => navigate("/flight-schedule")} className="text-primary font-semibold hover:underline">Flight Schedule</button> and{" "}
        <button onClick={() => navigate("/airport-charges")} className="text-primary font-semibold hover:underline">Airport Charges</button>
      </p>

      {/* Tab navigation */}
      <div className="flex flex-wrap gap-1 mb-6 p-1 bg-muted rounded-lg">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
              activeTab === t.key
                ? "bg-card shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            style={activeTab === t.key ? { color: t.color } : {}}
          >
            <span style={{ color: t.color }}>{t.icon}</span>
            {t.key}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-card rounded-lg border p-5">
        {activeTab === "Civil Aviation" && <CivilAviationTab />}
        {activeTab === "Handling Services" && <HandlingServicesTab />}
        {activeTab === "Catering" && (
          <SimpleServiceTab
            items={cateringItems}
            columns={["item", "unit", "price", "notes"]}
            sourceSheet="Catering"
          />
        )}
        {activeTab === "Fuel" && (
          <SimpleServiceTab
            items={fuelItems}
            columns={["grade", "unit", "price", "currency", "notes"]}
            sourceSheet="Fuel"
          />
        )}
        {activeTab === "Hotac" && (
          <SimpleServiceTab
            items={hotacItems}
            columns={["category", "unit", "price", "currency"]}
            sourceSheet="Hotac"
          />
        )}
        {activeTab === "Security" && (
          <SimpleServiceTab
            items={securityItems}
            columns={["service", "unit", "price"]}
            sourceSheet="Security"
          />
        )}
        {activeTab === "VIP Services" && (
          <SimpleServiceTab
            items={vipItems}
            columns={["service", "unit", "price"]}
            sourceSheet="VIP Services"
          />
        )}
        {activeTab === "Overflying & Permits" && (
          <SimpleServiceTab
            items={overflyItems}
            columns={["permit", "unit", "price", "validity"]}
            sourceSheet="Overflying - permits"
          />
        )}
      </div>
    </div>
  );
}
