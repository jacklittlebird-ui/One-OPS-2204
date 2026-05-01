import { ReactNode, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Minus, type LucideIcon } from "lucide-react";

/* ---------- Stat Tile (gradient + delta) ---------- */
type Tone = "primary" | "success" | "warning" | "destructive" | "info" | "indigo" | "muted";
const toneRing: Record<Tone, string> = {
  primary: "from-primary/20 to-primary/5 text-primary border-primary/20",
  success: "from-success/20 to-success/5 text-success border-success/20",
  warning: "from-warning/20 to-warning/5 text-warning border-warning/20",
  destructive: "from-destructive/20 to-destructive/5 text-destructive border-destructive/20",
  info: "from-info/20 to-info/5 text-info border-info/20",
  indigo: "from-indigo/20 to-indigo/5 text-indigo border-indigo/20",
  muted: "from-muted/40 to-muted/10 text-foreground border-border",
};

export function StatTile({
  label, value, icon: Icon, tone = "primary", delta, hint,
}: {
  label: string; value: string | number; icon: LucideIcon; tone?: Tone;
  delta?: { value: number; suffix?: string }; hint?: string;
}) {
  const trend = delta == null ? null : delta.value > 0 ? "up" : delta.value < 0 ? "down" : "flat";
  return (
    <Card className={`overflow-hidden border bg-gradient-to-br ${toneRing[tone]}`}>
      <CardContent className="p-3.5">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold truncate">{label}</p>
            <p className="text-xl md:text-2xl font-bold mt-0.5 text-foreground leading-tight">{value}</p>
            {hint && <p className="text-[10px] text-muted-foreground mt-1 truncate">{hint}</p>}
          </div>
          <div className="rounded-lg bg-background/60 p-1.5 backdrop-blur-sm shrink-0">
            <Icon size={16} />
          </div>
        </div>
        {trend && (
          <div className="mt-2 flex items-center gap-1 text-[11px] font-medium">
            {trend === "up" && <ArrowUpRight size={12} className="text-success" />}
            {trend === "down" && <ArrowDownRight size={12} className="text-destructive" />}
            {trend === "flat" && <Minus size={12} className="text-muted-foreground" />}
            <span className={trend === "up" ? "text-success" : trend === "down" ? "text-destructive" : "text-muted-foreground"}>
              {Math.abs(delta!.value)}{delta!.suffix || "%"} vs last period
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------- Sparkline (pure SVG) ---------- */
export function Sparkline({ data, height = 36, color = "hsl(var(--primary))" }: { data: number[]; height?: number; color?: string }) {
  const points = useMemo(() => {
    if (!data.length) return "";
    const max = Math.max(...data, 1);
    const step = 100 / Math.max(1, data.length - 1);
    return data.map((v, i) => `${i * step},${100 - (v / max) * 90 - 5}`).join(" ");
  }, [data]);
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`sg-${color}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={points} vectorEffect="non-scaling-stroke" />
      <polygon fill={`url(#sg-${color})`} points={`0,100 ${points} 100,100`} />
    </svg>
  );
}

/* ---------- Trend Card (label + value + sparkline) ---------- */
export function TrendCard({ title, value, data, color, footer }: { title: string; value: string | number; data: number[]; color?: string; footer?: ReactNode }) {
  return (
    <Card>
      <CardContent className="p-3.5">
        <div className="flex items-baseline justify-between">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">{title}</p>
          <p className="text-base font-bold">{value}</p>
        </div>
        <div className="mt-2"><Sparkline data={data} color={color} /></div>
        {footer && <div className="text-[11px] text-muted-foreground mt-1">{footer}</div>}
      </CardContent>
    </Card>
  );
}

/* ---------- Progress Row (segmented bar) ---------- */
export function ProgressRow({ label, value, max, tone = "primary", suffix }: { label: string; value: number; max: number; tone?: Tone; suffix?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const barTone: Record<Tone, string> = {
    primary: "bg-primary", success: "bg-success", warning: "bg-warning",
    destructive: "bg-destructive", info: "bg-info", indigo: "bg-indigo", muted: "bg-muted-foreground",
  };
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-foreground font-medium truncate">{label}</span>
        <span className="text-muted-foreground tabular-nums">{value}{suffix || ""} / {max}{suffix || ""}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`${barTone[tone]} h-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ---------- Section ---------- */
export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent className="text-sm">{children}</CardContent>
    </Card>
  );
}

/* ---------- Activity Item ---------- */
export function ActivityItem({ icon: Icon, title, meta, tone = "muted" }: { icon: LucideIcon; title: ReactNode; meta?: ReactNode; tone?: Tone }) {
  const dot: Record<Tone, string> = {
    primary: "bg-primary/15 text-primary", success: "bg-success/15 text-success", warning: "bg-warning/15 text-warning",
    destructive: "bg-destructive/15 text-destructive", info: "bg-info/15 text-info", indigo: "bg-indigo/15 text-indigo", muted: "bg-muted text-muted-foreground",
  };
  return (
    <div className="flex items-start gap-3 py-2 border-b last:border-0">
      <div className={`rounded-md p-1.5 ${dot[tone]} shrink-0`}><Icon size={13} /></div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground truncate">{title}</p>
        {meta && <p className="text-[11px] text-muted-foreground mt-0.5">{meta}</p>}
      </div>
    </div>
  );
}

/* ---------- Helpers ---------- */
export function last7DaysCounts<T>(rows: T[], dateField: keyof T): number[] {
  const buckets = new Array(7).fill(0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  rows.forEach((r) => {
    const v = r[dateField] as unknown as string;
    if (!v) return;
    const d = new Date(v);
    const diff = Math.floor((today.getTime() - d.setHours(0, 0, 0, 0)) / 86400000);
    if (diff >= 0 && diff < 7) buckets[6 - diff] += 1;
  });
  return buckets;
}

export function relTime(iso?: string | null): string {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
