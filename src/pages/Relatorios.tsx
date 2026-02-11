import { useMemo, useState } from 'react';
import { usePayrollData } from '@/hooks/usePayrollData';
import { formatCurrency, formatNumber, getMonthName } from '@/lib/formatters';
import { exportToPDF, exportToExcel } from '@/lib/exportUtils';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { FileText, FileSpreadsheet, Download } from 'lucide-react';

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

  // ===== POR SECRETARIA =====
  const bySecretaria = useMemo(() => {
    const grouped: Record<string, { pasta: string; count: number; bruto: number; liquido: number }> = {};
    filteredRecords.forEach(r => {
      if (!grouped[r.pasta]) grouped[r.pasta] = { pasta: r.pasta, count: 0, bruto: 0, liquido: 0 };
      const cpfs = new Set<string>();
      grouped[r.pasta].bruto += r.bruto;
      grouped[r.pasta].liquido += r.liquido;
      grouped[r.pasta].count++;
    });
    // Recalculate unique count per pasta
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

  // ===== POR FUNÇÃO =====
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

  // ===== TOP SALÁRIOS =====
  const topSalarios = useMemo(() => {
    return [...filteredRecords]
      .sort((a, b) => b.bruto - a.bruto)
      .slice(0, 20);
  }, [filteredRecords]);

  // Export helpers
  const exportSecretaria = (type: 'pdf' | 'excel') => {
    const opts = {
      title: 'Relatório por Secretaria',
      subtitle: periodLabel,
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
        ...r,
        brutoFmt: formatCurrency(r.bruto),
        liquidoFmt: formatCurrency(r.liquido),
        descontosFmt: formatCurrency(r.descontos),
        pctFmt: `${r.pctTotal.toFixed(1)}%`,
      })),
    };
    type === 'pdf' ? exportToPDF(opts) : exportToExcel(opts);
  };

  const exportFuncao = (type: 'pdf' | 'excel') => {
    const opts = {
      title: 'Relatório por Função',
      subtitle: periodLabel,
      fileName: `relatorio-funcao-${selectedPeriod}`,
      columns: [
        { header: 'Função', key: 'funcao' },
        { header: 'Qtd', key: 'qtd', align: 'right' as const },
        { header: 'Total Bruto', key: 'brutoFmt', align: 'right' as const },
        { header: 'Média Bruto', key: 'mediaFmt', align: 'right' as const },
      ],
      data: byFuncao.map(r => ({
        ...r,
        brutoFmt: formatCurrency(r.bruto),
        mediaFmt: formatCurrency(r.media),
      })),
    };
    type === 'pdf' ? exportToPDF(opts) : exportToExcel(opts);
  };

  const exportTopSalarios = (type: 'pdf' | 'excel') => {
    const opts = {
      title: 'Top 20 Maiores Salários',
      subtitle: periodLabel,
      fileName: `relatorio-top-salarios-${selectedPeriod}`,
      columns: [
        { header: 'Nome', key: 'nome' },
        { header: 'CPF', key: 'cpf' },
        { header: 'Função', key: 'funcao' },
        { header: 'Secretaria', key: 'pasta' },
        { header: 'Bruto', key: 'brutoFmt', align: 'right' as const },
        { header: 'Líquido', key: 'liquidoFmt', align: 'right' as const },
      ],
      data: topSalarios.map(r => ({
        ...r,
        brutoFmt: formatCurrency(r.bruto),
        liquidoFmt: formatCurrency(r.liquido),
      })),
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

  return (
    <Layout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-5 w-5 text-primary" />
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Relatórios</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {records[0]?.prefeitura || 'Prefeitura'} — <span className="font-medium text-foreground">{periodLabel}</span>
          </p>
        </div>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Período" /></SelectTrigger>
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

      <Tabs defaultValue="secretaria" className="w-full">
        <TabsList className="mb-4 w-full sm:w-auto">
          <TabsTrigger value="secretaria" className="flex-1 sm:flex-none">Por Secretaria</TabsTrigger>
          <TabsTrigger value="funcao" className="flex-1 sm:flex-none">Por Função</TabsTrigger>
          <TabsTrigger value="salarios" className="flex-1 sm:flex-none">Top Salários</TabsTrigger>
        </TabsList>

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
      </Tabs>
    </Layout>
  );
};

export default Relatorios;
