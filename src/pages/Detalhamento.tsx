import { useMemo, useState } from 'react';
import { usePayrollData } from '@/hooks/usePayrollData';
import { formatCurrency, formatNumber, getMonthShort } from '@/lib/formatters';
import type { DashboardFilters } from '@/types/payroll';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Search, ChevronLeft, ChevronRight, Download } from 'lucide-react';

const PAGE_SIZE = 15;

const Detalhamento = () => {
  const { data: records = [], isLoading } = usePayrollData();
  const [filters, setFilters] = useState<DashboardFilters>({ ano: null, mes: null, pasta: null, search: '' });
  const [page, setPage] = useState(0);

  const anos = useMemo(() => [...new Set(records.map(r => r.ano))].sort(), [records]);
  const meses = useMemo(() => [...new Set(records.map(r => r.mes))].sort((a, b) => a - b), [records]);
  const pastas = useMemo(() => [...new Set(records.map(r => r.pasta))].sort(), [records]);

  const filtered = useMemo(() => {
    return records.filter(r => {
      if (filters.ano && r.ano !== filters.ano) return false;
      if (filters.mes && r.mes !== filters.mes) return false;
      if (filters.pasta && r.pasta !== filters.pasta) return false;
      if (filters.search) {
        const s = filters.search.toLowerCase();
        if (!r.nome.toLowerCase().includes(s) && !r.cpf.includes(s)) return false;
      }
      return true;
    });
  }, [records, filters]);

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-64 items-center justify-center text-muted-foreground">Carregando dados...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Detalhamento da Folha</h1>
        <p className="text-muted-foreground">Consulta detalhada dos registros de pagamento</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Select value={filters.ano?.toString() || 'all'} onValueChange={v => { setFilters(f => ({ ...f, ano: v === 'all' ? null : Number(v) })); setPage(0); }}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Ano" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {anos.map(a => <SelectItem key={a} value={a.toString()}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.mes?.toString() || 'all'} onValueChange={v => { setFilters(f => ({ ...f, mes: v === 'all' ? null : Number(v) })); setPage(0); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Mês" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {meses.map(m => <SelectItem key={m} value={m.toString()}>{getMonthShort(m)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.pasta || 'all'} onValueChange={v => { setFilters(f => ({ ...f, pasta: v === 'all' ? null : v })); setPage(0); }}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Pasta" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {pastas.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou CPF..."
            value={filters.search}
            onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(0); }}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Registros ({formatNumber(filtered.length)})</CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            Página {page + 1} de {totalPages || 1}
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Pasta</TableHead>
                <TableHead>Mês/Ano</TableHead>
                <TableHead className="text-right">Bruto</TableHead>
                <TableHead className="text-right">Líquido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    {records.length === 0 ? 'Nenhum dado importado ainda. Vá em Importar para começar.' : 'Nenhum registro encontrado com os filtros aplicados.'}
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((r, i) => (
                  <TableRow key={r.id || i}>
                    <TableCell className="font-medium">{r.nome}</TableCell>
                    <TableCell>{r.cpf}</TableCell>
                    <TableCell>{r.funcao}</TableCell>
                    <TableCell>{r.pasta}</TableCell>
                    <TableCell>{getMonthShort(r.mes)}/{r.ano}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.bruto)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.liquido)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default Detalhamento;
