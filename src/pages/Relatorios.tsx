import { useMemo, useState } from 'react';
import { usePayrollData } from '@/hooks/usePayrollData';
import { formatCurrency, formatNumber, getMonthShort, getMonthName } from '@/lib/formatters';
import { runAllChecks } from '@/lib/auditChecks';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
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
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');

  // All periods sorted
  const periods = useMemo(() => {
    const set = new Map<string, { ano: number; mes: number }>();
    records.forEach(r => {
      const key = `${r.ano}-${r.mes}`;
      if (!set.has(key)) set.set(key, { ano: r.ano, mes: r.mes });
    });
    return [...set.values()].sort((a, b) => a.ano * 12 + a.mes - (b.ano * 12 + b.mes));
  }, [records]);

  // Filtered records based on selected period
  const filteredRecords = useMemo(() => {
    if (selectedPeriod === 'all') return records;
    const [ano, mes] = selectedPeriod.split('-').map(Number);
    return records.filter(r => r.ano === ano && r.mes === mes);
  }, [records, selectedPeriod]);

  const periodLabel = useMemo(() => {
    if (selectedPeriod === 'all') return 'Todos os períodos';
    const [ano, mes] = selectedPeriod.split('-').map(Number);
    return `${getMonthName(mes)}/${ano}`;
  }, [selectedPeriod]);

  // === RESUMO GERAL ===
  const totalBruto = filteredRecords.reduce((s, r) => s + r.bruto, 0);
  const totalLiquido = filteredRecords.reduce((s, r) => s + r.liquido, 0);
  const totalDescontos = totalBruto - totalLiquido;
  const percentDesconto = totalBruto > 0 ? (totalDescontos / totalBruto) * 100 : 0;
  const uniqueEmployees = new Set(filteredRecords.map(r => r.cpf)).size;
  const uniquePastas = new Set(filteredRecords.map(r => r.pasta)).size;
  const avgSalario = uniqueEmployees > 0 ? totalBruto / uniqueEmployees : 0;

  // === TOP PASTAS ===
  const topPastas = useMemo(() => {
    const grouped: Record<string, { pasta: string; bruto: number; liquido: number; count: number }> = {};
    filteredRecords.forEach(r => {
      if (!grouped[r.pasta]) grouped[r.pasta] = { pasta: r.pasta, bruto: 0, liquido: 0, count: 0 };
      grouped[r.pasta].bruto += r.bruto;
      grouped[r.pasta].liquido += r.liquido;
      grouped[r.pasta].count++;
    });
    return Object.values(grouped).sort((a, b) => b.bruto - a.bruto);
  }, [filteredRecords]);

  // === TOP FUNÇÕES ===
  const topFuncoes = useMemo(() => {
    const grouped: Record<string, { funcao: string; count: number; bruto: number }> = {};
    filteredRecords.forEach(r => {
      const f = r.funcao || 'Não informado';
      if (!grouped[f]) grouped[f] = { funcao: f, count: 0, bruto: 0 };
      grouped[f].count++;
      grouped[f].bruto += r.bruto;
    });
    return Object.values(grouped).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [filteredRecords]);

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
      count: filteredRecords.filter(r => r.bruto >= range.min && r.bruto <= range.max).length,
    }));
  }, [filteredRecords]);

  // === AUDITORIA RESUMO ===
  const auditAlerts = useMemo(() => runAllChecks(filteredRecords), [filteredRecords]);
  const alertsBySeverity = useMemo(() => ({
    alta: auditAlerts.filter(a => a.severity === 'alta').length,
    media: auditAlerts.filter(a => a.severity === 'media').length,
    baixa: auditAlerts.filter(a => a.severity === 'baixa').length,
  }), [auditAlerts]);

  const prefeitura = records[0]?.prefeitura || 'Prefeitura';

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
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-5 w-5 text-primary" />
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Relatórios</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {prefeitura} — <span className="font-medium text-foreground">{periodLabel}</span>
          </p>
        </div>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os períodos</SelectItem>
            {periods.map(p => (
              <SelectItem key={`${p.ano}-${p.mes}`} value={`${p.ano}-${p.mes}`}>
                {getMonthName(p.mes)}/{p.ano}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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

      {/* ===== COMPOSIÇÃO + FAIXAS ===== */}
      <div className="mb-6 grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* PIE Bruto vs Líquido */}
        <Card>
          <CardHeader className="p-4 md:p-6 pb-2">
            <CardTitle className="text-sm md:text-base">Composição da Folha</CardTitle>
            <CardDescription className="text-xs">Líquido vs Descontos</CardDescription>
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

        {/* Faixas Salariais */}
        <Card>
          <CardHeader className="p-4 md:p-6 pb-2">
            <CardTitle className="text-sm md:text-base">Distribuição por Faixa Salarial</CardTitle>
            <CardDescription className="text-xs">Quantidade de colaboradores por faixa</CardDescription>
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

      {/* ===== DISTRIBUIÇÃO POR PASTA + TOP FUNÇÕES ===== */}
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

        {/* Top Funções */}
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
      </div>

      {/* ===== RESUMO AUDITORIA ===== */}
      <div className="mb-6 grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader className="p-4 md:p-6 pb-2">
            <CardTitle className="text-sm md:text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Resumo de Auditoria
            </CardTitle>
            <CardDescription className="text-xs">Alertas identificados nos dados filtrados</CardDescription>
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
                  <span className="font-medium">{formatNumber(filteredRecords.length)}</span>
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

        {/* Indicadores Gerais */}
        <Card>
          <CardHeader className="p-4 md:p-6 pb-2">
            <CardTitle className="text-sm md:text-base">Indicadores Gerais</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: 'Total Registros', value: formatNumber(filteredRecords.length) },
                { label: 'CPFs Únicos', value: formatNumber(uniqueEmployees) },
                { label: 'Secretarias', value: formatNumber(uniquePastas) },
                { label: 'Funções', value: formatNumber(new Set(filteredRecords.map(r => r.funcao)).size) },
                { label: 'Maior Salário', value: formatCurrency(Math.max(...filteredRecords.map(r => r.bruto), 0)) },
                { label: 'Menor Salário', value: formatCurrency(Math.min(...filteredRecords.map(r => r.bruto), 0)) },
              ].map(item => (
                <div key={item.label} className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-sm md:text-lg font-bold text-foreground">{item.value}</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground mt-1">{item.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Relatorios;
