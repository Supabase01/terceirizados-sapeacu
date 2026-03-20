import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnidade } from '@/contexts/UnidadeContext';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, DollarSign } from 'lucide-react';

const currentDate = new Date();
const defaultMes = currentDate.getMonth() + 1;
const defaultAno = currentDate.getFullYear();

const PAGE_SIZE = 20;

const formatCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const getMonthLabel = (m: number) =>
  ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][m - 1] || '';

const Pagamento = () => {
  const { unidadeId } = useUnidade();
  const [mes, setMes] = useState(defaultMes);
  const [ano, setAno] = useState(defaultAno);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const { data: folha = [], isLoading } = useQuery({
    queryKey: ['pagamento', mes, ano, unidadeId],
    queryFn: async () => {
      const PAGE = 1000;
      let all: any[] = [];
      let from = 0;
      let hasMore = true;
      while (hasMore) {
        let query = supabase
          .from('folha_processamento')
          .select('id, nome, cpf, liquido, status, colaborador_id, colaboradores(banco, conta, pix)')
          .eq('mes', mes)
          .eq('ano', ano)
          .eq('status', 'liberado')
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
    enabled: !!unidadeId,
  });

  const filtered = folha.filter((r: any) => {
    const term = search.toLowerCase();
    return !term || r.nome?.toLowerCase().includes(term) || r.cpf?.includes(term);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalValor = filtered.reduce((s: number, r: any) => s + Number(r.liquido || 0), 0);

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Autorização de Pagamento</h1>
            <p className="text-sm text-muted-foreground">
              Folhas processadas aguardando autorização — {getMonthLabel(mes)}/{ano}
            </p>
          </div>
          <Badge variant="outline" className="text-base px-4 py-1">
            <DollarSign className="h-4 w-4 mr-1" />
            {filtered.length} registros
          </Badge>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center gap-3">
              <Select value={String(mes)} onValueChange={v => { setMes(Number(v)); setPage(0); }}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{getMonthLabel(i + 1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(ano)} onValueChange={v => { setAno(Number(v)); setPage(0); }}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map(a => (
                    <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou CPF..."
                  className="pl-9"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(0); }}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12 text-muted-foreground">Carregando...</div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <DollarSign className="h-10 w-10 mb-2 opacity-40" />
                <span>Nenhuma folha processada para este período.</span>
              </div>
            ) : (
              <>
                <div className="rounded-md border overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>CPF</TableHead>
                        <TableHead>Banco</TableHead>
                        <TableHead>Conta</TableHead>
                        <TableHead>PIX</TableHead>
                        <TableHead className="text-right">Valor para Pagamento</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginated.map((r: any, idx: number) => (
                        <TableRow key={r.id}>
                          <TableCell className="text-muted-foreground">{page * PAGE_SIZE + idx + 1}</TableCell>
                          <TableCell className="font-medium">{r.nome}</TableCell>
                          <TableCell>{r.cpf}</TableCell>
                          <TableCell>{r.colaboradores?.banco || '—'}</TableCell>
                          <TableCell>{r.colaboradores?.conta || '—'}</TableCell>
                          <TableCell>{r.colaboradores?.pix || '—'}</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(Number(r.liquido))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Total: <span className="font-bold text-foreground">{formatCurrency(totalValor)}</span>
                    {' — '}{filtered.length} colaboradores
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="px-3 py-1 text-sm rounded-md border disabled:opacity-40"
                      disabled={page === 0}
                      onClick={() => setPage(p => p - 1)}
                    >Anterior</button>
                    <span className="text-sm text-muted-foreground">{page + 1}/{totalPages}</span>
                    <button
                      className="px-3 py-1 text-sm rounded-md border disabled:opacity-40"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage(p => p + 1)}
                    >Próximo</button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Pagamento;
