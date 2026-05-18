import { useEffect, useMemo, useRef, useState } from "react";
import { X, Printer, Download, FileText } from "lucide-react";
import linkAeroLogo from "@/assets/linkaero-logo.png";
import ighcLogo from "@/assets/ighc-logo.jpg";
import { formatDateDMY } from "@/lib/utils";
import {
  parseSecurityDetail,
  SECURITY_INVOICE_COLUMNS,
  type SecurityDetailRow,
} from "@/lib/securityInvoiceDetail";

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
  handling: number;
  other: number;
  subtotal: number;
  vat: number;
  total: number;
  currency: string;
  status: string;
  notes: string;
}

type DetailRow = SecurityDetailRow;
const parseDetail = parseSecurityDetail;

const fmtMoney = (n: number, ccy: string) =>
  `${ccy} ${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Props {
  invoice: SecurityPrintInvoice;
  onClose: () => void;
}

// A4 landscape in mm
const A4_W_MM = 297;
const A4_H_MM = 210;
// 1mm ≈ 3.7795px @ 96dpi
const MM_TO_PX = 3.7795275591;

export default function SecurityInvoicePrintView({ invoice, onClose }: Props) {
  const { detail } = parseDetail(invoice.notes);
  const [margin, setMargin] = useState<number>(8); // mm
  const [pageCount, setPageCount] = useState<number>(2);
  const [isDownloading, setIsDownloading] = useState(false);
  const coverRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);

  // Group detail by station
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
    const key = (invoice.station || "—").toUpperCase();
    byStation.set(key, { security: invoice.handling || 0, extra: invoice.other || 0, rows: [] });
  }

  const stations = Array.from(byStation.entries()).sort(([a], [b]) => a.localeCompare(b));
  const fromDate = detail.length ? detail.map(d => d.date || "").filter(Boolean).sort()[0] : "";
  const toDate = detail.length ? detail.map(d => d.date || "").filter(Boolean).sort().slice(-1)[0] : "";
  const periodFrom = fromDate ? formatDateDMY(fromDate) : "";
  const periodTo = toDate ? formatDateDMY(toDate) : "";

  // Estimate scale needed to fit details on a single landscape A4 page.
  // Available height = page height - (top+bottom margin).
  const availableDetailsHeightPx = useMemo(() => (A4_H_MM - margin * 2) * MM_TO_PX, [margin]);

  // Measure details, compute scale + page count.
  const [detailsScale, setDetailsScale] = useState(1);
  useEffect(() => {
    const measure = () => {
      const el = detailsRef.current;
      if (!el) return;
      // Reset transform for accurate measurement
      el.style.transform = "none";
      const naturalH = el.scrollHeight;
      const scale = naturalH > availableDetailsHeightPx
        ? Math.max(0.5, availableDetailsHeightPx / naturalH)
        : 1;
      setDetailsScale(scale);
      // Page count = 1 (cover) + ceil(details / available) — but we always scale to fit, so 2.
      const coverH = coverRef.current?.scrollHeight || 0;
      const coverPages = Math.max(1, Math.ceil(coverH / availableDetailsHeightPx));
      setPageCount(coverPages + 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (detailsRef.current) ro.observe(detailsRef.current);
    if (coverRef.current) ro.observe(coverRef.current);
    return () => ro.disconnect();
  }, [availableDetailsHeightPx, detail.length, stations.length]);

  const handlePrint = () => window.print();

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

      const renderToPdf = async (el: HTMLElement, addPage: boolean) => {
        const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        const availW = A4_W_MM - margin * 2;
        const availH = A4_H_MM - margin * 2;
        // Fit while preserving aspect ratio
        const ratio = canvas.width / canvas.height;
        let w = availW;
        let h = w / ratio;
        if (h > availH) { h = availH; w = h * ratio; }
        const x = margin + (availW - w) / 2;
        const y = margin;
        if (addPage) pdf.addPage("a4", "landscape");
        pdf.addImage(imgData, "JPEG", x, y, w, h);
      };

      if (coverRef.current) await renderToPdf(coverRef.current, false);
      if (detailsRef.current) await renderToPdf(detailsRef.current, true);
      pdf.save(`${invoice.invoiceNo || "security-invoice"}.pdf`);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-y-auto m-4 print:m-0 print:shadow-none print:rounded-none print:max-h-none print:overflow-visible">
        {/* Toolbar — no print */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b print:hidden">
          <div className="flex items-center gap-3 text-sm">
            <span className="font-semibold text-gray-700">Security Invoice Preview</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
              <FileText size={12} /> {pageCount} page{pageCount === 1 ? "" : "s"} · A4 Landscape
            </span>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-gray-600">
              Margin (mm)
              <input
                type="number"
                min={3}
                max={25}
                step={1}
                value={margin}
                onChange={(e) => setMargin(Math.max(3, Math.min(25, Number(e.target.value) || 8)))}
                className="w-16 px-2 py-1 border border-gray-300 rounded text-xs"
              />
            </label>
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="toolbar-btn-primary inline-flex items-center gap-1.5 disabled:opacity-60"
            >
              <Download size={14} /> {isDownloading ? "Generating…" : "Download PDF"}
            </button>
            <button onClick={handlePrint} className="toolbar-btn-primary inline-flex items-center gap-1.5">
              <Printer size={14} /> Print / Save PDF
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500"><X size={18} /></button>
          </div>
        </div>

        {/* Print styles — configurable margin, forced landscape, 2-page layout */}
        <style>{`
          @media print {
            @page { size: A4 landscape; margin: ${margin}mm; }
            html, body { width: ${A4_W_MM - margin * 2}mm; }
            .no-print { display: none !important; }
            #invoice-cover-page {
              page-break-after: always !important;
              break-after: page !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            #invoice-details-page {
              page-break-before: always !important;
              break-before: page !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              transform: scale(${detailsScale});
              transform-origin: top left;
              width: ${100 / detailsScale}%;
            }
            #invoice-details-page .annex-block {
              page-break-before: avoid !important;
              break-before: avoid !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              margin-top: 8px !important;
            }
            #invoice-details-page .annex-block:first-child { margin-top: 0 !important; }
            #invoice-details-page table { font-size: 8px !important; }
            #invoice-details-page .annex-block .border-2 { padding: 10px !important; }
            #invoice-print-area { padding: 0 !important; }
          }
        `}</style>

        {/* Printable A4 sheet */}
        <div className="p-10 text-gray-900 font-serif" id="invoice-print-area" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
          {/* COVER PAGE */}
          <div id="invoice-cover-page" ref={coverRef}>
            <div className="border-2 border-gray-800 p-6">
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
                  <tr className="border-t border-gray-700">
                    <td colSpan={2} className="px-3 py-2 font-bold border-r border-gray-700">
                      All services rendered on ramp outside the customs area
                    </td>
                    <td className="px-3 py-2 text-right text-sm">VAT-Zero%&nbsp;&nbsp;{(invoice.vat || 0).toFixed(2)}</td>
                  </tr>
                  <tr className="border-t border-gray-700">
                    <td colSpan={2} className="px-3 py-2 border-r border-gray-700"></td>
                    <td className="px-3 py-2 text-right font-bold text-base">
                      Total&nbsp;&nbsp;{fmtMoney(invoice.total, invoice.currency)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-8 pt-4 border-t border-gray-400 text-center text-[11px] text-gray-700">
                P.O.BOX 203,-ZAMALEK, CAIRO, EGYPT&nbsp;&nbsp;
                <strong>TEL</strong>: +202-27351555&nbsp;&nbsp;
                <strong>FAX</strong>: +202-27359309&nbsp;&nbsp;
                <strong>Email</strong>: acc.receivables@linkagency.com&nbsp;&nbsp;
                <strong>Website</strong>: www.linkagency.com
              </div>
            </div>
          </div>

          {/* DETAILS PAGE */}
          <div
            id="invoice-details-page"
            ref={detailsRef}
            className="break-before-page print:break-before-page mt-10 print:mt-0"
          >
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
                <div key={key} className="annex-block mt-10">
                  <div className="border-2 border-gray-800 p-6">
                    <div className="flex items-start justify-between mb-4 pb-3 border-b border-gray-400">
                      <div className="border border-gray-400 p-1.5">
                        <img src={linkAeroLogo} alt="Link Aero" className="h-16 w-auto object-contain" />
                      </div>
                      <div className="text-right">
                        <img src={ighcLogo} alt="IGHC" className="h-10 w-auto object-contain ml-auto mb-1" />
                        <p className="text-xs text-gray-600">Tax ID : 215-137-108</p>
                      </div>
                    </div>

                    <div className="text-center mb-4">
                      <h2 className="text-xl font-bold tracking-wide uppercase">{title}</h2>
                      <p className="text-base font-semibold mt-1">{invoice.operator}</p>
                    </div>

                    <div className="grid grid-cols-3 text-sm mb-4 border border-gray-500 rounded-sm overflow-hidden">
                      <div className="px-3 py-1.5 border-r border-gray-500">
                        <span className="font-semibold">Station :</span> {st}
                      </div>
                      <div className="px-3 py-1.5 border-r border-gray-500">
                        <span className="font-semibold">From :</span> {periodFrom || "—"}
                      </div>
                      <div className="px-3 py-1.5">
                        <span className="font-semibold">To :</span> {periodTo || "—"}
                      </div>
                    </div>

                    <table className="w-full text-[10px] border border-gray-800 border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          {SECURITY_INVOICE_COLUMNS.map(h => (
                            <th key={h} className="border border-gray-800 px-1.5 py-1 text-center font-bold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...rows].sort((a, b) => {
                          const ka = (a.arrDate || a.depDate || a.date || "") + (a.flight || "");
                          const kb = (b.arrDate || b.depDate || b.date || "") + (b.flight || "");
                          return ka.localeCompare(kb);
                        }).map((r, i) => (
                          <tr key={i}>
                            <td className="border border-gray-800 px-1.5 py-1 text-center">{i + 1}</td>
                            <td className="border border-gray-800 px-1.5 py-1 text-center whitespace-nowrap">{r.arrDate ? formatDateDMY(r.arrDate) : (r.date ? formatDateDMY(r.date) : "—")}</td>
                            <td className="border border-gray-800 px-1.5 py-1 text-center whitespace-nowrap">{r.depDate ? formatDateDMY(r.depDate) : (r.date ? formatDateDMY(r.date) : "—")}</td>
                            <td className="border border-gray-800 px-1.5 py-1 text-center">{r.flight || "—"}</td>
                            <td className="border border-gray-800 px-1.5 py-1 text-center">{r.reg || "—"}</td>
                            <td className="border border-gray-800 px-1.5 py-1 text-center">{r.aircraftType || "—"}</td>
                            <td className="border border-gray-800 px-1.5 py-1 text-center">{r.route || "—"}</td>
                            <td className="border border-gray-800 px-1.5 py-1 text-left">{r.serviceType || r.type || "—"}</td>
                            <td className="border border-gray-800 px-1.5 py-1 text-center">{r.skdType || "—"}</td>
                            <td className="border border-gray-800 px-1.5 py-1 text-center">{r.actualStart || "—"}</td>
                            <td className="border border-gray-800 px-1.5 py-1 text-center">{r.actualEnd || "—"}</td>
                            <td className="border border-gray-800 px-1.5 py-1 text-center">{r.durationHours ? Number(r.durationHours).toFixed(2) : "—"}</td>
                            <td className="border border-gray-800 px-1.5 py-1 text-center">{r.overtimeHours ? Number(r.overtimeHours).toFixed(2) : "—"}</td>
                            <td className="border border-gray-800 px-1.5 py-1 text-center">{r.staffCount || "—"}</td>
                            <td className="border border-gray-800 px-1.5 py-1 text-right whitespace-nowrap">{fmtMoney(Number(r[amountKey]) || 0, invoice.currency)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={14} className="border border-gray-800 px-1.5 py-1 text-right font-semibold">Total</td>
                          <td className="border border-gray-800 px-1.5 py-1 text-right">{fmtMoney(total, invoice.currency)}</td>
                        </tr>
                        <tr>
                          <td colSpan={14} className="border border-gray-800 px-1.5 py-1 text-right">Admin</td>
                          <td className="border border-gray-800 px-1.5 py-1 text-right">{fmtMoney(0, invoice.currency)}</td>
                        </tr>
                        <tr className="font-bold">
                          <td colSpan={14} className="border border-gray-800 px-1.5 py-1.5 text-right">Grand total</td>
                          <td className="border border-gray-800 px-1.5 py-1.5 text-right">{fmtMoney(total, invoice.currency)}</td>
                        </tr>
                      </tfoot>
                    </table>

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
    </div>
  );
}
