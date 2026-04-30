import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnidade } from '@/contexts/UnidadeContext';
import { useToast } from '@/hooks/use-toast';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/SearchableSelect';
import { Loader2, Receipt, Download, User2, Users } from 'lucide-react';
import ContrachequeDetalhado from '@/components/ContrachequeDetalhado';
import { downloadMultipleContracheques, downloadColetivoContracheques } from '@/lib/contrachequePdf';

const monthName = (m: number) =>
  ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][m-1] || '';

const formatBRL = (v: number) =>
  (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const MESES = Array.from({ length: 12 }, (_, i) => ({ v: i + 1, n: monthName(i + 1) }));
const currentYear = new Date().getFullYear();
const ANOS = Array.from({ length: 6 }, (_, i) => currentYear - 3 + i);

const RelatorioContracheque = () => {
  const { unidadeId, unidadePadrao } = useUnidade();
  const isPadrao02 = unidadePadrao === 'padrao_02';
  const { toast } = useToast();

  // ---- Individual ----
  const [colaboradorId, setColaboradorId] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRegistro, setPreviewRegistro] = useState<any | null>(null);

  // ---- Coletivo ----
  const now = new Date();
  const [mes, setMes] = useState<number>(now.getMonth() + 1);
  const [ano, setAno] = useState<number>(now.getFullYear());
  const [secretariaFilter, setSecretariaFilter] = useState<string>('todas');
  const [lotacaoFilter, setLotacaoFilter] = useState<string>('todas');
  const [funcaoFilter, setFuncaoFilter] = useState<string>('todas');
  const [generatingColetivo, setGeneratingColetivo] = useState(false);

  // ===== Queries comuns =====
  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores-contracheque', unidadeId],
    queryFn: async () => {
      const PAGE = 1000;
      let all: any[] = [];
      let from = 0;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from('colaboradores')
          .select('id, nome, cpf, matricula')
          .eq('unidade_id', unidadeId!)
          .eq('ativo', true)
          .order('nome')
          .range(from, from + PAGE - 1);
        if (error) throw error;
        all = all.concat(data || []);
        hasMore = (data?.length ?? 0) === PAGE;
        from += PAGE;
      }
      return all;
    },
    enabled: !!unidadeId,
  });

  // ===== Individual: registros do colaborador =====
  const { data: registros = [], isLoading } = useQuery({
    queryKey: ['contracheques-colaborador', colaboradorId, unidadeId],
    queryFn: async () => {
      const PAGE = 1000;
      let all: any[] = [];
      let from = 0;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from('folha_processamento')
          .select('*')
          .eq('unidade_id', unidadeId!)
          .eq('colaborador_id', colaboradorId)
          .in('status', ['processado', 'liberado'])
          .order('ano', { ascending: false })
          .order('mes', { ascending: false })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        all = all.concat(data || []);
        hasMore = (data?.length ?? 0) === PAGE;
        from += PAGE;
      }
      return all;
    },
    enabled: !!unidadeId && !!colaboradorId,
  });

  // ===== Coletivo: opções de filtro (tabelas mestras) =====
  const { data: filtrosOpts = { secretarias: [], lotacoes: [], funcoes: [] } } = useQuery({
    queryKey: ['filtros-coletivo', unidadeId],
    queryFn: async () => {
      const [secs, lots, funs] = await Promise.all([
        supabase.from('secretarias').select('nome').eq('unidade_id', unidadeId!).eq('ativo', true).order('nome'),
        supabase.from('lotacoes').select('nome').eq('unidade_id', unidadeId!).eq('ativo', true).order('nome'),
        supabase.from('funcoes').select('nome').eq('unidade_id', unidadeId!).eq('ativo', true).order('nome'),
      ]);
      return {
        secretarias: (secs.data || []).map((s: any) => s.nome),
        lotacoes: (lots.data || []).map((s: any) => s.nome),
        funcoes: (funs.data || []).map((s: any) => s.nome),
      };
    },
    enabled: !!unidadeId,
  });

  // ===== Coletivo: folha do mês =====
  const colaboradoresKey = colaboradores.length;
  const { data: folhaColetivo = [], isLoading: loadingColetivo } = useQuery({
    queryKey: ['folha-coletivo', unidadeId, mes, ano, colaboradoresKey],
    queryFn: async () => {
      const PAGE = 1000;
      let all: any[] = [];
      let from = 0;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from('folha_processamento')
          .select('*')
          .eq('unidade_id', unidadeId!)
          .eq('mes', mes)
          .eq('ano', ano)
          .in('status', ['processado', 'liberado'])
          .order('nome')
          .range(from, from + PAGE - 1);
        if (error) throw error;
        all = all.concat(data || []);
        hasMore = (data?.length ?? 0) === PAGE;
        from += PAGE;
      }
      const matMap = new Map(colaboradores.map((c: any) => [c.id, c.matricula]));
      return all.map(r => ({ ...r, matricula: matMap.get(r.colaborador_id) || '' }));
    },
    enabled: !!unidadeId,
  });


  const colaboradorOptions = useMemo(
    () => colaboradores.map((c: any) => ({
      value: c.id,
      label: `${c.nome}${c.matricula ? ` — Mat. ${c.matricula}` : ''} ${c.cpf ? `(${c.cpf})` : ''}`.trim(),
    })),
    [colaboradores],
  );

  const allSelected = registros.length > 0 && selectedIds.size === registros.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(registros.map((r: any) => r.id)));
  };
  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const handleColaboradorChange = (id: string) => {
    setColaboradorId(id);
    setSelectedIds(new Set());
  };

  const handleGeneratePDF = async () => {
    const selecionados = registros.filter((r: any) => selectedIds.has(r.id));
    if (selecionados.length === 0) {
      toast({ title: 'Selecione ao menos um contracheque', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    try {
      await downloadMultipleContracheques(selecionados, unidadeId!, isPadrao02);
      toast({ title: 'PDF gerado', description: `${selecionados.length} contracheque(s) exportado(s).` });
    } catch (err: any) {
      toast({ title: 'Erro ao gerar PDF', description: err.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  // Coletivo - opções de filtro derivadas
  const secretariasOpts = useMemo(() => Array.from(new Set(folhaColetivo.map((r: any) => r.secretaria).filter(Boolean))).sort(), [folhaColetivo]);
  const lotacoesOpts = useMemo(() => Array.from(new Set(folhaColetivo.map((r: any) => r.lotacao).filter(Boolean))).sort(), [folhaColetivo]);
  const funcoesOpts = useMemo(() => Array.from(new Set(folhaColetivo.map((r: any) => r.funcao).filter(Boolean))).sort(), [folhaColetivo]);

  const folhaFiltrada = useMemo(() => folhaColetivo.filter((r: any) =>
    (secretariaFilter === 'todas' || r.secretaria === secretariaFilter) &&
    (lotacaoFilter === 'todas' || r.lotacao === lotacaoFilter) &&
    (funcaoFilter === 'todas' || r.funcao === funcaoFilter)
  ), [folhaColetivo, secretariaFilter, lotacaoFilter, funcaoFilter]);

  const totaisColetivo = useMemo(() => ({
    bruto: folhaFiltrada.reduce((s: number, r: any) => s + Number(r.bruto || 0), 0),
    descontos: folhaFiltrada.reduce((s: number, r: any) => s + Number(r.total_descontos || 0), 0),
    liquido: folhaFiltrada.reduce((s: number, r: any) => s + Number(r.liquido || 0), 0),
  }), [folhaFiltrada]);

  const handleGerarColetivo = async () => {
    if (folhaFiltrada.length === 0) {
      toast({ title: 'Nenhum registro encontrado para os filtros selecionados', variant: 'destructive' });
      return;
    }
    setGeneratingColetivo(true);
    try {
      await downloadColetivoContracheques(folhaFiltrada, unidadeId!, mes, ano, {
        secretaria: secretariaFilter !== 'todas' ? secretariaFilter : undefined,
        lotacao: lotacaoFilter !== 'todas' ? lotacaoFilter : undefined,
        funcao: funcaoFilter !== 'todas' ? funcaoFilter : undefined,
      });
      toast({ title: 'PDF gerado', description: `${folhaFiltrada.length} colaborador(es) na folha.` });
    } catch (err: any) {
      toast({ title: 'Erro ao gerar PDF', description: err.message, variant: 'destructive' });
    } finally {
      setGeneratingColetivo(false);
    }
  };

  const colaboradorSelecionado = colaboradores.find((c: any) => c.id === colaboradorId);

  return (
    <Layout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contracheques</h1>
          <p className="text-sm text-muted-foreground">
            Gere contracheques individuais por colaborador ou uma folha coletiva por mês.
          </p>
        </div>

        <Tabs defaultValue="individual" className="w-full">
          <TabsList>
            <TabsTrigger value="individual" className="gap-2"><User2 className="h-4 w-4" />Individual</TabsTrigger>
            <TabsTrigger value="coletivo" className="gap-2"><Users className="h-4 w-4" />Coletivo</TabsTrigger>
          </TabsList>

          {/* ============ INDIVIDUAL ============ */}
          <TabsContent value="individual" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User2 className="h-4 w-4 text-muted-foreground" />
                  Colaborador
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-w-xl">
                  <SearchableSelect
                    options={colaboradorOptions}
                    value={colaboradorId}
                    onValueChange={handleColaboradorChange}
                    placeholder="Buscar colaborador por nome, matrícula ou CPF..."
                  />
                </div>
                {colaboradorSelecionado && (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <Badge variant="outline">{colaboradorSelecionado.nome}</Badge>
                    {colaboradorSelecionado.matricula && <Badge variant="outline">Mat. {colaboradorSelecionado.matricula}</Badge>}
                    {colaboradorSelecionado.cpf && <Badge variant="outline">CPF: {colaboradorSelecionado.cpf}</Badge>}
                  </div>
                )}
              </CardContent>
            </Card>

            {colaboradorId && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-muted-foreground" />
                      Contracheques disponíveis
                      <span className="text-xs font-normal text-muted-foreground">
                        ({selectedIds.size} selecionado{selectedIds.size === 1 ? '' : 's'} de {registros.length})
                      </span>
                    </CardTitle>
                    <Button onClick={handleGeneratePDF} disabled={generating || selectedIds.size === 0} size="sm">
                      {generating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                      Gerar PDF ({selectedIds.size})
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                  ) : registros.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Receipt className="h-10 w-10 mb-2 opacity-40" />
                      <p className="text-sm">Nenhum contracheque processado para este colaborador.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10">
                              <Checkbox
                                checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                                onCheckedChange={toggleAll}
                                aria-label="Selecionar todos"
                              />
                            </TableHead>
                            <TableHead>Competência</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="hidden md:table-cell">Função</TableHead>
                            <TableHead className="hidden md:table-cell">Secretaria</TableHead>
                            <TableHead className="text-right">Bruto</TableHead>
                            <TableHead className="text-right">Descontos</TableHead>
                            <TableHead className="text-right">Líquido</TableHead>
                            <TableHead className="text-center w-20">Visualizar</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {registros.map((r: any) => (
                            <TableRow key={r.id} className={selectedIds.has(r.id) ? 'bg-muted/40' : ''}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedIds.has(r.id)}
                                  onCheckedChange={() => toggleOne(r.id)}
                                  aria-label={`Selecionar ${monthName(r.mes)}/${r.ano}`}
                                />
                              </TableCell>
                              <TableCell className="font-medium">{monthName(r.mes)} / {r.ano}</TableCell>
                              <TableCell>
                                <Badge variant={r.status === 'liberado' ? 'default' : 'secondary'} className="text-[10px]">
                                  {r.status === 'liberado' ? 'Liberado' : 'Processado'}
                                </Badge>
                              </TableCell>
                              <TableCell className="hidden md:table-cell text-muted-foreground text-xs">{r.funcao || '—'}</TableCell>
                              <TableCell className="hidden md:table-cell text-muted-foreground text-xs">{r.secretaria || '—'}</TableCell>
                              <TableCell className="text-right tabular-nums">{formatBRL(Number(r.bruto))}</TableCell>
                              <TableCell className="text-right tabular-nums text-muted-foreground">{formatBRL(Number(r.total_descontos))}</TableCell>
                              <TableCell className="text-right tabular-nums font-semibold">{formatBRL(Number(r.liquido))}</TableCell>
                              <TableCell className="text-center">
                                <Button size="sm" variant="ghost" className="h-8" onClick={() => { setPreviewRegistro(r); setPreviewOpen(true); }}>
                                  Ver
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ============ COLETIVO ============ */}
          <TabsContent value="coletivo" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Filtros da folha coletiva
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <Label className="text-xs">Mês</Label>
                    <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MESES.map(m => <SelectItem key={m.v} value={String(m.v)}>{m.n}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Ano</Label>
                    <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ANOS.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Secretaria</Label>
                    <Select value={secretariaFilter} onValueChange={setSecretariaFilter}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todas">Todas</SelectItem>
                        {secretariasOpts.map((s: any) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Lotação</Label>
                    <Select value={lotacaoFilter} onValueChange={setLotacaoFilter}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todas">Todas</SelectItem>
                        {lotacoesOpts.map((s: any) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Função</Label>
                    <Select value={funcaoFilter} onValueChange={setFuncaoFilter}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todas">Todas</SelectItem>
                        {funcoesOpts.map((s: any) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                    Resultado — {monthName(mes)} / {ano}
                    <span className="text-xs font-normal text-muted-foreground">
                      ({folhaFiltrada.length} colaborador{folhaFiltrada.length === 1 ? '' : 'es'})
                    </span>
                  </CardTitle>
                  <Button onClick={handleGerarColetivo} disabled={generatingColetivo || folhaFiltrada.length === 0} size="sm">
                    {generatingColetivo ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                    Gerar PDF Coletivo
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loadingColetivo ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : folhaFiltrada.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Receipt className="h-10 w-10 mb-2 opacity-40" />
                    <p className="text-sm">Nenhuma folha processada nessa competência com esses filtros.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Colaborador</TableHead>
                          <TableHead className="hidden md:table-cell">Função</TableHead>
                          <TableHead className="hidden lg:table-cell">Secretaria</TableHead>
                          <TableHead className="text-right">Bruto</TableHead>
                          <TableHead className="text-right">Descontos</TableHead>
                          <TableHead className="text-right">Líquido</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {folhaFiltrada.map((r: any, i: number) => (
                          <TableRow key={r.id}>
                            <TableCell className="text-muted-foreground tabular-nums text-xs">{i + 1}</TableCell>
                            <TableCell className="font-medium">
                              {r.nome}
                              {r.matricula && <span className="ml-2 text-xs text-muted-foreground">Mat. {r.matricula}</span>}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-muted-foreground text-xs">{r.funcao || '—'}</TableCell>
                            <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">{r.secretaria || '—'}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatBRL(Number(r.bruto))}</TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">{formatBRL(Number(r.total_descontos))}</TableCell>
                            <TableCell className="text-right tabular-nums font-semibold">{formatBRL(Number(r.liquido))}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="border-t-2">
                          <TableCell colSpan={4} className="font-semibold text-right">TOTAIS</TableCell>
                          <TableCell className="text-right tabular-nums font-bold">{formatBRL(totaisColetivo.bruto)}</TableCell>
                          <TableCell className="text-right tabular-nums font-bold text-muted-foreground">{formatBRL(totaisColetivo.descontos)}</TableCell>
                          <TableCell className="text-right tabular-nums font-bold">{formatBRL(totaisColetivo.liquido)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <ContrachequeDetalhado
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        registro={previewRegistro}
        unidadeId={unidadeId || ''}
        isPadrao02={isPadrao02}
      />
    </Layout>
  );
};

export default RelatorioContracheque;
