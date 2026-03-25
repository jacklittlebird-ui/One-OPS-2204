import { useState, useMemo } from "react";
import { Search, BookOpen } from "lucide-react";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";

type AbbrRow = { id: string; abbr: string; full_text: string };

export default function AbbreviationsPage() {
  const { data, isLoading } = useSupabaseTable<AbbrRow>("abbreviations", { orderBy: "abbr", ascending: true });
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return data;
    const s = search.toLowerCase();
    return data.filter(a => a.abbr.toLowerCase().includes(s) || a.full_text.toLowerCase().includes(s));
  }, [data, search]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><BookOpen size={22} className="text-primary" /> Abbreviations</h1>
        <p className="text-muted-foreground text-sm mt-1">Aviation and ground handling abbreviation reference</p>
      </div>
      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="p-4 border-b flex items-center gap-3">
          <h2 className="text-base font-semibold text-foreground mr-auto">Abbreviation Dictionary ({filtered.length})</h2>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 pr-3 py-1.5 text-sm border rounded bg-card text-foreground placeholder:text-muted-foreground w-52 focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr><th className="data-table-header px-4 py-3 text-left w-32">ABBREVIATION</th><th className="data-table-header px-4 py-3 text-left">FULL FORM</th></tr></thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={2} className="text-center py-16 text-muted-foreground">Loading…</td></tr>
              ) : filtered.map(a => (
                <tr key={a.id} className="data-table-row">
                  <td className="px-4 py-2.5 font-bold font-mono text-primary">{a.abbr}</td>
                  <td className="px-4 py-2.5 text-foreground">{a.full_text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
