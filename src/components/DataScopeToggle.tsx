import { History, Zap } from "lucide-react";

/**
 * Active / Full History scope toggle.
 *
 * Use on any page whose data hook accepts `mode: "active" | "history"`.
 * Default is "active" (last 180d/365d server-side window). Users opt-in to
 * "history" when they need audits, cross-year comparisons, or to find an
 * older record. The mode is part of the React Query cache key, so switching
 * never returns stale narrow-window data.
 *
 * Example:
 *   const [mode, setMode] = useState<"active" | "history">("active");
 *   const { data } = useSupabaseTable("flight_schedules", { stationFilter: true, mode });
 *   <DataScopeToggle mode={mode} onChange={setMode} />
 */
export function DataScopeToggle({
  mode,
  onChange,
  activeLabel = "Active",
  historyLabel = "Full History",
}: {
  mode: "active" | "history";
  onChange: (m: "active" | "history") => void;
  activeLabel?: string;
  historyLabel?: string;
}) {
  return (
    <div className="inline-flex items-center rounded-md border border-border bg-card p-0.5 text-xs">
      <button
        type="button"
        onClick={() => onChange("active")}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-medium transition-colors ${
          mode === "active"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
        title="Recent operational data (faster)"
      >
        <Zap size={12} /> {activeLabel}
      </button>
      <button
        type="button"
        onClick={() => onChange("history")}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-medium transition-colors ${
          mode === "history"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
        title="Full history — slower, loads all rows"
      >
        <History size={12} /> {historyLabel}
      </button>
    </div>
  );
}
