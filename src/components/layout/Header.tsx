import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Settings, LogOut, ChevronDown, Monitor, Code2, Server, TestTube, Moon, Sun } from "lucide-react";
import GlobalSearch from "@/components/GlobalSearch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
type Role = "UI/UX" | "Front-End" | "Back-End" | "Tester";

const roleConfig: Record<Role, { icon: React.ReactNode; color: string }> = {
  "UI/UX":      { icon: <Monitor size={13} />,  color: "hsl(var(--primary))" },
  "Front-End":  { icon: <Code2 size={13} />,    color: "hsl(var(--info))" },
  "Back-End":   { icon: <Server size={13} />,   color: "hsl(var(--warning))" },
  "Tester":     { icon: <TestTube size={13} />, color: "hsl(var(--accent))" },
};

export default function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("UI/UX");
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      setUnreadCount(count ?? 0);
    };
    fetchUnread();
    const channel = supabase
      .channel("header-notifications")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => fetchUnread())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [dark]);

  return (
    <header
      className="h-14 border-b flex items-center justify-end px-6 gap-3 bg-card"
      style={{ borderColor: "hsl(var(--header-border))" }}
    >
      {/* Global Search */}
      <GlobalSearch />

      {/* Dark Mode Toggle */}
      <button
        onClick={() => setDark(d => !d)}
        className="p-2 rounded-full hover:bg-muted transition-colors"
        title={dark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        {dark ? <Sun size={18} className="text-warning" /> : <Moon size={18} className="text-muted-foreground" />}
      </button>

      {/* Role Switcher */}
      <div className="relative mr-2">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm font-semibold transition-colors hover:bg-muted"
          style={{ color: roleConfig[role].color, borderColor: roleConfig[role].color }}
        >
          {roleConfig[role].icon}
          {role}
          <ChevronDown size={12} className="ml-0.5 opacity-60" />
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-1 z-50 bg-card border rounded-md shadow-lg py-1 min-w-[130px]">
            {(Object.keys(roleConfig) as Role[]).map(r => (
              <button
                key={r}
                onClick={() => { setRole(r); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted transition-colors ${r === role ? "font-bold" : ""}`}
                style={{ color: roleConfig[r].color }}
              >
                {roleConfig[r].icon}
                {r}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Notifications */}
      <button className="relative p-2 rounded-full hover:bg-muted transition-colors">
        <Bell size={18} className="text-muted-foreground" />
        <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-accent text-[10px] font-bold flex items-center justify-center text-accent-foreground">3</span>
      </button>

      {/* Settings */}
      <button className="p-2 rounded-full hover:bg-muted transition-colors">
        <Settings size={18} className="text-muted-foreground" />
      </button>

      {/* User */}
      <div className="flex items-center gap-2 ml-1">
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">AU</div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-foreground">Admin User</span>
          <span className="text-[10px] font-medium" style={{ color: roleConfig[role].color }}>{role}</span>
        </div>
      </div>

      {/* Logout */}
      <button className="p-2 rounded-full hover:bg-muted transition-colors">
        <LogOut size={18} className="text-muted-foreground" />
      </button>
    </header>
  );
}
