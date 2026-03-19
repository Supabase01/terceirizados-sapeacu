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
import { Search, Loader2, Monitor, Eye, ChevronLeft, ChevronRight, LogIn, Upload, FileText, Users, Shield, Settings, AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 25;

const CATEGORIA_LABELS: Record<string, { label: string; icon: typeof LogIn }> = {
  autenticacao: { label: 'Autenticação', icon: LogIn },
  importacao: { label: 'Importação', icon: Upload },
  folha: { label: 'Folha de Pagamento', icon: FileText },
  cadastro: { label: 'Cadastro', icon: Users },
  sistema: { label: 'Sistema', icon: Settings },
  permissao: { label: 'Permissão', icon: Shield },
};

const TIPO_CONFIG: Record<string, { label: string; icon: typeof Info; className: string }> = {
  info: { label: 'Info', icon: Info, className: 'bg-blue-100 text-blue-800 border-blue-300' },
  sucesso: { label: 'Sucesso', icon: CheckCircle2, className: 'bg-green-100 text-green-800 border-green-300' },
  aviso: { label: 'Aviso', icon: AlertTriangle, className: 'bg-amber-100 text-amber-800 border-amber-300' },
  erro: { label: 'Erro', icon: XCircle, className: 'bg-red-100 text-red-800 border-red-300' },
};

const formatDate = (d: string) => {
  const dt = new Date(d);
  return dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const LogSistema = () => {
  const [search, setSearch] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('all');
  const [tipoFilter, setTipoFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [detailLog, setDetailLog] = useState<any>(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['logs-sistema', categoriaFilter, tipoFilter],
    queryFn: async () => {
      let query = (supabase as any)
        .from('logs_sistema')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (categoriaFilter !== 'all') query = query.eq('categoria', categoriaFilter);
      if (tipoFilter !== 'all') query = query.eq('tipo', tipoFilter);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = logs.filter((log: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (log.descricao || '').toLowerCase().includes(s) ||
      (log.user_email || '').toLowerCase().includes(s) ||
      (log.categoria || '').toLowerCase().includes(s)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <Layout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Log do Sistema</h1>
          <p className="text-sm text-muted-foreground">Registro de eventos operacionais: logins, importações, processamentos e erros</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por descrição ou e-mail..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pl-9"
            />
          </div>
          <Select value={categoriaFilter} onValueChange={(v) => { setCategoriaFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {Object.entries(CATEGORIA_LABELS).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={tipoFilter} onValueChange={(v) => { setTipoFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {Object.entries(TIPO_CONFIG).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary cards */}
        {!isLoading && logs.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(TIPO_CONFIG).map(([tipo, cfg]) => {
              const count = logs.filter((l: any) => l.tipo === tipo).length;
              const Icon = cfg.icon;
              return (
                <Card key={tipo} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setTipoFilter(tipoFilter === tipo ? 'all' : tipo); setPage(0); }}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <Icon className={cn('h-5 w-5', tipo === 'info' && 'text-blue-600', tipo === 'sucesso' && 'text-green-600', tipo === 'aviso' && 'text-amber-600', tipo === 'erro' && 'text-destructive')} />
                    <div>
                      <p className="text-lg font-bold">{count}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{cfg.label}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Monitor className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground">Nenhum log do sistema encontrado.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">Data/Hora</TableHead>
                    <TableHead className="w-[80px]">Tipo</TableHead>
                    <TableHead className="w-[140px]">Categoria</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="hidden md:table-cell">Usuário</TableHead>
                    <TableHead className="text-center w-[60px]">Info</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((log: any) => {
                    const tipoCfg = TIPO_CONFIG[log.tipo] || TIPO_CONFIG.info;
                    const catCfg = CATEGORIA_LABELS[log.categoria];
                    const CatIcon = catCfg?.icon || Settings;
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(log.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('text-[10px]', tipoCfg.className)}>
                            {tipoCfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm">
                            <CatIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            {catCfg?.label || log.categoria}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm max-w-[300px] truncate">{log.descricao}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                          {log.user_email || '—'}
                        </TableCell>
                        <TableCell className="text-center">
                          {log.detalhes && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetailLog(log)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
        <DialogContent className="max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Detalhes do Evento
              {detailLog && (
                <Badge variant="outline" className={cn('text-[10px]', TIPO_CONFIG[detailLog.tipo]?.className)}>
                  {TIPO_CONFIG[detailLog.tipo]?.label || detailLog.tipo}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {detailLog && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Categoria:</span>
                  <p className="font-medium">{CATEGORIA_LABELS[detailLog.categoria]?.label || detailLog.categoria}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Data:</span>
                  <p className="font-medium">{formatDate(detailLog.created_at)}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Usuário:</span>
                  <p className="font-medium">{detailLog.user_email || '—'}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Descrição:</span>
                  <p className="font-medium">{detailLog.descricao}</p>
                </div>
              </div>
              {detailLog.detalhes && (
                <div className="border-t pt-3">
                  <p className="text-sm font-medium mb-2">Detalhes técnicos:</p>
                  <ScrollArea className="max-h-[300px]">
                    <pre className="text-xs bg-muted p-3 rounded-md whitespace-pre-wrap break-words">
                      {JSON.stringify(detailLog.detalhes, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default LogSistema;
