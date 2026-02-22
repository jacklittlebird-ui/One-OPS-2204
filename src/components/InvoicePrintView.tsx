import { Invoice } from "@/pages/Invoices";
import { X } from "lucide-react";

interface InvoicePrintViewProps {
  invoice: Invoice;
  onClose: () => void;
}

export default function InvoicePrintView({ invoice, onClose }: InvoicePrintViewProps) {
  const handlePrint = () => window.print();

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
          {invoice.notes && (
            <div className="mb-8 p-3 bg-gray-50 rounded text-sm text-gray-600">
              <span className="font-semibold">Notes:</span> {invoice.notes}
            </div>
          )}

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
