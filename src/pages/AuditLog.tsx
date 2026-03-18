import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Loader2, History, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

const TABELA_LABELS: Record<string, string> = {
  colaboradores: 'Colaboradores',
  adicionais: 'Adicionais',
  descontos: 'Descontos',
  secretarias: 'Secretarias',
  funcoes: 'Funções',
  lotacoes: 'Lotações',
  folha_processamento: 'Folha Processamento',
  prefeituras: 'Prefeituras',
  terceirizadas: 'Terceirizadas',
  unidades_folha: 'Unidades de Folha',
};

const ACAO_STYLES: Record<string, string> = {
  INSERT: 'bg-green-100 text-green-800 border-green-300',
  UPDATE: 'bg-amber-100 text-amber-800 border-amber-300',
  DELETE: 'bg-destructive/10 text-destructive border-destructive/30',
};

const ACAO_LABELS: Record<string, string> = {
  INSERT: 'Criação',
  UPDATE: 'Alteração',
  DELETE: 'Exclusão',
};

const formatDate = (d: string) => {
  const dt = new Date(d);
  return dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const AuditLog = () => {
  const [search, setSearch] = useState('');
  const [tabelaFilter, setTabelaFilter] = useState('all');
  const [acaoFilter, setAcaoFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [detailLog, setDetailLog] = useState<any>(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-log', tabelaFilter, acaoFilter],
    queryFn: async () => {
      let query = supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (tabelaFilter !== 'all') {
        query = query.eq('tabela', tabelaFilter);
      }
      if (acaoFilter !== 'all') {
        query = query.eq('acao', acaoFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = logs.filter((log: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    const nome = (log.dados_novo?.nome || log.dados_anterior?.nome || '').toLowerCase();
    const email = (log.user_email || '').toLowerCase();
    return nome.includes(s) || email.includes(s) || (log.registro_id || '').includes(s);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const getRecordLabel = (log: any) => {
    const data = log.dados_novo || log.dados_anterior;
    return data?.nome || data?.descricao || log.registro_id?.slice(0, 8) || '—';
  };

  const renderJsonDiff = (anterior: any, novo: any) => {
    if (!anterior && !novo) return <span className="text-muted-foreground">Sem dados</span>;

    const allKeys = new Set([
      ...Object.keys(anterior || {}),
      ...Object.keys(novo || {}),
    ]);

    const ignoredKeys = new Set(['created_at', 'updated_at', 'id']);
    const relevantKeys = [...allKeys].filter(k => !ignoredKeys.has(k));

    return (
      <div className="space-y-1 text-xs">
        {relevantKeys.map(key => {
          const oldVal = anterior?.[key];
          const newVal = novo?.[key];
          const changed = JSON.stringify(oldVal) !== JSON.stringify(newVal);

          if (!anterior) {
            // INSERT
            return (
              <div key={key} className="flex gap-2">
                <span className="font-medium text-muted-foreground min-w-[120px]">{key}:</span>
                <span className="text-green-700">{JSON.stringify(newVal)}</span>
              </div>
            );
          }

          if (!novo) {
            // DELETE
            return (
              <div key={key} className="flex gap-2">
                <span className="font-medium text-muted-foreground min-w-[120px]">{key}:</span>
                <span className="text-destructive line-through">{JSON.stringify(oldVal)}</span>
              </div>
            );
          }

          if (!changed) return null;

          return (
            <div key={key} className="flex gap-2">
              <span className="font-medium text-muted-foreground min-w-[120px]">{key}:</span>
              <span className="text-destructive line-through mr-1">{JSON.stringify(oldVal)}</span>
              <span className="text-green-700">{JSON.stringify(newVal)}</span>
            </div>
          );
        }).filter(Boolean)}
        {relevantKeys.every(key => JSON.stringify(anterior?.[key]) === JSON.stringify(novo?.[key])) && (
          <span className="text-muted-foreground italic">Nenhuma alteração detectada nos campos.</span>
        )}
      </div>
    );
  };

  return (
    <Layout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Log de Auditoria</h1>
          <p className="text-sm text-muted-foreground">Registro de todas as alterações realizadas no sistema</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, e-mail ou ID..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pl-9"
            />
          </div>
          <Select value={tabelaFilter} onValueChange={(v) => { setTabelaFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tabela" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as tabelas</SelectItem>
              {Object.entries(TABELA_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={acaoFilter} onValueChange={(v) => { setAcaoFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Ação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as ações</SelectItem>
              <SelectItem value="INSERT">Criação</SelectItem>
              <SelectItem value="UPDATE">Alteração</SelectItem>
              <SelectItem value="DELETE">Exclusão</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <History className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground">Nenhum registro de auditoria encontrado.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Módulo</TableHead>
                    <TableHead>Registro</TableHead>
                    <TableHead className="hidden md:table-cell">Usuário</TableHead>
                    <TableHead className="text-center">Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-[10px]', ACAO_STYLES[log.acao])}>
                          {ACAO_LABELS[log.acao] || log.acao}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {TABELA_LABELS[log.tabela] || log.tabela}
                      </TableCell>
                      <TableCell className="text-sm font-medium max-w-[200px] truncate">
                        {getRecordLabel(log)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                        {log.user_email || '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" onClick={() => setDetailLog(log)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{filtered.length} registros</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setPage(p => p - 1)} disabled={page === 0}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="flex items-center px-2">{page + 1} / {totalPages}</span>
                  <Button size="sm" variant="outline" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!detailLog} onOpenChange={() => setDetailLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Detalhes da Alteração
              {detailLog && (
                <Badge variant="outline" className={cn('text-[10px]', ACAO_STYLES[detailLog.acao])}>
                  {ACAO_LABELS[detailLog.acao]}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {detailLog && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Módulo:</span>
                  <p className="font-medium">{TABELA_LABELS[detailLog.tabela] || detailLog.tabela}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Data:</span>
                  <p className="font-medium">{formatDate(detailLog.created_at)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Usuário:</span>
                  <p className="font-medium">{detailLog.user_email || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Registro:</span>
                  <p className="font-medium truncate">{getRecordLabel(detailLog)}</p>
                </div>
              </div>
              <div className="border-t pt-3">
                <p className="text-sm font-medium mb-2">
                  {detailLog.acao === 'INSERT' ? 'Dados criados:' : detailLog.acao === 'DELETE' ? 'Dados excluídos:' : 'Campos alterados:'}
                </p>
                <ScrollArea className="max-h-[300px]">
                  {renderJsonDiff(detailLog.dados_anterior, detailLog.dados_novo)}
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default AuditLog;
