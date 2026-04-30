import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { registrarLog } from '@/lib/logSistema';
import { useUnidade } from '@/contexts/UnidadeContext';
import { roundMoney } from '@/lib/money';
import { cn } from '@/lib/utils';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Search, CheckCircle2, Loader2, FileText, Info, Download } from 'lucide-react';
import { exportToPDF } from '@/lib/exportUtils';
import { useIsMaster } from '@/hooks/useIsMaster';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const currentDate = new Date();
const currentMes = currentDate.getMonth() + 1;
const currentAno = currentDate.getFullYear();

const PAGE_SIZE = 20;

const formatCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const getMonthLabel = (m: number) =>
  ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][m - 1] || '';

// Compute previous month
const prevMes = currentMes === 1 ? 12 : currentMes - 1;
const prevAno = currentMes === 1 ? currentAno - 1 : currentAno;

const FolhaProcessamento = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isMaster } = useIsMaster();
  const { unidadeId, unidadePadrao } = useUnidade();
  const isPadrao02 = unidadePadrao === 'padrao_02';
  const [mes, setMes] = useState(currentMes);
  const [ano, setAno] = useState(currentAno);
  const [search, setSearch] = useState('');
  const [filterSecretaria, setFilterSecretaria] = useState('all');
  const [filterFuncao, setFilterFuncao] = useState('all');
  const [filterValorMin, setFilterValorMin] = useState('');
  const [filterValorMax, setFilterValorMax] = useState('');
  const [page, setPage] = useState(0);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [generateSecretaria, setGenerateSecretaria] = useState('all');

  // Load secretarias for the generation filter
  const { data: secretariasList = [] } = useQuery({
    queryKey: ['secretarias-ativas', unidadeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('secretarias')
        .select('id, nome')
        .eq('ativo', true)
        .eq('unidade_id', unidadeId!)
        .order('nome');
      if (error) throw error;
      return data;
    },
    enabled: !!unidadeId,
  });

  // Check if previous month is already processed or released FOR THIS UNIT
  const { data: prevMonthProcessed } = useQuery({
    queryKey: ['prev-month-processed', prevMes, prevAno, unidadeId],
    queryFn: async () => {
      const { data } = await supabase
        .from('folha_processamento')
        .select('id')
        .eq('mes', prevMes)
        .eq('ano', prevAno)
        .in('status', ['processado', 'liberado'])
        .eq('unidade_id', unidadeId!)
        .limit(1);
      return (data?.length ?? 0) > 0;
    },
    enabled: !!unidadeId,
  });

  // Check if selected month is already processed/released
  const { data: processedInfo } = useQuery({
    queryKey: ['processed-info', mes, ano, unidadeId],
    queryFn: async () => {
      const PAGE = 1000;
      let all: any[] = [];
      let from = 0;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from('folha_processamento')
          .select('*')
          .eq('mes', mes)
          .eq('ano', ano)
          .in('status', ['processado', 'liberado'])
          .eq('unidade_id', unidadeId!)
          .range(from, from + PAGE - 1);
        if (error) throw error;
        all = all.concat(data || []);
        hasMore = (data?.length ?? 0) === PAGE;
        from += PAGE;
      }
      if (all.length === 0) return null;
      const status = all[0].status as string;
      const updatedAt = all[0].updated_at as string;
      const totalColab = all.length;
      const tBruto = all.reduce((s: number, r: any) => s + Number(r.bruto), 0);
      const tLiquido = all.reduce((s: number, r: any) => s + Number(r.liquido), 0);
      const tAdicionais = all.reduce((s: number, r: any) => s + Number(r.total_adicionais), 0);
      const tDescontos = all.reduce((s: number, r: any) => s + Number(r.total_descontos), 0);
      const tEncargos = all.reduce((s: number, r: any) => s + Number(r.total_encargos || 0), 0);
      return { status, updatedAt, totalColab, totalBruto: tBruto, totalLiquido: tLiquido, totalAdicionais: tAdicionais, totalDescontos: tDescontos, totalEncargos: tEncargos };
    },
    enabled: !!unidadeId,
  });

  const isSelectedMonthProcessed = !!processedInfo;

  // Build available competencias
  const competencias = [
    { mes: currentMes, ano: currentAno },
    ...(!prevMonthProcessed ? [{ mes: prevMes, ano: prevAno }] : []),
  ];

  // Fetch draft payroll for selected period (only if NOT already processed)
  const { data: folha = [], isLoading, refetch } = useQuery({
    queryKey: ['folha-processamento', mes, ano, unidadeId],
    queryFn: async () => {
      const PAGE = 1000;
      let all: any[] = [];
      let from = 0;
      let hasMore = true;
      while (hasMore) {
        let query = supabase
          .from('folha_processamento')
          .select('*')
          .eq('mes', mes)
          .eq('ano', ano)
          .eq('status', 'rascunho')
          .order('nome', { ascending: true })
          .range(from, from + PAGE - 1);
        if (unidadeId) query = query.eq('unidade_id', unidadeId);
        const { data, error } = await query;
        if (error) throw error;
        all = all.concat(data || []);
        hasMore = (data?.length ?? 0) === PAGE;
        from += PAGE;
      }
      return all;
    },
    enabled: !!unidadeId && !isSelectedMonthProcessed,
  });

  // Generate/regenerate draft
  const generateMutation = useMutation({
    mutationFn: async () => {
      const selectedSecretariaId = generateSecretaria !== 'all' ? generateSecretaria : null;

      // 1. Load active colaboradores with joins (optionally filtered by secretaria)
      let colaboradores: any[] = [];
      {
        const PAGE = 1000;
        let from = 0;
        let hasMore = true;
        while (hasMore) {
          let q = supabase
            .from('colaboradores')
            .select('*, secretarias(nome), funcoes(nome), lotacoes(nome)')
            .eq('ativo', true)
            .eq('unidade_id', unidadeId!);
          if (selectedSecretariaId) q = q.eq('secretaria_id', selectedSecretariaId);
          q = q.range(from, from + PAGE - 1);
          const { data: chunk, error: colErr } = await q;
          if (colErr) throw colErr;
          colaboradores = colaboradores.concat(chunk || []);
          hasMore = (chunk?.length ?? 0) === PAGE;
          from += PAGE;
        }
      }
      if (!colaboradores?.length) throw new Error('Nenhum colaborador ativo encontrado.');

      // 2. Load adicionais ativos
      const { data: adicionais, error: addErr } = await supabase
        .from('adicionais')
        .select('*')
        .eq('ativo', true)
        .eq('unidade_id', unidadeId!);
      if (addErr) throw addErr;

      // 3. Load descontos ativos
      const { data: descontos, error: descErr } = await supabase
        .from('descontos')
        .select('*')
        .eq('ativo', true)
        .eq('unidade_id', unidadeId!);
      if (descErr) throw descErr;

      // 4. Load encargos ativos (for Padrão 02)
      let encargosData: any[] = [];
      if (isPadrao02) {
        const { data: enc, error: encErr } = await supabase
          .from('encargos')
          .select('*')
          .eq('ativo', true)
          .eq('unidade_id', unidadeId!);
        if (encErr) throw encErr;
        encargosData = enc || [];
      }

      // Helper: vigência por tipo (recorrente | prazo | eventual).
      // Mantém compatibilidade com o tipo legado 'fixo' = recorrente.
      const current = ano * 100 + mes;
      const isVigente = (r: any) => {
        const tipo = r.tipo || 'recorrente';
        if (tipo === 'recorrente' || tipo === 'fixo') {
          // Sem competência = sempre vale
          if (!r.ano && !r.mes) return true;
          // Com competência (legado) = trata como prazo
          const inicio = (r.ano ?? 0) * 100 + (r.mes ?? 0);
          const fim = (r.ano_fim ?? r.ano ?? 9999) * 100 + (r.mes_fim ?? r.mes ?? 12);
          return current >= inicio && current <= fim;
        }
        if (tipo === 'eventual') {
          return r.mes === mes && r.ano === ano;
        }
        if (tipo === 'prazo') {
          const inicio = (r.ano ?? 0) * 100 + (r.mes ?? 0);
          const fim = (r.ano_fim ?? 9999) * 100 + (r.mes_fim ?? 12);
          return current >= inicio && current <= fim;
        }
        return false;
      };
      const isAdicionalVigente = isVigente;
      const isDescontoVigente = isVigente;

      // Global descontos (sem colaborador)
      const descontosGlobais = (descontos || []).filter(
        (d: any) => d.escopo === 'global' && isDescontoVigente(d)
      );

      // Helper: resolve base value for percentual calculations
      const resolveBase = (baseCalculo: string | null | undefined, ctx: { salarioBase: number; bruto: number; liquido: number }) => {
        switch (baseCalculo) {
          case 'bruto': return ctx.bruto;
          case 'liquido': return ctx.liquido;
          case 'salario_base':
          default: return ctx.salarioBase;
        }
      };

      // Compute adicional value: respects modo_calculo (fixo/percentual) and base_calculo
      // ATENÇÃO: NÃO arredondar aqui — propaga erro de centavos. Arredondamento só nos totais finais.
      const computeAdicional = (a: any, salarioBase: number) => {
        if (a.modo_calculo === 'percentual') {
          const pct = Number(a.percentual) || 0;
          // Adicionais entram ANTES do bruto, então só faz sentido base = salario_base
          const base = resolveBase(a.base_calculo, { salarioBase, bruto: salarioBase, liquido: salarioBase });
          return base * pct / 100;
        }
        return Number(a.valor) || 0;
      };

      // Compute desconto value: respects modo_calculo (fixo/percentual) and base_calculo
      // Base 'liquido' bloqueada no cadastro; aqui mantemos fallback defensivo apenas.
      const computeDesconto = (d: any, ctx: { salarioBase: number; bruto: number }) => {
        if (d.modo_calculo === 'percentual') {
          const pct = Number(d.percentual) || 0;
          const base = resolveBase(d.base_calculo, { ...ctx, liquido: ctx.bruto });
          return base * pct / 100;
        }
        // Legacy support: is_percentual flag on fixo mode
        if (d.is_percentual) {
          return ctx.bruto * Number(d.valor) / 100;
        }
        return Number(d.valor) || 0;
      };

      // Build records
      const records = colaboradores.map((col: any) => {
        const salarioBase = Number(col.salario_base) || 0;

        if (isPadrao02) {
          const liquido = salarioBase;
          const encargosColab = encargosData.filter(
            (e: any) => e.escopo === 'global' || e.colaborador_id === col.id
          );
          const somaPercentuais = encargosColab.reduce((s: number, e: any) => s + Number(e.percentual), 0);
          const totalEncargos = liquido * (somaPercentuais / 100);
          const bruto = liquido + totalEncargos;

          return {
            colaborador_id: col.id,
            nome: col.nome,
            cpf: col.cpf,
            funcao: (col.funcoes as any)?.nome || '',
            secretaria: (col.secretarias as any)?.nome || '',
            lotacao: (col.lotacoes as any)?.nome || '',
            salario_base: roundMoney(salarioBase),
            total_adicionais: 0,
            total_descontos: 0,
            total_encargos: roundMoney(totalEncargos),
            bruto: roundMoney(bruto),
            liquido: roundMoney(liquido),
            mes,
            ano,
            status: 'rascunho',
            unidade_id: unidadeId,
          };
        }

        // Padrão 01 — ordem: Base → Adicionais → Bruto → Descontos → Líquido
        const adicionaisCol = (adicionais || []).filter(
          (a: any) => ((a.escopo === 'global' && !a.colaborador_id) || a.colaborador_id === col.id) && isAdicionalVigente(a)
        );
        const totalAdicionais = adicionaisCol.reduce(
          (s: number, a: any) => s + computeAdicional(a, salarioBase), 0
        );

        const bruto = salarioBase + totalAdicionais;

        const descontosInd = (descontos || []).filter(
          (d: any) => (d.escopo === 'individual' || d.escopo === 'grupo') && d.colaborador_id === col.id && isDescontoVigente(d)
        );

        let totalDescontos = 0;
        descontosInd.forEach((d: any) => {
          totalDescontos += computeDesconto(d, { salarioBase, bruto });
        });
        descontosGlobais.forEach((d: any) => {
          totalDescontos += computeDesconto(d, { salarioBase, bruto });
        });

        const liquido = bruto - totalDescontos;

        return {
          colaborador_id: col.id,
          nome: col.nome,
          cpf: col.cpf,
          funcao: (col.funcoes as any)?.nome || '',
          secretaria: (col.secretarias as any)?.nome || '',
          lotacao: (col.lotacoes as any)?.nome || '',
          salario_base: roundMoney(salarioBase),
          total_adicionais: roundMoney(totalAdicionais),
          total_descontos: roundMoney(totalDescontos),
          total_encargos: 0,
          bruto: roundMoney(bruto),
          liquido: roundMoney(liquido),
          mes,
          ano,
          status: 'rascunho',
          unidade_id: unidadeId,
        };
      });

      // Delete existing drafts for the colaboradores being generated
      if (selectedSecretariaId) {
        // Delete by colaborador_id to avoid constraint violations
        const colIds = colaboradores.map((c: any) => c.id);
        const DEL_BATCH = 100;
        for (let i = 0; i < colIds.length; i += DEL_BATCH) {
          const batch = colIds.slice(i, i + DEL_BATCH);
          await supabase
            .from('folha_processamento')
            .delete()
            .eq('mes', mes)
            .eq('ano', ano)
            .eq('status', 'rascunho')
            .eq('unidade_id', unidadeId!)
            .in('colaborador_id', batch);
        }
      } else {
        await supabase
          .from('folha_processamento')
          .delete()
          .eq('mes', mes)
          .eq('ano', ano)
          .eq('status', 'rascunho')
          .eq('unidade_id', unidadeId!);
      }

      const BATCH = 500;
      for (let i = 0; i < records.length; i += BATCH) {
        const batch = records.slice(i, i + BATCH);
        const { error } = await supabase.from('folha_processamento').insert(batch);
        if (error) throw error;
      }

      return records.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['folha-processamento'] });
      const secLabel = generateSecretaria !== 'all' ? ` (${secretariasList.find((s: any) => s.id === generateSecretaria)?.nome || 'Secretaria'})` : '';
      toast({ title: 'Folha gerada', description: `${count} registros gerados para ${getMonthLabel(mes)}/${ano}${secLabel}.` });
      registrarLog({ tipo: 'sucesso', categoria: 'folha', descricao: `Folha rascunho gerada: ${count} registros para ${getMonthLabel(mes)}/${ano}${secLabel}`, unidadeId });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao gerar folha', description: err.message, variant: 'destructive' });
    },
  });

  // Finalize (process) the draft
  const finalizeMutation = useMutation({
    mutationFn: async () => {
      const selectedSecretariaId = generateSecretaria !== 'all' ? generateSecretaria : null;
      const secNome = selectedSecretariaId ? secretariasList.find((s: any) => s.id === selectedSecretariaId)?.nome || '' : '';

      // Update status to 'processado' — scoped by secretaria if selected
      let updateQuery = supabase
        .from('folha_processamento')
        .update({ status: 'processado', updated_at: new Date().toISOString() })
        .eq('mes', mes)
        .eq('ano', ano)
        .eq('status', 'rascunho')
        .eq('unidade_id', unidadeId!);
      if (selectedSecretariaId && secNome) {
        updateQuery = updateQuery.eq('secretaria', secNome);
      }
      const { error } = await updateQuery;
      if (error) throw error;

      const { data: unidade } = await supabase
        .from('unidades_folha')
        .select('nome')
        .eq('id', unidadeId!)
        .single();
      const prefeituraName = unidade?.nome || '';

      // Delete existing payroll_records for this scope
      let delPayroll = supabase
        .from('payroll_records')
        .delete()
        .eq('mes', mes)
        .eq('ano', ano)
        .eq('unidade_id', unidadeId!);
      if (selectedSecretariaId && secNome) {
        delPayroll = delPayroll.eq('pasta', secNome);
      }
      await delPayroll;

      // Fetch the just-processed records
      let processedQuery = supabase
        .from('folha_processamento')
        .select('*')
        .eq('mes', mes)
        .eq('ano', ano)
        .eq('status', 'processado')
        .eq('unidade_id', unidadeId!);
      if (selectedSecretariaId && secNome) {
        processedQuery = processedQuery.eq('secretaria', secNome);
      }
      const { data: processed } = await processedQuery;

      if (processed && processed.length > 0) {
        const payrollRows = processed.map((r: any) => ({
          nome: r.nome,
          cpf: r.cpf,
          funcao: r.funcao || '',
          pasta: r.secretaria || '',
          prefeitura: prefeituraName,
          bruto: r.bruto,
          liquido: r.liquido,
          mes: r.mes,
          ano: r.ano,
          unidade_id: r.unidade_id,
        }));

        const BATCH = 500;
        for (let i = 0; i < payrollRows.length; i += BATCH) {
          const batch = payrollRows.slice(i, i + BATCH);
          const { error: insErr } = await supabase.from('payroll_records').insert(batch);
          if (insErr) throw insErr;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folha-processamento'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-records'] });
      queryClient.invalidateQueries({ queryKey: ['processed-info'] });
      setConfirmDialogOpen(false);
      const secLabel = generateSecretaria !== 'all' ? ` — ${secretariasList.find((s: any) => s.id === generateSecretaria)?.nome || 'Secretaria'}` : '';
      toast({ title: 'Folha processada', description: `Folha de ${getMonthLabel(mes)}/${ano}${secLabel} finalizada e enviada para autorização de pagamento.` });
      registrarLog({ tipo: 'sucesso', categoria: 'folha', descricao: `Folha finalizada: ${getMonthLabel(mes)}/${ano}${secLabel}`, unidadeId });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao processar', description: err.message, variant: 'destructive' });
    },
  });

  const isDraft = folha.length > 0;

  // Dependent filter options: each dropdown shows only values compatible with the OTHER active filter
  const folhaForSecretarias = folha.filter((r: any) =>
    filterFuncao === 'all' || (filterFuncao === '__pending__' ? !r.funcao : r.funcao === filterFuncao)
  );
  const folhaForFuncoes = folha.filter((r: any) =>
    filterSecretaria === 'all' || (filterSecretaria === '__pending__' ? !r.secretaria : r.secretaria === filterSecretaria)
  );
  const secretariasUnicas = [...new Set(folhaForSecretarias.map((r: any) => r.secretaria).filter(Boolean))].sort();
  const funcoesUnicas = [...new Set(folhaForFuncoes.map((r: any) => r.funcao).filter(Boolean))].sort();
  const hasPendingSecretaria = folhaForSecretarias.some((r: any) => !r.secretaria);
  const hasPendingFuncao = folhaForFuncoes.some((r: any) => !r.funcao);

  // Filtered + paginated
  const filtered = folha.filter((r: any) => {
    const matchSearch = !search || r.nome?.toLowerCase().includes(search.toLowerCase()) || r.cpf?.includes(search);
    const matchSecretaria = filterSecretaria === 'all'
      || (filterSecretaria === '__pending__' ? !r.secretaria : r.secretaria === filterSecretaria);
    const matchFuncao = filterFuncao === 'all'
      || (filterFuncao === '__pending__' ? !r.funcao : r.funcao === filterFuncao);
    const valorRef = Number(r.liquido);
    const matchValorMin = !filterValorMin || valorRef >= Number(filterValorMin);
    const matchValorMax = !filterValorMax || valorRef <= Number(filterValorMax);
    return matchSearch && matchSecretaria && matchFuncao && matchValorMin && matchValorMax;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Totals based on filtered data
  const hasActiveFilter = search || filterSecretaria !== 'all' || filterFuncao !== 'all' || filterValorMin || filterValorMax;
  const dataForTotals = hasActiveFilter ? filtered : folha;
  const totalBruto = dataForTotals.reduce((s: number, r: any) => s + Number(r.bruto), 0);
  const totalLiquido = dataForTotals.reduce((s: number, r: any) => s + Number(r.liquido), 0);
  const totalAdicionais = dataForTotals.reduce((s: number, r: any) => s + Number(r.total_adicionais), 0);
  const totalDescontos = dataForTotals.reduce((s: number, r: any) => s + Number(r.total_descontos), 0);
  const totalEncargos = dataForTotals.reduce((s: number, r: any) => s + Number(r.total_encargos || 0), 0);

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Folha em Processamento</h1>
            <p className="text-sm text-muted-foreground">Rascunho da folha de pagamento para conferência antes do fechamento</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select 
              value={`${mes}-${ano}`} 
              onValueChange={(v) => { 
                const [m, y] = v.split('-').map(Number); 
                setMes(m); 
                setAno(y); 
                setPage(0); 
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {competencias.map((c) => (
                  <SelectItem key={`${c.mes}-${c.ano}`} value={`${c.mes}-${c.ano}`}>
                    {getMonthLabel(c.mes)}/{c.ano}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Show buttons only when NOT processed */}
            {!isSelectedMonthProcessed && (
              <>
                <Select value={generateSecretaria} onValueChange={setGenerateSecretaria}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Todas secretarias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas secretarias</SelectItem>
                    {secretariasList.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {folha.length > 0 ? (
                  <>
                    <Button disabled variant="outline" className="bg-green-600/10 text-green-700 border-green-600 cursor-default hover:bg-green-600/10">
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Folha Gerada
                    </Button>
                    <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending} variant="outline" size="sm">
                      {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                      {generateSecretaria !== 'all' ? 'Gerar Secretaria' : 'Regerar'}
                    </Button>
                    <Button onClick={() => setConfirmDialogOpen(true)} className="bg-green-600 hover:bg-green-700 text-white">
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Processar
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
                    {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                    Gerar Folha
                  </Button>
                )}
                {folha.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const dataToExport = hasActiveFilter ? filtered : folha;
                      const cols = isPadrao02
                        ? [
                            { header: 'Nome', key: 'nome' },
                            { header: 'CPF', key: 'cpf' },
                            { header: 'Função', key: 'funcao' },
                            { header: 'Secretaria', key: 'secretaria' },
                            { header: 'Sal. Base', key: 'salario_base_fmt', align: 'right' as const },
                            { header: 'Encargos', key: 'encargos_fmt', align: 'right' as const },
                            { header: 'Bruto', key: 'bruto_fmt', align: 'right' as const },
                            { header: 'Líquido', key: 'liquido_fmt', align: 'right' as const },
                          ]
                        : [
                            { header: 'Nome', key: 'nome' },
                            { header: 'CPF', key: 'cpf' },
                            { header: 'Função', key: 'funcao' },
                            { header: 'Secretaria', key: 'secretaria' },
                            { header: 'Sal. Base', key: 'salario_base_fmt', align: 'right' as const },
                            { header: 'Adicionais', key: 'adicionais_fmt', align: 'right' as const },
                            { header: 'Descontos', key: 'descontos_fmt', align: 'right' as const },
                            { header: 'Bruto', key: 'bruto_fmt', align: 'right' as const },
                            { header: 'Líquido', key: 'liquido_fmt', align: 'right' as const },
                          ];
                      const rows = dataToExport.map((r: any) => ({
                        ...r,
                        salario_base_fmt: formatCurrency(Number(r.salario_base)),
                        adicionais_fmt: formatCurrency(Number(r.total_adicionais)),
                        descontos_fmt: formatCurrency(Number(r.total_descontos)),
                        encargos_fmt: formatCurrency(Number(r.total_encargos || 0)),
                        bruto_fmt: formatCurrency(Number(r.bruto)),
                        liquido_fmt: formatCurrency(Number(r.liquido)),
                      }));
                      exportToPDF({
                        title: `Folha em Processamento — ${getMonthLabel(mes)}/${ano}`,
                        subtitle: hasActiveFilter ? `Filtrado: ${dataToExport.length} de ${folha.length} colaboradores` : `${dataToExport.length} colaboradores`,
                        columns: cols,
                        data: rows,
                        fileName: `folha_processamento_${mes}_${ano}`,
                      });
                    }}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    PDF
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* PROCESSED INFO PANEL */}
        {isSelectedMonthProcessed && processedInfo && (
          <Card className="border-green-300 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-green-100 dark:bg-green-900 p-2">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                      Folha de {getMonthLabel(mes)}/{ano} — {processedInfo.status === 'liberado' ? 'Liberada para Pagamento' : 'Processada e Enviada para Autorização'}
                    </h3>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      {processedInfo.status === 'liberado' 
                        ? 'Esta folha já foi autorizada e liberada para pagamento.'
                        : 'Esta folha foi processada e está aguardando autorização de pagamento na etapa "Folha Processada".'}
                    </p>
                  </div>
                  <div className={cn("grid gap-4", isPadrao02 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-5")}>
                    <div>
                      <p className="text-xs text-green-600 dark:text-green-400 font-medium">Colaboradores</p>
                      <p className="text-xl font-bold text-green-800 dark:text-green-200">{processedInfo.totalColab}</p>
                    </div>
                    {isPadrao02 ? (
                      <>
                        <div>
                          <p className="text-xs text-green-600 dark:text-green-400 font-medium">Total Líquido</p>
                          <p className="text-xl font-bold text-green-800 dark:text-green-200">{formatCurrency(processedInfo.totalLiquido)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-green-600 dark:text-green-400 font-medium">Total Encargos</p>
                          <p className="text-xl font-bold text-green-800 dark:text-green-200">{formatCurrency(processedInfo.totalEncargos)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-green-600 dark:text-green-400 font-medium">Total Bruto</p>
                          <p className="text-xl font-bold text-green-800 dark:text-green-200">{formatCurrency(processedInfo.totalBruto)}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <p className="text-xs text-green-600 dark:text-green-400 font-medium">Total Bruto</p>
                          <p className="text-xl font-bold text-green-800 dark:text-green-200">{formatCurrency(processedInfo.totalBruto)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-green-600 dark:text-green-400 font-medium">Adicionais</p>
                          <p className="text-xl font-bold text-green-800 dark:text-green-200">{formatCurrency(processedInfo.totalAdicionais)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-green-600 dark:text-green-400 font-medium">Descontos</p>
                          <p className="text-xl font-bold text-green-800 dark:text-green-200">{formatCurrency(processedInfo.totalDescontos)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-green-600 dark:text-green-400 font-medium">Total Líquido</p>
                          <p className="text-xl font-bold text-green-800 dark:text-green-200">{formatCurrency(processedInfo.totalLiquido)}</p>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                    <Info className="h-3 w-3" />
                    <span>Processada em {formatDate(processedInfo.updatedAt)}</span>
                    <span className="mx-2">•</span>
                    <Badge variant="outline" className={cn(
                      "text-xs",
                      processedInfo.status === 'liberado' 
                        ? "border-blue-400 text-blue-700 bg-blue-50 dark:bg-blue-950 dark:text-blue-300" 
                        : "border-green-400 text-green-700 bg-green-100 dark:bg-green-900 dark:text-green-300"
                    )}>
                      {processedInfo.status === 'liberado' ? 'Liberada' : 'Processada'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Draft content - only show when NOT processed */}
        {!isSelectedMonthProcessed && (
          <>
            {/* Summary cards */}
            {folha.length > 0 && (
              <div className={cn("grid gap-3", isPadrao02 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-5")}>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">Colaboradores{hasActiveFilter ? ' (filtrados)' : ''}</p>
                     <p className="text-lg font-bold text-foreground">{hasActiveFilter ? `${filtered.length} / ${folha.length}` : folha.length}</p>
                  </CardContent>
                </Card>
                {isPadrao02 ? (
                  <>
                    <Card>
                      <CardContent className="p-3 text-center">
                        <p className="text-xs text-muted-foreground">Total Líquido</p>
                        <p className="text-lg font-bold text-primary">{formatCurrency(totalLiquido)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 text-center">
                        <p className="text-xs text-muted-foreground">Total Encargos</p>
                        <p className="text-lg font-bold text-amber-600">{formatCurrency(totalEncargos)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 text-center">
                        <p className="text-xs text-muted-foreground">Total Bruto</p>
                        <p className="text-lg font-bold text-foreground">{formatCurrency(totalBruto)}</p>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <>
                    <Card>
                      <CardContent className="p-3 text-center">
                        <p className="text-xs text-muted-foreground">Total Bruto</p>
                        <p className="text-lg font-bold text-foreground">{formatCurrency(totalBruto)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 text-center">
                        <p className="text-xs text-muted-foreground">Adicionais</p>
                        <p className="text-lg font-bold text-green-600">{formatCurrency(totalAdicionais)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 text-center">
                        <p className="text-xs text-muted-foreground">Descontos</p>
                        <p className="text-lg font-bold text-destructive">{formatCurrency(totalDescontos)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 text-center">
                        <p className="text-xs text-muted-foreground">Total Líquido</p>
                        <p className="text-lg font-bold text-primary">{formatCurrency(totalLiquido)}</p>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            )}

            {/* Status badge */}
            {folha.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-300">
                  <FileText className="h-3 w-3 mr-1" /> Rascunho — {getMonthLabel(mes)}/{ano}
                </Badge>
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap items-end gap-3">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nome ou CPF..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                  className="pl-9"
                />
              </div>
              <div className="w-full sm:w-48">
                <Select value={filterSecretaria} onValueChange={(v) => { setFilterSecretaria(v); setPage(0); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Secretaria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas Secretarias</SelectItem>
                    {hasPendingSecretaria && (
                      <SelectItem value="__pending__" className="text-destructive font-medium">⚠ Pendente de vinculação</SelectItem>
                    )}
                    {secretariasUnicas.map((s: string) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-48">
                <Select value={filterFuncao} onValueChange={(v) => { setFilterFuncao(v); setPage(0); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Função" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas Funções</SelectItem>
                    {hasPendingFuncao && (
                      <SelectItem value="__pending__" className="text-destructive font-medium">⚠ Pendente de vinculação</SelectItem>
                    )}
                    {funcoesUnicas.map((f: string) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Valor mín"
                  value={filterValorMin}
                  onChange={(e) => { setFilterValorMin(e.target.value); setPage(0); }}
                  className="w-28"
                />
                <span className="text-muted-foreground text-sm">a</span>
                <Input
                  type="number"
                  placeholder="Valor máx"
                  value={filterValorMax}
                  onChange={(e) => { setFilterValorMax(e.target.value); setPage(0); }}
                  className="w-28"
                />
              </div>
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : folha.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-muted-foreground">Nenhuma folha gerada para {getMonthLabel(mes)}/{ano}.</p>
                  <p className="text-sm text-muted-foreground mt-1">Clique em "Gerar Folha" para criar o rascunho.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="rounded-md border overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead className="hidden md:table-cell">CPF</TableHead>
                        <TableHead className="hidden lg:table-cell">Função</TableHead>
                        <TableHead className="hidden lg:table-cell">Secretaria</TableHead>
                        {isPadrao02 ? (
                          <>
                            <TableHead className="text-right">Líquido</TableHead>
                            <TableHead className="text-right">Encargos</TableHead>
                            <TableHead className="text-right">Bruto</TableHead>
                          </>
                        ) : (
                          <>
                            <TableHead className="text-right">Base</TableHead>
                            <TableHead className="text-right">Adicionais</TableHead>
                            <TableHead className="text-right">Bruto</TableHead>
                            <TableHead className="text-right">Descontos</TableHead>
                            <TableHead className="text-right">Líquido</TableHead>
                          </>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paged.map((r: any) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.nome}</TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">{r.cpf}</TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground">{r.funcao || '—'}</TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground">{r.secretaria || '—'}</TableCell>
                          {isPadrao02 ? (
                            <>
                              <TableCell className="text-right font-bold text-primary">{formatCurrency(Number(r.liquido))}</TableCell>
                              <TableCell className="text-right text-amber-600">{formatCurrency(Number(r.total_encargos || 0))}</TableCell>
                              <TableCell className="text-right font-medium">{formatCurrency(Number(r.bruto))}</TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell className="text-right">{formatCurrency(Number(r.salario_base))}</TableCell>
                              <TableCell className="text-right text-green-600">{formatCurrency(Number(r.total_adicionais))}</TableCell>
                              <TableCell className="text-right font-medium">{formatCurrency(Number(r.bruto))}</TableCell>
                              <TableCell className="text-right text-destructive">{formatCurrency(Number(r.total_descontos))}</TableCell>
                              <TableCell className="text-right font-bold text-primary">{formatCurrency(Number(r.liquido))}</TableCell>
                            </>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{filtered.length} registros</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setPage(p => p - 1)} disabled={page === 0}>Anterior</Button>
                      <span className="flex items-center px-2">{page + 1} / {totalPages}</span>
                      <Button size="sm" variant="outline" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>Próximo</Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Confirm processing dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Processar Folha de {getMonthLabel(mes)}/{ano}
              {generateSecretaria !== 'all' ? ` — ${secretariasList.find((s: any) => s.id === generateSecretaria)?.nome || ''}` : ''}?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {generateSecretaria !== 'all'
              ? 'Ao processar, os rascunhos desta secretaria serão finalizados e enviados para autorização de pagamento. Os rascunhos das demais secretarias permanecerão inalterados.'
              : 'Ao processar, a folha será marcada como finalizada e enviada para autorização de pagamento. Tem certeza que deseja continuar?'}
          </p>
          <p className="text-sm font-medium mt-2">
            {generateSecretaria !== 'all'
              ? `${folha.filter((r: any) => r.secretaria === (secretariasList.find((s: any) => s.id === generateSecretaria)?.nome || '')).length} colaboradores`
              : `${folha.length} colaboradores`} — Total líquido: {generateSecretaria !== 'all'
              ? formatCurrency(folha.filter((r: any) => r.secretaria === (secretariasList.find((s: any) => s.id === generateSecretaria)?.nome || '')).reduce((s: number, r: any) => s + Number(r.liquido), 0))
              : formatCurrency(totalLiquido)}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => finalizeMutation.mutate()}
              disabled={finalizeMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {finalizeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              Confirmar Processamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default FolhaProcessamento;
