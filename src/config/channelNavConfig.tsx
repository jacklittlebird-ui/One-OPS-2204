import { 
  LayoutDashboard, Plane, Calculator, FileText, Utensils, DollarSign,
  Shield, AlertTriangle, MoreHorizontal, FileBarChart2,
  ShieldCheck, Users, Bell, Settings, ClipboardCheck, Building2,
  Receipt, CreditCard, Eye
} from "lucide-react";
import type { Channel } from "@/contexts/ChannelContext";

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

// Channel-specific navigation configs
const channelNavs: Record<Channel, NavSection[]> = {
  clearance: [
    { label: "Dashboard", icon: <LayoutDashboard size={18} />, path: "/" },
    {
      label: "CLEARANCE", icon: <ShieldCheck size={18} />, collapsible: true,
      children: [
        { label: "Flight Schedules", path: "/clearances" },
        { label: "Overfly Schedule", path: "/overfly-schedule" },
      ],
    },
    {
      label: "REFERENCE", icon: <MoreHorizontal size={18} />, collapsible: true,
      children: [
        { label: "Airlines", path: "/airlines" },
        { label: "Aircrafts", path: "/aircrafts" },
        { label: "Aircraft Types", path: "/aircraft-types" },
        { label: "Airports", path: "/airports" },
      ],
    },
    { label: "NOTIFICATIONS", icon: <Bell size={18} />, path: "/notifications" },
  ],

  station: [
    { label: "Dashboard", icon: <LayoutDashboard size={18} />, path: "/" },
    {
      label: "SCHEDULE", icon: <Plane size={18} />, collapsible: true,
      children: [
        { label: "Flight Schedules", path: "/clearances" },
      ],
    },
    {
      label: "REPORTING", icon: <FileBarChart2 size={18} />, collapsible: true,
      children: [
        { label: "Service Report", path: "/service-report" },
        { label: "Lost & Found", path: "/lost-found" },
        { label: "Delay Codes", path: "/delay-codes" },
      ],
    },
    {
      label: "REFERENCE", icon: <MoreHorizontal size={18} />, collapsible: true,
      children: [
        { label: "Airlines", path: "/airlines" },
        { label: "Services Catalog", path: "/services-catalog" },
        { label: "Staff Roster", path: "/staff-roster" },
      ],
    },
    { label: "NOTIFICATIONS", icon: <Bell size={18} />, path: "/notifications" },
  ],

  contracts: [
    { label: "Dashboard", icon: <LayoutDashboard size={18} />, path: "/" },
    {
      label: "CONTRACTS", icon: <FileText size={18} />, collapsible: true,
      children: [
        { label: "Contracts", path: "/contracts" },
        { label: "Airline Incentives", path: "/airline-incentives" },
      ],
    },
    {
      label: "PRICING", icon: <DollarSign size={18} />, collapsible: true,
      children: [
        { label: "Chart of Services", path: "/services" },
        { label: "Airport Charges", path: "/airport-charges" },
        { label: "Departure Tax", path: "/airport-tax" },
        { label: "Basic Ramp", path: "/basic-ramp" },
        { label: "Vendor Equipment", path: "/vendor-equipment" },
        { label: "Hall & VVIP", path: "/hall-vvip" },
        { label: "Tube", path: "/tube" },
        { label: "Catering", path: "/catering" },
      ],
    },
    {
      label: "REFERENCE", icon: <MoreHorizontal size={18} />, collapsible: true,
      children: [
        { label: "Airlines", path: "/airlines" },
        { label: "Service Providers", path: "/service-providers" },
      ],
    },
    { label: "NOTIFICATIONS", icon: <Bell size={18} />, path: "/notifications" },
  ],

  operations: [
    { label: "Dashboard", icon: <LayoutDashboard size={18} />, path: "/" },
    {
      label: "REVIEW", icon: <ClipboardCheck size={18} />, collapsible: true,
      children: [
        { label: "Service Report", path: "/service-report" },
        { label: "Flight Schedules", path: "/clearances" },
      ],
    },
    {
      label: "OPERATIONS", icon: <Plane size={18} />, collapsible: true,
      children: [
        { label: "Countries", path: "/countries" },
        { label: "Airports", path: "/airports" },
        { label: "Airlines", path: "/airlines" },
        { label: "Aircrafts", path: "/aircrafts" },
        { label: "Staff Roster", path: "/staff-roster" },
      ],
    },
    {
      label: "QUALITY & SAFETY", icon: <AlertTriangle size={18} />, collapsible: true,
      children: [
        { label: "Bulletins", path: "/bulletins" },
        { label: "Manuals & Forms", path: "/manuals-forms" },
      ],
    },
    { label: "NOTIFICATIONS", icon: <Bell size={18} />, path: "/notifications" },
  ],

  receivables: [
    { label: "Dashboard", icon: <LayoutDashboard size={18} />, path: "/" },
    {
      label: "BILLING", icon: <Receipt size={18} />, collapsible: true,
      children: [
        { label: "Client Invoices", path: "/invoices" },
        { label: "Service Report", path: "/service-report" },
        { label: "Aging Reports", path: "/aging-reports" },
      ],
    },
    {
      label: "ACCOUNTING", icon: <Calculator size={18} />, collapsible: true,
      children: [
        { label: "Chart of Accounts", path: "/chart-of-accounts" },
        { label: "Journal Entries", path: "/journal-entries" },
        { label: "Financial Reports", path: "/financial-reports" },
      ],
    },
    {
      label: "REFERENCE", icon: <MoreHorizontal size={18} />, collapsible: true,
      children: [
        { label: "Airlines", path: "/airlines" },
        { label: "Contracts", path: "/contracts" },
      ],
    },
    { label: "NOTIFICATIONS", icon: <Bell size={18} />, path: "/notifications" },
  ],

  payables: [
    { label: "Dashboard", icon: <LayoutDashboard size={18} />, path: "/" },
    {
      label: "PAYABLES", icon: <CreditCard size={18} />, collapsible: true,
      children: [
        { label: "Vendor Invoices", path: "/vendor-invoices" },
        { label: "Service Providers", path: "/service-providers" },
        { label: "Aging Reports", path: "/aging-reports" },
      ],
    },
    {
      label: "PRICING", icon: <DollarSign size={18} />, collapsible: true,
      children: [
        { label: "Airport Charges", path: "/airport-charges" },
        { label: "Vendor Equipment", path: "/vendor-equipment" },
      ],
    },
    { label: "NOTIFICATIONS", icon: <Bell size={18} />, path: "/notifications" },
  ],

  admin: [
    { label: "Dashboard", icon: <LayoutDashboard size={18} />, path: "/" },
    {
      label: "CLEARANCE", icon: <ShieldCheck size={18} />, collapsible: true,
      children: [
        { label: "Flight Schedules", path: "/clearances" },
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
    { label: "CATERING", icon: <Utensils size={18} />, path: "/catering" },
    {
      label: "PRICES", icon: <DollarSign size={18} />, collapsible: true,
      children: [
        { label: "Tube", path: "/tube" },
        { label: "Airport Charges", path: "/airport-charges" },
        { label: "Departure Tax", path: "/airport-tax" },
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
    { label: "NOTIFICATIONS", icon: <Bell size={18} />, path: "/notifications" },
    { label: "SETTINGS", icon: <Settings size={18} />, path: "/settings" },
    { label: "USERS", icon: <Users size={18} />, path: "/users" },
  ],
};

export function getNavForChannel(channel: Channel): NavSection[] {
  return channelNavs[channel] || channelNavs.admin;
}

export type { NavSection, NavChild };
