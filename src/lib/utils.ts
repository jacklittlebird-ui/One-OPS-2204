import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Parse a date string safely without timezone shifts. Supports ISO and DD/MM/YYYY. */
export function parseDateSafe(value: string | null | undefined): { year: number; month: number; day: number } | null {
  if (!value) return null;
  const str = String(value).trim();

  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    const dt = new Date(Date.UTC(year, month - 1, day));
    if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) return null;
    return { year, month, day };
  }

  const dmy = str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (dmy) {
    let year = Number(dmy[3]);
    if (year < 100) year += 2000;
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const dt = new Date(Date.UTC(year, month - 1, day));
    if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) return null;
    return { year, month, day };
  }

  return null;
}

/** Format a date string (ISO yyyy-mm-dd or DD/MM/YYYY) to DD/MM/YYYY for display. */
export function formatDateDMY(value: string | null | undefined): string {
  const parsed = parseDateSafe(value);
  if (!parsed) return value ? String(value).trim() : "—";
  return `${String(parsed.day).padStart(2, "0")}/${String(parsed.month).padStart(2, "0")}/${parsed.year}`;
}

/** Format a timestamp to DD/MM/YYYY for display */
export function formatTimestampDMY(value: string | null | undefined): string {
  return formatDateDMY(value);
}
