import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnidade } from '@/contexts/UnidadeContext';
import { useToast } from '@/hooks/use-toast';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SearchableSelect } from '@/components/SearchableSelect';
import { Loader2, Receipt, Download, User2 } from 'lucide-react';
import ContrachequeDetalhado from '@/components/ContrachequeDetalhado';
import { downloadMultipleContracheques } from '@/lib/contrachequePdf';

const monthName = (m: number) =>
  ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][m-1] || '';

const formatBRL = (v: number) =>
  (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const RelatorioContracheque = () => {
  const { unidadeId, unidadePadrao } = useUnidade();
  const isPadrao02 = unidadePadrao === 'padrao_02';
  const { toast } = useToast();

  const [colaboradorId, setColaboradorId] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRegistro, setPreviewRegistro] = useState<any | null>(null);

  // Fetch colaboradores
  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores-contracheque', unidadeId],
    queryFn: async () => {
      const PAGE = 1000;
      let all: any[] = [];
      let from = 0;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from('colaboradores')
          .select('id, nome, cpf, matricula')
          .eq('unidade_id', unidadeId!)
          .eq('ativo', true)
          .order('nome')
          .range(from, from + PAGE - 1);
        if (error) throw error;
        all = all.concat(data || []);
        hasMore = (data?.length ?? 0) === PAGE;
        from += PAGE;
      }
      return all;
    },
    enabled: !!unidadeId,
  });

  // Fetch contracheques (folhas processadas/liberadas) for selected colaborador
  const { data: registros = [], isLoading } = useQuery({
    queryKey: ['contracheques-colaborador', colaboradorId, unidadeId],
    queryFn: async () => {
      const PAGE = 1000;
      let all: any[] = [];
      let from = 0;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from('folha_processamento')
          .select('*')
          .eq('unidade_id', unidadeId!)
          .eq('colaborador_id', colaboradorId)
          .in('status', ['processado', 'liberado'])
          .order('ano', { ascending: false })
          .order('mes', { ascending: false })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        all = all.concat(data || []);
        hasMore = (data?.length ?? 0) === PAGE;
        from += PAGE;
      }
      return all;
    },
    enabled: !!unidadeId && !!colaboradorId,
  });

  const colaboradorOptions = useMemo(
    () => colaboradores.map((c: any) => ({
      value: c.id,
      label: `${c.nome}${c.matricula ? ` — Mat. ${c.matricula}` : ''} ${c.cpf ? `(${c.cpf})` : ''}`.trim(),
    })),
    [colaboradores],
  );

  const allSelected = registros.length > 0 && selectedIds.size === registros.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(registros.map((r: any) => r.id)));
  };

  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleColaboradorChange = (id: string) => {
    setColaboradorId(id);
    setSelectedIds(new Set());
  };

  const handleGeneratePDF = async () => {
    const selecionados = registros.filter((r: any) => selectedIds.has(r.id));
    if (selecionados.length === 0) {
      toast({ title: 'Selecione ao menos um contracheque', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    try {
      await downloadMultipleContracheques(selecionados, unidadeId!, isPadrao02);
      toast({ title: 'PDF gerado', description: `${selecionados.length} contracheque(s) exportado(s).` });
    } catch (err: any) {
      toast({ title: 'Erro ao gerar PDF', description: err.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const colaboradorSelecionado = colaboradores.find((c: any) => c.id === colaboradorId);

  return (
    <Layout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contracheques</h1>
          <p className="text-sm text-muted-foreground">
            Selecione um colaborador, marque os contracheques desejados e gere o PDF.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User2 className="h-4 w-4 text-muted-foreground" />
              Colaborador
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-w-xl">
              <SearchableSelect
                options={colaboradorOptions}
                value={colaboradorId}
                onChange={handleColaboradorChange}
                placeholder="Buscar colaborador por nome, matrícula ou CPF..."
              />
            </div>
            {colaboradorSelecionado && (
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <Badge variant="outline">{colaboradorSelecionado.nome}</Badge>
                {colaboradorSelecionado.matricula && (
                  <Badge variant="outline">Mat. {colaboradorSelecionado.matricula}</Badge>
                )}
                {colaboradorSelecionado.cpf && (
                  <Badge variant="outline">CPF: {colaboradorSelecionado.cpf}</Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {colaboradorId && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                  Contracheques disponíveis
                  <span className="text-xs font-normal text-muted-foreground">
                    ({selectedIds.size} selecionado{selectedIds.size === 1 ? '' : 's'} de {registros.length})
                  </span>
                </CardTitle>
                <Button
                  onClick={handleGeneratePDF}
                  disabled={generating || selectedIds.size === 0}
                  size="sm"
                >
                  {generating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                  Gerar PDF ({selectedIds.size})
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : registros.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Receipt className="h-10 w-10 mb-2 opacity-40" />
                  <p className="text-sm">Nenhum contracheque processado para este colaborador.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                            onCheckedChange={toggleAll}
                            aria-label="Selecionar todos"
                          />
                        </TableHead>
                        <TableHead>Competência</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden md:table-cell">Função</TableHead>
                        <TableHead className="hidden md:table-cell">Secretaria</TableHead>
                        <TableHead className="text-right">Bruto</TableHead>
                        <TableHead className="text-right">Descontos</TableHead>
                        <TableHead className="text-right">Líquido</TableHead>
                        <TableHead className="text-center w-20">Visualizar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {registros.map((r: any) => (
                        <TableRow
                          key={r.id}
                          className={selectedIds.has(r.id) ? 'bg-muted/40' : ''}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(r.id)}
                              onCheckedChange={() => toggleOne(r.id)}
                              aria-label={`Selecionar ${monthName(r.mes)}/${r.ano}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {monthName(r.mes)} / {r.ano}
                          </TableCell>
                          <TableCell>
                            <Badge variant={r.status === 'liberado' ? 'default' : 'secondary'} className="text-[10px]">
                              {r.status === 'liberado' ? 'Liberado' : 'Processado'}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground text-xs">{r.funcao || '—'}</TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground text-xs">{r.secretaria || '—'}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatBRL(Number(r.bruto))}</TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">{formatBRL(Number(r.total_descontos))}</TableCell>
                          <TableCell className="text-right tabular-nums font-semibold">{formatBRL(Number(r.liquido))}</TableCell>
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8"
                              onClick={() => { setPreviewRegistro(r); setPreviewOpen(true); }}
                            >
                              Ver
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <ContrachequeDetalhado
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        registro={previewRegistro}
        unidadeId={unidadeId || ''}
        isPadrao02={isPadrao02}
      />
    </Layout>
  );
};

export default RelatorioContracheque;
