import { useLocation, Link } from "react-router-dom";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useChannel, CHANNEL_LABELS } from "@/contexts/ChannelContext";
import { getNavForChannel, type NavChild } from "@/config/channelNavConfig";
import { ChannelSwitcher } from "./ChannelSwitcher";
import oneOpsLogo from "@/assets/one-ops-logo.png";
import linkAeroLogo from "@/assets/linkaero-logo.png";

interface SidebarProps {
  onNavigate?: () => void;
}

export default function Sidebar({ onNavigate }: SidebarProps) {
  const location = useLocation();
  const currentPath = location.pathname;
  const { activeChannel } = useChannel();

  const navSections = getNavForChannel(activeChannel);

  const isChildActive = (children: NavChild[]) =>
    children.some(c => currentPath === c.path);

  const defaultExpanded: Record<string, boolean> = {};
  navSections.forEach(s => {
    if (s.collapsible && s.children) {
      if (isChildActive(s.children)) {
        defaultExpanded[s.label] = true;
      } else {
        // Expand first collapsible section by default
        defaultExpanded[s.label] = true;
      }
    }
  });

  const [expanded, setExpanded] = useState<Record<string, boolean>>(defaultExpanded);
  const toggle = (label: string) => setExpanded(prev => ({ ...prev, [label]: !prev[label] }));

  const isActive = (path: string) => currentPath === path;

  return (
    <aside className="w-56 min-h-screen bg-sidebar flex flex-col shrink-0">
      <div className="border-b border-sidebar-border/70 px-3 pt-3 pb-2">
        <div className="flex items-center gap-2 rounded-lg bg-sidebar-accent/40 px-3 py-3">
          <img src={linkAeroLogo} alt="Link Aero" className="h-7 shrink-0 object-contain" />
          <div className="h-6 w-px bg-sidebar-border/60" />
          <img src={oneOpsLogo} alt="One OPS" className="h-8 shrink-0 object-contain" />
        </div>
      </div>

      <ChannelSwitcher />

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
                        onClick={onNavigate}
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
                onClick={onNavigate}
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
