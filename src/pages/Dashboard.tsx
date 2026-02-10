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
import { DollarSign, Users, TrendingUp, Wallet, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['hsl(267, 70%, 23%)', 'hsl(267, 60%, 35%)', 'hsl(270, 50%, 50%)', 'hsl(270, 45%, 65%)', 'hsl(280, 40%, 75%)', 'hsl(290, 35%, 60%)', 'hsl(300, 30%, 70%)', 'hsl(250, 50%, 55%)'];
const PAGE_SIZE = 15;

const Dashboard = () => {
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

  const totalBruto = useMemo(() => filtered.reduce((sum, r) => sum + r.bruto, 0), [filtered]);
  const totalLiquido = useMemo(() => filtered.reduce((sum, r) => sum + r.liquido, 0), [filtered]);
  const uniqueEmployees = useMemo(() => new Set(filtered.map(r => r.cpf)).size, [filtered]);
  const ticketMedio = uniqueEmployees > 0 ? totalLiquido / uniqueEmployees : 0;

  const barData = useMemo(() => {
    const grouped: Record<string, { mes: number; ano: number; bruto: number }> = {};
    filtered.forEach(r => {
      const key = `${r.ano}-${r.mes}`;
      if (!grouped[key]) grouped[key] = { mes: r.mes, ano: r.ano, bruto: 0 };
      grouped[key].bruto += r.bruto;
    });
    return Object.values(grouped)
      .sort((a, b) => a.ano * 12 + a.mes - (b.ano * 12 + b.mes))
      .map(g => ({ name: `${getMonthShort(g.mes)}/${g.ano}`, bruto: g.bruto }));
  }, [filtered]);

  const pieData = useMemo(() => {
    const grouped: Record<string, number> = {};
    filtered.forEach(r => {
      grouped[r.pasta] = (grouped[r.pasta] || 0) + r.bruto;
    });
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  const prefeitura = records[0]?.prefeitura || 'Prefeitura';
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
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">{prefeitura}</h1>
        <p className="text-muted-foreground">
          {filters.ano || 'Todos os anos'} • {filters.mes ? getMonthShort(filters.mes) : 'Todos os meses'}
        </p>
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

      {/* KPI Cards */}
      <div className="mb-6 grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Bruto</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBruto)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Líquido</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalLiquido)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Funcionários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(uniqueEmployees)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ticket Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(ticketMedio)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Evolução do Custo Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Total Bruto']}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  />
                  <Bar dataKey="bruto" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Composição por Pasta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
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
                <TableHead className="text-right">Bruto</TableHead>
                <TableHead className="text-right">Líquido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
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

export default Dashboard;
