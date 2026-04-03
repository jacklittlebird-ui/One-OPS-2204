import { useLocation, Link } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard, Plane, Calculator, FileText, Utensils, DollarSign,
  Shield, AlertTriangle, MoreHorizontal, ChevronDown, ChevronRight, FileBarChart2,
  ShieldCheck, Users, Bell
} from "lucide-react";

interface NavChild {
  label: string;
  path: string;
}

interface NavSection {
  label: string;
  icon: React.ReactNode;
  children?: NavChild[];
  path?: string;
  collapsible?: boolean;
}

const navSections: NavSection[] = [
  { label: "Dashboard", icon: <LayoutDashboard size={18} />, path: "/" },
  {
    label: "CLEARANCE", icon: <ShieldCheck size={18} />, collapsible: true,
    children: [
      { label: "Clearances", path: "/clearances" },
      { label: "Flight Schedule", path: "/flight-schedule" },
      { label: "Overfly Schedule", path: "/overfly-schedule" },
    ],
  },
  {
    label: "OPERATION", icon: <Plane size={18} />, collapsible: true,
    children: [
      { label: "Countries", path: "/countries" },
      { label: "Airports", path: "/airports" },
      { label: "Airlines", path: "/airlines" },
      { label: "Aircrafts", path: "/aircrafts" },
      { label: "Services Catalog", path: "/services-catalog" },
      { label: "Service Providers", path: "/service-providers" },
      { label: "Delay Codes", path: "/delay-codes" },
      { label: "Lost & Found", path: "/lost-found" },
      { label: "Staff Roster", path: "/staff-roster" },
    ],
  },
  {
    label: "ACCOUNTANT", icon: <Calculator size={18} />, collapsible: true,
    children: [
      { label: "Chart of Accounts", path: "/chart-of-accounts" },
      { label: "Journal Entries", path: "/journal-entries" },
      { label: "Client Invoices", path: "/invoices" },
      { label: "Vendor Invoices", path: "/vendor-invoices" },
      { label: "Aging Reports", path: "/aging-reports" },
      { label: "Financial Reports", path: "/financial-reports" },
      { label: "Airline Incentives", path: "/airline-incentives" },
    ],
  },
  {
    label: "CONTRACT", icon: <FileText size={18} />, collapsible: true,
    children: [{ label: "Contracts", path: "/contracts" }],
  },
  {
    label: "CATERING", icon: <Utensils size={18} />, path: "/catering",
  },
  {
    label: "PRICES", icon: <DollarSign size={18} />, collapsible: true,
    children: [
      { label: "Tube", path: "/tube" },
      { label: "Airport Charges", path: "/airport-charges" },
      { label: "Airport Tax", path: "/airport-tax" },
      { label: "Basic Ramp", path: "/basic-ramp" },
      { label: "Vendor Equipment", path: "/vendor-equipment" },
      { label: "Hall & VVIP", path: "/hall-vvip" },
      { label: "Chart of Services", path: "/services" },
    ],
  },
  { label: "SERVICE REPORT", icon: <FileBarChart2 size={18} />, path: "/service-report" },
  { label: "T2 (TRAFFIC RIGHTS)", icon: <Shield size={18} />, path: "/traffic-rights" },
  {
    label: "QUALITY & SAFETY", icon: <AlertTriangle size={18} />, collapsible: true,
    children: [
      { label: "Bulletins", path: "/bulletins" },
      { label: "Manuals & Forms", path: "/manuals-forms" },
    ],
  },
  {
    label: "MISC.", icon: <MoreHorizontal size={18} />, collapsible: true,
    children: [
      { label: "Abbreviations", path: "/abbreviations" },
      { label: "Aircraft Types", path: "/aircraft-types" },
    ],
  },
  {
    label: "NOTIFICATIONS", icon: <Bell size={18} />, path: "/notifications",
  },
  {
    label: "USERS", icon: <Users size={18} />, path: "/users",
  },
];


export default function Sidebar() {
  const location = useLocation();
  const currentPath = location.pathname;
  

  const isChildActive = (children: NavChild[]) =>
    children.some(c => currentPath === c.path);

  const defaultExpanded: Record<string, boolean> = {};
  navSections.forEach(s => {
    if (s.collapsible && s.children && isChildActive(s.children)) {
      defaultExpanded[s.label] = true;
    }
  });
  defaultExpanded["PRICES"] = defaultExpanded["PRICES"] ?? true;
  defaultExpanded["OPERATION"] = defaultExpanded["OPERATION"] ?? true;
  defaultExpanded["CLEARANCE"] = defaultExpanded["CLEARANCE"] ?? true;

  const [expanded, setExpanded] = useState<Record<string, boolean>>(defaultExpanded);
  const toggle = (label: string) => setExpanded(prev => ({ ...prev, [label]: !prev[label] }));

  const isActive = (path: string) => currentPath === path;


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
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sidebar-foreground hover:bg-sidebar-accent transition-colors ${
                    section.children && isChildActive(section.children) ? "bg-sidebar-accent/60" : ""
                  }`}
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
                      <Link
                        key={child.label}
                        to={child.path}
                        className={`block px-3 py-1.5 rounded text-sm transition-colors ${
                          isActive(child.path)
                            ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold"
                            : "text-sidebar-foreground hover:bg-sidebar-accent"
                        }`}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <Link
                to={section.path || "/"}
                className={`flex items-center gap-2 px-3 py-2 rounded transition-colors ${
                  isActive(section.path || "/")
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                {section.icon}
                <span className="text-xs uppercase tracking-wider font-medium">{section.label}</span>
              </Link>
            )}
          </div>
        ))}
      </nav>

    </aside>
  );
}
