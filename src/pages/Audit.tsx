import { useMemo, useState } from 'react';
import { usePayrollData } from '@/hooks/usePayrollData';
import { runAllChecks, runCPFCrossCheck, runVariationCheck, runInconsistencyCheck, runGhostCheck } from '@/lib/auditChecks';
import type { AuditAlert } from '@/types/payroll';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldAlert, AlertTriangle, Eye, Ghost, ArrowUpDown } from 'lucide-react';

const SEVERITY_STYLES: Record<string, string> = {
  alta: 'bg-destructive text-destructive-foreground',
  media: 'bg-warning text-warning-foreground',
  baixa: 'bg-secondary text-secondary-foreground',
};

const TYPE_LABELS: Record<string, string> = {
  cpf_cruzamento: 'CPF em Múltiplas Pastas',
  variacao: 'Variação > 20%',
  inconsistencia: 'Líquido = Bruto',
  fantasma: 'Funcionário Fantasma',
};

const TYPE_ICONS: Record<string, any> = {
  cpf_cruzamento: ArrowUpDown,
  variacao: AlertTriangle,
  inconsistencia: Eye,
  fantasma: Ghost,
};

const Audit = () => {
  const { data: records = [], isLoading } = usePayrollData();
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const allAlerts = useMemo(() => runAllChecks(records), [records]);

  const filteredAlerts = useMemo(() => {
    if (typeFilter === 'all') return allAlerts;
    return allAlerts.filter(a => a.type === typeFilter);
  }, [allAlerts, typeFilter]);

  const counts = useMemo(() => ({
    cpf_cruzamento: runCPFCrossCheck(records).length,
    variacao: runVariationCheck(records).length,
    inconsistencia: runInconsistencyCheck(records).length,
    fantasma: runGhostCheck(records).length,
  }), [records]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-64 items-center justify-center text-muted-foreground">Carregando dados...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Módulo de Auditoria</h1>
          <p className="text-sm text-muted-foreground">Verificações automáticas nos dados da folha de pagamento</p>
        </div>

        {/* Summary cards */}
        <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.entries(counts) as [string, number][]).map(([type, count]) => {
            const Icon = TYPE_ICONS[type];
            return (
              <Card
                key={type}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setTypeFilter(typeFilter === type ? 'all' : type)}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{TYPE_LABELS[type]}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
                  <div className="text-2xl md:text-3xl font-bold">{count}</div>
                  <p className="text-xs text-muted-foreground">alertas encontrados</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-56">
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

        {/* Alerts */}
        {filteredAlerts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
              <ShieldAlert className="mb-3 h-12 w-12" />
              <p className="font-medium">Nenhum alerta encontrado</p>
              <p className="text-sm">{records.length === 0 ? 'Importe dados para iniciar a auditoria.' : 'Os dados estão limpos para os critérios selecionados.'}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredAlerts.map((alert, i) => {
              const Icon = TYPE_ICONS[alert.type];
              return (
                <Card key={i} className="border-l-4" style={{ borderLeftColor: alert.severity === 'alta' ? 'hsl(var(--destructive))' : alert.severity === 'media' ? 'hsl(var(--warning))' : 'hsl(var(--muted))' }}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <CardTitle className="text-sm">{alert.title}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{TYPE_LABELS[alert.type]}</Badge>
                        <Badge className={SEVERITY_STYLES[alert.severity]}>{alert.severity}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{alert.description}</CardDescription>
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

export default Audit;
