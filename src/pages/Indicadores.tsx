import { useMemo, useState } from 'react';
import { usePayrollData } from '@/hooks/usePayrollData';
import { formatCurrency, formatNumber, getMonthShort } from '@/lib/formatters';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, Users, TrendingUp, TrendingDown, UserPlus, UserMinus } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area,
} from 'recharts';

const COLORS = [
  'hsl(267, 70%, 23%)', 'hsl(267, 60%, 35%)', 'hsl(270, 50%, 50%)',
  'hsl(270, 45%, 65%)', 'hsl(280, 40%, 75%)', 'hsl(290, 35%, 60%)',
  'hsl(300, 30%, 70%)', 'hsl(250, 50%, 55%)',
];

const Dashboard = () => {
  const { data: records = [], isLoading } = usePayrollData();
  const [anoFilter, setAnoFilter] = useState<number | null>(null);

  const anos = useMemo(() => [...new Set(records.map(r => r.ano))].sort(), [records]);

  const filtered = useMemo(() => {
    if (!anoFilter) return records;
    return records.filter(r => r.ano === anoFilter);
  }, [records, anoFilter]);

  // Get sorted unique periods
  const periods = useMemo(() => {
    const set = new Map<string, { ano: number; mes: number }>();
    filtered.forEach(r => {
      const key = `${r.ano}-${r.mes}`;
      if (!set.has(key)) set.set(key, { ano: r.ano, mes: r.mes });
    });
    return [...set.values()].sort((a, b) => a.ano * 12 + a.mes - (b.ano * 12 + b.mes));
  }, [filtered]);

  const lastPeriod = periods[periods.length - 1];
  const prevPeriod = periods[periods.length - 2];

  // Current period records
  const currentRecords = useMemo(() => {
    if (!lastPeriod) return [];
    return filtered.filter(r => r.ano === lastPeriod.ano && r.mes === lastPeriod.mes);
  }, [filtered, lastPeriod]);

  const prevRecords = useMemo(() => {
    if (!prevPeriod) return [];
    return filtered.filter(r => r.ano === prevPeriod.ano && r.mes === prevPeriod.mes);
  }, [filtered, prevPeriod]);

  // KPIs
  const totalBruto = currentRecords.reduce((s, r) => s + r.bruto, 0);
  const totalBrutoPrev = prevRecords.reduce((s, r) => s + r.bruto, 0);
  const impacto = totalBruto - totalBrutoPrev;
  const uniqueEmployees = new Set(currentRecords.map(r => r.cpf)).size;

  // Admissions & Departures
  const currentCPFs = new Set(currentRecords.map(r => r.cpf));
  const prevCPFs = new Set(prevRecords.map(r => r.cpf));
  const admissoes = prevPeriod ? [...currentCPFs].filter(cpf => !prevCPFs.has(cpf)).length : 0;
  const desligamentos = prevPeriod ? [...prevCPFs].filter(cpf => !currentCPFs.has(cpf)).length : 0;

  // Bar chart - monthly cost evolution
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

  // Pie chart - by pasta
  const pieData = useMemo(() => {
    const grouped: Record<string, number> = {};
    currentRecords.forEach(r => {
      grouped[r.pasta] = (grouped[r.pasta] || 0) + r.bruto;
    });
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [currentRecords]);

  // Line chart - headcount evolution
  const headcountData = useMemo(() => {
    return periods.map(p => {
      const count = new Set(
        filtered.filter(r => r.ano === p.ano && r.mes === p.mes).map(r => r.cpf)
      ).size;
      return { name: `${getMonthShort(p.mes)}/${p.ano}`, colaboradores: count };
    });
  }, [filtered, periods]);

  // Area chart - Bruto vs Líquido evolution
  const evolutionData = useMemo(() => {
    return periods.map(p => {
      const monthRecords = filtered.filter(r => r.ano === p.ano && r.mes === p.mes);
      const bruto = monthRecords.reduce((s, r) => s + r.bruto, 0);
      const liquido = monthRecords.reduce((s, r) => s + r.liquido, 0);
      return {
        name: `${getMonthShort(p.mes)}/${p.ano}`,
        bruto,
        liquido,
      };
    });
  }, [filtered, periods]);

  const prefeitura = records[0]?.prefeitura || 'Prefeitura';
  const lastPeriodLabel = lastPeriod ? `${getMonthShort(lastPeriod.mes)}/${lastPeriod.ano}` : '';
  const prevPeriodLabel = prevPeriod ? `${getMonthShort(prevPeriod.mes)}` : '';
  const impactoLabel = prevPeriod && lastPeriod
    ? `${prevPeriodLabel} → ${getMonthShort(lastPeriod.mes)}`
    : '';

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-64 items-center justify-center text-muted-foreground">Carregando dados...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">{prefeitura}</h1>
          <p className="text-sm text-muted-foreground">Painel de acompanhamento da folha de pagamento</p>
        </div>
        <Select value={anoFilter?.toString() || 'all'} onValueChange={v => setAnoFilter(v === 'all' ? null : Number(v))}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Ano" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {anos.map(a => <SelectItem key={a} value={a.toString()}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="mb-6 grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground leading-tight">
              Custo Total {lastPeriodLabel && `(${lastPeriodLabel})`}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
            <div className="text-lg md:text-2xl font-bold truncate">{formatCurrency(totalBruto)}</div>
            <p className="text-xs text-muted-foreground">{formatNumber(uniqueEmployees)} colaboradores</p>
          </CardContent>
        </Card>

        <Card className={impacto > 0 ? 'bg-destructive/5 border-destructive/20' : impacto < 0 ? 'bg-success/5 border-success/20' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground leading-tight">
              Impacto {impactoLabel && `(${impactoLabel})`}
            </CardTitle>
            {impacto >= 0 ? <TrendingUp className="h-4 w-4 text-destructive shrink-0" /> : <TrendingDown className="h-4 w-4 text-success shrink-0" />}
          </CardHeader>
          <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
            <div className={`text-lg md:text-2xl font-bold truncate ${impacto > 0 ? 'text-destructive' : impacto < 0 ? 'text-success' : ''}`}>
              {impacto >= 0 ? '+' : ''}{formatCurrency(impacto)}
            </div>
            <p className="text-xs text-muted-foreground">
              {impacto > 0 ? 'Aumento na folha' : impacto < 0 ? 'Redução na folha' : 'Sem variação'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-info/5 border-info/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground leading-tight">
              Admissões {impactoLabel && `(${impactoLabel})`}
            </CardTitle>
            <UserPlus className="h-4 w-4 text-info shrink-0" />
          </CardHeader>
          <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
            <div className="text-lg md:text-2xl font-bold text-info">{formatNumber(admissoes)}</div>
            <p className="text-xs text-muted-foreground">Novos em relação ao mês anterior</p>
          </CardContent>
        </Card>

        <Card className="bg-destructive/5 border-destructive/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground leading-tight">
              Desligamentos {impactoLabel && `(${impactoLabel})`}
            </CardTitle>
            <UserMinus className="h-4 w-4 text-destructive shrink-0" />
          </CardHeader>
          <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
            <div className="text-lg md:text-2xl font-bold text-destructive">{formatNumber(desligamentos)}</div>
            <p className="text-xs text-muted-foreground">Saídas em relação ao mês anterior</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="mb-6 grid gap-4 grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-sm md:text-base">Evolução do Custo Mensal</CardTitle>
          </CardHeader>
          <CardContent className="p-2 md:p-6 pt-0 md:pt-0">
            <div className="h-56 md:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" angle={-45} textAnchor="end" height={50} />
                  <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={45} />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Total Bruto']}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Bar dataKey="bruto" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-sm md:text-base">Composição por Pasta</CardTitle>
          </CardHeader>
          <CardContent className="p-2 md:p-6 pt-0 md:pt-0">
            <div className="h-56 md:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Evolução Bruto vs Líquido */}
      <Card className="mb-6">
        <CardHeader className="p-4 md:p-6 pb-2">
          <CardTitle className="text-sm md:text-base">Evolução Bruto vs Líquido</CardTitle>
          <CardDescription className="text-xs">Comparação mensal com área de descontos</CardDescription>
        </CardHeader>
        <CardContent className="p-2 md:p-6 pt-0">
          <div className="h-56 md:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolutionData}>
                <defs>
                  <linearGradient id="gradBruto" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(267, 70%, 23%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(267, 70%, 23%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradLiquido" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={45} />
                <Tooltip
                  formatter={(value: number, name: string) => [formatCurrency(value), name === 'bruto' ? 'Bruto' : 'Líquido']}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="bruto" stroke="hsl(267, 70%, 23%)" fill="url(#gradBruto)" strokeWidth={2} />
                <Area type="monotone" dataKey="liquido" stroke="hsl(142, 76%, 36%)" fill="url(#gradLiquido)" strokeWidth={2} />
                <Legend formatter={v => v === 'bruto' ? 'Bruto' : 'Líquido'} wrapperStyle={{ fontSize: '11px' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Headcount evolution */}
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-sm md:text-base">Evolução do Quadro de Pessoal</CardTitle>
          <p className="text-xs md:text-sm text-muted-foreground">Total de colaboradores ativos por mês</p>
        </CardHeader>
        <CardContent className="p-2 md:p-6 pt-0 md:pt-0">
          <div className="h-56 md:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={headcountData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="colaboradores" stroke="hsl(var(--success))" strokeWidth={2} dot={{ fill: 'hsl(var(--success))', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default Dashboard;
