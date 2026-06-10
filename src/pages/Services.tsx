import { useState } from "react";
import { TablePagination, usePagination } from "@/components/ui/table-pagination";
import { Link2, DollarSign, Plane, UtensilsCrossed, Fuel, BedDouble, Shield, Crown, Map, ChevronLeft, ChevronRight, Building2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  civilAviationData, civilAviationServices,
  handlingTypes, handlingEquipmentIncluded, handlingEquipmentPerHour,
  handlingEquipmentOnRequest, handlingEquipmentPerHourRequest, crewHandlingItems,
  cateringItems, fuelItems,
  hotacPassengers, hotacCrew, hotacVip, hotacTransport,
  securityItems, vipItems, overflyItems, caiSuppliers,
} from "@/data/servicesData";

type ServiceTab =
  | "Civil Aviation"
  | "Handling Services"
  | "Catering"
  | "Fuel"
  | "Hotac"
  | "Security"
  | "VIP Services"
  | "Overflying & Permits"
  | "CAI Suppliers";

const tabs: { key: ServiceTab; icon: React.ReactNode; color: string }[] = [
  { key: "Civil Aviation",       icon: <Plane size={15} />,            color: "hsl(var(--primary))" },
  { key: "Handling Services",    icon: <DollarSign size={15} />,       color: "hsl(var(--info))" },
  { key: "Catering",             icon: <UtensilsCrossed size={15} />,  color: "hsl(var(--warning))" },
  { key: "Fuel",                 icon: <Fuel size={15} />,             color: "hsl(var(--destructive))" },
  { key: "Hotac",                icon: <BedDouble size={15} />,        color: "hsl(var(--accent))" },
  { key: "Security",             icon: <Shield size={15} />,           color: "hsl(var(--success))" },
  { key: "VIP Services",         icon: <Crown size={15} />,            color: "hsl(208 60% 55%)" },
  { key: "Overflying & Permits", icon: <Map size={15} />,              color: "hsl(var(--muted-foreground))" },
  { key: "CAI Suppliers",        icon: <Building2 size={15} />,        color: "hsl(var(--primary))" },
];

// ---- Civil Aviation Tab ----
const CA_PAGE_SIZE = 25;
function CivilAviationTab() {
  const { pageRows: pageData, ...pag } = usePagination(civilAviationData, { resetKey: [] });
  const [showServices, setShowServices] = useState(false);

  const grouped = civilAviationServices.reduce((acc, s) => {
    (acc[s.category] = acc[s.category] || []).push(s);
    return acc;
  }, {} as Record<string, typeof civilAviationServices>);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-primary">المصرية للمطارات (Egyptian Airports)</span> – Landing Fees
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Airports: HRG, SSH, LXR, ASW · Currency: USD</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowServices(v => !v)} className="text-xs px-3 py-1.5 rounded-md border font-semibold hover:bg-muted transition-colors text-primary border-primary/30">
            {showServices ? "Hide" : "Show"} Additional Services
          </button>
          <span className="text-xs text-muted-foreground">{civilAviationData.length} TON records</span>
        </div>
      </div>

      {/* TON rate table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {["TON", "Rate/Ton (Day)", "Day Fee (USD)", "Rate/Ton (Night)", "Night Fee (USD)", "Currency", "Airports"].map(h => (
                <th key={h} className="data-table-header px-4 py-3 text-left whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map(r => {
              const rateDay = r.ton <= 18 ? 1.817 : r.ton <= 25 ? 1.820 : r.ton <= 100 ? 2.783 : 3.761;
              const rateNight = r.ton <= 18 ? 2.18 : r.ton <= 25 ? 2.27 : r.ton <= 100 ? 3.479 : 4.640;
              return (
                <tr key={r.id} className="data-table-row">
                  <td className="px-4 py-2.5 font-semibold text-foreground">{r.ton}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{rateDay.toFixed(3)}</td>
                  <td className="px-4 py-2.5 font-semibold text-foreground">{r.dayFee.toFixed(3)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{rateNight.toFixed(3)}</td>
                  <td className="px-4 py-2.5 font-semibold text-foreground">{r.nightFee.toFixed(3)}</td>
                  <td className="px-4 py-2.5 text-foreground">{r.currency}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{r.airports}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <TablePagination {...pag} />

      {/* Additional Civil Aviation Services */}
      {showServices && (
        <div className="space-y-4 pt-2">
          <h3 className="font-bold text-foreground">Additional Civil Aviation Services & Fees</h3>
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{cat}</h4>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead><tr>
                    <th className="data-table-header px-4 py-2.5 text-left">Service</th>
                    <th className="data-table-header px-4 py-2.5 text-left">Billing</th>
                  </tr></thead>
                  <tbody>
                    {items.map(s => (
                      <tr key={s.service} className="data-table-row">
                        <td className="px-4 py-2 text-foreground">{s.service}</td>
                        <td className="px-4 py-2 text-muted-foreground text-xs">{s.billing}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Handling Services Tab ----
function HandlingServicesTab() {
  const equipmentSections = [
    { title: "Included in Basic Handling", data: handlingEquipmentIncluded, badge: "✓ Included", badgeClass: "bg-success/15 text-success" },
    { title: "Per Hour (included in basic, time-free)", data: handlingEquipmentPerHour, badge: "Per Hour", badgeClass: "bg-info/15 text-info" },
    { title: "Per Unit (on request)", data: handlingEquipmentOnRequest, badge: "On Request", badgeClass: "bg-muted text-muted-foreground" },
    { title: "Per Hour (on request)", data: handlingEquipmentPerHourRequest, badge: "On Request", badgeClass: "bg-muted text-muted-foreground" },
  ];

  return (
    <div className="space-y-6">
      {/* Handling types */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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

      {/* Equipment sections */}
      {equipmentSections.map(section => (
        <div key={section.title}>
          <h3 className="font-bold text-foreground mb-3">{section.title}</h3>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead><tr>
                <th className="data-table-header px-4 py-3 text-left">Service / Equipment</th>
                <th className="data-table-header px-4 py-3 text-left">Billing Unit</th>
                <th className="data-table-header px-4 py-3 text-left">Status</th>
              </tr></thead>
              <tbody>
                {section.data.map(e => (
                  <tr key={e.name} className="data-table-row">
                    <td className="px-4 py-2.5 text-foreground">{e.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{e.unit}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${section.badgeClass}`}>{section.badge}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Crew Handling */}
      <div>
        <h3 className="font-bold text-foreground mb-3 flex items-center gap-2"><Users size={14} className="text-primary" /> Crew Handling</h3>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead><tr>
              <th className="data-table-header px-4 py-3 text-left">Service</th>
              <th className="data-table-header px-4 py-3 text-left">Billing Unit</th>
            </tr></thead>
            <tbody>
              {crewHandlingItems.map(c => (
                <tr key={c.service} className="data-table-row">
                  <td className="px-4 py-2.5 text-foreground">{c.service}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{c.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---- Catering Tab (grouped by category) ----
function CateringTab() {
  const grouped = cateringItems.reduce((acc, item) => {
    (acc[item.category] = acc[item.category] || []).push(item);
    return acc;
  }, {} as Record<string, typeof cateringItems>);

  return (
    <div className="space-y-5">
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat}>
          <h3 className="font-bold text-foreground mb-2">{cat}</h3>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead><tr>
                <th className="data-table-header px-4 py-3 text-left">Item</th>
                <th className="data-table-header px-4 py-3 text-left">Unit</th>
                <th className="data-table-header px-4 py-3 text-left">Price</th>
              </tr></thead>
              <tbody>
                {items.map(r => (
                  <tr key={r.item} className="data-table-row">
                    <td className="px-4 py-2.5 text-foreground">{r.item}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{r.unit}</td>
                    <td className="px-4 py-2.5 text-foreground">{r.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- Hotac Tab (Passengers / Crew / VIP / Transport) ----
function HotacTab() {
  const renderHotacTable = (title: string, data: { category: string; sgl: string; dbl: string; tpl: string; currency: string }[]) => (
    <div>
      <h3 className="font-bold text-foreground mb-2">{title}</h3>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead><tr>
            {["Category", "SGL", "DBL", "TPL", "Currency"].map(h => (
              <th key={h} className="data-table-header px-4 py-3 text-left">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {data.map(r => (
              <tr key={r.category} className="data-table-row">
                <td className="px-4 py-2.5 text-foreground">{r.category}</td>
                <td className="px-4 py-2.5 text-foreground">{r.sgl}</td>
                <td className="px-4 py-2.5 text-foreground">{r.dbl}</td>
                <td className="px-4 py-2.5 text-foreground">{r.tpl}</td>
                <td className="px-4 py-2.5 text-muted-foreground text-xs">{r.currency}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {renderHotacTable("Passengers HOTAC", hotacPassengers)}
      {renderHotacTable("Crew HOTAC", hotacCrew)}
      {renderHotacTable("VIP HOTAC", hotacVip)}
      <div>
        <h3 className="font-bold text-foreground mb-2">Transportation</h3>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead><tr>
              {["Service", "Unit", "Price", "Currency"].map(h => (
                <th key={h} className="data-table-header px-4 py-3 text-left">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {hotacTransport.map(r => (
                <tr key={r.service} className="data-table-row">
                  <td className="px-4 py-2.5 text-foreground">{r.service}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{r.unit}</td>
                  <td className="px-4 py-2.5 text-foreground">{r.price}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{r.currency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---- VIP Tab (grouped by category) ----
function VipTab() {
  const grouped = vipItems.reduce((acc, item) => {
    (acc[item.category] = acc[item.category] || []).push(item);
    return acc;
  }, {} as Record<string, typeof vipItems>);

  return (
    <div className="space-y-5">
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat}>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{cat}</h4>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead><tr>
                <th className="data-table-header px-4 py-3 text-left">Service</th>
                <th className="data-table-header px-4 py-3 text-left">Unit</th>
                <th className="data-table-header px-4 py-3 text-left">Price</th>
              </tr></thead>
              <tbody>
                {items.map(r => (
                  <tr key={r.service} className="data-table-row">
                    <td className="px-4 py-2.5 text-foreground">{r.service}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{r.unit}</td>
                    <td className="px-4 py-2.5 text-foreground">{r.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- Simple table for Security, Fuel, Overfly ----
function SimpleServiceTab({ items, columns }: { items: Record<string, any>[]; columns: string[] }) {
  return (
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
  );
}

// ---- CAI Suppliers Tab ----
function CaiSuppliersTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Building2 size={16} className="text-primary" />
        <h3 className="font-bold text-foreground">Cairo International Airport (CAI) — Service Suppliers</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">Mapped from <span className="font-semibold text-primary">CAI_1.pdf</span></p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {caiSuppliers.map(s => (
          <div key={s.service} className="bg-card border rounded-lg p-4">
            <h4 className="font-bold text-foreground mb-2 text-sm">{s.service}</h4>
            <div className="flex flex-wrap gap-1.5">
              {s.suppliers.map(sup => (
                <span key={sup} className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">{sup}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ Main Page ============
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
        Cross-referenced with{" "}
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
              activeTab === t.key ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"
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
        {activeTab === "Catering" && <CateringTab />}
        {activeTab === "Fuel" && <SimpleServiceTab items={fuelItems} columns={["grade", "unit", "price", "currency", "notes"]} />}
        {activeTab === "Hotac" && <HotacTab />}
        {activeTab === "Security" && <SimpleServiceTab items={securityItems} columns={["service", "unit", "price"]} />}
        {activeTab === "VIP Services" && <VipTab />}
        {activeTab === "Overflying & Permits" && <SimpleServiceTab items={overflyItems} columns={["permit", "unit", "price", "validity"]} />}
        {activeTab === "CAI Suppliers" && <CaiSuppliersTab />}
      </div>
    </div>
  );
}
