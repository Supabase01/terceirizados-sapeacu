import { useMemo, useState } from 'react';
import { usePayrollData } from '@/hooks/usePayrollData';
import { formatCurrency, formatNumber, getMonthShort, getMonthName } from '@/lib/formatters';
import { runAllChecks } from '@/lib/auditChecks';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, Users, TrendingUp, TrendingDown, UserPlus, UserMinus, AlertTriangle, ShieldAlert } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area,
} from 'recharts';

const COLORS = [
  'hsl(267, 70%, 23%)', 'hsl(267, 60%, 35%)', 'hsl(270, 50%, 50%)',
  'hsl(270, 45%, 65%)', 'hsl(280, 40%, 75%)', 'hsl(290, 35%, 60%)',
  'hsl(300, 30%, 70%)', 'hsl(250, 50%, 55%)',
];

const SALARY_RANGES = [
  { label: 'Até 1.500', min: 0, max: 1500 },
  { label: '1.500–3.000', min: 1500, max: 3000 },
  { label: '3.000–5.000', min: 3000, max: 5000 },
  { label: '5.000–10.000', min: 5000, max: 10000 },
  { label: 'Acima de 10.000', min: 10000, max: Infinity },
];

// =================== ABA GERAIS ===================
const TabGerais = ({ records, anoFilter, setAnoFilter, anos }: {
  records: any[]; anoFilter: number | null; setAnoFilter: (v: number | null) => void; anos: number[];
}) => {
  const filtered = useMemo(() => {
    if (!anoFilter) return records;
    return records.filter(r => r.ano === anoFilter);
  }, [records, anoFilter]);

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

  const currentRecords = useMemo(() => {
    if (!lastPeriod) return [];
    return filtered.filter(r => r.ano === lastPeriod.ano && r.mes === lastPeriod.mes);
  }, [filtered, lastPeriod]);

  const prevRecords = useMemo(() => {
    if (!prevPeriod) return [];
    return filtered.filter(r => r.ano === prevPeriod.ano && r.mes === prevPeriod.mes);
  }, [filtered, prevPeriod]);

  const totalBruto = currentRecords.reduce((s, r) => s + r.bruto, 0);
  const totalBrutoPrev = prevRecords.reduce((s, r) => s + r.bruto, 0);
  const impacto = totalBruto - totalBrutoPrev;
  const uniqueEmployees = new Set(currentRecords.map(r => r.cpf)).size;

  const currentCPFs = new Set(currentRecords.map(r => r.cpf));
  const prevCPFs = new Set(prevRecords.map(r => r.cpf));
  const admissoes = prevPeriod ? [...currentCPFs].filter(cpf => !prevCPFs.has(cpf)).length : 0;
  const desligamentos = prevPeriod ? [...prevCPFs].filter(cpf => !currentCPFs.has(cpf)).length : 0;

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
    currentRecords.forEach(r => {
      grouped[r.pasta] = (grouped[r.pasta] || 0) + r.bruto;
    });
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [currentRecords]);

  const headcountData = useMemo(() => {
    return periods.map(p => {
      const count = new Set(
        filtered.filter(r => r.ano === p.ano && r.mes === p.mes).map(r => r.cpf)
      ).size;
      return { name: `${getMonthShort(p.mes)}/${p.ano}`, colaboradores: count };
    });
  }, [filtered, periods]);

  const evolutionData = useMemo(() => {
    return periods.map(p => {
      const monthRecords = filtered.filter(r => r.ano === p.ano && r.mes === p.mes);
      const bruto = monthRecords.reduce((s, r) => s + r.bruto, 0);
      const liquido = monthRecords.reduce((s, r) => s + r.liquido, 0);
      return { name: `${getMonthShort(p.mes)}/${p.ano}`, bruto, liquido };
    });
  }, [filtered, periods]);

  const lastPeriodLabel = lastPeriod ? `${getMonthShort(lastPeriod.mes)}/${lastPeriod.ano}` : '';
  const prevPeriodLabel = prevPeriod ? `${getMonthShort(prevPeriod.mes)}` : '';
  const impactoLabel = prevPeriod && lastPeriod
    ? `${prevPeriodLabel} → ${getMonthShort(lastPeriod.mes)}`
    : '';

  return (
    <>
      <div className="mb-4 flex justify-end">
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
    </>
  );
};

// =================== ABA MENSAIS ===================
const TabMensais = ({ records }: { records: any[] }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');

  const periods = useMemo(() => {
    const set = new Map<string, { ano: number; mes: number }>();
    records.forEach(r => {
      const key = `${r.ano}-${r.mes}`;
      if (!set.has(key)) set.set(key, { ano: r.ano, mes: r.mes });
    });
    return [...set.values()].sort((a, b) => a.ano * 12 + a.mes - (b.ano * 12 + b.mes));
  }, [records]);

  const activePeriod = useMemo(() => {
    if (selectedPeriod) {
      const [ano, mes] = selectedPeriod.split('-').map(Number);
      return periods.find(p => p.ano === ano && p.mes === mes) || periods[periods.length - 1];
    }
    return periods[periods.length - 1];
  }, [periods, selectedPeriod]);

  const prevPeriod = useMemo(() => {
    if (!activePeriod) return null;
    const idx = periods.findIndex(p => p.ano === activePeriod.ano && p.mes === activePeriod.mes);
    return idx > 0 ? periods[idx - 1] : null;
  }, [periods, activePeriod]);

  const monthRecords = useMemo(() => {
    if (!activePeriod) return [];
    return records.filter(r => r.ano === activePeriod.ano && r.mes === activePeriod.mes);
  }, [records, activePeriod]);

  const prevMonthRecords = useMemo(() => {
    if (!prevPeriod) return [];
    return records.filter(r => r.ano === prevPeriod.ano && r.mes === prevPeriod.mes);
  }, [records, prevPeriod]);

  // KPIs
  const bruto = monthRecords.reduce((s, r) => s + r.bruto, 0);
  const liquido = monthRecords.reduce((s, r) => s + r.liquido, 0);
  const descontos = bruto - liquido;
  const colaboradores = new Set(monthRecords.map(r => r.cpf)).size;
  const salarioMedio = colaboradores > 0 ? bruto / colaboradores : 0;

  const prevBruto = prevMonthRecords.reduce((s, r) => s + r.bruto, 0);
  const prevLiquido = prevMonthRecords.reduce((s, r) => s + r.liquido, 0);
  const prevColabs = new Set(prevMonthRecords.map(r => r.cpf)).size;
  const prevMedia = prevColabs > 0 ? prevBruto / prevColabs : 0;

  const pctVar = (curr: number, prev: number) => prev > 0 ? ((curr - prev) / prev * 100).toFixed(1) : '—';

  // Pie: Líquido vs Descontos
  const pieComposition = [
    { name: 'Líquido', value: liquido },
    { name: 'Descontos', value: descontos },
  ];

  // Salary ranges
  const salaryRangeData = useMemo(() => {
    const cpfBruto = new Map<string, number>();
    monthRecords.forEach(r => {
      cpfBruto.set(r.cpf, (cpfBruto.get(r.cpf) || 0) + r.bruto);
    });
    return SALARY_RANGES.map(range => ({
      name: range.label,
      quantidade: [...cpfBruto.values()].filter(v => v >= range.min && v < range.max).length,
    }));
  }, [monthRecords]);

  // Top 10 funções
  const topFuncoes = useMemo(() => {
    const grouped: Record<string, number> = {};
    monthRecords.forEach(r => {
      const f = r.funcao || 'Não informado';
      grouped[f] = (grouped[f] || 0) + r.bruto;
    });
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [monthRecords]);

  // Custo por secretaria
  const custoSecretaria = useMemo(() => {
    const grouped: Record<string, { pasta: string; bruto: number; count: number }> = {};
    monthRecords.forEach(r => {
      if (!grouped[r.pasta]) grouped[r.pasta] = { pasta: r.pasta, bruto: 0, count: 0 };
      grouped[r.pasta].bruto += r.bruto;
    });
    // unique count
    const cpfByPasta: Record<string, Set<string>> = {};
    monthRecords.forEach(r => {
      if (!cpfByPasta[r.pasta]) cpfByPasta[r.pasta] = new Set();
      cpfByPasta[r.pasta].add(r.cpf);
    });
    const arr = Object.values(grouped).map(g => ({
      ...g,
      uniqueCount: cpfByPasta[g.pasta]?.size || 0,
    }));
    const maxBruto = Math.max(...arr.map(a => a.bruto), 1);
    return arr.sort((a, b) => b.bruto - a.bruto).map(a => ({ ...a, pct: (a.bruto / maxBruto) * 100 }));
  }, [monthRecords]);

  // Audit summary
  const auditSummary = useMemo(() => {
    const alerts = runAllChecks(monthRecords);
    const alta = alerts.filter(a => a.severity === 'alta').length;
    const media = alerts.filter(a => a.severity === 'media').length;
    const baixa = alerts.filter(a => a.severity === 'baixa').length;
    return { total: alerts.length, alta, media, baixa };
  }, [monthRecords]);

  if (!activePeriod) return <p className="text-muted-foreground text-center py-8">Nenhum período disponível.</p>;

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Select
          value={selectedPeriod || `${activePeriod.ano}-${activePeriod.mes}`}
          onValueChange={setSelectedPeriod}
        >
          <SelectTrigger className="w-48"><SelectValue placeholder="Período" /></SelectTrigger>
          <SelectContent>
            {periods.map(p => (
              <SelectItem key={`${p.ano}-${p.mes}`} value={`${p.ano}-${p.mes}`}>
                {getMonthName(p.mes)}/{p.ano}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="mb-6 grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Folha Bruta</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
            <div className="text-lg md:text-2xl font-bold truncate">{formatCurrency(bruto)}</div>
            <p className="text-xs text-muted-foreground">{pctVar(bruto, prevBruto)}% vs mês anterior</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Folha Líquida</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
            <div className="text-lg md:text-2xl font-bold truncate">{formatCurrency(liquido)}</div>
            <p className="text-xs text-muted-foreground">{pctVar(liquido, prevLiquido)}% vs mês anterior</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Colaboradores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
            <div className="text-lg md:text-2xl font-bold">{formatNumber(colaboradores)}</div>
            <p className="text-xs text-muted-foreground">{pctVar(colaboradores, prevColabs)}% vs mês anterior</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Salário Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
            <div className="text-lg md:text-2xl font-bold truncate">{formatCurrency(salarioMedio)}</div>
            <p className="text-xs text-muted-foreground">{pctVar(salarioMedio, prevMedia)}% vs mês anterior</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 1 */}
      <div className="mb-6 grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Pie: Líquido vs Descontos */}
        <Card>
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-sm md:text-base">Composição: Líquido vs Descontos</CardTitle>
          </CardHeader>
          <CardContent className="p-2 md:p-6 pt-0 md:pt-0">
            <div className="h-56 md:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieComposition} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                    <Cell fill="hsl(142, 76%, 36%)" />
                    <Cell fill="hsl(0, 72%, 51%)" />
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Bar: Faixas salariais */}
        <Card>
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-sm md:text-base">Faixas Salariais</CardTitle>
          </CardHeader>
          <CardContent className="p-2 md:p-6 pt-0 md:pt-0">
            <div className="h-56 md:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salaryRangeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" angle={-20} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="quantidade" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top 10 funções */}
      <Card className="mb-6">
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-sm md:text-base">Top 10 Funções por Custo</CardTitle>
        </CardHeader>
        <CardContent className="p-2 md:p-6 pt-0 md:pt-0">
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topFuncoes} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" width={120} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="value" fill="hsl(270, 50%, 50%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Custo por secretaria - ranking */}
      <Card className="mb-6">
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-sm md:text-base">Custo por Secretaria</CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 md:pt-0 space-y-3">
          {custoSecretaria.map(s => (
            <div key={s.pasta}>
              <div className="flex items-center justify-between text-xs md:text-sm mb-1">
                <span className="font-medium truncate mr-2">{s.pasta}</span>
                <span className="text-muted-foreground whitespace-nowrap">{formatCurrency(s.bruto)} · {s.uniqueCount} col.</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${s.pct}%` }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Audit summary */}
      <Card>
        <CardHeader className="p-4 md:p-6 flex flex-row items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-primary" />
          <CardTitle className="text-sm md:text-base">Resumo de Auditoria</CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
          {auditSummary.total === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum alerta identificado neste período.</p>
          ) : (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="rounded-lg bg-destructive/10 p-3">
                <AlertTriangle className="h-5 w-5 text-destructive mx-auto mb-1" />
                <div className="text-xl font-bold text-destructive">{auditSummary.alta}</div>
                <p className="text-xs text-muted-foreground">Alta</p>
              </div>
              <div className="rounded-lg bg-warning/10 p-3">
                <AlertTriangle className="h-5 w-5 text-warning mx-auto mb-1" />
                <div className="text-xl font-bold text-warning">{auditSummary.media}</div>
                <p className="text-xs text-muted-foreground">Média</p>
              </div>
              <div className="rounded-lg bg-info/10 p-3">
                <AlertTriangle className="h-5 w-5 text-info mx-auto mb-1" />
                <div className="text-xl font-bold text-info">{auditSummary.baixa}</div>
                <p className="text-xs text-muted-foreground">Baixa</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

// =================== MAIN COMPONENT ===================
const Indicadores = () => {
  const { data: records = [], isLoading } = usePayrollData();
  const [anoFilter, setAnoFilter] = useState<number | null>(null);

  const anos = useMemo(() => [...new Set(records.map(r => r.ano))].sort(), [records]);
  const prefeitura = records[0]?.prefeitura || 'Prefeitura';

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
        <h1 className="text-xl md:text-2xl font-bold text-foreground">{prefeitura}</h1>
        <p className="text-sm text-muted-foreground">Painel de acompanhamento da folha de pagamento</p>
      </div>

      <Tabs defaultValue="gerais" className="w-full">
        <TabsList className="mb-6 w-full sm:w-auto">
          <TabsTrigger value="gerais" className="flex-1 sm:flex-none">Indicadores Gerais</TabsTrigger>
          <TabsTrigger value="mensais" className="flex-1 sm:flex-none">Indicadores Mensais</TabsTrigger>
        </TabsList>

        <TabsContent value="gerais">
          <TabGerais records={records} anoFilter={anoFilter} setAnoFilter={setAnoFilter} anos={anos} />
        </TabsContent>

        <TabsContent value="mensais">
          <TabMensais records={records} />
        </TabsContent>
      </Tabs>
    </Layout>
  );
};

export default Indicadores;
