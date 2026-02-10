import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExportColumn {
  header: string;
  key: string;
  align?: 'left' | 'right' | 'center';
}

interface ExportOptions {
  title: string;
  subtitle?: string;
  columns: ExportColumn[];
  data: Record<string, any>[];
  fileName: string;
}

export const exportToExcel = ({ title, columns, data, fileName }: ExportOptions) => {
  const rows = data.map(row => {
    const obj: Record<string, any> = {};
    columns.forEach(col => {
      obj[col.header] = row[col.key];
    });
    return obj;
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 31));
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};

export const exportToPDF = ({ title, subtitle, columns, data, fileName }: ExportOptions) => {
  const doc = new jsPDF({ orientation: 'landscape' });

  doc.setFontSize(16);
  doc.text(title, 14, 20);

  if (subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(subtitle, 14, 28);
    doc.setTextColor(0);
  }

  const head = [columns.map(c => c.header)];
  const body = data.map(row => columns.map(col => String(row[col.key] ?? '')));

  autoTable(doc, {
    startY: subtitle ? 34 : 28,
    head,
    body,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [41, 65, 122], textColor: 255, fontStyle: 'bold' },
    columnStyles: columns.reduce((acc, col, i) => {
      if (col.align === 'right') acc[i] = { halign: 'right' as const };
      return acc;
    }, {} as Record<number, { halign: 'left' | 'right' | 'center' }>),
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.text(`Página ${data.pageNumber} de ${pageCount}`, doc.internal.pageSize.width - 40, doc.internal.pageSize.height - 10);
    },
  });

  doc.save(`${fileName}.pdf`);
};
