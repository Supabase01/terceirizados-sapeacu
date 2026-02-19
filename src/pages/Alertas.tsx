import { useMemo, useState } from 'react';
import { usePayrollData } from '@/hooks/usePayrollData';
import { runCPFCrossCheck, runVariationCheck, runInconsistencyCheck, runDuplicateCheck, runNewEmployeeCheck } from '@/lib/auditChecks';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldAlert, AlertTriangle, Eye, Copy, ArrowUpDown, Info, UserPlus } from 'lucide-react';
import { getMonthName } from '@/lib/formatters';
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
  cpf_cruzamento: 'Identifica servidores cujo CPF aparece em mais de uma pasta/secretaria no mesmo mês. Pode indicar acúmulo irregular de cargos ou erro de cadastro.',
  variacao: 'Detecta servidores cujo valor líquido variou mais de 20% em relação ao mês anterior. Variações atípicas podem indicar pagamentos indevidos ou erros de lançamento.',
  inconsistencia: 'Aponta registros onde o valor líquido é igual ao bruto, ou seja, nenhuma retenção (INSS, IR, etc.) foi aplicada. Pode indicar erro no cálculo da folha.',
  duplicado: 'Encontra o mesmo CPF registrado mais de uma vez na mesma pasta e mês. Pode representar pagamento em duplicidade.',
  novo_na_folha: 'Identifica CPFs que aparecem pela primeira vez na folha do mês selecionado, não constando no mês anterior. Pode indicar novas contratações ou inclusões a serem verificadas.',
};

const TYPE_ICONS: Record<string, any> = {
  cpf_cruzamento: ArrowUpDown,
  variacao: AlertTriangle,
  inconsistencia: Eye,
  duplicado: Copy,
  novo_na_folha: UserPlus,
};

const Alertas = () => {
  const { data: records = [], isLoading } = usePayrollData();
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('');

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => set.add(`${r.ano}-${String(r.mes).padStart(2, '0')}`));
    return [...set].sort().reverse();
  }, [records]);

  const selectedMonth = monthFilter || (availableMonths.length > 0 ? availableMonths[0] : '');

  const filteredRecords = useMemo(() => {
    if (!selectedMonth) return records;
    const [ano, mes] = selectedMonth.split('-').map(Number);
    return records.filter(r => r.ano === ano && r.mes === mes);
  }, [records, selectedMonth]);

  // Variation and new employee alerts need all records but filtered to show only alerts for the selected month
  const variationAlerts = useMemo(() => {
    if (!selectedMonth) return runVariationCheck(records);
    const [ano, mes] = selectedMonth.split('-').map(Number);
    return runVariationCheck(records).filter(a => {
      // Only show if the destination month (records[1]) matches selected month
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

  // Other checks only need the selected month's records
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

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-64 items-center justify-center text-muted-foreground">Carregando dados...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">
        <div>
          <h1 className="text-lg md:text-2xl font-bold text-foreground">Alertas</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Verificações automáticas nos dados da folha de pagamento</p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <Select value={selectedMonth} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Selecione o mês" />
            </SelectTrigger>
            <SelectContent>
              {availableMonths.map(m => {
                const [ano, mes] = m.split('-').map(Number);
                return (
                  <SelectItem key={m} value={m}>
                    {getMonthName(mes)} {ano}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

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
    </Layout>
  );
};

export default Alertas;
