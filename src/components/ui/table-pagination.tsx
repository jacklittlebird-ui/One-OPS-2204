import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

const DEFAULT_PAGE_SIZE = 25;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

/**
 * Client-side pagination for an already-filtered array.
 * Use when the data is loaded in full (the common case in this app) and
 * you only need to slice it for display.
 *
 * Returns the page slice plus pagination state to render <TablePagination />.
 */
export function usePagination<T>(rows: T[], options?: { pageSize?: number; resetKey?: unknown }) {
  const [pageSize, setPageSize] = useState(options?.pageSize ?? DEFAULT_PAGE_SIZE);
  const [page, setPage] = useState(0);

  // Reset to first page whenever the underlying filter/category changes.
  useEffect(() => { setPage(0); }, [options?.resetKey, pageSize, rows.length]);

  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * pageSize;
  const end = Math.min(start + pageSize, total);
  const pageRows = useMemo(() => rows.slice(start, end), [rows, start, end]);

  return {
    pageRows,
    page: safePage,
    pageCount,
    pageSize,
    total,
    start,
    end,
    setPage,
    setPageSize,
  };
}

export interface TablePaginationProps {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  start: number;
  end: number;
  setPage: (p: number) => void;
  setPageSize: (n: number) => void;
  className?: string;
}

export function TablePagination(p: TablePaginationProps) {
  if (p.total === 0) return null;
  const { page, pageCount, pageSize, total, start, end, setPage, setPageSize } = p;
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 px-2 py-3 border-t ${p.className || ""}`}>
      <div className="text-xs text-muted-foreground">
        Showing <span className="font-semibold text-foreground">{start + 1}</span>–
        <span className="font-semibold text-foreground">{end}</span> of{" "}
        <span className="font-semibold text-foreground">{total}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Rows per page</span>
          <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
            <SelectTrigger className="h-8 w-[78px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(0)} disabled={page === 0} aria-label="First page">
            <ChevronsLeft size={14} />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(page - 1)} disabled={page === 0} aria-label="Previous page">
            <ChevronLeft size={14} />
          </Button>
          <span className="text-xs px-2 tabular-nums">
            Page <span className="font-semibold text-foreground">{page + 1}</span> of {pageCount}
          </span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(page + 1)} disabled={page >= pageCount - 1} aria-label="Next page">
            <ChevronRight size={14} />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(pageCount - 1)} disabled={page >= pageCount - 1} aria-label="Last page">
            <ChevronsRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
