import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { useChannel } from "./ChannelContext";

interface UserStationContextType {
  station: string | null;       // e.g. "HBE", "CAI" — null = no restriction (admin or not set)
  isStationScoped: boolean;     // true when filters should auto-apply
  loading: boolean;
}

const UserStationContext = createContext<UserStationContextType | undefined>(undefined);

export function UserStationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { isAdmin } = useChannel();
  const [station, setStation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setStation(null);
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("station")
        .eq("user_id", user.id)
        .maybeSingle();
      setStation(data?.station || null);
      setLoading(false);
    })();
  }, [user]);

  // Admins are never scoped. Otherwise, scope only if a station is explicitly set on the profile.
  const isStationScoped = !isAdmin && !!station;

  return (
    <UserStationContext.Provider value={{ station, isStationScoped, loading }}>
      {children}
    </UserStationContext.Provider>
  );
}

export function useUserStation() {
  const ctx = useContext(UserStationContext);
  if (!ctx) throw new Error("useUserStation must be used within UserStationProvider");
  return ctx;
}
