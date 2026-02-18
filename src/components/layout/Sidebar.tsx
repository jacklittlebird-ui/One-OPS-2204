import { useState } from "react";
import {
  LayoutDashboard, Plane, Calculator, FileText, Utensils, DollarSign,
  Cylinder, Building2, Receipt, Wrench, Award, Crown, Shield, AlertTriangle,
  BookOpen, FileCheck, MoreHorizontal, Type, PlaneTakeoff, ChevronDown, ChevronRight
} from "lucide-react";

interface NavSection {
  label: string;
  icon: React.ReactNode;
  children?: { label: string; path: string; active?: boolean }[];
  path?: string;
  active?: boolean;
  collapsible?: boolean;
}

const navSections: NavSection[] = [
  { label: "Dashboard", icon: <LayoutDashboard size={18} />, path: "/", active: false },
  {
    label: "OPERATION", icon: <Plane size={18} />, collapsible: true,
    children: [
      { label: "Airlines", path: "/airlines" },
      { label: "Aircrafts", path: "/aircrafts" },
      { label: "Flight Schedule", path: "/flight-schedule" },
      { label: "Overfly Schedule", path: "#" },
      { label: "Delay Codes", path: "#" },
      { label: "Lost & Found", path: "#" },
      { label: "Staff Roster", path: "#" },
    ],
  },
  {
    label: "ACCOUNTANT", icon: <Calculator size={18} />, collapsible: true,
    children: [{ label: "Invoices", path: "#" }],
  },
  {
    label: "CONTRACT", icon: <FileText size={18} />, collapsible: true,
    children: [{ label: "Contracts", path: "#" }],
  },
  { label: "CATERING", icon: <Utensils size={18} />, path: "#" },
  {
    label: "PRICES", icon: <DollarSign size={18} />, collapsible: true,
    children: [
      { label: "Tube", path: "#" },
      { label: "Airport Charges", path: "/airport-charges" },
      { label: "Airport Tax", path: "#" },
      { label: "Basic Ramp", path: "#" },
      { label: "Vendor Equipment", path: "#" },
      { label: "Hall & VVIP", path: "#" },
      { label: "Chart of Services", path: "/services" },
    ],
  },
  { label: "T2 (TRAFFIC RIGHTS)", icon: <Shield size={18} />, path: "#" },
  {
    label: "QUALITY & SAFETY", icon: <AlertTriangle size={18} />, collapsible: true,
    children: [
      { label: "Bulletins", path: "#" },
      { label: "Bulletins Read", path: "#" },
      { label: "Manuals & Forms", path: "#" },
    ],
  },
  {
    label: "MISC.", icon: <MoreHorizontal size={18} />, collapsible: true,
    children: [
      { label: "Abbreviations", path: "#" },
      { label: "Aircraft Types", path: "#" },
    ],
  },
];

export default function Sidebar() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    PRICES: true,
    "QUALITY & SAFETY": true,
    "MISC.": true,
  });

  const toggle = (label: string) => setExpanded(prev => ({ ...prev, [label]: !prev[label] }));

  return (
    <aside className="w-56 min-h-screen bg-sidebar flex flex-col shrink-0">
      <div className="px-4 py-4 flex items-center gap-2">
        <span className="text-lg font-bold text-sidebar-primary-foreground tracking-wide">
          ✈ Link Aero
        </span>
      </div>
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto text-sm">
        {navSections.map((section) => (
          <div key={section.label}>
            {section.collapsible ? (
              <>
                <button
                  onClick={() => toggle(section.label)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                >
                  {section.icon}
                  <span className="flex-1 text-left font-medium text-xs uppercase tracking-wider">
                    {section.label}
                  </span>
                  {expanded[section.label] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                {expanded[section.label] && section.children && (
                  <div className="ml-4 space-y-0.5">
                    {section.children.map((child) => (
                      <a
                        key={child.label}
                        href={child.path}
                        className={`block px-3 py-1.5 rounded text-sm transition-colors ${
                          child.active
                            ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                            : "text-sidebar-foreground hover:bg-sidebar-accent"
                        }`}
                      >
                        {child.label}
                      </a>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <a
                href={section.path || "#"}
                className={`flex items-center gap-2 px-3 py-2 rounded transition-colors ${
                  section.active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                {section.icon}
                <span className="text-xs uppercase tracking-wider font-medium">{section.label}</span>
              </a>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
