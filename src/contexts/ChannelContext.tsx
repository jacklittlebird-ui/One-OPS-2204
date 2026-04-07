import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

export type Channel = "clearance" | "station" | "contracts" | "operations" | "receivables" | "payables" | "admin";

export const CHANNEL_LABELS: Record<Channel, string> = {
  clearance: "Clearance",
  station: "Station",
  contracts: "Contracts",
  operations: "Operations",
  receivables: "Receivables",
  payables: "Payables",
  admin: "Admin & Management",
};

export const CHANNEL_DESCRIPTIONS: Record<Channel, string> = {
  clearance: "Flight schedule entry & permit management",
  station: "Service delivery & reporting",
  contracts: "Service pricing & contract management",
  operations: "Monitor, review & approve station reports",
  receivables: "Invoice generation & client billing",
  payables: "Vendor invoices & third-party payments",
  admin: "Full system administration",
};

// Map DB roles to channels
function rolesToChannels(roles: string[]): Channel[] {
  const channels: Channel[] = [];
  if (roles.includes("admin")) return ["admin", "clearance", "station", "contracts", "operations", "receivables", "payables"];
  if (roles.includes("clearance")) channels.push("clearance");
  if (roles.includes("station_manager") || roles.includes("station_ops") || roles.includes("employee")) channels.push("station");
  if (roles.includes("contracts")) channels.push("contracts");
  if (roles.includes("operations")) channels.push("operations");
  if (roles.includes("receivables")) channels.push("receivables");
  if (roles.includes("payables")) channels.push("payables");
  return channels.length > 0 ? channels : ["station"]; // default fallback
}

interface ChannelContextType {
  channels: Channel[];
  activeChannel: Channel;
  setActiveChannel: (c: Channel) => void;
  loading: boolean;
  userRoles: string[];
  isAdmin: boolean;
}

const ChannelContext = createContext<ChannelContextType | undefined>(undefined);

export function ChannelProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    
    const fetchRoles = async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const roles = data?.map(r => r.role) || [];
      setUserRoles(roles);
      
      const available = rolesToChannels(roles);
      if (roles.includes("admin")) {
        setActiveChannel("admin");
      } else {
        setActiveChannel(available[0]);
      }
      setLoading(false);
    };
    
    fetchRoles();
  }, [user]);

  const channels = rolesToChannels(userRoles);
  const isAdmin = userRoles.includes("admin");
  const resolvedChannel = activeChannel || channels[0] || "station";

  if (loading || !activeChannel) {
    return (
      <ChannelContext.Provider value={{ channels, activeChannel: resolvedChannel, setActiveChannel: setActiveChannel as (c: Channel) => void, loading: true, userRoles, isAdmin }}>
        {null}
      </ChannelContext.Provider>
    );
  }

  return (
    <ChannelContext.Provider value={{ channels, activeChannel: resolvedChannel, setActiveChannel: setActiveChannel as (c: Channel) => void, loading, userRoles, isAdmin }}>
      {children}
    </ChannelContext.Provider>
  );
}

export function useChannel() {
  const ctx = useContext(ChannelContext);
  if (!ctx) throw new Error("useChannel must be used within ChannelProvider");
  return ctx;
}
