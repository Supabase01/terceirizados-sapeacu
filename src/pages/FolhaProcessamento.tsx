import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { registrarLog } from '@/lib/logSistema';
import { useUnidade } from '@/contexts/UnidadeContext';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Search, CheckCircle2, Loader2, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const currentDate = new Date();
const defaultMes = currentDate.getMonth() + 1;
const defaultAno = currentDate.getFullYear();

const PAGE_SIZE = 20;

const formatCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const getMonthLabel = (m: number) =>
  ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][m - 1] || '';

const FolhaProcessamento = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { unidadeId, unidadePadrao } = useUnidade();
  const isPadrao02 = unidadePadrao === 'padrao_02';
  const [mes, setMes] = useState(defaultMes);
  const [ano, setAno] = useState(defaultAno);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Fetch draft payroll for selected period
  const { data: folha = [], isLoading, refetch } = useQuery({
    queryKey: ['folha-processamento', mes, ano, unidadeId],
    queryFn: async () => {
      let query = supabase
        .from('folha_processamento')
        .select('*')
        .eq('mes', mes)
        .eq('ano', ano)
        .order('nome', { ascending: true });
      if (unidadeId) query = query.eq('unidade_id', unidadeId);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!unidadeId,
  });

  // Generate/regenerate draft
  const generateMutation = useMutation({
    mutationFn: async () => {
      // 1. Load active colaboradores with joins
      const { data: colaboradores, error: colErr } = await supabase
        .from('colaboradores')
        .select('*, secretarias(nome), funcoes(nome), lotacoes(nome)')
        .eq('ativo', true)
        .eq('unidade_id', unidadeId!);
      if (colErr) throw colErr;
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

      // Helper: check if adicional is valid for the period
      const isAdicionalVigente = (a: any) => {
        const inicio = (a.ano ?? 0) * 100 + (a.mes ?? 0);
        const fim = (a.ano_fim ?? 9999) * 100 + (a.mes_fim ?? 12);
        const current = ano * 100 + mes;
        if (a.tipo === 'fixo') {
          if (!a.ano && !a.mes) return true;
          return current >= inicio && current <= fim;
        }
        if (!a.ano && !a.mes) return false;
        return current >= inicio && current <= fim;
      };

      // Helper: check if desconto applies
      const isDescontoVigente = (d: any) => {
        if (d.mes && d.ano) return d.mes === mes && d.ano === ano;
        return true;
      };

      // Global descontos
      const descontosGlobais = (descontos || []).filter(
        (d: any) => d.escopo === 'global' && isDescontoVigente(d)
      );

      // Build records
      const records = colaboradores.map((col: any) => {
        const salarioBase = Number(col.salario_base) || 0;

        if (isPadrao02) {
          // Padrão 02: salario_base = líquido cadastrado
          const liquido = salarioBase;
          // Encargos: global + individual for this collaborator
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
            salario_base: salarioBase,
            total_adicionais: 0,
            total_descontos: 0,
            total_encargos: totalEncargos,
            bruto,
            liquido,
            mes,
            ano,
            status: 'rascunho',
            unidade_id: unidadeId,
          };
        }

        // Padrão 01: comportamento original
        const adicionaisCol = (adicionais || []).filter(
          (a: any) => a.colaborador_id === col.id && isAdicionalVigente(a)
        );
        const totalAdicionais = adicionaisCol.reduce((s: number, a: any) => s + Number(a.valor), 0);

        const descontosInd = (descontos || []).filter(
          (d: any) => d.escopo === 'individual' && d.colaborador_id === col.id && isDescontoVigente(d)
        );

        let totalDescontos = 0;
        descontosInd.forEach((d: any) => {
          if (d.is_percentual) {
            totalDescontos += (salarioBase + totalAdicionais) * Number(d.valor) / 100;
          } else {
            totalDescontos += Number(d.valor);
          }
        });
        descontosGlobais.forEach((d: any) => {
          if (d.is_percentual) {
            totalDescontos += (salarioBase + totalAdicionais) * Number(d.valor) / 100;
          } else {
            totalDescontos += Number(d.valor);
          }
        });

        const bruto = salarioBase + totalAdicionais;
        const liquido = bruto - totalDescontos;

        return {
          colaborador_id: col.id,
          nome: col.nome,
          cpf: col.cpf,
          funcao: (col.funcoes as any)?.nome || '',
          secretaria: (col.secretarias as any)?.nome || '',
          lotacao: (col.lotacoes as any)?.nome || '',
          salario_base: salarioBase,
          total_adicionais: totalAdicionais,
          total_descontos: totalDescontos,
          total_encargos: 0,
          bruto,
          liquido,
          mes,
          ano,
          status: 'rascunho',
          unidade_id: unidadeId,
        };
      });

      // Delete existing drafts for this period, then insert
      await supabase
        .from('folha_processamento')
        .delete()
        .eq('mes', mes)
        .eq('ano', ano)
        .eq('status', 'rascunho')
        .eq('unidade_id', unidadeId!);

      // Insert in batches
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
      toast({ title: 'Folha gerada', description: `${count} registros gerados para ${getMonthLabel(mes)}/${ano}.` });
      registrarLog({ tipo: 'sucesso', categoria: 'folha', descricao: `Folha rascunho gerada: ${count} registros para ${getMonthLabel(mes)}/${ano}`, unidadeId });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao gerar folha', description: err.message, variant: 'destructive' });
    },
  });

  // Finalize (process) the draft
  const finalizeMutation = useMutation({
    mutationFn: async () => {
      // 1. Mark as processed
      const { error } = await supabase
        .from('folha_processamento')
        .update({ status: 'processado', updated_at: new Date().toISOString() })
        .eq('mes', mes)
        .eq('ano', ano)
        .eq('status', 'rascunho')
        .eq('unidade_id', unidadeId!);
      if (error) throw error;

      // 2. Get unit name for prefeitura field
      const { data: unidade } = await supabase
        .from('unidades_folha')
        .select('nome')
        .eq('id', unidadeId!)
        .single();
      const prefeituraName = unidade?.nome || '';

      // 3. Delete previous payroll_records for same period/unit
      await supabase
        .from('payroll_records')
        .delete()
        .eq('mes', mes)
        .eq('ano', ano)
        .eq('unidade_id', unidadeId!);

      // 4. Load processed records and insert into payroll_records
      const { data: processed } = await supabase
        .from('folha_processamento')
        .select('*')
        .eq('mes', mes)
        .eq('ano', ano)
        .eq('status', 'processado')
        .eq('unidade_id', unidadeId!);

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
      setConfirmDialogOpen(false);
      toast({ title: 'Folha processada', description: `Folha de ${getMonthLabel(mes)}/${ano} finalizada e registros enviados para relatórios.` });
      registrarLog({ tipo: 'sucesso', categoria: 'folha', descricao: `Folha finalizada: ${getMonthLabel(mes)}/${ano}`, unidadeId });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao processar', description: err.message, variant: 'destructive' });
    },
  });

  // Auto-generate on first load if no records exist
  useEffect(() => {
    if (!isLoading && folha.length === 0 && !generateMutation.isPending) {
      // Don't auto-generate, just show empty state
    }
  }, [isLoading, folha.length]);

  const isDraft = folha.length > 0 && folha[0]?.status === 'rascunho';
  const isProcessed = folha.length > 0 && folha[0]?.status === 'processado';

  // Filtered + paginated
  const filtered = folha.filter((r: any) =>
    r.nome?.toLowerCase().includes(search.toLowerCase()) ||
    r.cpf?.includes(search)
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Totals
  const totalBruto = folha.reduce((s: number, r: any) => s + Number(r.bruto), 0);
  const totalLiquido = folha.reduce((s: number, r: any) => s + Number(r.liquido), 0);
  const totalAdicionais = folha.reduce((s: number, r: any) => s + Number(r.total_adicionais), 0);
  const totalDescontos = folha.reduce((s: number, r: any) => s + Number(r.total_descontos), 0);
  const totalEncargos = folha.reduce((s: number, r: any) => s + Number(r.total_encargos || 0), 0);

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Folha em Processamento</h1>
            <p className="text-sm text-muted-foreground">Rascunho da folha de pagamento para conferência antes do fechamento</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={String(mes)} onValueChange={(v) => { setMes(Number(v)); setPage(0); }}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{getMonthLabel(i + 1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(ano)} onValueChange={(v) => { setAno(Number(v)); setPage(0); }}>
              <SelectTrigger className="w-[90px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026, 2027].map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending || isProcessed}
              variant={folha.length > 0 ? 'outline' : 'default'}
            >
              {generateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              {folha.length > 0 ? 'Regerar' : 'Gerar Folha'}
            </Button>
            {isDraft && folha.length > 0 && (
              <Button onClick={() => setConfirmDialogOpen(true)} className="bg-green-600 hover:bg-green-700 text-white">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Processar
              </Button>
            )}
          </div>
        </div>

        {/* Summary cards */}
        {folha.length > 0 && (
          <div className={cn("grid gap-3", isPadrao02 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-5")}>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Colaboradores</p>
                <p className="text-lg font-bold text-foreground">{folha.length}</p>
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
            {isDraft ? (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-300">
                <FileText className="h-3 w-3 mr-1" /> Rascunho — {getMonthLabel(mes)}/{ano}
              </Badge>
            ) : (
              <Badge className="bg-green-100 text-green-800 border-green-300">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Processada — {getMonthLabel(mes)}/{ano}
              </Badge>
            )}
          </div>
        )}

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou CPF..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9"
          />
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
                    <TableHead className="text-right">Base</TableHead>
                    <TableHead className="text-right">Adicionais</TableHead>
                    <TableHead className="text-right">Bruto</TableHead>
                    <TableHead className="text-right">Descontos</TableHead>
                    <TableHead className="text-right">Líquido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.nome}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{r.cpf}</TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">{r.funcao || '—'}</TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">{r.secretaria || '—'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(r.salario_base))}</TableCell>
                      <TableCell className="text-right text-green-600">{formatCurrency(Number(r.total_adicionais))}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(Number(r.bruto))}</TableCell>
                      <TableCell className="text-right text-destructive">{formatCurrency(Number(r.total_descontos))}</TableCell>
                      <TableCell className="text-right font-bold text-primary">{formatCurrency(Number(r.liquido))}</TableCell>
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
      </div>

      {/* Confirm processing dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Processar Folha de {getMonthLabel(mes)}/{ano}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Ao processar, a folha será marcada como finalizada. Tem certeza que deseja continuar?
          </p>
          <p className="text-sm font-medium mt-2">
            {folha.length} colaboradores — Total líquido: {formatCurrency(totalLiquido)}
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
