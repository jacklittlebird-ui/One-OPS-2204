import { useMemo, useState, ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Filter, Search, X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export type FilterFieldKind = "text" | "select" | "date" | "number";

export interface FilterField {
  /** Stable key used in the values object */
  key: string;
  /** Label shown above the input and in chips */
  label: string;
  kind: FilterFieldKind;
  /** For select fields */
  options?: { value: string; label: string }[];
  /** For text/number fields */
  placeholder?: string;
  /** Optional column span (1–4). Default 1. */
  span?: 1 | 2 | 3 | 4;
}

export type FilterValues = Record<string, string>;

interface AdvancedFiltersProps {
  fields: FilterField[];
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  /** Optional always-visible search field shown next to the toggle button */
  searchKey?: string;
  searchPlaceholder?: string;
  /** Default open state of the panel. Default false. */
  defaultOpen?: boolean;
  /** Render extra content (e.g. action buttons) inline at the end of the bar */
  rightSlot?: ReactNode;
  className?: string;
}

const DEFAULT_VALUE: Record<FilterFieldKind, string> = {
  text: "",
  select: "all",
  date: "",
  number: "",
};

function isActive(field: FilterField, value: string | undefined): boolean {
  if (value === undefined || value === null) return false;
  return value !== DEFAULT_VALUE[field.kind];
}

export function buildInitialFilters(fields: FilterField[], extra: Record<string, string> = {}): FilterValues {
  const v: FilterValues = {};
  for (const f of fields) v[f.key] = DEFAULT_VALUE[f.kind];
  return { ...v, ...extra };
}

export function AdvancedFilters({
  fields,
  values,
  onChange,
  searchKey,
  searchPlaceholder = "Search…",
  defaultOpen = false,
  rightSlot,
  className,
}: AdvancedFiltersProps) {
  const [open, setOpen] = useState(defaultOpen);

  const activeChips = useMemo(() => {
    return fields
      .filter(f => f.key !== searchKey && isActive(f, values[f.key]))
      .map(f => {
        const raw = values[f.key];
        let label = raw;
        if (f.kind === "select") {
          label = f.options?.find(o => o.value === raw)?.label ?? raw;
        }
        return { key: f.key, fieldLabel: f.label, valueLabel: label };
      });
  }, [fields, values, searchKey]);

  const activeCount = activeChips.length + (searchKey && values[searchKey] ? 1 : 0);

  const set = (key: string, value: string) => onChange({ ...values, [key]: value });
  const clearOne = (key: string) => {
    const f = fields.find(x => x.key === key);
    if (!f) return;
    set(key, DEFAULT_VALUE[f.kind]);
  };
  const clearAll = () => onChange(buildInitialFilters(fields));

  return (
    <Card className={cn("border-border/60", className)}>
      <CardContent className="p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {searchKey && (
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
              <Input
                className="pl-9"
                placeholder={searchPlaceholder}
                value={values[searchKey] ?? ""}
                onChange={e => set(searchKey, e.target.value)}
              />
            </div>
          )}

          <Collapsible open={open} onOpenChange={setOpen} className="contents">
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter size={14} />
                Advanced filters
                {activeCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">{activeCount}</Badge>
                )}
                {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </Button>
            </CollapsibleTrigger>

            {activeCount > 0 && (
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={clearAll}>
                <RotateCcw size={13} /> Clear
              </Button>
            )}

            {rightSlot && <div className="ml-auto flex items-center gap-2">{rightSlot}</div>}

            <CollapsibleContent className="w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t mt-3">
                {fields.filter(f => f.key !== searchKey).map(f => (
                  <div
                    key={f.key}
                    className={cn(
                      f.span === 2 && "sm:col-span-2",
                      f.span === 3 && "sm:col-span-2 lg:col-span-3",
                      f.span === 4 && "sm:col-span-2 lg:col-span-4",
                    )}
                  >
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">{f.label}</label>
                    {f.kind === "select" ? (
                      <Select value={values[f.key] ?? "all"} onValueChange={v => set(f.key, v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All {f.label}</SelectItem>
                          {(f.options || []).map(o => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : f.kind === "date" ? (
                      <Input type="date" value={values[f.key] ?? ""} onChange={e => set(f.key, e.target.value)} />
                    ) : f.kind === "number" ? (
                      <Input type="number" placeholder={f.placeholder} value={values[f.key] ?? ""} onChange={e => set(f.key, e.target.value)} />
                    ) : (
                      <Input placeholder={f.placeholder} value={values[f.key] ?? ""} onChange={e => set(f.key, e.target.value)} />
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {(activeChips.length > 0 || (searchKey && values[searchKey])) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {searchKey && values[searchKey] && (
              <Badge variant="secondary" className="gap-1 pl-2 pr-1">
                Search: <span className="font-mono">{values[searchKey]}</span>
                <Button variant="ghost" size="icon" className="h-4 w-4 p-0 ml-1" onClick={() => set(searchKey, "")}>
                  <X size={11} />
                </Button>
              </Badge>
            )}
            {activeChips.map(c => (
              <Badge key={c.key} variant="secondary" className="gap-1 pl-2 pr-1">
                {c.fieldLabel}: <span className="font-medium">{c.valueLabel}</span>
                <Button variant="ghost" size="icon" className="h-4 w-4 p-0 ml-1" onClick={() => clearOne(c.key)}>
                  <X size={11} />
                </Button>
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Helper: apply standard filter values against any record using a field-mapper. */
export function matchesFilters<T>(
  row: T,
  fields: FilterField[],
  values: FilterValues,
  accessors: Partial<Record<string, (r: T) => string | number | null | undefined>>,
): boolean {
  for (const f of fields) {
    const v = values[f.key];
    if (!isActive(f, v)) continue;
    const accessor = accessors[f.key];
    if (!accessor) continue;
    const cell = accessor(row);
    if (cell === null || cell === undefined) return false;
    const cellStr = String(cell).toLowerCase();
    if (f.kind === "select") {
      if (cellStr !== String(v).toLowerCase()) return false;
    } else if (f.kind === "date") {
      // treat cell as ISO date; v as YYYY-MM-DD (exact day match)
      if (!cellStr.startsWith(v)) return false;
    } else {
      if (!cellStr.includes(String(v).toLowerCase())) return false;
    }
  }
  return true;
}
