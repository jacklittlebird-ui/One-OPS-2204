import { Bell, Settings, LogOut } from "lucide-react";

export default function Header() {
  return (
    <header className="h-14 border-b flex items-center justify-end px-6 gap-4 bg-card" style={{ borderColor: "hsl(var(--header-border))" }}>
      <button className="relative p-2 rounded-full hover:bg-muted transition-colors">
        <Bell size={18} className="text-muted-foreground" />
        <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-accent text-[10px] font-bold flex items-center justify-center text-accent-foreground">3</span>
      </button>
      <button className="p-2 rounded-full hover:bg-muted transition-colors">
        <Settings size={18} className="text-muted-foreground" />
      </button>
      <div className="flex items-center gap-2 ml-2">
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">AU</div>
        <span className="text-sm font-medium text-foreground">Admin User</span>
      </div>
      <button className="p-2 rounded-full hover:bg-muted transition-colors">
        <LogOut size={18} className="text-muted-foreground" />
      </button>
    </header>
  );
}
