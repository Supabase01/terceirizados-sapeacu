import type { PayrollRecord, AuditAlert } from '@/types/payroll';

export const runCPFCrossCheck = (records: PayrollRecord[]): AuditAlert[] => {
  const alerts: AuditAlert[] = [];
  const grouped: Record<string, PayrollRecord[]> = {};

  records.forEach(r => {
    const key = `${r.cpf}-${r.ano}-${r.mes}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(r);
  });

  Object.values(grouped).forEach(group => {
    const pastas = [...new Set(group.map(r => r.pasta))];
    if (pastas.length > 1) {
      alerts.push({
        type: 'cpf_cruzamento',
        severity: 'alta',
        title: `CPF ${group[0].cpf} em múltiplas pastas`,
        description: `${group[0].nome} recebeu em ${pastas.join(', ')} no mesmo mês (${group[0].mes}/${group[0].ano})`,
        records: group,
      });
    }
  });

  return alerts;
};

export const runVariationCheck = (records: PayrollRecord[]): AuditAlert[] => {
  const alerts: AuditAlert[] = [];
  const byCPF: Record<string, PayrollRecord[]> = {};

  records.forEach(r => {
    if (!byCPF[r.cpf]) byCPF[r.cpf] = [];
    byCPF[r.cpf].push(r);
  });

  Object.values(byCPF).forEach(cpfRecords => {
    // Aggregate by month (sum liquido per month for CPFs in multiple pastas)
    const byMonth: Record<string, { liquido: number; record: PayrollRecord }> = {};
    cpfRecords.forEach(r => {
      const key = `${r.ano}-${r.mes}`;
      if (!byMonth[key]) {
        byMonth[key] = { liquido: r.liquido, record: r };
      } else {
        byMonth[key].liquido += r.liquido;
      }
    });

    const sortedMonths = Object.entries(byMonth)
      .sort(([, a], [, b]) => a.record.ano * 12 + a.record.mes - (b.record.ano * 12 + b.record.mes));

    for (let i = 1; i < sortedMonths.length; i++) {
      const [, prev] = sortedMonths[i - 1];
      const [, curr] = sortedMonths[i];
      const prevTotal = prev.record.ano * 12 + prev.record.mes;
      const currTotal = curr.record.ano * 12 + curr.record.mes;
      // Only compare strictly consecutive months
      if (currTotal - prevTotal !== 1) continue;
      if (prev.liquido > 0) {
        const variation = ((curr.liquido - prev.liquido) / prev.liquido) * 100;
        if (variation > 20) {
          alerts.push({
            type: 'variacao',
            severity: 'media',
            title: `Variação de ${variation.toFixed(1)}% no líquido`,
            description: `${curr.record.nome} (${curr.record.cpf}): de R$ ${prev.liquido.toFixed(2)} para R$ ${curr.liquido.toFixed(2)} (${prev.record.mes}/${prev.record.ano} → ${curr.record.mes}/${curr.record.ano})`,
            records: [prev.record, curr.record],
          });
        }
      }
    }
  });

  return alerts;
};

export const runInconsistencyCheck = (records: PayrollRecord[]): AuditAlert[] => {
  return records
    .filter(r => r.bruto > 0 && r.liquido === r.bruto)
    .map(r => ({
      type: 'inconsistencia' as const,
      severity: 'media' as const,
      title: `Líquido = Bruto (sem retenções)`,
      description: `${r.nome} (${r.cpf}): R$ ${r.bruto.toFixed(2)} em ${r.mes}/${r.ano} - ${r.pasta}`,
      records: [r],
    }));
};

export const runDuplicateCheck = (records: PayrollRecord[]): AuditAlert[] => {
  const grouped: Record<string, PayrollRecord[]> = {};
  records.forEach(r => {
    const key = `${r.cpf}-${r.ano}-${r.mes}-${r.pasta}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(r);
  });

  return Object.values(grouped)
    .filter(group => group.length > 1)
    .map(group => ({
      type: 'duplicado' as const,
      severity: 'alta' as const,
      title: `CPF duplicado no mês`,
      description: `${group[0].nome} (${group[0].cpf}) aparece ${group.length}x em ${group[0].pasta} - ${group[0].mes}/${group[0].ano}`,
      records: group,
    }));
};

export const runNewEmployeeCheck = (records: PayrollRecord[]): AuditAlert[] => {
  const alerts: AuditAlert[] = [];
  const byMonth: Record<string, PayrollRecord[]> = {};

  records.forEach(r => {
    const key = `${r.ano}-${String(r.mes).padStart(2, '0')}`;
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(r);
  });

  const sortedMonths = Object.keys(byMonth).sort();

  for (let i = 1; i < sortedMonths.length; i++) {
    const prevCPFs = new Set(byMonth[sortedMonths[i - 1]].map(r => r.cpf));
    const currRecords = byMonth[sortedMonths[i]];

    currRecords.forEach(r => {
      if (!prevCPFs.has(r.cpf)) {
        alerts.push({
          type: 'novo_na_folha',
          severity: 'baixa',
          title: `Novo na folha: ${r.nome}`,
          description: `${r.nome} (${r.cpf}) apareceu pela primeira vez em ${r.pasta} - ${r.mes}/${r.ano} (Bruto: R$ ${r.bruto.toFixed(2)})`,
          records: [r],
        });
      }
    });
  }

  return alerts;
};

export const runAllChecks = (records: PayrollRecord[]): AuditAlert[] => {
  return [
    ...runCPFCrossCheck(records),
    ...runVariationCheck(records),
    ...runInconsistencyCheck(records),
    ...runDuplicateCheck(records),
    ...runNewEmployeeCheck(records),
  ];
};
