import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatBRL = (v: number) =>
  (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const monthName = (m: number) =>
  ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][m - 1] || '';

export interface Linha {
  descricao: string;
  detalhe?: string;
  valor: number;
}

export interface ContrachequeCalculo {
  salarioBase: number;
  adicionaisLinhas: Linha[];
  totalAdicionais: number;
  descontosLinhas: Linha[];
  totalDescontos: number;
  encargosLinhas: Linha[];
  totalEncargos: number;
  bruto: number;
  liquido: number;
  faltas: number;
}

export interface UnidadeInfo {
  nome?: string;
  cidade?: string;
  estado?: string;
  instituicao_tipo?: string;
  instituicao_id?: string;
  padrao?: string;
  instituicao?: {
    nome?: string;
    cnpj?: string;
    endereco?: string;
    cidade?: string;
    estado?: string;
    telefone?: string;
    email?: string;
  } | null;
}

export async function fetchUnidadeInfo(unidadeId: string): Promise<UnidadeInfo | null> {
  const { data: u } = await supabase
    .from('unidades_folha')
    .select('nome, cidade, estado, instituicao_tipo, instituicao_id, padrao')
    .eq('id', unidadeId)
    .maybeSingle();
  if (!u) return null;
  let instituicao: any = null;
  if (u.instituicao_id) {
    const table = u.instituicao_tipo === 'prefeitura' ? 'prefeituras' : 'terceirizadas';
    const { data: i } = await supabase
      .from(table)
      .select('nome, cnpj, endereco, cidade, estado, telefone, email')
      .eq('id', u.instituicao_id)
      .maybeSingle();
    instituicao = i;
  }
  return { ...u, instituicao };
}

export async function fetchContrachequeCalculo(
  registro: any,
  unidadeId: string,
  isPadrao02: boolean,
): Promise<ContrachequeCalculo> {
  const colId = registro.colaborador_id;
  const mes = registro.mes;
  const ano = registro.ano;
  const salarioBase = Number(registro.salario_base) || 0;

  const [adicionaisRes, descontosRes, encargosRes, freqRes] = await Promise.all([
    supabase.from('adicionais').select('*').eq('ativo', true).eq('unidade_id', unidadeId)
      .or(`colaborador_id.eq.${colId},and(escopo.eq.global,colaborador_id.is.null)`),
    supabase.from('descontos').select('*').eq('ativo', true).eq('unidade_id', unidadeId)
      .or(`colaborador_id.eq.${colId},and(escopo.eq.global,colaborador_id.is.null)`),
    isPadrao02
      ? supabase.from('encargos').select('*').eq('ativo', true).eq('unidade_id', unidadeId)
          .or(`colaborador_id.eq.${colId},escopo.eq.global`)
      : Promise.resolve({ data: [], error: null } as any),
    supabase.from('frequencias').select('faltas').eq('unidade_id', unidadeId)
      .eq('colaborador_id', colId).eq('mes', mes).eq('ano', ano).maybeSingle(),
  ]);

  const current = ano * 100 + mes;
  const isVigente = (r: any) => {
    const tipo = r.tipo || 'recorrente';
    if (tipo === 'recorrente' || tipo === 'fixo') {
      if (!r.ano && !r.mes) return true;
      const inicio = (r.ano ?? 0) * 100 + (r.mes ?? 0);
      const fim = (r.ano_fim ?? r.ano ?? 9999) * 100 + (r.mes_fim ?? r.mes ?? 12);
      return current >= inicio && current <= fim;
    }
    if (tipo === 'eventual') return r.mes === mes && r.ano === ano;
    if (tipo === 'prazo') {
      const inicio = (r.ano ?? 0) * 100 + (r.mes ?? 0);
      const fim = (r.ano_fim ?? 9999) * 100 + (r.mes_fim ?? 12);
      return current >= inicio && current <= fim;
    }
    return false;
  };

  const faltas = Number((freqRes as any)?.data?.faltas) || 0;

  const adicionaisLinhas: Linha[] = [];
  let totalAdicionais = 0;
  if (!isPadrao02) {
    const adicionais = (adicionaisRes.data || []).filter(isVigente);
    adicionais.forEach((a: any) => {
      let valor = 0;
      let detalhe = '';
      if (a.modo_calculo === 'percentual') {
        const pct = Number(a.percentual) || 0;
        valor = salarioBase * pct / 100;
        detalhe = `${pct}% sobre salário base`;
      } else {
        valor = Number(a.valor) || 0;
      }
      totalAdicionais += valor;
      adicionaisLinhas.push({
        descricao: a.descricao,
        detalhe: detalhe || (a.escopo === 'global' ? 'Global' : undefined),
        valor,
      });
    });
  }

  const bruto = isPadrao02 ? Number(registro.bruto) : salarioBase + totalAdicionais;

  const descontosLinhas: Linha[] = [];
  let totalDescontos = 0;
  if (!isPadrao02) {
    const descontos = (descontosRes.data || []).filter(isVigente);
    descontos.forEach((d: any) => {
      let valor = 0;
      let detalhe = '';
      if (d.modo_calculo === 'percentual') {
        const pct = Number(d.percentual) || 0;
        const base = d.base_calculo === 'bruto' ? bruto : salarioBase;
        valor = base * pct / 100;
        detalhe = `${pct}% sobre ${d.base_calculo === 'bruto' ? 'bruto' : 'salário base'}`;
      } else if (d.is_percentual) {
        valor = bruto * Number(d.valor) / 100;
        detalhe = `${d.valor}% sobre bruto`;
      } else {
        valor = Number(d.valor) || 0;
      }
      totalDescontos += valor;
      descontosLinhas.push({
        descricao: d.descricao,
        detalhe: detalhe || (d.escopo === 'global' ? 'Global' : undefined),
        valor,
      });
    });
  }

  if (faltas > 0) {
    const valorFalta = (bruto / 30) * faltas;
    descontosLinhas.push({
      descricao: `Faltas (${faltas} ${faltas === 1 ? 'dia' : 'dias'})`,
      detalhe: `${formatBRL(bruto)} ÷ 30 × ${faltas}`,
      valor: valorFalta,
    });
    totalDescontos += valorFalta;
  }

  const encargosLinhas: Linha[] = [];
  let totalEncargos = 0;
  if (isPadrao02) {
    const encargos = (encargosRes.data || []) as any[];
    encargos.forEach((e: any) => {
      const pct = Number(e.percentual) || 0;
      const valor = salarioBase * pct / 100;
      totalEncargos += valor;
      encargosLinhas.push({
        descricao: e.nome,
        detalhe: `${pct}% sobre líquido (${formatBRL(salarioBase)})`,
        valor,
      });
    });
  }

  return {
    salarioBase,
    adicionaisLinhas,
    totalAdicionais,
    descontosLinhas,
    totalDescontos,
    encargosLinhas,
    totalEncargos,
    bruto,
    liquido: Number(registro.liquido),
    faltas,
  };
}

/**
 * Renders a single contracheque on the given jsPDF document at the current page.
 * Caller is responsible for adding new pages between calls.
 */
export function renderContrachequeOnPdf(
  doc: jsPDF,
  registro: any,
  data: ContrachequeCalculo,
  unidadeInfo: UnidadeInfo | null,
  isPadrao02: boolean,
) {
  const W = doc.internal.pageSize.width;
  const m = 15;
  let y = 16;

  const inst = unidadeInfo?.instituicao;
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(inst?.nome || unidadeInfo?.nome || '—', m, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(110);
  let infoY = y + 4;
  if (inst?.cnpj) { doc.text(`CNPJ: ${inst.cnpj}`, m, infoY); infoY += 3.5; }
  const localLinha = [inst?.endereco, [inst?.cidade || unidadeInfo?.cidade, inst?.estado || unidadeInfo?.estado].filter(Boolean).join(' - ')].filter(Boolean).join(' • ');
  if (localLinha) { doc.text(localLinha, m, infoY); infoY += 3.5; }
  const contatoLinha = [inst?.telefone, inst?.email].filter(Boolean).join(' • ');
  if (contatoLinha) { doc.text(contatoLinha, m, infoY); infoY += 3.5; }
  if (unidadeInfo?.nome && inst?.nome && unidadeInfo.nome !== inst.nome) {
    doc.text(`Unidade: ${unidadeInfo.nome}`, m, infoY); infoY += 3.5;
  }

  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('CONTRACHEQUE', W - m, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(110);
  doc.text(`Competência: ${monthName(registro.mes)}/${registro.ano}`, W - m, y + 4, { align: 'right' });
  doc.text(isPadrao02 ? 'Padrão 02' : 'Padrão 01', W - m, y + 8, { align: 'right' });

  y = Math.max(infoY, y + 12) + 2;
  doc.setDrawColor(220);
  doc.line(m, y, W - m, y);
  y += 5;

  const label = (t: string, x: number, yy: number) => {
    doc.setFontSize(7); doc.setTextColor(140); doc.setFont('helvetica', 'normal');
    doc.text(t, x, yy);
  };
  const value = (t: string, x: number, yy: number, bold = false) => {
    doc.setFontSize(9); doc.setTextColor(30); doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(t, x, yy);
  };
  const col2 = m + (W - m * 2) * 0.55;
  label('COLABORADOR', m, y); value(registro.nome, m, y + 4, true);
  label('CPF', col2, y); value(registro.cpf || '-', col2, y + 4);
  y += 10;
  label('FUNÇÃO', m, y); value(registro.funcao || '-', m, y + 4);
  label('SECRETARIA', col2, y); value(registro.secretaria || '-', col2, y + 4);
  y += 10;
  label('LOTAÇÃO', m, y); value(registro.lotacao || '-', m, y + 4);
  label('PADRÃO', col2, y); value(isPadrao02 ? 'Padrão 02' : 'Padrão 01', col2, y + 4);
  y += 9;

  const sectionTitle = (title: string) => {
    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(title, m, y + 3.5);
    doc.setDrawColor(51, 65, 85);
    doc.setLineWidth(0.4);
    doc.line(m, y + 5, W - m, y + 5);
    doc.setLineWidth(0.2);
    y += 7;
  };

  const renderTable = (rows: Linha[], totalLabel: string, total: number, negative = false) => {
    autoTable(doc, {
      startY: y,
      head: [['Descrição', 'Detalhe', 'Valor (R$)']],
      body: rows.length
        ? rows.map(l => [l.descricao, l.detalhe || '', `${negative ? '- ' : ''}${formatBRL(l.valor)}`])
        : [['—', 'Sem registros', '-']],
      foot: [['', totalLabel, `${negative ? '- ' : ''}${formatBRL(total)}`]],
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: { top: 1.6, bottom: 1.6, left: 2, right: 2 }, textColor: [40, 40, 40], lineColor: [225, 228, 232], lineWidth: 0 },
      headStyles: { textColor: [120, 130, 140], fontStyle: 'bold', fontSize: 7, lineWidth: { bottom: 0.2 }, lineColor: [200, 205, 212] },
      bodyStyles: { lineWidth: { bottom: 0.1 }, lineColor: [235, 238, 242] },
      footStyles: { textColor: [51, 65, 85], fontStyle: 'bold', lineWidth: { top: 0.3 }, lineColor: [180, 188, 198] },
      columnStyles: { 1: { textColor: [140, 145, 152], fontSize: 7 }, 2: { halign: 'right' } },
      margin: { left: m, right: m },
    });
    y = (doc as any).lastAutoTable.finalY + 5;
  };

  if (!isPadrao02) {
    sectionTitle('PROVENTOS');
    renderTable(
      [{ descricao: 'Salário Base', valor: data.salarioBase }, ...data.adicionaisLinhas],
      'Total Proventos / Bruto',
      data.bruto,
    );
    sectionTitle('DESCONTOS');
    renderTable(data.descontosLinhas, 'Total de Descontos', data.totalDescontos, true);
  } else {
    sectionTitle('LÍQUIDO CONTRATADO');
    renderTable([{ descricao: 'Salário Líquido (base)', valor: data.salarioBase }], 'Líquido Base', data.salarioBase);
    sectionTitle('ENCARGOS SOBRE O LÍQUIDO');
    renderTable(data.encargosLinhas, 'Total de Encargos', data.totalEncargos);
    doc.setDrawColor(220, 224, 230);
    doc.setLineWidth(0.2);
    doc.line(m, y, W - m, y);
    doc.setTextColor(60); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text('Salário Bruto (Líquido + Encargos)', m, y + 5);
    doc.text(formatBRL(data.bruto), W - m, y + 5, { align: 'right' });
    doc.line(m, y + 7.5, W - m, y + 7.5);
    y += 12;
    if (data.descontosLinhas.length > 0) {
      sectionTitle('DESCONTOS');
      renderTable(data.descontosLinhas, 'Total de Descontos', data.totalDescontos, true);
    }
  }

  if (y > 250) { doc.addPage(); y = 20; }
  // Líquido a receber - linhas destacadas, sem faixa cheia
  doc.setDrawColor(51, 65, 85);
  doc.setLineWidth(0.6);
  doc.line(m, y, W - m, y);
  doc.setTextColor(51, 65, 85); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text('VALOR LÍQUIDO A RECEBER', m, y + 7);
  doc.setFontSize(13);
  doc.text(formatBRL(data.liquido), W - m, y + 7, { align: 'right' });
  doc.setLineWidth(0.2);
  doc.line(m, y + 10, W - m, y + 10);
  y += 18;

  doc.setFontSize(7); doc.setTextColor(150); doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, W / 2, doc.internal.pageSize.height - 8, { align: 'center' });
}

export function downloadSingleContracheque(
  registro: any,
  data: ContrachequeCalculo,
  unidadeInfo: UnidadeInfo | null,
  isPadrao02: boolean,
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  renderContrachequeOnPdf(doc, registro, data, unidadeInfo, isPadrao02);
  const safeName = (registro.nome || 'colaborador').replace(/\s+/g, '_');
  doc.save(`contracheque_${safeName}_${registro.mes}_${registro.ano}.pdf`);
}

/**
 * Renders a compact single-page collective payslip listing for a single competência (mês/ano).
 * One header for the unidade, all collaborators listed with bruto/descontos/líquido.
 */
export async function downloadColetivoContracheques(
  registros: any[],
  unidadeId: string,
  mes: number,
  ano: number,
  filtros?: { secretaria?: string; lotacao?: string; funcao?: string },
) {
  if (registros.length === 0) return;
  const unidadeInfo = await fetchUnidadeInfo(unidadeId);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.width;
  const H = doc.internal.pageSize.height;
  const m = 14;
  let y = 14;

  const inst = unidadeInfo?.instituicao;
  // Header único
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(inst?.nome || unidadeInfo?.nome || '—', m, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(110);
  let infoY = y + 4.5;
  const linha1 = [inst?.cnpj && `CNPJ: ${inst.cnpj}`, [inst?.cidade || unidadeInfo?.cidade, inst?.estado || unidadeInfo?.estado].filter(Boolean).join(' - ')].filter(Boolean).join(' • ');
  if (linha1) { doc.text(linha1, m, infoY); infoY += 3.5; }
  if (unidadeInfo?.nome && inst?.nome && unidadeInfo.nome !== inst.nome) {
    doc.text(`Unidade: ${unidadeInfo.nome}`, m, infoY); infoY += 3.5;
  }

  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('FOLHA DE PAGAMENTO — COLETIVO', W - m, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(110);
  doc.text(`Competência: ${monthName(mes)}/${ano}`, W - m, y + 4.5, { align: 'right' });
  const filtrosTxt = [
    filtros?.secretaria && `Secretaria: ${filtros.secretaria}`,
    filtros?.lotacao && `Lotação: ${filtros.lotacao}`,
    filtros?.funcao && `Função: ${filtros.funcao}`,
  ].filter(Boolean).join(' • ');
  if (filtrosTxt) doc.text(filtrosTxt, W - m, y + 8, { align: 'right' });

  y = Math.max(infoY, y + 12) + 2;
  doc.setDrawColor(180);
  doc.setLineWidth(0.4);
  doc.line(m, y, W - m, y);
  y += 4;

  // Tabela compacta
  const totalBruto = registros.reduce((s, r) => s + Number(r.bruto || 0), 0);
  const totalDesc = registros.reduce((s, r) => s + Number(r.total_descontos || 0), 0);
  const totalLiq = registros.reduce((s, r) => s + Number(r.liquido || 0), 0);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Matrícula', 'Colaborador', 'CPF', 'Função', 'Secretaria', 'Bruto', 'Descontos', 'Líquido']],
    body: registros.map((r, i) => [
      String(i + 1),
      r.matricula || '-',
      r.nome,
      r.cpf || '-',
      r.funcao || '-',
      r.secretaria || '-',
      formatBRL(Number(r.bruto || 0)),
      formatBRL(Number(r.total_descontos || 0)),
      formatBRL(Number(r.liquido || 0)),
    ]),
    foot: [['', '', '', '', '', `TOTAIS (${registros.length})`, formatBRL(totalBruto), formatBRL(totalDesc), formatBRL(totalLiq)]],
    theme: 'plain',
    styles: { fontSize: 7.5, cellPadding: { top: 1.4, bottom: 1.4, left: 2, right: 2 }, textColor: [40, 40, 40] },
    headStyles: { textColor: [120, 130, 140], fontStyle: 'bold', fontSize: 7, lineWidth: { bottom: 0.2 }, lineColor: [200, 205, 212] },
    bodyStyles: { lineWidth: { bottom: 0.1 }, lineColor: [235, 238, 242] },
    footStyles: { textColor: [51, 65, 85], fontStyle: 'bold', fontSize: 8, lineWidth: { top: 0.3 }, lineColor: [180, 188, 198] },
    columnStyles: {
      0: { cellWidth: 7, halign: 'right', textColor: [150, 150, 150] },
      1: { cellWidth: 16 },
      6: { halign: 'right' },
      7: { halign: 'right', textColor: [120, 120, 120] },
      8: { halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: m, right: m },
    didDrawPage: () => {
      doc.setFontSize(7); doc.setTextColor(150); doc.setFont('helvetica', 'normal');
      doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, m, H - 8);
      doc.text(`Página ${doc.getCurrentPageInfo().pageNumber}`, W - m, H - 8, { align: 'right' });
    },
  });

  doc.save(`folha_coletivo_${mes.toString().padStart(2,'0')}_${ano}.pdf`);
}

export async function downloadMultipleContracheques(
  registros: any[],
  unidadeId: string,
  isPadrao02: boolean,
) {
  if (registros.length === 0) return;
  const unidadeInfo = await fetchUnidadeInfo(unidadeId);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  for (let i = 0; i < registros.length; i++) {
    const reg = registros[i];
    const calc = await fetchContrachequeCalculo(reg, unidadeId, isPadrao02);
    if (i > 0) doc.addPage();
    renderContrachequeOnPdf(doc, reg, calc, unidadeInfo, isPadrao02);
  }
  const safeName = (registros[0].nome || 'colaborador').replace(/\s+/g, '_');
  const filename = registros.length === 1
    ? `contracheque_${safeName}_${registros[0].mes}_${registros[0].ano}.pdf`
    : `contracheques_${safeName}_${registros.length}_meses.pdf`;
  doc.save(filename);
}
