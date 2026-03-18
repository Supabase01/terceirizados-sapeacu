import { useMemo, useState } from 'react';
import { usePayrollData } from '@/hooks/usePayrollData';
import { runCPFCrossCheck, runVariationCheck, runInconsistencyCheck, runDuplicateCheck, runNewEmployeeCheck } from '@/lib/auditChecks';
import { formatCurrency, getMonthName } from '@/lib/formatters';
import { exportToPDF, exportToExcel } from '@/lib/exportUtils';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ShieldAlert, AlertTriangle, Eye, Copy, ArrowUpDown, Info, UserPlus, Download, FileText, FileSpreadsheet, Search, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const SEVERITY_STYLES: Record<string, string> = {
  alta: 'bg-destructive text-destructive-foreground',
  media: 'bg-warning text-warning-foreground',
  baixa: 'bg-secondary text-secondary-foreground',
};

const TYPE_LABELS: Record<string, string> = {
  cpf_cruzamento: 'CPF em Múltiplas Pastas',
  variacao: 'Variação > 20%',
  inconsistencia: 'Líquido = Bruto',
  duplicado: 'Duplicado no Mês',
  novo_na_folha: 'Novo na Folha',
};

const TYPE_DESCRIPTIONS: Record<string, string> = {
  cpf_cruzamento: 'Identifica servidores cujo CPF aparece em mais de uma pasta/secretaria no mesmo mês.',
  variacao: 'Detecta servidores cujo valor líquido variou mais de 20% em relação ao mês anterior.',
  inconsistencia: 'Aponta registros onde o valor líquido é igual ao bruto, sem retenções.',
  duplicado: 'Encontra o mesmo CPF registrado mais de uma vez na mesma pasta e mês.',
  novo_na_folha: 'Identifica CPFs que aparecem pela primeira vez na folha do mês selecionado.',
};

const TYPE_ICONS: Record<string, any> = {
  cpf_cruzamento: ArrowUpDown,
  variacao: AlertTriangle,
  inconsistencia: Eye,
  duplicado: Copy,
  novo_na_folha: UserPlus,
};

const ALERT_TYPE_LABELS: Record<string, string> = {
  cpf_cruzamento: 'CPF Múltiplas Pastas',
  variacao: 'Variação > 20%',
  inconsistencia: 'Líquido = Bruto',
  duplicado: 'Duplicado',
  novo_na_folha: 'Novo na Folha',
};

// =================== TAB ALERTAS ===================
const TabAlertasContent = ({ records, selectedMonth }: { records: any[]; selectedMonth: string }) => {
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredRecords = useMemo(() => {
    if (!selectedMonth) return records;
    const [ano, mes] = selectedMonth.split('-').map(Number);
    return records.filter(r => r.ano === ano && r.mes === mes);
  }, [records, selectedMonth]);

  const variationAlerts = useMemo(() => {
    if (!selectedMonth) return runVariationCheck(records);
    const [ano, mes] = selectedMonth.split('-').map(Number);
    return runVariationCheck(records).filter(a => {
      const dest = a.records[1];
      return dest && dest.ano === ano && dest.mes === mes;
    });
  }, [records, selectedMonth]);

  const newEmployeeAlerts = useMemo(() => {
    if (!selectedMonth) return runNewEmployeeCheck(records);
    const [ano, mes] = selectedMonth.split('-').map(Number);
    return runNewEmployeeCheck(records).filter(a =>
      a.records.some(r => r.ano === ano && r.mes === mes)
    );
  }, [records, selectedMonth]);

  const allAlerts = useMemo(() => [
    ...runCPFCrossCheck(filteredRecords),
    ...variationAlerts,
    ...runInconsistencyCheck(filteredRecords),
    ...runDuplicateCheck(filteredRecords),
    ...newEmployeeAlerts,
  ], [filteredRecords, variationAlerts, newEmployeeAlerts]);

  const filteredAlerts = useMemo(() => {
    if (typeFilter === 'all') return allAlerts;
    return allAlerts.filter(a => a.type === typeFilter);
  }, [allAlerts, typeFilter]);

  const counts = useMemo(() => ({
    cpf_cruzamento: runCPFCrossCheck(filteredRecords).length,
    variacao: variationAlerts.length,
    inconsistencia: runInconsistencyCheck(filteredRecords).length,
    duplicado: runDuplicateCheck(filteredRecords).length,
    novo_na_folha: newEmployeeAlerts.length,
  }), [filteredRecords, variationAlerts, newEmployeeAlerts]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os alertas ({allAlerts.length})</SelectItem>
            {Object.entries(TYPE_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label} ({counts[key as keyof typeof counts]})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2 md:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {(Object.entries(counts) as [string, number][]).map(([type, count]) => {
          const Icon = TYPE_ICONS[type];
          const isActive = typeFilter === type;
          return (
            <Card
              key={type}
              className={cn(
                'cursor-pointer transition-all hover:shadow-md',
                isActive && 'ring-2 ring-primary shadow-md'
              )}
              onClick={() => setTypeFilter(isActive ? 'all' : type)}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-1 p-3 md:p-6 md:pb-2">
                <CardTitle className="text-[11px] md:text-sm font-medium text-muted-foreground leading-tight">{TYPE_LABELS[type]}</CardTitle>
                <Icon className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground shrink-0" />
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                <div className="text-xl md:text-3xl font-bold">{count}</div>
                <p className="text-[10px] md:text-xs text-muted-foreground">alertas</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {typeFilter !== 'all' && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-start gap-3 p-4">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-medium text-sm text-foreground">{TYPE_LABELS[typeFilter]}</p>
              <p className="text-sm text-muted-foreground mt-1">{TYPE_DESCRIPTIONS[typeFilter]}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {filteredAlerts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
            <ShieldAlert className="mb-3 h-12 w-12" />
            <p className="font-medium">Nenhum alerta encontrado</p>
            <p className="text-sm">{records.length === 0 ? 'Importe dados para iniciar a auditoria.' : 'Os dados estão limpos para os critérios selecionados.'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2 md:space-y-3">
          {filteredAlerts.map((alert, i) => {
            const Icon = TYPE_ICONS[alert.type];
            return (
              <Card key={i} className="border-l-4 overflow-hidden" style={{ borderLeftColor: alert.severity === 'alta' ? 'hsl(var(--destructive))' : alert.severity === 'media' ? 'hsl(var(--warning))' : 'hsl(var(--muted))' }}>
                <CardHeader className="p-3 md:p-6 pb-1.5 md:pb-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Icon className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0" />
                      <CardTitle className="text-xs md:text-sm truncate">{alert.title}</CardTitle>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="outline" className="text-[10px] md:text-xs px-1.5 py-0">{TYPE_LABELS[alert.type]}</Badge>
                      <Badge className={cn('text-[10px] md:text-xs px-1.5 py-0', SEVERITY_STYLES[alert.severity])}>{alert.severity}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                  <CardDescription className="text-[11px] md:text-sm leading-relaxed">{alert.description}</CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

// =================== TAB COMPARATIVO ===================
type VariationType = 'todos' | 'admissoes' | 'desligamentos' | 'aumentos' | 'reducoes' | 'sem_alteracao';

interface ComparisonRow {
  nome: string;
  cpf: string;
  brutoA: number;
  brutoB: number;
  variacaoRS: number;
  variacaoPct: number;
  type: VariationType;
}

const PAGE_SIZE = 20;

const TabComparativo = ({ records }: { records: any[] }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [variationType, setVariationType] = useState<VariationType>('todos');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const periods = useMemo(() => {
    const monthKeys = [...new Set(records.map(r => `${r.ano}-${String(r.mes).padStart(2, '0')}`))].sort();
    const pairs: { key: string; label: string; anoA: number; mesA: number; anoB: number; mesB: number }[] = [];
    for (let i = 0; i < monthKeys.length - 1; i++) {
      const [anoA, mesA] = monthKeys[i].split('-').map(Number);
      const [anoB, mesB] = monthKeys[i + 1].split('-').map(Number);
      pairs.push({ key: `${anoA}-${mesA}-${anoB}-${mesB}`, label: `${getMonthName(mesA)} vs ${getMonthName(mesB)}`, anoA, mesA, anoB, mesB });
    }
    return pairs;
  }, [records]);

  const activePeriod = useMemo(() => {
    if (selectedPeriod) return periods.find(p => p.key === selectedPeriod);
    return periods[periods.length - 1] || null;
  }, [periods, selectedPeriod]);

  const comparisonRows = useMemo((): ComparisonRow[] => {
    if (!activePeriod) return [];
    const { anoA, mesA, anoB, mesB } = activePeriod;
    const mapA = new Map<string, { nome: string; bruto: number }>();
    const mapB = new Map<string, { nome: string; bruto: number }>();
    records.forEach(r => {
      if (r.ano === anoA && r.mes === mesA) {
        const existing = mapA.get(r.cpf);
        mapA.set(r.cpf, { nome: r.nome, bruto: (existing?.bruto || 0) + r.bruto });
      }
      if (r.ano === anoB && r.mes === mesB) {
        const existing = mapB.get(r.cpf);
        mapB.set(r.cpf, { nome: r.nome, bruto: (existing?.bruto || 0) + r.bruto });
      }
    });
    const allCPFs = new Set([...mapA.keys(), ...mapB.keys()]);
    const rows: ComparisonRow[] = [];
    allCPFs.forEach(cpf => {
      const a = mapA.get(cpf);
      const b = mapB.get(cpf);
      const brutoA = a?.bruto || 0;
      const brutoB = b?.bruto || 0;
      const variacaoRS = brutoB - brutoA;
      const variacaoPct = brutoA > 0 ? ((brutoB - brutoA) / brutoA) * 100 : (brutoB > 0 ? 100 : 0);
      const nome = b?.nome || a?.nome || '';
      let type: VariationType = 'sem_alteracao';
      if (!a && b) type = 'admissoes';
      else if (a && !b) type = 'desligamentos';
      else if (variacaoRS > 0) type = 'aumentos';
      else if (variacaoRS < 0) type = 'reducoes';
      rows.push({ nome, cpf, brutoA, brutoB, variacaoRS, variacaoPct, type });
    });
    return rows.sort((a, b) => Math.abs(b.variacaoRS) - Math.abs(a.variacaoRS));
  }, [records, activePeriod]);

  const filtered = useMemo(() => {
    return comparisonRows.filter(r => {
      if (variationType !== 'todos' && r.type !== variationType) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!r.nome.toLowerCase().includes(s) && !r.cpf.includes(s)) return false;
      }
      return true;
    });
  }, [comparisonRows, variationType, search]);

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const handleExport = (type: 'pdf' | 'excel') => {
    if (!activePeriod || filtered.length === 0) return;
    const exportData = filtered.map(r => ({
      nome: r.nome, cpf: r.cpf,
      brutoA: formatCurrency(r.brutoA), brutoB: formatCurrency(r.brutoB),
      variacaoRS: formatCurrency(r.variacaoRS),
      variacaoPct: `${r.variacaoPct > 0 ? '+' : ''}${r.variacaoPct.toFixed(2)}%`,
    }));
    const opts = {
      title: 'Comparativo de Colaboradores', subtitle: activePeriod.label,
      fileName: `comparativo_${activePeriod.key}`,
      columns: [
        { header: 'Nome', key: 'nome' },
        { header: 'CPF', key: 'cpf' },
        { header: `Bruto ${getMonthName(activePeriod.mesA)}`, key: 'brutoA', align: 'right' as const },
        { header: `Bruto ${getMonthName(activePeriod.mesB)}`, key: 'brutoB', align: 'right' as const },
        { header: 'Variação (R$)', key: 'variacaoRS', align: 'right' as const },
        { header: 'Variação (%)', key: 'variacaoPct', align: 'right' as const },
      ],
      data: exportData,
    };
    type === 'pdf' ? exportToPDF(opts) : exportToExcel(opts);
  };

  return (
    <>
      {activePeriod && filtered.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="text-xs md:text-sm gap-1.5" onClick={() => handleExport('excel')}>
            <Download className="h-3.5 w-3.5" /> Excel
          </Button>
          <Button variant="outline" size="sm" className="text-xs md:text-sm gap-1.5" onClick={() => handleExport('pdf')}>
            <FileText className="h-3.5 w-3.5" /> PDF
          </Button>
        </div>
      )}

      <Card className="mb-6">
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-base md:text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            <div className="space-y-1">
              <label className="text-xs md:text-sm font-medium text-primary">Período</label>
              <Select value={activePeriod?.key || ''} onValueChange={v => { setSelectedPeriod(v); setPage(0); }}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {periods.map(p => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs md:text-sm font-medium text-primary">Tipo de Variação</label>
              <Select value={variationType} onValueChange={v => { setVariationType(v as VariationType); setPage(0); }}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="admissoes">Admissões</SelectItem>
                  <SelectItem value="desligamentos">Desligamentos</SelectItem>
                  <SelectItem value="aumentos">Aumentos</SelectItem>
                  <SelectItem value="reducoes">Reduções</SelectItem>
                  <SelectItem value="sem_alteracao">Sem Alteração</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:col-span-2 lg:col-span-1">
              <label className="text-xs md:text-sm font-medium text-primary">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Nome ou CPF..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="pl-10" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {activePeriod && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 md:p-6">
            <div>
              <CardTitle className="text-base md:text-lg">{activePeriod.label}</CardTitle>
              <CardDescription className="text-xs md:text-sm">Comparativo de remuneração bruta</CardDescription>
            </div>
            <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
              Página {page + 1} de {totalPages || 1}
              <Button variant="outline" size="icon" className="h-7 w-7 md:h-8 md:w-8" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-7 w-7 md:h-8 md:w-8" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead className="text-right">Bruto {getMonthName(activePeriod.mesA)}</TableHead>
                  <TableHead className="text-right">Bruto {getMonthName(activePeriod.mesB)}</TableHead>
                  <TableHead className="text-right">Variação (R$)</TableHead>
                  <TableHead className="text-right">Variação (%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum registro encontrado.</TableCell>
                  </TableRow>
                ) : (
                  paged.map((r, i) => (
                    <TableRow key={r.cpf + i}>
                      <TableCell className="font-medium text-xs md:text-sm whitespace-nowrap">{r.nome}</TableCell>
                      <TableCell className="font-mono text-xs">{r.cpf}</TableCell>
                      <TableCell className="text-right text-xs md:text-sm whitespace-nowrap">{formatCurrency(r.brutoA)}</TableCell>
                      <TableCell className="text-right text-xs md:text-sm whitespace-nowrap">{formatCurrency(r.brutoB)}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 text-xs md:text-sm font-semibold ${r.variacaoRS < 0 ? 'text-destructive' : r.variacaoRS > 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                          {r.variacaoRS < 0 ? <ArrowDown className="h-3 w-3" /> : r.variacaoRS > 0 ? <ArrowUp className="h-3 w-3" /> : null}
                          {formatCurrency(Math.abs(r.variacaoRS))}
                        </span>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <span className={`text-xs md:text-sm font-semibold ${r.variacaoPct < 0 ? 'text-destructive' : r.variacaoPct > 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                          {r.variacaoPct > 0 ? '+' : ''}{r.variacaoPct.toFixed(2)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              <TableFooter>
                {(() => {
                  const totalA = filtered.reduce((s, r) => s + r.brutoA, 0);
                  const totalB = filtered.reduce((s, r) => s + r.brutoB, 0);
                  const totalVar = totalB - totalA;
                  const totalPct = totalA > 0 ? ((totalB - totalA) / totalA) * 100 : 0;
                  return (
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell className="text-xs md:text-sm">Total ({filtered.length} colaboradores)</TableCell>
                      <TableCell />
                      <TableCell className="text-right text-xs md:text-sm whitespace-nowrap">{formatCurrency(totalA)}</TableCell>
                      <TableCell className="text-right text-xs md:text-sm whitespace-nowrap">{formatCurrency(totalB)}</TableCell>
                      <TableCell className="text-right text-xs md:text-sm whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 ${totalVar < 0 ? 'text-destructive' : totalVar > 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                          {totalVar < 0 ? <ArrowDown className="h-3 w-3" /> : totalVar > 0 ? <ArrowUp className="h-3 w-3" /> : null}
                          {formatCurrency(Math.abs(totalVar))}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-xs md:text-sm whitespace-nowrap">
                        <span className={`${totalPct < 0 ? 'text-destructive' : totalPct > 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                          {totalPct > 0 ? '+' : ''}{totalPct.toFixed(2)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })()}
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
};

// =================== TAB TOP SALÁRIOS ===================
const TabTopSalarios = ({ records, periodLabel, selectedPeriod }: { records: any[]; periodLabel: string; selectedPeriod: string }) => {
  const filteredRecords = useMemo(() => {
    if (selectedPeriod === 'all') return records;
    const [ano, mes] = selectedPeriod.split('-').map(Number);
    return records.filter(r => r.ano === ano && r.mes === mes);
  }, [records, selectedPeriod]);

  const topSalarios = useMemo(() => {
    return [...filteredRecords].sort((a, b) => b.bruto - a.bruto).slice(0, 20);
  }, [filteredRecords]);

  const handleExport = (type: 'pdf' | 'excel') => {
    const opts = {
      title: 'Top 20 Maiores Salários', subtitle: periodLabel,
      fileName: `relatorio-top-salarios-${selectedPeriod}`,
      columns: [
        { header: 'Nome', key: 'nome' },
        { header: 'CPF', key: 'cpf' },
        { header: 'Função', key: 'funcao' },
        { header: 'Secretaria', key: 'pasta' },
        { header: 'Bruto', key: 'brutoFmt', align: 'right' as const },
        { header: 'Líquido', key: 'liquidoFmt', align: 'right' as const },
      ],
      data: topSalarios.map(r => ({ ...r, brutoFmt: formatCurrency(r.bruto), liquidoFmt: formatCurrency(r.liquido) })),
    };
    type === 'pdf' ? exportToPDF(opts) : exportToExcel(opts);
  };

  return (
    <Card>
      <CardHeader className="p-4 md:p-6 flex flex-row items-center justify-between">
        <CardTitle className="text-sm md:text-base">Top 20 Maiores Salários</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('pdf')} className="gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('excel')} className="gap-1.5 text-xs">
            <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 md:p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Secretaria</TableHead>
                <TableHead className="text-right">Bruto</TableHead>
                <TableHead className="text-right">Líquido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topSalarios.map((row, i) => (
                <TableRow key={`${row.cpf}-${i}`}>
                  <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-medium text-xs md:text-sm">{row.nome}</TableCell>
                  <TableCell className="text-xs md:text-sm font-mono">{row.cpf}</TableCell>
                  <TableCell className="text-xs md:text-sm">{row.funcao}</TableCell>
                  <TableCell className="text-xs md:text-sm">{row.pasta}</TableCell>
                  <TableCell className="text-right text-xs md:text-sm font-medium">{formatCurrency(row.bruto)}</TableCell>
                  <TableCell className="text-right text-xs md:text-sm">{formatCurrency(row.liquido)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

// =================== MAIN COMPONENT ===================
const Alertas = () => {
  const { data: records = [], isLoading } = usePayrollData();
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => set.add(`${r.ano}-${String(r.mes).padStart(2, '0')}`));
    return [...set].sort().reverse();
  }, [records]);

  const periods = useMemo(() => {
    const set = new Map<string, { ano: number; mes: number }>();
    records.forEach(r => {
      const key = `${r.ano}-${r.mes}`;
      if (!set.has(key)) set.set(key, { ano: r.ano, mes: r.mes });
    });
    return [...set.values()].sort((a, b) => a.ano * 12 + a.mes - (b.ano * 12 + b.mes));
  }, [records]);

  const periodLabel = useMemo(() => {
    if (selectedPeriod === 'all') return 'Todos os períodos';
    const [ano, mes] = selectedPeriod.split('-').map(Number);
    return `${getMonthName(mes)}/${ano}`;
  }, [selectedPeriod]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-64 items-center justify-center text-muted-foreground">Carregando dados...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-4 md:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 md:gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5 md:mb-1">
            <ShieldAlert className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            <h1 className="text-lg md:text-2xl font-bold text-foreground">Auditoria</h1>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground">Verificações e análises nos dados da folha de pagamento</p>
        </div>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Período" /></SelectTrigger>
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

      <Tabs defaultValue="alertas" className="w-full">
        <div className="overflow-x-auto scrollbar-hide -mx-3 px-3 md:mx-0 md:px-0 mb-4">
          <TabsList className="w-max sm:w-auto inline-flex">
            <TabsTrigger value="alertas" className="text-xs md:text-sm px-2.5 md:px-3">Alertas</TabsTrigger>
            <TabsTrigger value="salarios" className="text-xs md:text-sm px-2.5 md:px-3">Top Salários</TabsTrigger>
            <TabsTrigger value="comparativo" className="text-xs md:text-sm px-2.5 md:px-3">Comparativo</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="alertas">
          <TabAlertasContent records={records} selectedMonth={selectedPeriod === 'all' ? (availableMonths[0] || '') : selectedPeriod} />
        </TabsContent>

        <TabsContent value="salarios">
          <TabTopSalarios records={records} periodLabel={periodLabel} selectedPeriod={selectedPeriod} />
        </TabsContent>

        <TabsContent value="comparativo">
          <TabComparativo records={records} />
        </TabsContent>
      </Tabs>
    </Layout>
  );
};

export default Alertas;