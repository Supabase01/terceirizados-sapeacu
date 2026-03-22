import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { registrarLog } from '@/lib/logSistema';
import { useUnidade } from '@/contexts/UnidadeContext';
import { useIsMaster } from '@/hooks/useIsMaster';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, CheckCircle2, Loader2, FileText, Undo2, Send, Info, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const currentDate = new Date();
const defaultMes = currentDate.getMonth() + 1;
const defaultAno = currentDate.getFullYear();
const PAGE_SIZE = 20;

const formatCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const getMonthLabel = (m: number) =>
  ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][m - 1] || '';

const FolhaProcessada = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isMaster } = useIsMaster();
  const { unidadeId, unidadePadrao } = useUnidade();
  const isPadrao02 = unidadePadrao === 'padrao_02';
  const [mes, setMes] = useState(defaultMes);
  const [ano, setAno] = useState(defaultAno);
  const [search, setSearch] = useState('');
  const [filterSecretaria, setFilterSecretaria] = useState('all');
  const [filterFuncao, setFilterFuncao] = useState('all');
  const [page, setPage] = useState(0);
  const [liberarDialogOpen, setLiberarDialogOpen] = useState(false);

  // Check if selected month is already released
  const { data: liberadoInfo } = useQuery({
    queryKey: ['liberado-info', mes, ano, unidadeId],
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
          .eq('status', 'liberado')
          .eq('unidade_id', unidadeId!)
          .range(from, from + PAGE - 1);
        if (error) throw error;
        all = all.concat(data || []);
        hasMore = (data?.length ?? 0) === PAGE;
        from += PAGE;
      }
      if (all.length === 0) return null;
      const updatedAt = all[0].updated_at as string;
      const totalColab = all.length;
      const tBruto = all.reduce((s: number, r: any) => s + Number(r.bruto), 0);
      const tLiquido = all.reduce((s: number, r: any) => s + Number(r.liquido), 0);
      const tAdicionais = all.reduce((s: number, r: any) => s + Number(r.total_adicionais), 0);
      const tDescontos = all.reduce((s: number, r: any) => s + Number(r.total_descontos), 0);
      const tEncargos = all.reduce((s: number, r: any) => s + Number(r.total_encargos || 0), 0);
      return { updatedAt, totalColab, totalBruto: tBruto, totalLiquido: tLiquido, totalAdicionais: tAdicionais, totalDescontos: tDescontos, totalEncargos: tEncargos };
    },
    enabled: !!unidadeId,
  });

  const isReleased = !!liberadoInfo;

  const { data: folha = [], isLoading } = useQuery({
    queryKey: ['folha-processada', mes, ano, unidadeId],
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
          .eq('status', 'processado')
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
    enabled: !!unidadeId && !isReleased,
  });

  // Liberar para pagamento
  const liberarMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('folha_processamento')
        .update({ status: 'liberado', updated_at: new Date().toISOString() })
        .eq('mes', mes)
        .eq('ano', ano)
        .eq('status', 'processado')
        .eq('unidade_id', unidadeId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folha-processada'] });
      queryClient.invalidateQueries({ queryKey: ['pagamento'] });
      queryClient.invalidateQueries({ queryKey: ['liberado-info'] });
      setLiberarDialogOpen(false);
      toast({ title: 'Folha liberada', description: `Folha de ${getMonthLabel(mes)}/${ano} liberada para pagamento.` });
      registrarLog({ tipo: 'sucesso', categoria: 'folha', descricao: `Folha liberada para pagamento: ${getMonthLabel(mes)}/${ano}`, unidadeId });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao liberar', description: err.message, variant: 'destructive' });
    },
  });

  // Reverter para rascunho (master only)
  const revertMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('folha_processamento')
        .update({ status: 'rascunho', updated_at: new Date().toISOString() })
        .eq('mes', mes)
        .eq('ano', ano)
        .eq('status', 'processado')
        .eq('unidade_id', unidadeId!);
      if (error) throw error;

      await supabase
        .from('payroll_records')
        .delete()
        .eq('mes', mes)
        .eq('ano', ano)
        .eq('unidade_id', unidadeId!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folha-processada'] });
      queryClient.invalidateQueries({ queryKey: ['folha-processamento'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-records'] });
      queryClient.invalidateQueries({ queryKey: ['liberado-info'] });
      toast({ title: 'Folha revertida', description: `Folha de ${getMonthLabel(mes)}/${ano} voltou para rascunho.` });
      registrarLog({ tipo: 'aviso', categoria: 'folha', descricao: `Folha revertida para rascunho: ${getMonthLabel(mes)}/${ano}`, unidadeId });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao reverter', description: err.message, variant: 'destructive' });
    },
  });

  const secretariasUnicas = [...new Set(folha.map((r: any) => r.secretaria).filter(Boolean))].sort();
  const funcoesUnicas = [...new Set(folha.map((r: any) => r.funcao).filter(Boolean))].sort();

  const filtered = folha.filter((r: any) => {
    const matchSearch = !search || r.nome?.toLowerCase().includes(search.toLowerCase()) || r.cpf?.includes(search);
    const matchSecretaria = filterSecretaria === 'all' || r.secretaria === filterSecretaria;
    const matchFuncao = filterFuncao === 'all' || r.funcao === filterFuncao;
    return matchSearch && matchSecretaria && matchFuncao;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const totalBruto = folha.reduce((s: number, r: any) => s + Number(r.bruto), 0);
  const totalLiquido = folha.reduce((s: number, r: any) => s + Number(r.liquido), 0);
  const totalEncargos = folha.reduce((s: number, r: any) => s + Number(r.total_encargos || 0), 0);
  const totalAdicionais = folha.reduce((s: number, r: any) => s + Number(r.total_adicionais), 0);
  const totalDescontos = folha.reduce((s: number, r: any) => s + Number(r.total_descontos), 0);

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
            <h1 className="text-2xl font-bold text-foreground">Folha Processada</h1>
            <p className="text-sm text-muted-foreground">Folhas finalizadas aguardando liberação para pagamento</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={String(mes)} onValueChange={(v) => { setMes(Number(v)); setPage(0); }}>
              <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{getMonthLabel(i + 1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(ano)} onValueChange={(v) => { setAno(Number(v)); setPage(0); }}>
              <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026, 2027].map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Show action buttons only when NOT released */}
            {!isReleased && (
              <>
                {folha.length > 0 && (
                  <Button onClick={() => setLiberarDialogOpen(true)} className="bg-green-600 hover:bg-green-700 text-white">
                    <Send className="h-4 w-4 mr-1" />
                    Liberar para Pagamento
                  </Button>
                )}
                {folha.length > 0 && isMaster && (
                  <Button
                    onClick={() => revertMutation.mutate()}
                    disabled={revertMutation.isPending}
                    variant="destructive"
                  >
                    {revertMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Undo2 className="h-4 w-4 mr-1" />}
                    Reverter
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* RELEASED INFO PANEL */}
        {isReleased && liberadoInfo && (
          <Card className="border-blue-300 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-blue-100 dark:bg-blue-900 p-2">
                  <CheckCircle2 className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">
                      Folha de {getMonthLabel(mes)}/{ano} — Liberada para Pagamento
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Esta folha foi liberada e está disponível na tela de Pagamento para execução financeira.
                    </p>
                  </div>
                  <div className={cn("grid gap-4", isPadrao02 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-5")}>
                    <div>
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Colaboradores</p>
                      <p className="text-xl font-bold text-blue-800 dark:text-blue-200">{liberadoInfo.totalColab}</p>
                    </div>
                    {isPadrao02 ? (
                      <>
                        <div>
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Total Líquido</p>
                          <p className="text-xl font-bold text-blue-800 dark:text-blue-200">{formatCurrency(liberadoInfo.totalLiquido)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Total Encargos</p>
                          <p className="text-xl font-bold text-blue-800 dark:text-blue-200">{formatCurrency(liberadoInfo.totalEncargos)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Total Bruto</p>
                          <p className="text-xl font-bold text-blue-800 dark:text-blue-200">{formatCurrency(liberadoInfo.totalBruto)}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Total Bruto</p>
                          <p className="text-xl font-bold text-blue-800 dark:text-blue-200">{formatCurrency(liberadoInfo.totalBruto)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Adicionais</p>
                          <p className="text-xl font-bold text-blue-800 dark:text-blue-200">{formatCurrency(liberadoInfo.totalAdicionais)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Descontos</p>
                          <p className="text-xl font-bold text-blue-800 dark:text-blue-200">{formatCurrency(liberadoInfo.totalDescontos)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Total Líquido</p>
                          <p className="text-xl font-bold text-blue-800 dark:text-blue-200">{formatCurrency(liberadoInfo.totalLiquido)}</p>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                    <Info className="h-3 w-3" />
                    <span>Liberada em {formatDate(liberadoInfo.updatedAt)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 p-3 rounded-md bg-blue-100/50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700">
                    <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      O detalhamento completo desta folha pode ser consultado em <strong>Relatórios</strong> e <strong>Indicadores</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Processed content - only show when NOT released */}
        {!isReleased && (
          <>
            {folha.length > 0 && (
              <>
                <div className={cn("grid gap-3", isPadrao02 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-5")}>
                  <Card><CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">Colaboradores</p>
                    <p className="text-lg font-bold text-foreground">{folha.length}</p>
                  </CardContent></Card>
                  {isPadrao02 ? (
                    <>
                      <Card><CardContent className="p-3 text-center">
                        <p className="text-xs text-muted-foreground">Total Líquido</p>
                        <p className="text-lg font-bold text-primary">{formatCurrency(totalLiquido)}</p>
                      </CardContent></Card>
                      <Card><CardContent className="p-3 text-center">
                        <p className="text-xs text-muted-foreground">Total Encargos</p>
                        <p className="text-lg font-bold text-amber-600">{formatCurrency(totalEncargos)}</p>
                      </CardContent></Card>
                      <Card><CardContent className="p-3 text-center">
                        <p className="text-xs text-muted-foreground">Total Bruto</p>
                        <p className="text-lg font-bold text-foreground">{formatCurrency(totalBruto)}</p>
                      </CardContent></Card>
                    </>
                  ) : (
                    <>
                      <Card><CardContent className="p-3 text-center">
                        <p className="text-xs text-muted-foreground">Total Bruto</p>
                        <p className="text-lg font-bold text-foreground">{formatCurrency(totalBruto)}</p>
                      </CardContent></Card>
                      <Card><CardContent className="p-3 text-center">
                        <p className="text-xs text-muted-foreground">Adicionais</p>
                        <p className="text-lg font-bold text-green-600">{formatCurrency(totalAdicionais)}</p>
                      </CardContent></Card>
                      <Card><CardContent className="p-3 text-center">
                        <p className="text-xs text-muted-foreground">Descontos</p>
                        <p className="text-lg font-bold text-destructive">{formatCurrency(totalDescontos)}</p>
                      </CardContent></Card>
                      <Card><CardContent className="p-3 text-center">
                        <p className="text-xs text-muted-foreground">Total Líquido</p>
                        <p className="text-lg font-bold text-primary">{formatCurrency(totalLiquido)}</p>
                      </CardContent></Card>
                    </>
                  )}
                </div>

                <Badge className="bg-green-100 text-green-800 border-green-300">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Processada — {getMonthLabel(mes)}/{ano}
                </Badge>
              </>
            )}

            {/* Filters */}
            <div className="flex flex-wrap items-end gap-3">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Nome ou CPF..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
              </div>
              <div className="w-full sm:w-48">
                <Select value={filterSecretaria} onValueChange={(v) => { setFilterSecretaria(v); setPage(0); }}>
                  <SelectTrigger><SelectValue placeholder="Secretaria" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas Secretarias</SelectItem>
                    {secretariasUnicas.map((s: string) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-48">
                <Select value={filterFuncao} onValueChange={(v) => { setFilterFuncao(v); setPage(0); }}>
                  <SelectTrigger><SelectValue placeholder="Função" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas Funções</SelectItem>
                    {funcoesUnicas.map((f: string) => (<SelectItem key={f} value={f}>{f}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : folha.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-muted-foreground">Nenhuma folha processada para {getMonthLabel(mes)}/{ano}.</p>
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

      {/* Confirm liberar dialog */}
      <Dialog open={liberarDialogOpen} onOpenChange={setLiberarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Liberar Folha de {getMonthLabel(mes)}/{ano} para Pagamento?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Ao liberar, a folha ficará disponível na tela de Pagamento para autorização financeira.
          </p>
          <p className="text-sm font-medium mt-2">
            {folha.length} colaboradores — Total líquido: {formatCurrency(totalLiquido)}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLiberarDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => liberarMutation.mutate()}
              disabled={liberarMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {liberarMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              Confirmar Liberação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default FolhaProcessada;
