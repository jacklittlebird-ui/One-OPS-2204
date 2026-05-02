import { X, Download, AlertTriangle } from "lucide-react";

export interface PrintableInvoice {
  invoiceNo: string;
  date: string;
  dueDate: string;
  operator: string;
  airlineIATA: string;
  flightRef: string;
  description: string;
  civilAviation: number;
  handling: number;
  airportCharges: number;
  catering: number;
  other: number;
  subtotal: number;
  vat: number;
  total: number;
  currency: string;
  status: string;
  notes: string;
}

interface InvoicePrintViewProps {
  invoice: PrintableInvoice;
  onClose: () => void;
}

type DetailRow = {
  date?: string; flight?: string; route?: string; reg?: string; station?: string;
  type?: string; civil?: number; handling?: number; airport?: number; other?: number; total?: number;
};

/**
 * Robust parser for the __DETAIL__:[...] payload embedded in invoice notes.
 * Handles: missing notes, no marker, malformed JSON, non-array payloads,
 * trailing/leading whitespace, and rows missing fields. Always returns
 * a stable `{ detail, cleanNotes }` shape — never throws.
 */
function parseDetail(notes: string | null | undefined): { detail: DetailRow[]; cleanNotes: string } {
  const raw = (notes ?? "").toString();
  if (!raw.trim()) return { detail: [], cleanNotes: "" };

  // Locate the marker. Use a balanced-bracket scan instead of a non-greedy regex
  // so payloads containing nested arrays/objects don't get truncated.
  const markerIdx = raw.indexOf("__DETAIL__:");
  if (markerIdx === -1) return { detail: [], cleanNotes: raw.trim() };

  const startBracket = raw.indexOf("[", markerIdx);
  if (startBracket === -1) {
    return { detail: [], cleanNotes: raw.replace(/__DETAIL__:.*$/s, "").trim() };
  }

  let depth = 0;
  let endBracket = -1;
  let inString = false;
  let escape = false;
  for (let i = startBracket; i < raw.length; i++) {
    const ch = raw[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) { endBracket = i; break; }
    }
  }

  if (endBracket === -1) {
    // Unterminated payload — strip marker, treat as plain notes
    return { detail: [], cleanNotes: raw.slice(0, markerIdx).trim() };
  }

  const jsonStr = raw.slice(startBracket, endBracket + 1);
  const cleanNotes = (raw.slice(0, markerIdx) + raw.slice(endBracket + 1)).trim();

  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) return { detail: [], cleanNotes };
    // Sanitize: coerce numeric fields, drop obviously empty rows
    const detail: DetailRow[] = parsed
      .filter((r): r is Record<string, unknown> => r != null && typeof r === "object")
      .map((r: any) => ({
        date: r.date ? String(r.date) : "",
        flight: r.flight ? String(r.flight) : "",
        reg: r.reg ? String(r.reg) : "",
        route: r.route ? String(r.route) : "",
        station: r.station ? String(r.station) : "",
        type: r.type ? String(r.type) : "",
        civil: Number(r.civil) || 0,
        handling: Number(r.handling) || 0,
        airport: Number(r.airport) || 0,
        other: Number(r.other) || 0,
        total: Number(r.total) || 0,
      }));
    return { detail, cleanNotes };
  } catch {
    return { detail: [], cleanNotes };
  }
}

const ROWS_PER_PAGE = 22; // keeps each annex page within standard A4 print height


export default function InvoicePrintView({ invoice, onClose }: InvoicePrintViewProps) {
  const handlePrint = () => window.print();
  const { detail, cleanNotes } = parseDetail(invoice.notes || "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-y-auto m-4 print:m-0 print:shadow-none print:rounded-none print:max-h-none print:overflow-visible">
        {/* No-print toolbar */}
        <div className="flex items-center justify-between px-6 py-3 border-b print:hidden">
          <span className="text-sm font-semibold text-gray-600">Invoice Preview</span>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="toolbar-btn-primary">🖨 Print / Save PDF</button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500"><X size={18} /></button>
          </div>
        </div>

        {/* Printable content */}
        <div className="p-8 text-gray-900" id="invoice-print-area">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">✈ Link Aero</h1>
              <p className="text-sm text-gray-500 mt-1">Ground Handling & Aviation Services</p>
              <p className="text-xs text-gray-400 mt-0.5">Cairo, Egypt</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold text-gray-800">INVOICE</h2>
              <p className="text-sm font-mono font-semibold mt-1">{invoice.invoiceNo}</p>
              <p className="text-xs text-gray-500 mt-1">Date: {invoice.date}</p>
              <p className="text-xs text-gray-500">Due: {invoice.dueDate}</p>
            </div>
          </div>

          {/* Bill To */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Bill To</p>
            <p className="font-semibold text-lg">{invoice.operator}</p>
            <p className="text-sm text-gray-600">IATA: {invoice.airlineIATA} · Flight Ref: {invoice.flightRef}</p>
            {invoice.description && <p className="text-sm text-gray-500 mt-1">{invoice.description}</p>}
          </div>

          {/* Line Items */}
          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-2 text-xs font-bold text-gray-500 uppercase">Item</th>
                <th className="text-right py-2 text-xs font-bold text-gray-500 uppercase">Amount ({invoice.currency})</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Civil Aviation Authority Fees", amount: invoice.civilAviation },
                { label: "Ground Handling Fee", amount: invoice.handling },
                { label: "Airport Charges", amount: invoice.airportCharges },
                { label: "Catering", amount: invoice.catering },
                { label: "Other Charges", amount: invoice.other },
              ].filter(item => item.amount > 0).map((item, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-2.5">{item.label}</td>
                  <td className="py-2.5 text-right font-mono">{item.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-64">
              <div className="flex justify-between py-1.5 text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-mono">{invoice.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1.5 text-sm">
                <span className="text-gray-500">VAT</span>
                <span className="font-mono">{invoice.vat.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2.5 text-lg font-bold border-t-2 border-gray-900 mt-1">
                <span>Total</span>
                <span>{invoice.currency} {invoice.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="mb-8 text-center">
            <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider ${
              invoice.status === "Paid" ? "bg-green-100 text-green-700" :
              invoice.status === "Overdue" ? "bg-red-100 text-red-700" :
              invoice.status === "Sent" ? "bg-blue-100 text-blue-700" :
              "bg-gray-100 text-gray-600"
            }`}>
              {invoice.status}
            </span>
          </div>

          {/* Notes */}
          {cleanNotes && (
            <div className="mb-8 p-3 bg-gray-50 rounded text-sm text-gray-600">
              <span className="font-semibold">Notes:</span> {cleanNotes}
            </div>
          )}

          {/* Per-Flight Detail Annex — paginated for print */}
          {detail.length > 0 && (() => {
            const grandTotals = detail.reduce(
              (s, d) => ({
                civil: s.civil + (d.civil || 0),
                handling: s.handling + (d.handling || 0),
                airport: s.airport + (d.airport || 0),
                other: s.other + (d.other || 0),
                total: s.total + (d.total || 0),
              }),
              { civil: 0, handling: 0, airport: 0, other: 0, total: 0 }
            );
            const pages: DetailRow[][] = [];
            for (let i = 0; i < detail.length; i += ROWS_PER_PAGE) {
              pages.push(detail.slice(i, i + ROWS_PER_PAGE));
            }
            const totalPages = pages.length;

            const byStation: Record<string, { flights: number; total: number }> = {};
            detail.forEach(d => {
              const k = d.station || "—";
              if (!byStation[k]) byStation[k] = { flights: 0, total: 0 };
              byStation[k].flights++;
              byStation[k].total += d.total || 0;
            });
            const stationRows = Object.entries(byStation);

            return (
              <>
                {pages.map((pageRows, pageIdx) => {
                  const isLast = pageIdx === totalPages - 1;
                  const pageRunning = pageRows.reduce(
                    (s, d) => ({
                      civil: s.civil + (d.civil || 0),
                      handling: s.handling + (d.handling || 0),
                      airport: s.airport + (d.airport || 0),
                      other: s.other + (d.other || 0),
                      total: s.total + (d.total || 0),
                    }),
                    { civil: 0, handling: 0, airport: 0, other: 0, total: 0 }
                  );
                  return (
                    <div
                      key={pageIdx}
                      className="mt-10 pt-6 border-t-2 border-gray-300 break-before-page print:break-before-page"
                    >
                      <div className="flex items-end justify-between mb-1">
                        <h3 className="text-lg font-bold text-gray-800">
                          Annex A — Per-Flight Service Detail
                        </h3>
                        <span className="text-xs text-gray-500 font-mono">
                          Page {pageIdx + 1} of {totalPages}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-4">
                        Invoice {invoice.invoiceNo} · {invoice.operator} · {detail.length} flight{detail.length === 1 ? "" : "s"} total
                      </p>
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="border-b-2 border-gray-300 bg-gray-50">
                            {["Date","Flight","Reg","Route","Station","Service","Civil Av.","Handling","Airport","Other","Total"].map(h => (
                              <th key={h} className="px-2 py-1.5 text-left font-bold text-gray-600 uppercase whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {pageRows.map((d, i) => (
                            <tr key={i} className="border-b border-gray-100">
                              <td className="px-2 py-1.5 whitespace-nowrap">{d.date || "—"}</td>
                              <td className="px-2 py-1.5 font-mono whitespace-nowrap">{d.flight || "—"}</td>
                              <td className="px-2 py-1.5 font-mono whitespace-nowrap">{d.reg || "—"}</td>
                              <td className="px-2 py-1.5 whitespace-nowrap">{d.route || "—"}</td>
                              <td className="px-2 py-1.5 font-semibold whitespace-nowrap">{d.station || "—"}</td>
                              <td className="px-2 py-1.5 whitespace-nowrap">{d.type || "—"}</td>
                              <td className="px-2 py-1.5 text-right font-mono">{(d.civil || 0).toFixed(2)}</td>
                              <td className="px-2 py-1.5 text-right font-mono">{(d.handling || 0).toFixed(2)}</td>
                              <td className="px-2 py-1.5 text-right font-mono">{(d.airport || 0).toFixed(2)}</td>
                              <td className="px-2 py-1.5 text-right font-mono">{(d.other || 0).toFixed(2)}</td>
                              <td className="px-2 py-1.5 text-right font-mono font-bold">{(d.total || 0).toFixed(2)}</td>
                            </tr>
                          ))}
                          <tr className="border-t border-gray-400 bg-gray-50/60 italic">
                            <td colSpan={6} className="px-2 py-1.5 text-right text-gray-600">Page Subtotal</td>
                            <td className="px-2 py-1.5 text-right font-mono">{pageRunning.civil.toFixed(2)}</td>
                            <td className="px-2 py-1.5 text-right font-mono">{pageRunning.handling.toFixed(2)}</td>
                            <td className="px-2 py-1.5 text-right font-mono">{pageRunning.airport.toFixed(2)}</td>
                            <td className="px-2 py-1.5 text-right font-mono">{pageRunning.other.toFixed(2)}</td>
                            <td className="px-2 py-1.5 text-right font-mono">{pageRunning.total.toFixed(2)}</td>
                          </tr>
                          {isLast && (
                            <tr className="border-t-2 border-gray-700 bg-gray-50 font-bold">
                              <td colSpan={6} className="px-2 py-2 text-right">Annex Grand Total</td>
                              <td className="px-2 py-2 text-right font-mono">{grandTotals.civil.toFixed(2)}</td>
                              <td className="px-2 py-2 text-right font-mono">{grandTotals.handling.toFixed(2)}</td>
                              <td className="px-2 py-2 text-right font-mono">{grandTotals.airport.toFixed(2)}</td>
                              <td className="px-2 py-2 text-right font-mono">{grandTotals.other.toFixed(2)}</td>
                              <td className="px-2 py-2 text-right font-mono">{grandTotals.total.toFixed(2)}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>

                      {/* Subtotals by Station — only on the last annex page */}
                      {isLast && stationRows.length > 1 && (
                        <div className="mt-6">
                          <h4 className="text-sm font-bold text-gray-800 mb-2">Subtotals by Station</h4>
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b-2 border-gray-300 bg-gray-50">
                                <th className="px-2 py-1.5 text-left font-bold text-gray-600 uppercase">Station</th>
                                <th className="px-2 py-1.5 text-right font-bold text-gray-600 uppercase">Flights</th>
                                <th className="px-2 py-1.5 text-right font-bold text-gray-600 uppercase">Total ({invoice.currency})</th>
                              </tr>
                            </thead>
                            <tbody>
                              {stationRows.map(([st, v]) => (
                                <tr key={st} className="border-b border-gray-100">
                                  <td className="px-2 py-1.5 font-semibold">{st}</td>
                                  <td className="px-2 py-1.5 text-right font-mono">{v.flights}</td>
                                  <td className="px-2 py-1.5 text-right font-mono">{v.total.toFixed(2)}</td>
                                </tr>
                              ))}
                              <tr className="border-t-2 border-gray-700 bg-gray-50 font-bold">
                                <td className="px-2 py-1.5">Total</td>
                                <td className="px-2 py-1.5 text-right font-mono">{detail.length}</td>
                                <td className="px-2 py-1.5 text-right font-mono">{grandTotals.total.toFixed(2)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            );
          })()}


          {/* Signature */}
          <div className="grid grid-cols-2 gap-12 mt-12 pt-4">
            <div>
              <div className="border-b border-gray-300 mb-2 h-12"></div>
              <p className="text-xs text-gray-500">Authorized Signature (Link Aero)</p>
            </div>
            <div>
              <div className="border-b border-gray-300 mb-2 h-12"></div>
              <p className="text-xs text-gray-500">Client Signature / Stamp</p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
            <p>Link Aero · Aviation Ground Handling Services · Cairo, Egypt</p>
            <p className="mt-0.5">Thank you for your business</p>
          </div>
        </div>
      </div>
    </div>
  );
}
