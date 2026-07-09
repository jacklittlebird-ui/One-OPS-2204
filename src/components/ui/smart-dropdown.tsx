import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SmartOption = { value: string; label: string; sub?: string };

interface SmartDropdownProps {
  options: SmartOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  allowAdd?: boolean;
  onAdd?: (query: string) => Promise<void> | void;
  className?: string;
  disabled?: boolean;
}

/**
 * SmartDropdown — searchable by code or name, with optional inline "add new".
 * Used across Accounting master screens for a consistent lookup UX.
 */
export function SmartDropdown({
  options,
  value,
  onChange,
  placeholder = "Select...",
  emptyText = "No results",
  allowAdd = false,
  onAdd,
  className,
  disabled,
}: SmartDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(() => options.find(o => o.value === value), [options, value]);
  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () => (q ? options.filter(o => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q) || o.sub?.toLowerCase().includes(q)) : options),
    [options, q],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn("w-full justify-between font-normal", className)}
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronsUpDown className="ms-2 h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width] min-w-[240px]" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search code or name..." value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>
              <div className="flex flex-col items-center gap-2 py-3 text-sm">
                <span className="text-muted-foreground">{emptyText}</span>
                {allowAdd && onAdd && query.trim() && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      await onAdd(query.trim());
                      setQuery("");
                    }}
                  >
                    <Plus className="h-3.5 w-3.5 me-1" /> Add "{query.trim()}"
                  </Button>
                )}
              </div>
            </CommandEmpty>
            <CommandGroup>
              {filtered.map(opt => (
                <CommandItem
                  key={opt.value}
                  value={opt.value}
                  onSelect={() => { onChange(opt.value); setOpen(false); setQuery(""); }}
                >
                  <Check className={cn("me-2 h-4 w-4", value === opt.value ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col">
                    <span>{opt.label}</span>
                    {opt.sub && <span className="text-xs text-muted-foreground">{opt.sub}</span>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
