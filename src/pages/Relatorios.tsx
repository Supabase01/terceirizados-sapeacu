import { useMemo } from 'react';
import { usePayrollData } from '@/hooks/usePayrollData';
import { formatCurrency, formatNumber, getMonthShort, getMonthName } from '@/lib/formatters';
import { runAllChecks } from '@/lib/auditChecks';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, RadialBarChart, RadialBar,
} from 'recharts';
import {
  FileText, Users, DollarSign, TrendingUp, TrendingDown,
  Building2, Briefcase, AlertTriangle, CheckCircle2,
} from 'lucide-react';

const COLORS = [
  'hsl(267, 70%, 23%)', 'hsl(267, 60%, 35%)', 'hsl(270, 50%, 50%)',
  'hsl(270, 45%, 65%)', 'hsl(280, 40%, 75%)', 'hsl(290, 35%, 60%)',
  'hsl(300, 30%, 70%)', 'hsl(250, 50%, 55%)', 'hsl(240, 45%, 45%)',
  'hsl(260, 55%, 40%)',
];

const Relatorios = () => {
  const { data: records = [], isLoading } = usePayrollData();

  // All periods sorted
  const periods = useMemo(() => {
    const set = new Map<string, { ano: number; mes: number }>();
    records.forEach(r => {
      const key = `${r.ano}-${r.mes}`;
      if (!set.has(key)) set.set(key, { ano: r.ano, mes: r.mes });
    });
    return [...set.values()].sort((a, b) => a.ano * 12 + a.mes - (b.ano * 12 + b.mes));
  }, [records]);

  const lastPeriod = periods[periods.length - 1];
  const prevPeriod = periods.length >= 2 ? periods[periods.length - 2] : null;

  const currentRecords = useMemo(() => {
    if (!lastPeriod) return [];
    return records.filter(r => r.ano === lastPeriod.ano && r.mes === lastPeriod.mes);
  }, [records, lastPeriod]);

  const prevRecords = useMemo(() => {
    if (!prevPeriod) return [];
    return records.filter(r => r.ano === prevPeriod.ano && r.mes === prevPeriod.mes);
  }, [records, prevPeriod]);

  // === RESUMO GERAL ===
  const totalBruto = currentRecords.reduce((s, r) => s + r.bruto, 0);
  const totalLiquido = currentRecords.reduce((s, r) => s + r.liquido, 0);
  const totalDescontos = totalBruto - totalLiquido;
  const percentDesconto = totalBruto > 0 ? (totalDescontos / totalBruto) * 100 : 0;
  const uniqueEmployees = new Set(currentRecords.map(r => r.cpf)).size;
  const uniquePastas = new Set(currentRecords.map(r => r.pasta)).size;
  const avgSalario = uniqueEmployees > 0 ? totalBruto / uniqueEmployees : 0;

  // Variação mês anterior
  const totalBrutoPrev = prevRecords.reduce((s, r) => s + r.bruto, 0);
  const variacao = totalBrutoPrev > 0 ? ((totalBruto - totalBrutoPrev) / totalBrutoPrev) * 100 : 0;

  // === TOP PASTAS ===
  const topPastas = useMemo(() => {
    const grouped: Record<string, { pasta: string; bruto: number; liquido: number; count: number }> = {};
    currentRecords.forEach(r => {
      if (!grouped[r.pasta]) grouped[r.pasta] = { pasta: r.pasta, bruto: 0, liquido: 0, count: 0 };
      grouped[r.pasta].bruto += r.bruto;
      grouped[r.pasta].liquido += r.liquido;
      grouped[r.pasta].count++;
    });
    return Object.values(grouped).sort((a, b) => b.bruto - a.bruto);
  }, [currentRecords]);

  // === TOP FUNÇÕES ===
  const topFuncoes = useMemo(() => {
    const grouped: Record<string, { funcao: string; count: number; bruto: number }> = {};
    currentRecords.forEach(r => {
      const f = r.funcao || 'Não informado';
      if (!grouped[f]) grouped[f] = { funcao: f, count: 0, bruto: 0 };
      grouped[f].count++;
      grouped[f].bruto += r.bruto;
    });
    return Object.values(grouped).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [currentRecords]);

  // === EVOLUÇÃO ACUMULADA ===
  const evolutionData = useMemo(() => {
    return periods.map(p => {
      const monthRecords = records.filter(r => r.ano === p.ano && r.mes === p.mes);
      const bruto = monthRecords.reduce((s, r) => s + r.bruto, 0);
      const liquido = monthRecords.reduce((s, r) => s + r.liquido, 0);
      const headcount = new Set(monthRecords.map(r => r.cpf)).size;
      return {
        name: `${getMonthShort(p.mes)}/${p.ano}`,
        bruto,
        liquido,
        descontos: bruto - liquido,
        headcount,
      };
    });
  }, [records, periods]);

  // === PIE BRUTO vs LIQUIDO ===
  const brutoLiquidoPie = useMemo(() => [
    { name: 'Líquido', value: totalLiquido },
    { name: 'Descontos', value: totalDescontos },
  ], [totalLiquido, totalDescontos]);

  // === FAIXAS SALARIAIS ===
  const faixas = useMemo(() => {
    const ranges = [
      { label: 'Até R$ 2.000', min: 0, max: 2000 },
      { label: 'R$ 2.001 - 5.000', min: 2001, max: 5000 },
      { label: 'R$ 5.001 - 10.000', min: 5001, max: 10000 },
      { label: 'R$ 10.001 - 20.000', min: 10001, max: 20000 },
      { label: 'Acima de R$ 20.000', min: 20001, max: Infinity },
    ];
    return ranges.map(range => ({
      name: range.label,
      count: currentRecords.filter(r => r.bruto >= range.min && r.bruto <= range.max).length,
    }));
  }, [currentRecords]);

  // === AUDITORIA RESUMO ===
  const auditAlerts = useMemo(() => runAllChecks(records), [records]);
  const alertsBySeverity = useMemo(() => ({
    alta: auditAlerts.filter(a => a.severity === 'alta').length,
    media: auditAlerts.filter(a => a.severity === 'media').length,
    baixa: auditAlerts.filter(a => a.severity === 'baixa').length,
  }), [auditAlerts]);

  const prefeitura = records[0]?.prefeitura || 'Prefeitura';
  const periodoLabel = lastPeriod ? `${getMonthName(lastPeriod.mes)}/${lastPeriod.ano}` : '';

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-64 items-center justify-center text-muted-foreground">Carregando dados...</div>
      </Layout>
    );
  }

  if (records.length === 0) {
    return (
      <Layout>
        <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
          <FileText className="h-10 w-10" />
          <p>Nenhum dado importado para gerar relatórios.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="h-5 w-5 text-primary" />
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Relatórios</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {prefeitura} — Resumo executivo referente a <span className="font-medium text-foreground">{periodoLabel}</span>
        </p>
      </div>

      {/* ===== RESUMO EXECUTIVO ===== */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Resumo Executivo</h2>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium">Folha Bruta</span>
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
              <p className="text-lg md:text-xl font-bold truncate">{formatCurrency(totalBruto)}</p>
              {prevPeriod && (
                <div className={`flex items-center gap-1 mt-1 text-xs ${variacao > 0 ? 'text-destructive' : variacao < 0 ? 'text-success' : 'text-muted-foreground'}`}>
                  {variacao > 0 ? <TrendingUp className="h-3 w-3" /> : variacao < 0 ? <TrendingDown className="h-3 w-3" /> : null}
                  <span>{variacao > 0 ? '+' : ''}{variacao.toFixed(1)}% vs mês anterior</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-success">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium">Folha Líquida</span>
                <DollarSign className="h-4 w-4 text-success" />
              </div>
              <p className="text-lg md:text-xl font-bold truncate">{formatCurrency(totalLiquido)}</p>
              <p className="text-xs text-muted-foreground mt-1">Descontos: {percentDesconto.toFixed(1)}%</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-info">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium">Colaboradores</span>
                <Users className="h-4 w-4 text-info" />
              </div>
              <p className="text-lg md:text-xl font-bold">{formatNumber(uniqueEmployees)}</p>
              <p className="text-xs text-muted-foreground mt-1">{uniquePastas} secretaria{uniquePastas !== 1 ? 's' : ''}</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-warning">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium">Salário Médio</span>
                <Briefcase className="h-4 w-4 text-warning" />
              </div>
              <p className="text-lg md:text-xl font-bold truncate">{formatCurrency(avgSalario)}</p>
              <p className="text-xs text-muted-foreground mt-1">Bruto por colaborador</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ===== EVOLUÇÃO BRUTO vs LÍQUIDO ===== */}
      <div className="mb-6 grid gap-4 grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-2">
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

        {/* PIE Bruto vs Líquido */}
        <Card>
          <CardHeader className="p-4 md:p-6 pb-2">
            <CardTitle className="text-sm md:text-base">Composição da Folha</CardTitle>
            <CardDescription className="text-xs">Líquido vs Descontos ({periodoLabel})</CardDescription>
          </CardHeader>
          <CardContent className="p-2 md:p-6 pt-0">
            <div className="h-56 md:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={brutoLiquidoPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                    <Cell fill="hsl(142, 76%, 36%)" />
                    <Cell fill="hsl(0, 84%, 60%)" />
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== DISTRIBUIÇÃO POR PASTA + FAIXAS ===== */}
      <div className="mb-6 grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Top Pastas */}
        <Card>
          <CardHeader className="p-4 md:p-6 pb-2">
            <CardTitle className="text-sm md:text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Custo por Secretaria
            </CardTitle>
            <CardDescription className="text-xs">Ranking de pastas por folha bruta</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {topPastas.map((p, i) => {
                const pct = totalBruto > 0 ? (p.bruto / totalBruto) * 100 : 0;
                return (
                  <div key={p.pasta}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium truncate mr-2 max-w-[60%]">
                        <span className="text-muted-foreground mr-1">{i + 1}.</span>
                        {p.pasta}
                      </span>
                      <span className="text-muted-foreground whitespace-nowrap">
                        {formatCurrency(p.bruto)} ({pct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: COLORS[i % COLORS.length],
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{p.count} colaboradores</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Faixas Salariais */}
        <Card>
          <CardHeader className="p-4 md:p-6 pb-2">
            <CardTitle className="text-sm md:text-base">Distribuição por Faixa Salarial</CardTitle>
            <CardDescription className="text-xs">Quantidade de colaboradores por faixa ({periodoLabel})</CardDescription>
          </CardHeader>
          <CardContent className="p-2 md:p-6 pt-0">
            <div className="h-56 md:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={faixas} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" width={110} />
                  <Tooltip
                    formatter={(value: number) => [`${value} colaboradores`, 'Quantidade']}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== TOP FUNÇÕES ===== */}
      <div className="mb-6 grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader className="p-4 md:p-6 pb-2">
            <CardTitle className="text-sm md:text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              Top 10 Funções
            </CardTitle>
            <CardDescription className="text-xs">Funções com mais colaboradores</CardDescription>
          </CardHeader>
          <CardContent className="p-2 md:p-6 pt-0">
            <div className="h-56 md:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topFuncoes}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="funcao" tick={{ fontSize: 8 }} stroke="hsl(var(--muted-foreground))" angle={-45} textAnchor="end" height={60} interval={0} />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    formatter={(value: number, name: string) => [name === 'count' ? `${value} colaboradores` : formatCurrency(value), name === 'count' ? 'Quantidade' : 'Custo Bruto']}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" fill="hsl(270, 50%, 50%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* RESUMO AUDITORIA */}
        <Card>
          <CardHeader className="p-4 md:p-6 pb-2">
            <CardTitle className="text-sm md:text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Resumo de Auditoria
            </CardTitle>
            <CardDescription className="text-xs">Alertas identificados em toda a base</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-lg bg-destructive/10">
                  <p className="text-2xl md:text-3xl font-bold text-destructive">{alertsBySeverity.alta}</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground font-medium mt-1">Alta</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-warning/10">
                  <p className="text-2xl md:text-3xl font-bold text-warning">{alertsBySeverity.media}</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground font-medium mt-1">Média</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-info/10">
                  <p className="text-2xl md:text-3xl font-bold text-info">{alertsBySeverity.baixa}</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground font-medium mt-1">Baixa</p>
                </div>
              </div>

              <div className="border-t pt-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Total de alertas</span>
                  <Badge variant={auditAlerts.length > 0 ? 'destructive' : 'secondary'} className="text-[10px]">
                    {auditAlerts.length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Registros analisados</span>
                  <span className="font-medium">{formatNumber(records.length)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Períodos avaliados</span>
                  <span className="font-medium">{periods.length}</span>
                </div>
              </div>

              {auditAlerts.length === 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 text-success text-xs">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">Nenhuma irregularidade encontrada</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== INDICADORES FINAIS ===== */}
      <Card className="mb-6">
        <CardHeader className="p-4 md:p-6 pb-2">
          <CardTitle className="text-sm md:text-base">Indicadores Gerais</CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Total Registros', value: formatNumber(records.length) },
              { label: 'Períodos', value: `${periods.length} meses` },
              { label: 'CPFs Únicos', value: formatNumber(new Set(records.map(r => r.cpf)).size) },
              { label: 'Secretarias', value: formatNumber(new Set(records.map(r => r.pasta)).size) },
              { label: 'Funções', value: formatNumber(new Set(records.map(r => r.funcao)).size) },
              { label: 'Maior Salário', value: formatCurrency(Math.max(...currentRecords.map(r => r.bruto), 0)) },
            ].map(item => (
              <div key={item.label} className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-sm md:text-lg font-bold text-foreground">{item.value}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default Relatorios;
