import { useMemo, useState } from 'react';
import { usePayrollData } from '@/hooks/usePayrollData';
import { formatCurrency, formatNumber, getMonthName, getMonthShort } from '@/lib/formatters';
import { exportToPDF, exportToExcel } from '@/lib/exportUtils';
import { runCPFCrossCheck, runVariationCheck, runInconsistencyCheck, runDuplicateCheck, runNewEmployeeCheck } from '@/lib/auditChecks';
import type { DashboardFilters, AuditAlert } from '@/types/payroll';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, FileSpreadsheet, Download, Search, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, ShieldAlert } from 'lucide-react';

// =================== COMPARATIVO TYPES ===================
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

// =================== COMPARATIVO TAB ===================
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
      pairs.push({
        key: `${anoA}-${mesA}-${anoB}-${mesB}`,
        label: `${getMonthName(mesA)} vs ${getMonthName(mesB)}`,
        anoA, mesA, anoB, mesB,
      });
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
      title: 'Comparativo de Colaboradores',
      subtitle: activePeriod.label,
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
      {/* Export buttons */}
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

      {/* Filters */}
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
          {filtered.length > 0 && (
            <p className="mt-3 text-xs md:text-sm text-muted-foreground">
              Mostrando <strong>{filtered.length}</strong> colaboradores
            </p>
          )}
        </CardContent>
      </Card>

      {/* Table */}
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

// =================== DETALHAMENTO TAB ===================
const DETAIL_PAGE_SIZE = 15;

const TabDetalhamento = ({ records }: { records: any[] }) => {
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

  const paged = filtered.slice(page * DETAIL_PAGE_SIZE, (page + 1) * DETAIL_PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / DETAIL_PAGE_SIZE);

  const handleExport = (type: 'pdf' | 'excel') => {
    const exportData = filtered.map(r => ({
      nome: r.nome, cpf: r.cpf, funcao: r.funcao, pasta: r.pasta,
      mesAno: `${getMonthShort(r.mes)}/${r.ano}`,
      bruto: formatCurrency(r.bruto), liquido: formatCurrency(r.liquido),
    }));
    const opts = {
      title: 'Detalhamento da Folha',
      subtitle: `${formatNumber(filtered.length)} registros`,
      fileName: 'detalhamento_folha',
      columns: [
        { header: 'Nome', key: 'nome' },
        { header: 'CPF', key: 'cpf' },
        { header: 'Função', key: 'funcao' },
        { header: 'Pasta', key: 'pasta' },
        { header: 'Mês/Ano', key: 'mesAno' },
        { header: 'Bruto', key: 'bruto', align: 'right' as const },
        { header: 'Líquido', key: 'liquido', align: 'right' as const },
      ],
      data: exportData,
    };
    type === 'pdf' ? exportToPDF(opts) : exportToExcel(opts);
  };

  return (
    <>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
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
          <Input placeholder="Buscar por nome ou CPF..." value={filters.search} onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(0); }} className="pl-10" />
        </div>
      </div>

      {/* Export */}
      {filtered.length > 0 && (
        <div className="mb-4 flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => handleExport('excel')}>
            <Download className="h-3.5 w-3.5" /> Excel
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => handleExport('pdf')}>
            <FileText className="h-3.5 w-3.5" /> PDF
          </Button>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between p-4 md:p-6">
          <CardTitle className="text-sm md:text-base">Registros ({formatNumber(filtered.length)})</CardTitle>
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
          <Table className="min-w-[700px]">
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
                    {records.length === 0 ? 'Nenhum dado importado ainda.' : 'Nenhum registro encontrado com os filtros aplicados.'}
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((r, i) => (
                  <TableRow key={r.id || i}>
                    <TableCell className="font-medium text-xs md:text-sm">{r.nome}</TableCell>
                    <TableCell className="font-mono text-xs">{r.cpf}</TableCell>
                    <TableCell className="text-xs md:text-sm">{r.funcao}</TableCell>
                    <TableCell className="text-xs md:text-sm">{r.pasta}</TableCell>
                    <TableCell className="text-xs md:text-sm">{getMonthShort(r.mes)}/{r.ano}</TableCell>
                    <TableCell className="text-right text-xs md:text-sm">{formatCurrency(r.bruto)}</TableCell>
                    <TableCell className="text-right text-xs md:text-sm">{formatCurrency(r.liquido)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
};

const ExportButtons = ({ onExport }: { onExport: (type: 'pdf' | 'excel') => void }) => (
  <div className="flex gap-2">
    <Button variant="outline" size="sm" onClick={() => onExport('pdf')} className="gap-1.5 text-xs">
      <Download className="h-3.5 w-3.5" /> PDF
    </Button>
    <Button variant="outline" size="sm" onClick={() => onExport('excel')} className="gap-1.5 text-xs">
      <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
    </Button>
  </div>
);

const SEVERITY_STYLES: Record<string, string> = {
  alta: 'bg-destructive text-destructive-foreground',
  media: 'bg-warning text-warning-foreground',
  baixa: 'bg-secondary text-secondary-foreground',
};

const ALERT_TYPE_LABELS: Record<string, string> = {
  cpf_cruzamento: 'CPF Múltiplas Pastas',
  variacao: 'Variação > 20%',
  inconsistencia: 'Líquido = Bruto',
  duplicado: 'Duplicado',
  novo_na_folha: 'Novo na Folha',
};

// =================== ALERTAS TAB ===================
const TabAlertas = ({ records }: { records: any[] }) => {
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const allAlerts = useMemo(() => [
    ...runCPFCrossCheck(records),
    ...runVariationCheck(records),
    ...runInconsistencyCheck(records),
    ...runDuplicateCheck(records),
    ...runNewEmployeeCheck(records),
  ], [records]);

  const filteredAlerts = useMemo(() => {
    if (typeFilter === 'all') return allAlerts;
    return allAlerts.filter(a => a.type === typeFilter);
  }, [allAlerts, typeFilter]);

  const handleExport = (type: 'pdf' | 'excel') => {
    const exportData = filteredAlerts.map(a => ({
      tipo: ALERT_TYPE_LABELS[a.type] || a.type,
      severidade: a.severity,
      titulo: a.title,
      descricao: a.description,
    }));
    const opts = {
      title: 'Relatório de Alertas',
      subtitle: `${filteredAlerts.length} alertas encontrados`,
      fileName: 'relatorio_alertas',
      columns: [
        { header: 'Tipo', key: 'tipo' },
        { header: 'Severidade', key: 'severidade' },
        { header: 'Título', key: 'titulo' },
        { header: 'Descrição', key: 'descricao' },
      ],
      data: exportData,
    };
    type === 'pdf' ? exportToPDF(opts) : exportToExcel(opts);
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os alertas ({allAlerts.length})</SelectItem>
            {Object.entries(ALERT_TYPE_LABELS).map(([key, label]) => {
              const count = allAlerts.filter(a => a.type === key).length;
              return <SelectItem key={key} value={key}>{label} ({count})</SelectItem>;
            })}
          </SelectContent>
        </Select>
        {filteredAlerts.length > 0 && (
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => handleExport('excel')}>
              <Download className="h-3.5 w-3.5" /> Excel
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => handleExport('pdf')}>
              <FileText className="h-3.5 w-3.5" /> PDF
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-sm md:text-base">Alertas ({filteredAlerts.length})</CardTitle>
          <CardDescription className="text-xs md:text-sm">Verificações automáticas nos dados da folha</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Severidade</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Descrição</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAlerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    <div className="flex flex-col items-center gap-2">
                      <ShieldAlert className="h-8 w-8" />
                      <p>Nenhum alerta encontrado.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAlerts.map((alert, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs md:text-sm whitespace-nowrap">
                      <Badge variant="outline" className="text-xs">{ALERT_TYPE_LABELS[alert.type]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${SEVERITY_STYLES[alert.severity]}`}>{alert.severity}</Badge>
                    </TableCell>
                    <TableCell className="text-xs md:text-sm font-medium">{alert.title}</TableCell>
                    <TableCell className="text-xs md:text-sm text-muted-foreground">{alert.description}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
};

// =================== MAIN COMPONENT ===================
const Relatorios = () => {
  const { data: records = [], isLoading } = usePayrollData();
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');

  const periods = useMemo(() => {
    const set = new Map<string, { ano: number; mes: number }>();
    records.forEach(r => {
      const key = `${r.ano}-${r.mes}`;
      if (!set.has(key)) set.set(key, { ano: r.ano, mes: r.mes });
    });
    return [...set.values()].sort((a, b) => a.ano * 12 + a.mes - (b.ano * 12 + b.mes));
  }, [records]);

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

  const totalBruto = filteredRecords.reduce((s, r) => s + r.bruto, 0);

  const bySecretaria = useMemo(() => {
    const grouped: Record<string, { pasta: string; count: number; bruto: number; liquido: number }> = {};
    filteredRecords.forEach(r => {
      if (!grouped[r.pasta]) grouped[r.pasta] = { pasta: r.pasta, count: 0, bruto: 0, liquido: 0 };
      grouped[r.pasta].bruto += r.bruto;
      grouped[r.pasta].liquido += r.liquido;
      grouped[r.pasta].count++;
    });
    const uniqueCount: Record<string, Set<string>> = {};
    filteredRecords.forEach(r => {
      if (!uniqueCount[r.pasta]) uniqueCount[r.pasta] = new Set();
      uniqueCount[r.pasta].add(r.cpf);
    });
    return Object.values(grouped)
      .map(g => ({
        ...g,
        uniqueCount: uniqueCount[g.pasta]?.size || 0,
        descontos: g.bruto - g.liquido,
        pctTotal: totalBruto > 0 ? (g.bruto / totalBruto) * 100 : 0,
      }))
      .sort((a, b) => b.bruto - a.bruto);
  }, [filteredRecords, totalBruto]);

  const byFuncao = useMemo(() => {
    const grouped: Record<string, { funcao: string; cpfs: Set<string>; bruto: number }> = {};
    filteredRecords.forEach(r => {
      const f = r.funcao || 'Não informado';
      if (!grouped[f]) grouped[f] = { funcao: f, cpfs: new Set(), bruto: 0 };
      grouped[f].cpfs.add(r.cpf);
      grouped[f].bruto += r.bruto;
    });
    return Object.values(grouped)
      .map(g => ({ funcao: g.funcao, qtd: g.cpfs.size, bruto: g.bruto, media: g.cpfs.size > 0 ? g.bruto / g.cpfs.size : 0 }))
      .sort((a, b) => b.qtd - a.qtd);
  }, [filteredRecords]);

  const topSalarios = useMemo(() => {
    return [...filteredRecords].sort((a, b) => b.bruto - a.bruto).slice(0, 20);
  }, [filteredRecords]);

  const exportSecretaria = (type: 'pdf' | 'excel') => {
    const opts = {
      title: 'Relatório por Secretaria', subtitle: periodLabel,
      fileName: `relatorio-secretaria-${selectedPeriod}`,
      columns: [
        { header: 'Secretaria', key: 'pasta' },
        { header: 'Colaboradores', key: 'uniqueCount', align: 'right' as const },
        { header: 'Total Bruto', key: 'brutoFmt', align: 'right' as const },
        { header: 'Total Líquido', key: 'liquidoFmt', align: 'right' as const },
        { header: 'Descontos', key: 'descontosFmt', align: 'right' as const },
        { header: '% do Total', key: 'pctFmt', align: 'right' as const },
      ],
      data: bySecretaria.map(r => ({
        ...r, brutoFmt: formatCurrency(r.bruto), liquidoFmt: formatCurrency(r.liquido),
        descontosFmt: formatCurrency(r.descontos), pctFmt: `${r.pctTotal.toFixed(1)}%`,
      })),
    };
    type === 'pdf' ? exportToPDF(opts) : exportToExcel(opts);
  };

  const exportFuncao = (type: 'pdf' | 'excel') => {
    const opts = {
      title: 'Relatório por Função', subtitle: periodLabel,
      fileName: `relatorio-funcao-${selectedPeriod}`,
      columns: [
        { header: 'Função', key: 'funcao' },
        { header: 'Qtd', key: 'qtd', align: 'right' as const },
        { header: 'Total Bruto', key: 'brutoFmt', align: 'right' as const },
        { header: 'Média Bruto', key: 'mediaFmt', align: 'right' as const },
      ],
      data: byFuncao.map(r => ({ ...r, brutoFmt: formatCurrency(r.bruto), mediaFmt: formatCurrency(r.media) })),
    };
    type === 'pdf' ? exportToPDF(opts) : exportToExcel(opts);
  };

  const exportTopSalarios = (type: 'pdf' | 'excel') => {
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
      <div className="mb-4 md:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 md:gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5 md:mb-1">
            <FileText className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            <h1 className="text-lg md:text-2xl font-bold text-foreground">Relatórios</h1>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground">
            {records[0]?.prefeitura || 'Prefeitura'} — <span className="font-medium text-foreground">{periodLabel}</span>
          </p>
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

      <Tabs defaultValue="detalhamento" className="w-full">
        <div className="overflow-x-auto scrollbar-hide -mx-3 px-3 md:mx-0 md:px-0 mb-4">
          <TabsList className="w-max sm:w-auto inline-flex">
            <TabsTrigger value="detalhamento" className="text-xs md:text-sm px-2.5 md:px-3">Detalhamento</TabsTrigger>
            <TabsTrigger value="secretaria" className="text-xs md:text-sm px-2.5 md:px-3">Secretaria</TabsTrigger>
            <TabsTrigger value="funcao" className="text-xs md:text-sm px-2.5 md:px-3">Função</TabsTrigger>
            <TabsTrigger value="salarios" className="text-xs md:text-sm px-2.5 md:px-3">Top Salários</TabsTrigger>
            <TabsTrigger value="comparativo" className="text-xs md:text-sm px-2.5 md:px-3">Comparativo</TabsTrigger>
            <TabsTrigger value="alertas" className="text-xs md:text-sm px-2.5 md:px-3">Alertas</TabsTrigger>
          </TabsList>
        </div>

        {/* DETALHAMENTO */}
        <TabsContent value="detalhamento">
          <TabDetalhamento records={records} />
        </TabsContent>

        {/* POR SECRETARIA */}
        <TabsContent value="secretaria">
          <Card>
            <CardHeader className="p-4 md:p-6 flex flex-row items-center justify-between">
              <CardTitle className="text-sm md:text-base">Relatório por Secretaria</CardTitle>
              <ExportButtons onExport={exportSecretaria} />
            </CardHeader>
            <CardContent className="p-0 md:p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Secretaria</TableHead>
                      <TableHead className="text-right">Colaboradores</TableHead>
                      <TableHead className="text-right">Total Bruto</TableHead>
                      <TableHead className="text-right">Total Líquido</TableHead>
                      <TableHead className="text-right">Descontos</TableHead>
                      <TableHead className="text-right">% do Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bySecretaria.map(row => (
                      <TableRow key={row.pasta}>
                        <TableCell className="font-medium text-xs md:text-sm">{row.pasta}</TableCell>
                        <TableCell className="text-right text-xs md:text-sm">{formatNumber(row.uniqueCount)}</TableCell>
                        <TableCell className="text-right text-xs md:text-sm">{formatCurrency(row.bruto)}</TableCell>
                        <TableCell className="text-right text-xs md:text-sm">{formatCurrency(row.liquido)}</TableCell>
                        <TableCell className="text-right text-xs md:text-sm">{formatCurrency(row.descontos)}</TableCell>
                        <TableCell className="text-right text-xs md:text-sm font-medium">{row.pctTotal.toFixed(1)}%</TableCell>
                      </TableRow>
                    ))}
                    {bySecretaria.length > 0 && (
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell className="text-xs md:text-sm">TOTAL</TableCell>
                        <TableCell className="text-right text-xs md:text-sm">{formatNumber(new Set(filteredRecords.map(r => r.cpf)).size)}</TableCell>
                        <TableCell className="text-right text-xs md:text-sm">{formatCurrency(totalBruto)}</TableCell>
                        <TableCell className="text-right text-xs md:text-sm">{formatCurrency(filteredRecords.reduce((s, r) => s + r.liquido, 0))}</TableCell>
                        <TableCell className="text-right text-xs md:text-sm">{formatCurrency(totalBruto - filteredRecords.reduce((s, r) => s + r.liquido, 0))}</TableCell>
                        <TableCell className="text-right text-xs md:text-sm">100%</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* POR FUNÇÃO */}
        <TabsContent value="funcao">
          <Card>
            <CardHeader className="p-4 md:p-6 flex flex-row items-center justify-between">
              <CardTitle className="text-sm md:text-base">Relatório por Função</CardTitle>
              <ExportButtons onExport={exportFuncao} />
            </CardHeader>
            <CardContent className="p-0 md:p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Função</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Total Bruto</TableHead>
                      <TableHead className="text-right">Média Bruto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byFuncao.map(row => (
                      <TableRow key={row.funcao}>
                        <TableCell className="font-medium text-xs md:text-sm">{row.funcao}</TableCell>
                        <TableCell className="text-right text-xs md:text-sm">{formatNumber(row.qtd)}</TableCell>
                        <TableCell className="text-right text-xs md:text-sm">{formatCurrency(row.bruto)}</TableCell>
                        <TableCell className="text-right text-xs md:text-sm">{formatCurrency(row.media)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TOP SALÁRIOS */}
        <TabsContent value="salarios">
          <Card>
            <CardHeader className="p-4 md:p-6 flex flex-row items-center justify-between">
              <CardTitle className="text-sm md:text-base">Top 20 Maiores Salários</CardTitle>
              <ExportButtons onExport={exportTopSalarios} />
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
        </TabsContent>

        {/* COMPARATIVO */}
        <TabsContent value="comparativo">
          <TabComparativo records={records} />
        </TabsContent>

        {/* ALERTAS */}
        <TabsContent value="alertas">
          <TabAlertas records={records} />
        </TabsContent>
      </Tabs>
    </Layout>
  );
};

export default Relatorios;
