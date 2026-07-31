import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { PayrollRecord } from '@/types/payroll';
import { useUnidade } from '@/contexts/UnidadeContext';

const PAGE_SIZE = 1000;

async function fetchAll(build: (from: number) => any) {
  let all: any[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await build(from);
    if (error) throw error;
    const chunk = data || [];
    all = all.concat(chunk);
    if (chunk.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

export const usePayrollData = () => {
  const { unidadeId, unidadeNome } = useUnidade();

  return useQuery({
    queryKey: ['payroll-records', unidadeId],
    queryFn: async (): Promise<PayrollRecord[]> => {
      // 1) Folhas já processadas/liberadas (fonte da verdade do sistema)
      const folhas = await fetchAll((from) =>
        supabase
          .from('folha_processamento')
          .select('*')
          .in('status', ['processado', 'liberado'])
          .eq('unidade_id', unidadeId!)
          .order('ano', { ascending: true })
          .order('mes', { ascending: true })
          .range(from, from + PAGE_SIZE - 1)
      );

      const folhaRecords: PayrollRecord[] = folhas.map((r: any) => ({
        id: r.id,
        prefeitura: unidadeNome || '',
        pasta: r.secretaria || 'Não informado',
        ano: r.ano,
        mes: r.mes,
        nome: r.nome,
        funcao: r.funcao || 'Não informado',
        cpf: r.cpf || '',
        bruto: Number(r.bruto) || 0,
        liquido: Number(r.liquido) || 0,
        created_at: r.created_at,
      }));

      const periodosFolha = new Set(folhaRecords.map(r => `${r.ano}-${r.mes}`));

      // 2) Dados importados (histórico) — apenas competências sem folha processada,
      //    para não duplicar registros.
      const importados = await fetchAll((from) => {
        let query = supabase
          .from('payroll_records')
          .select('*')
          .order('ano', { ascending: true })
          .order('mes', { ascending: true })
          .range(from, from + PAGE_SIZE - 1);
        if (unidadeId) query = query.eq('unidade_id', unidadeId);
        return query;
      });

      const importRecords: PayrollRecord[] = importados
        .filter((r: any) => !periodosFolha.has(`${r.ano}-${r.mes}`))
        .map((r: any) => ({
          ...r,
          pasta: r.pasta || 'Não informado',
          funcao: r.funcao || 'Não informado',
          bruto: Number(r.bruto) || 0,
          liquido: Number(r.liquido) || 0,
        }));

      return [...folhaRecords, ...importRecords].sort(
        (a, b) => a.ano * 12 + a.mes - (b.ano * 12 + b.mes)
      );
    },
    enabled: !!unidadeId,
  });
};
