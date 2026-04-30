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
  y += 8;

  const sectionTitle = (title: string, color: [number, number, number]) => {
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(m, y, W - m * 2, 6, 'F');
    doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text(title, m + 2, y + 4.2);
    y += 6;
  };

  const renderTable = (rows: Linha[], totalLabel: string, total: number, color: [number, number, number], negative = false) => {
    autoTable(doc, {
      startY: y,
      head: [['Descrição', 'Detalhe', 'Valor (R$)']],
      body: rows.length
        ? rows.map(l => [l.descricao, l.detalhe || '', `${negative ? '- ' : ''}${formatBRL(l.valor)}`])
        : [['—', 'Sem registros', '-']],
      foot: [['', totalLabel, `${negative ? '- ' : ''}${formatBRL(total)}`]],
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 1.8, textColor: [40, 40, 40] },
      headStyles: { fillColor: [245, 247, 250], textColor: [80, 80, 80], fontStyle: 'bold', fontSize: 7 },
      footStyles: { fillColor: [245, 247, 250], textColor: color, fontStyle: 'bold' },
      columnStyles: { 1: { textColor: [120, 120, 120], fontSize: 7 }, 2: { halign: 'right' } },
      margin: { left: m, right: m },
    });
    y = (doc as any).lastAutoTable.finalY + 4;
  };

  const NEUTRAL_DARK: [number, number, number] = [55, 65, 81];
  const NEUTRAL_HEADER: [number, number, number] = [71, 85, 105];

  if (!isPadrao02) {
    sectionTitle('PROVENTOS', NEUTRAL_HEADER);
    renderTable(
      [{ descricao: 'Salário Base', valor: data.salarioBase }, ...data.adicionaisLinhas],
      'Total Proventos / Bruto',
      data.bruto,
      NEUTRAL_DARK,
    );
    sectionTitle('DESCONTOS', NEUTRAL_HEADER);
    renderTable(data.descontosLinhas, 'Total de Descontos', data.totalDescontos, NEUTRAL_DARK, true);
  } else {
    sectionTitle('LÍQUIDO CONTRATADO', NEUTRAL_HEADER);
    renderTable([{ descricao: 'Salário Líquido (base)', valor: data.salarioBase }], 'Líquido Base', data.salarioBase, NEUTRAL_DARK);
    sectionTitle('ENCARGOS SOBRE O LÍQUIDO', NEUTRAL_HEADER);
    renderTable(data.encargosLinhas, 'Total de Encargos', data.totalEncargos, NEUTRAL_DARK);
    doc.setFillColor(245, 247, 250);
    doc.rect(m, y, W - m * 2, 8, 'F');
    doc.setTextColor(60); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text('Salário Bruto (Líquido + Encargos)', m + 2, y + 5.5);
    doc.text(formatBRL(data.bruto), W - m - 2, y + 5.5, { align: 'right' });
    y += 12;
    if (data.descontosLinhas.length > 0) {
      sectionTitle('DESCONTOS', NEUTRAL_HEADER);
      renderTable(data.descontosLinhas, 'Total de Descontos', data.totalDescontos, NEUTRAL_DARK, true);
    }
  }

  if (y > 250) { doc.addPage(); y = 20; }
  doc.setFillColor(51, 65, 85);
  doc.rect(m, y, W - m * 2, 14, 'F');
  doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text('VALOR LÍQUIDO A RECEBER', m + 3, y + 9);
  doc.setFontSize(13);
  doc.text(formatBRL(data.liquido), W - m - 3, y + 9, { align: 'right' });
  y += 22;

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
