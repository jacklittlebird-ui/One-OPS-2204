import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface PdfTableOptions {
  title: string;
  subtitle?: string;
  head: string[][];
  body: (string | number)[][];
  fileName: string;
  orientation?: "portrait" | "landscape";
}

export function exportToPdf({ title, subtitle, head, body, fileName, orientation = "portrait" }: PdfTableOptions) {
  const doc = new jsPDF({ orientation, unit: "pt", format: "a4" });
  doc.setFontSize(16);
  doc.text(title, 40, 40);
  if (subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(subtitle, 40, 58);
  }
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 40, subtitle ? 72 : 58);

  autoTable(doc, {
    startY: subtitle ? 88 : 74,
    head,
    body,
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [30, 64, 175], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 40, right: 40 },
  });

  doc.save(fileName);
}
