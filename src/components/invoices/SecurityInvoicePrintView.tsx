import { X, Printer } from "lucide-react";
import linkAeroLogo from "@/assets/linkaero-logo.png";
import ighcLogo from "@/assets/ighc-logo.jpg";
import { formatDateDMY } from "@/lib/utils";

export interface SecurityPrintInvoice {
  invoiceNo: string;
  date: string;
  dueDate: string;
  operator: string;
  airlineIATA: string;
  flightRef: string;
  description: string;
  station: string;
  billingPeriod: string;
  handling: number;       // base / Security Service amount (single-station)
  other: number;          // overtime / Extra Service amount (single-station)
  subtotal: number;
  vat: number;
  total: number;
  currency: string;
  status: string;
  notes: string;
}

type DetailRow = {
  date?: string; flight?: string; route?: string; reg?: string; station?: string;
  type?: string; civil?: number; handling?: number; airport?: number; other?: number; total?: number;
};

function parseDetail(notes: string | null | undefined): { detail: DetailRow[]; cleanNotes: string } {
  const raw = (notes ?? "").toString();
  const idx = raw.indexOf("__DETAIL__:");
  if (idx === -1) return { detail: [], cleanNotes: raw.trim() };
  const start = raw.indexOf("[", idx);
  if (start === -1) return { detail: [], cleanNotes: raw.replace(/__DETAIL__:.*$/s, "").trim() };
  let depth = 0, end = -1, inStr = false, esc = false;
  for (let i = start; i < raw.length; i++) {
    const c = raw[i];
    if (esc) { esc = false; continue; }
    if (c === "\\") { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === "[") depth++;
    else if (c === "]") { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) return { detail: [], cleanNotes: raw.slice(0, idx).trim() };
  const cleanNotes = (raw.slice(0, idx) + raw.slice(end + 1)).trim();
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1));
    if (!Array.isArray(parsed)) return { detail: [], cleanNotes };
    return {
      detail: parsed.map((r: any) => ({
        date: r.date || "", flight: r.flight || "", reg: r.reg || "", route: r.route || "",
        station: r.station || "", type: r.type || "",
        handling: Number(r.handling) || 0, other: Number(r.other) || 0, total: Number(r.total) || 0,
      })),
      cleanNotes,
    };
  } catch { return { detail: [], cleanNotes }; }
}

const fmtMoney = (n: number, ccy: string) =>
  `${ccy} ${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Props {
  invoice: SecurityPrintInvoice;
  onClose: () => void;
}

export default function SecurityInvoicePrintView({ invoice, onClose }: Props) {
  const { detail } = parseDetail(invoice.notes);

  // Group detail by station: handling = Security Service, other = Extra Service
  const byStation = new Map<string, { security: number; extra: number; rows: DetailRow[] }>();
  if (detail.length > 0) {
    for (const r of detail) {
      const key = (r.station || "—").toUpperCase();
      const g = byStation.get(key) || { security: 0, extra: 0, rows: [] };
      g.security += Number(r.handling) || 0;
      g.extra += Number(r.other) || 0;
      g.rows.push(r);
      byStation.set(key, g);
    }
  } else {
    // Single-station fallback from invoice header fields
    const key = (invoice.station || "—").toUpperCase();
    byStation.set(key, { security: invoice.handling || 0, extra: invoice.other || 0, rows: [] });
  }

  const stations = Array.from(byStation.entries()).sort(([a], [b]) => a.localeCompare(b));
  const fromDate = detail.length ? detail.map(d => d.date || "").filter(Boolean).sort()[0] : "";
  const toDate = detail.length ? detail.map(d => d.date || "").filter(Boolean).sort().slice(-1)[0] : "";
  const periodFrom = fromDate ? formatDateDMY(fromDate) : "";
  const periodTo = toDate ? formatDateDMY(toDate) : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto m-4 print:m-0 print:shadow-none print:rounded-none print:max-h-none print:overflow-visible">
        {/* Toolbar — no print */}
        <div className="flex items-center justify-between px-6 py-3 border-b print:hidden bg-gray-50">
          <span className="text-sm font-semibold text-gray-700">Security Invoice Preview</span>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="toolbar-btn-primary inline-flex items-center gap-1.5">
              <Printer size={14} /> Print / Save PDF
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500"><X size={18} /></button>
          </div>
        </div>

        {/* Printable A4 sheet */}
        <div className="p-10 text-gray-900 font-serif" id="invoice-print-area" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
          {/* Outer frame */}
          <div className="border-2 border-gray-800 p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="border border-gray-400 p-2 inline-block">
                <img src={linkAeroLogo} alt="Link Aero" className="h-24 w-auto object-contain" />
              </div>
              <div className="text-right">
                <img src={ighcLogo} alt="IGHC" className="h-14 w-auto object-contain ml-auto mb-2" />
                <h1 className="text-3xl font-bold tracking-wide text-gray-900">INVOICE</h1>
                <div className="text-sm mt-2 leading-relaxed">
                  <div><span className="inline-block w-20 text-left">Tax ID</span> : 215-137-108</div>
                  <div><span className="inline-block w-20 text-left">Reg., No.,</span> : 19511 - Kasr El Nile</div>
                </div>
              </div>
            </div>

            {/* Bill To + Invoice meta */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <fieldset className="border border-gray-500 px-4 pb-3 pt-1 rounded-sm">
                <legend className="px-2 text-sm font-semibold">Bill To:</legend>
                <p className="text-base font-semibold mt-1">{invoice.operator}</p>
                {invoice.description && <p className="text-xs text-gray-600 leading-snug whitespace-pre-line">{invoice.description}</p>}
              </fieldset>
              <div className="text-sm flex flex-col justify-end gap-1 pl-4">
                <div className="flex"><span className="w-28 font-medium">INVOICE #</span>: <span className="ml-2 font-semibold">{invoice.invoiceNo}</span></div>
                <div className="flex"><span className="w-28 font-medium">Issued On</span>: <span className="ml-2">{formatDateDMY(invoice.date)}</span></div>
                {invoice.billingPeriod && (
                  <div className="flex"><span className="w-28 font-medium">Period</span>: <span className="ml-2">{invoice.billingPeriod}</span></div>
                )}
              </div>
            </div>

            {/* Details Table */}
            <table className="w-full text-sm border border-gray-700 border-collapse">
              <thead>
                <tr className="border-b border-gray-700">
                  <th colSpan={2} className="border-r border-gray-700 py-2 font-bold text-center">Details</th>
                  <th className="py-2 font-bold text-center w-40">Amount</th>
                </tr>
              </thead>
              <tbody>
                {stations.flatMap(([st, g], idx) => {
                  const rows = [];
                  if (g.security > 0) {
                    rows.push(
                      <tr key={`${st}-sec`} className="border-b border-gray-300">
                        <td className="px-3 py-1.5 w-32 text-xs">{idx === 0 && periodFrom ? periodFrom : ""}</td>
                        <td className="px-3 py-1.5 border-r border-gray-300">{st}-Ramp Security Service</td>
                        <td className="px-3 py-1.5 text-right">{fmtMoney(g.security, invoice.currency)}</td>
                      </tr>
                    );
                  }
                  if (g.extra > 0) {
                    rows.push(
                      <tr key={`${st}-ext`} className="border-b border-gray-300">
                        <td className="px-3 py-1.5 text-xs">{idx === 0 && periodTo ? periodTo : ""}</td>
                        <td className="px-3 py-1.5 border-r border-gray-300">{st}-Ramp Extra Service</td>
                        <td className="px-3 py-1.5 text-right">{fmtMoney(g.extra, invoice.currency)}</td>
                      </tr>
                    );
                  }
                  return rows;
                })}
                {/* VAT row */}
                <tr className="border-t border-gray-700">
                  <td colSpan={2} className="px-3 py-2 font-bold border-r border-gray-700">
                    All services rendered on ramp outside the customs area
                  </td>
                  <td className="px-3 py-2 text-right text-sm">VAT-Zero%&nbsp;&nbsp;{(invoice.vat || 0).toFixed(2)}</td>
                </tr>
                {/* Total */}
                <tr className="border-t border-gray-700 bg-gray-50">
                  <td colSpan={2} className="px-3 py-2 border-r border-gray-700"></td>
                  <td className="px-3 py-2 text-right font-bold text-base">
                    Total&nbsp;&nbsp;{fmtMoney(invoice.total, invoice.currency)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Footer line */}
            <div className="mt-8 pt-4 border-t border-gray-400 text-center text-[11px] text-gray-700">
              P.O.BOX 203,-ZAMALEK, CAIRO, EGYPT&nbsp;&nbsp;
              <strong>TEL</strong>: +202-27351555&nbsp;&nbsp;
              <strong>FAX</strong>: +202-27359309&nbsp;&nbsp;
              <strong>Email</strong>: acc.receivables@linkagency.com&nbsp;&nbsp;
              <strong>Website</strong>: www.linkagency.com
            </div>
          </div>

          {/* Per-station Annex pages — mirrors page 2 layout of source PDF */}
          {stations.map(([st, g]) => {
            const secRows = g.rows.filter(r => (r.handling || 0) > 0);
            const extRows = g.rows.filter(r => (r.other || 0) > 0);

            const renderAnnex = (
              title: string,
              rows: DetailRow[],
              amountKey: "handling" | "other",
              total: number,
              key: string,
            ) => (
              <div key={key} className="mt-10 break-before-page print:break-before-page">
                <div className="border-2 border-gray-800 p-6">
                  {/* Header band */}
                  <div className="flex items-start justify-between mb-4 pb-3 border-b border-gray-400">
                    <div className="border border-gray-400 p-1.5">
                      <img src={linkAeroLogo} alt="Link Aero" className="h-16 w-auto object-contain" />
                    </div>
                    <div className="text-right">
                      <img src={ighcLogo} alt="IGHC" className="h-10 w-auto object-contain ml-auto mb-1" />
                      <p className="text-xs text-gray-600">Tax ID : 215-137-108</p>
                    </div>
                  </div>

                  {/* Title block */}
                  <div className="text-center mb-4">
                    <h2 className="text-xl font-bold tracking-wide uppercase">{title}</h2>
                    <p className="text-base font-semibold mt-1">{invoice.operator}</p>
                  </div>

                  {/* Meta grid */}
                  <div className="grid grid-cols-3 text-sm mb-4 border border-gray-500 rounded-sm overflow-hidden">
                    <div className="px-3 py-1.5 border-r border-gray-500 bg-gray-50">
                      <span className="font-semibold">Station :</span> {st}
                    </div>
                    <div className="px-3 py-1.5 border-r border-gray-500 bg-gray-50">
                      <span className="font-semibold">From :</span> {periodFrom || "—"}
                    </div>
                    <div className="px-3 py-1.5 bg-gray-50">
                      <span className="font-semibold">To :</span> {periodTo || "—"}
                    </div>
                  </div>

                  {/* Flights table */}
                  <table className="w-full text-xs border border-gray-700 border-collapse">
                    <thead>
                      <tr className="bg-gray-200">
                        <th className="border border-gray-600 px-2 py-1.5 w-10 text-center">S</th>
                        <th className="border border-gray-600 px-2 py-1.5 w-24 text-center">Date</th>
                        <th className="border border-gray-600 px-2 py-1.5 w-28 text-center">Flight No.</th>
                        <th className="border border-gray-600 px-2 py-1.5 w-24 text-center">Reg.</th>
                        <th className="border border-gray-600 px-2 py-1.5 text-left">Route</th>
                        <th className="border border-gray-600 px-2 py-1.5 w-32 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={i} className={i % 2 ? "bg-gray-50" : ""}>
                          <td className="border border-gray-400 px-2 py-1 text-center">{i + 1}</td>
                          <td className="border border-gray-400 px-2 py-1 text-center whitespace-nowrap">{r.date ? formatDateDMY(r.date) : "—"}</td>
                          <td className="border border-gray-400 px-2 py-1 text-center font-mono">{r.flight || "—"}</td>
                          <td className="border border-gray-400 px-2 py-1 text-center font-mono">{r.reg || "—"}</td>
                          <td className="border border-gray-400 px-2 py-1">{r.route || "—"}</td>
                          <td className="border border-gray-400 px-2 py-1 text-right font-mono">{fmtMoney(Number(r[amountKey]) || 0, invoice.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={5} className="border border-gray-600 px-2 py-1.5 text-right font-semibold bg-gray-50">Total</td>
                        <td className="border border-gray-600 px-2 py-1.5 text-right font-mono bg-gray-50">{fmtMoney(total, invoice.currency)}</td>
                      </tr>
                      <tr>
                        <td colSpan={5} className="border border-gray-600 px-2 py-1.5 text-right bg-gray-50">Admin</td>
                        <td className="border border-gray-600 px-2 py-1.5 text-right font-mono bg-gray-50">{fmtMoney(0, invoice.currency)}</td>
                      </tr>
                      <tr className="font-bold">
                        <td colSpan={5} className="border border-gray-700 px-2 py-2 text-right bg-gray-100">Grand total</td>
                        <td className="border border-gray-700 px-2 py-2 text-right font-mono bg-gray-100">{fmtMoney(total, invoice.currency)}</td>
                      </tr>
                    </tfoot>
                  </table>

                  {/* Footer */}
                  <div className="mt-6 pt-3 border-t border-gray-400 text-center text-[10px] text-gray-700">
                    P.O.BOX 203,-ZAMALEK, CAIRO, EGYPT&nbsp;&nbsp;
                    <strong>TEL</strong>: +202-27351555&nbsp;&nbsp;
                    <strong>Email</strong>: acc.receivables@linkagency.com&nbsp;&nbsp;
                    <strong>Website</strong>: www.linkagency.com
                  </div>
                </div>
              </div>
            );

            return (
              <div key={`annex-${st}`}>
                {secRows.length > 0 && renderAnnex("Security Service", secRows, "handling", g.security, `${st}-sec`)}
                {extRows.length > 0 && renderAnnex("Extra Service", extRows, "other", g.extra, `${st}-ext`)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
