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

interface ContrachequeData {
  prefeitura: string;
  nome: string;
  cpf: string;
  funcao: string;
  pasta: string;
  mes: number;
  ano: number;
  bruto: number;
  liquido: number;
}

const getMonthNameExport = (m: number) => {
  const names = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return names[m] || '';
};

export const exportContracheque = (record: ContrachequeData) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const w = doc.internal.pageSize.width;
  const m = 20; // margin
  const cw = w - m * 2; // content width
  const descontos = record.bruto - record.liquido;
  const ref = `${getMonthNameExport(record.mes)} / ${record.ano}`;

  // ── Thin top accent line ──
  doc.setFillColor(41, 65, 122);
  doc.rect(0, 0, w, 3, 'F');

  // ── Header ──
  let y = 16;
  doc.setTextColor(41, 65, 122);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(record.prefeitura || 'Prefeitura Municipal', m, y);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('RECIBO DE PAGAMENTO', m, y + 6);

  doc.setFontSize(9);
  doc.setTextColor(60);
  doc.text(`Competência: ${ref}`, w - m, y + 3, { align: 'right' });

  y += 14;
  doc.setDrawColor(220);
  doc.setLineWidth(0.3);
  doc.line(m, y, w - m, y);

  // ── Employee data ──
  y += 8;
  const labelStyle = () => { doc.setFontSize(7); doc.setTextColor(140); doc.setFont('helvetica', 'normal'); };
  const valueStyle = () => { doc.setFontSize(10); doc.setTextColor(30); doc.setFont('helvetica', 'normal'); };
  const valueBold = () => { doc.setFontSize(10); doc.setTextColor(30); doc.setFont('helvetica', 'bold'); };

  const col2 = m + cw * 0.55;

  labelStyle(); doc.text('COLABORADOR', m, y);
  valueBold(); doc.text(record.nome, m, y + 5);

  labelStyle(); doc.text('COMPETÊNCIA', col2, y);
  valueStyle(); doc.text(ref, col2, y + 5);

  y += 14;
  labelStyle(); doc.text('CPF', m, y);
  valueStyle(); doc.text(record.cpf, m, y + 5);

  labelStyle(); doc.text('FUNÇÃO', col2, y);
  valueStyle(); doc.text(record.funcao, col2, y + 5);

  y += 14;
  labelStyle(); doc.text('SECRETARIA / LOTAÇÃO', m, y);
  valueStyle(); doc.text(record.pasta, m, y + 5);

  y += 12;
  doc.setDrawColor(220);
  doc.line(m, y, w - m, y);
  y += 4;

  // ── Values table (minimal) ──
  autoTable(doc, {
    startY: y,
    head: [['Descrição', 'Valor (R$)']],
    body: [
      ['Salário Bruto', formatCurrencyExport(record.bruto)],
      ['Descontos', descontos > 0 ? `(${formatCurrencyExport(descontos)})` : '-'],
    ],
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: { top: 4, bottom: 4, left: 0, right: 0 }, textColor: [30, 30, 30] },
    headStyles: { fillColor: false, textColor: [140, 140, 140], fontStyle: 'normal', fontSize: 7 },
    columnStyles: {
      0: { halign: 'left' },
      1: { halign: 'right' },
    },
    margin: { left: m, right: m },
    tableLineColor: [220, 220, 220],
    tableLineWidth: 0.2,
    didDrawCell: (data: any) => {
      if (data.section === 'body') {
        doc.setDrawColor(235);
        doc.setLineWidth(0.2);
        doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // ── Total líquido ──
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(m, y, cw, 14, 1.5, 1.5, 'F');
  doc.setDrawColor(41, 65, 122);
  doc.setLineWidth(0.4);
  doc.roundedRect(m, y, cw, 14, 1.5, 1.5, 'S');

  doc.setTextColor(41, 65, 122);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('VALOR LÍQUIDO', m + 5, y + 9);
  doc.setFontSize(12);
  doc.text(formatCurrencyExport(record.liquido), w - m - 5, y + 9, { align: 'right' });

  y += 30;

  // ── Signature ──
  doc.setDrawColor(180);
  doc.setLineWidth(0.3);
  const sigW = 70;
  const sigX = (w - sigW) / 2;
  doc.line(sigX, y, sigX + sigW, y);
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.setFont('helvetica', 'normal');
  doc.text('Assinatura do Colaborador', w / 2, y + 5, { align: 'center' });

  // ── Footer ──
  doc.setFontSize(7);
  doc.setTextColor(180);
  doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, w / 2, doc.internal.pageSize.height - 10, { align: 'center' });

  doc.save(`contracheque_${record.nome.replace(/\s+/g, '_')}_${record.mes}_${record.ano}.pdf`);
};

const formatCurrencyExport = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};
