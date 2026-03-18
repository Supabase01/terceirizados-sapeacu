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
  const descontos = record.bruto - record.liquido;
  const ref = `${getMonthNameExport(record.mes)} / ${record.ano}`;

  // Header
  doc.setFillColor(41, 65, 122);
  doc.rect(0, 0, w, 32, 'F');
  doc.setTextColor(255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(record.prefeitura || 'Prefeitura Municipal', w / 2, 14, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('RECIBO DE PAGAMENTO', w / 2, 22, { align: 'center' });
  doc.setFontSize(9);
  doc.text(`Competência: ${ref}`, w / 2, 28, { align: 'center' });

  doc.setTextColor(0);
  let y = 42;

  // Employee info box
  doc.setDrawColor(200);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, y, w - 28, 28, 2, 2);
  
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text('NOME DO COLABORADOR', 18, y + 5);
  doc.text('CPF', 18, y + 17);
  doc.text('FUNÇÃO', w / 2, y + 17);

  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text(record.nome, 18, y + 11);
  doc.setFont('helvetica', 'normal');
  doc.text(record.cpf, 18, y + 23);
  doc.text(record.funcao, w / 2, y + 23);

  y += 34;

  // Lotação
  doc.setDrawColor(200);
  doc.roundedRect(14, y, w - 28, 14, 2, 2);
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text('SECRETARIA / LOTAÇÃO', 18, y + 5);
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(record.pasta, 18, y + 11);

  y += 22;

  // Payment table
  const tableData = [
    ['Salário Bruto', formatCurrencyExport(record.bruto)],
    ['Descontos', `(${formatCurrencyExport(descontos)})`],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Descrição', 'Valor (R$)']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 5 },
    headStyles: { fillColor: [41, 65, 122], textColor: 255, fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { halign: 'left', cellWidth: 110 },
      1: { halign: 'right', cellWidth: 52 },
    },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 2;

  // Total líquido
  doc.setFillColor(41, 65, 122);
  doc.roundedRect(14, y, w - 28, 14, 2, 2, 'F');
  doc.setTextColor(255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('VALOR LÍQUIDO A RECEBER', 18, y + 9);
  doc.text(formatCurrencyExport(record.liquido), w - 18, y + 9, { align: 'right' });

  y += 26;

  // Signature line
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0);
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);

  const sigW = 80;
  const sigX = (w - sigW) / 2;
  doc.line(sigX, y + 20, sigX + sigW, y + 20);
  doc.setFontSize(9);
  doc.text('Assinatura do Colaborador', w / 2, y + 26, { align: 'center' });
  
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(`Documento gerado em ${new Date().toLocaleDateString('pt-BR')}`, w / 2, y + 38, { align: 'center' });

  doc.save(`contracheque_${record.nome.replace(/\s+/g, '_')}_${record.mes}_${record.ano}.pdf`);
};

const formatCurrencyExport = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};
