import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePayrollData } from '@/hooks/usePayrollData';
import { formatCurrency } from '@/lib/formatters';
import { getMonthName } from '@/lib/formatters';
import { exportToExcel, exportToPDF } from '@/lib/exportUtils';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Search, Home, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Download, FileText } from 'lucide-react';

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

const Comparativo = () => {
  const { data: records = [], isLoading } = usePayrollData();
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [variationType, setVariationType] = useState<VariationType>('todos');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  // Build available periods (consecutive month pairs)
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

  // Auto-select last period
  const activePeriod = useMemo(() => {
    if (selectedPeriod) return periods.find(p => p.key === selectedPeriod);
    return periods[periods.length - 1] || null;
  }, [periods, selectedPeriod]);

  // Build comparison rows
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

  // Filter rows
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
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Comparativo Detalhado</h1>
          <p className="text-sm text-muted-foreground">Evolução salarial individual por período</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
          <Home className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </div>

      {/* Export buttons */}
      {activePeriod && filtered.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs md:text-sm"
            onClick={() => {
              const exportData = filtered.map(r => ({
                nome: r.nome,
                cpf: r.cpf,
                brutoA: formatCurrency(r.brutoA),
                brutoB: formatCurrency(r.brutoB),
                variacaoRS: formatCurrency(r.variacaoRS),
                variacaoPct: `${r.variacaoPct > 0 ? '+' : ''}${r.variacaoPct.toFixed(2)}%`,
              }));
              exportToExcel({
                title: 'Comparativo',
                columns: [
                  { header: 'Nome', key: 'nome' },
                  { header: 'CPF', key: 'cpf' },
                  { header: `Bruto ${getMonthName(activePeriod.mesA)}`, key: 'brutoA', align: 'right' },
                  { header: `Bruto ${getMonthName(activePeriod.mesB)}`, key: 'brutoB', align: 'right' },
                  { header: 'Variação (R$)', key: 'variacaoRS', align: 'right' },
                  { header: 'Variação (%)', key: 'variacaoPct', align: 'right' },
                ],
                data: exportData,
                fileName: `comparativo_${activePeriod.key}`,
              });
            }}
          >
            <Download className="mr-1.5 h-4 w-4" /> Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs md:text-sm"
            onClick={() => {
              const exportData = filtered.map(r => ({
                nome: r.nome,
                cpf: r.cpf,
                brutoA: formatCurrency(r.brutoA),
                brutoB: formatCurrency(r.brutoB),
                variacaoRS: formatCurrency(r.variacaoRS),
                variacaoPct: `${r.variacaoPct > 0 ? '+' : ''}${r.variacaoPct.toFixed(2)}%`,
              }));
              exportToPDF({
                title: 'Comparativo de Colaboradores',
                subtitle: activePeriod.label,
                columns: [
                  { header: 'Nome', key: 'nome' },
                  { header: 'CPF', key: 'cpf' },
                  { header: `Bruto ${getMonthName(activePeriod.mesA)}`, key: 'brutoA', align: 'right' },
                  { header: `Bruto ${getMonthName(activePeriod.mesB)}`, key: 'brutoB', align: 'right' },
                  { header: 'Variação (R$)', key: 'variacaoRS', align: 'right' },
                  { header: 'Variação (%)', key: 'variacaoPct', align: 'right' },
                ],
                data: exportData,
                fileName: `comparativo_${activePeriod.key}`,
              });
            }}
          >
            <FileText className="mr-1.5 h-4 w-4" /> PDF
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
              <Select
                value={activePeriod?.key || ''}
                onValueChange={v => { setSelectedPeriod(v); setPage(0); }}
              >
                <SelectTrigger className="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {periods.map(p => (
                    <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs md:text-sm font-medium text-primary">Tipo de Variação</label>
              <Select
                value={variationType}
                onValueChange={v => { setVariationType(v as VariationType); setPage(0); }}
              >
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
                <Input
                  placeholder="Nome ou CPF..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(0); }}
                  className="pl-10"
                />
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

      {/* Comparison Table */}
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
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum registro encontrado.
                    </TableCell>
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
            </Table>
          </CardContent>
        </Card>
      )}
    </Layout>
  );
};

export default Comparativo;
