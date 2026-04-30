import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUnidade } from '@/contexts/UnidadeContext';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Search, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/SearchableSelect';
import { RegraCalculoFields, isRegraCalculoValid, type ModoCalculo, type BaseCalculo } from '@/components/RegraCalculoFields';
import { descontoSchema, zodErrorMap } from '@/lib/validators/financeiro';
import { roundMoney } from '@/lib/money';

type Escopo = 'global' | 'grupo' | 'individual';
type TipoVigencia = 'recorrente' | 'prazo' | 'eventual';

interface DescontoForm {
  colaborador_ids: string[];
  descricao: string;
  valor: string;
  is_percentual: boolean;
  escopo: Escopo;
  tipo: TipoVigencia;
  mes: string;
  ano: string;
  mes_fim: string;
  ano_fim: string;
  modo_calculo: ModoCalculo;
  percentual: string;
  base_calculo: BaseCalculo | '';
  quantidade: string;
  valor_unitario: string;
}

const emptyForm: DescontoForm = {
  colaborador_ids: [], descricao: '', valor: '', is_percentual: false,
  escopo: 'individual', tipo: 'recorrente',
  mes: '', ano: '', mes_fim: '', ano_fim: '',
  modo_calculo: 'fixo', percentual: '', base_calculo: '',
  quantidade: '', valor_unitario: '',
};

const escopoLabel = (e: string) => e === 'global' ? 'Global' : e === 'grupo' ? 'Grupo' : 'Individual';
const tipoLabel = (t: string) => t === 'eventual' ? 'Eventual' : t === 'prazo' ? 'Por prazo' : 'Recorrente';

const Descontos = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { unidadeId } = useUnidade();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<DescontoForm>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [filterEscopo, setFilterEscopo] = useState<string>('todos');
  const [filterTipo, setFilterTipo] = useState<string>('todos');

  const { data: descontos = [], isLoading } = useQuery({
    queryKey: ['descontos', unidadeId],
    queryFn: async () => {
      let query = supabase
        .from('descontos')
        .select('*, colaboradores(nome, cpf)')
        .order('created_at', { ascending: false });
      if (unidadeId) query = query.eq('unidade_id', unidadeId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!unidadeId,
  });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores-ativos', unidadeId],
    queryFn: async () => {
      let query = supabase.from('colaboradores').select('id, nome, cpf, salario_base').eq('ativo', true).order('nome');
      if (unidadeId) query = query.eq('unidade_id', unidadeId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!unidadeId,
  });

  const { data: rubricas = [] } = useQuery({
    queryKey: ['rubricas-desconto', unidadeId],
    queryFn: async () => {
      let query = supabase.from('rubricas').select('*').eq('ativo', true).eq('tipo', 'desconto').order('codigo');
      if (unidadeId) query = query.eq('unidade_id', unidadeId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!unidadeId,
  });

  const colaboradorOptions = colaboradores.map((c: any) => ({
    value: c.id,
    label: c.nome,
    sublabel: c.cpf,
  }));

  const saveMutation = useMutation({
    mutationFn: async () => {
      const parsed = descontoSchema.safeParse(form);
      if (!parsed.success) {
        setErrors(zodErrorMap(parsed.error));
        throw new Error('Corrija os campos destacados antes de salvar');
      }
      setErrors({});

      const isPercentual = form.modo_calculo === 'percentual';
      const isQuantidade = form.modo_calculo === 'quantidade';
      const percentualNum = Number(form.percentual) || 0;
      const qtdNum = Number(form.quantidade) || 0;
      const vuNum = Number(form.valor_unitario) || 0;
      const isPrazo = form.tipo === 'prazo';
      const isEventual = form.tipo === 'eventual';

      const computeValorFor = (colaborador: any | null): number => {
        if (isPercentual) {
          const base = Number(colaborador?.salario_base) || 0;
          return roundMoney(base * (percentualNum / 100));
        }
        if (isQuantidade) return roundMoney(qtdNum * vuNum);
        return roundMoney(Number(form.valor) || 0);
      };

      const basePayload: any = {
        descricao: form.descricao,
        is_percentual: form.is_percentual,
        escopo: form.escopo,
        tipo: form.tipo,
        mes: (isPrazo || isEventual) ? Number(form.mes) : null,
        ano: (isPrazo || isEventual) ? Number(form.ano) : null,
        mes_fim: isPrazo ? Number(form.mes_fim) : null,
        ano_fim: isPrazo ? Number(form.ano_fim) : null,
        unidade_id: unidadeId,
        modo_calculo: form.modo_calculo,
        percentual: isPercentual ? percentualNum : null,
        base_calculo: isPercentual ? form.base_calculo || null : null,
        quantidade: isQuantidade ? qtdNum : null,
        valor_unitario: isQuantidade ? vuNum : null,
      };

      if (editId) {
        const colab = colaboradores.find((c: any) => c.id === form.colaborador_ids[0]);
        const payload = {
          ...basePayload,
          valor: computeValorFor(form.escopo === 'global' ? null : colab),
          colaborador_id: form.escopo === 'global' ? null : (form.colaborador_ids[0] || null),
        };
        const { error } = await supabase.from('descontos').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        if (form.escopo === 'global') {
          const { error } = await supabase.from('descontos').insert({
            ...basePayload,
            valor: computeValorFor(null),
            colaborador_id: null,
          });
          if (error) throw error;
        } else {
          const rows = form.colaborador_ids.map(cid => {
            const colab = colaboradores.find((c: any) => c.id === cid);
            return { ...basePayload, valor: computeValorFor(colab), colaborador_id: cid };
          });
          if (rows.length === 0) throw new Error('Selecione ao menos um colaborador');
          const { error } = await supabase.from('descontos').insert(rows);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['descontos'] });
      toast({ title: editId ? 'Desconto atualizado' : 'Desconto cadastrado' });
      closeDialog();
    },
    onError: (e: any) => toast({ title: e?.message || 'Erro ao salvar', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('descontos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['descontos'] });
      toast({ title: 'Desconto removido' });
    },
  });

  const closeDialog = () => { setDialogOpen(false); setEditId(null); setForm(emptyForm); setErrors({}); };

  const openEdit = (item: any) => {
    setEditId(item.id);
    setForm({
      colaborador_ids: item.colaborador_id ? [item.colaborador_id] : [],
      descricao: item.descricao,
      valor: String(item.valor),
      is_percentual: item.is_percentual,
      escopo: (item.escopo as Escopo) || 'individual',
      tipo: (item.tipo as TipoVigencia) || 'recorrente',
      mes: item.mes ? String(item.mes) : '',
      ano: item.ano ? String(item.ano) : '',
      mes_fim: item.mes_fim ? String(item.mes_fim) : '',
      ano_fim: item.ano_fim ? String(item.ano_fim) : '',
      modo_calculo: (item.modo_calculo as ModoCalculo) || 'fixo',
      percentual: item.percentual != null ? String(item.percentual) : '',
      base_calculo: (item.base_calculo as BaseCalculo) || '',
      quantidade: item.quantidade != null ? String(item.quantidade) : '',
      valor_unitario: item.valor_unitario != null ? String(item.valor_unitario) : '',
    });
    setDialogOpen(true);
  };

  const filtered = descontos.filter((d: any) => {
    const matchSearch = d.descricao.toLowerCase().includes(search.toLowerCase()) ||
      (d.colaboradores as any)?.nome?.toLowerCase().includes(search.toLowerCase());
    const matchEscopo = filterEscopo === 'todos' || d.escopo === filterEscopo;
    const matchTipo = filterTipo === 'todos' || (d.tipo || 'recorrente') === filterTipo;
    return matchSearch && matchEscopo && matchTipo;
  });

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const formatCompetencia = (item: any) => {
    if ((item.tipo || 'recorrente') === 'recorrente') return 'Recorrente';
    const inicio = `${String(item.mes).padStart(2, '0')}/${item.ano}`;
    if (item.mes_fim && item.ano_fim) {
      const fim = `${String(item.mes_fim).padStart(2, '0')}/${item.ano_fim}`;
      return `${inicio} → ${fim}`;
    }
    return inicio;
  };

  const valorOk = isRegraCalculoValid({
    modo_calculo: form.modo_calculo,
    valor: form.valor,
    percentual: form.percentual,
    base_calculo: form.base_calculo,
    quantidade: form.quantidade,
    valor_unitario: form.valor_unitario,
  });

  const escopoOk =
    form.escopo === 'global' ? true :
    form.escopo === 'individual' ? form.colaborador_ids.length === 1 :
    form.colaborador_ids.length >= 1;

  const vigenciaOk =
    form.tipo === 'recorrente' ? true :
    form.tipo === 'eventual' ? !!(form.mes && form.ano) :
    !!(form.mes && form.ano && form.mes_fim && form.ano_fim);

  const canSave = !!form.descricao.trim() && valorOk && escopoOk && vigenciaOk;

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Descontos</h1>
          <Button onClick={() => setDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Novo Desconto
          </Button>
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos tipos</SelectItem>
              <SelectItem value="recorrente">Recorrente</SelectItem>
              <SelectItem value="prazo">Por prazo</SelectItem>
              <SelectItem value="eventual">Eventual</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterEscopo} onValueChange={setFilterEscopo}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos escopos</SelectItem>
              <SelectItem value="global">Global</SelectItem>
              <SelectItem value="grupo">Grupo</SelectItem>
              <SelectItem value="individual">Individual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Escopo</TableHead>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="hidden md:table-cell">Competência</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="hidden lg:table-cell">Cadastrado em</TableHead>
                    <TableHead className="w-28">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum desconto encontrado</TableCell></TableRow>
                  ) : (
                    filtered.map((item: any) => {
                      const esc = item.escopo || 'individual';
                      const tp = item.tipo || 'recorrente';
                      return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.descricao}</TableCell>
                        <TableCell>
                          <Badge variant={esc === 'global' ? 'destructive' : esc === 'grupo' ? 'default' : 'secondary'}>
                            {escopoLabel(esc)}
                          </Badge>
                        </TableCell>
                        <TableCell>{esc === 'global' ? 'Todos' : (item.colaboradores as any)?.nome || '—'}</TableCell>
                        <TableCell>
                          <Badge variant={tp === 'recorrente' ? 'default' : 'secondary'}>
                            {tipoLabel(tp)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{formatCompetencia(item)}</TableCell>
                        <TableCell className="text-right font-mono">
                          {item.modo_calculo === 'percentual' ? (
                            <span className="text-xs text-muted-foreground font-sans">
                              {Number(item.percentual || 0).toFixed(2)}% sobre {item.base_calculo === 'bruto' ? 'bruto' : 'salário base'}
                            </span>
                          ) : item.modo_calculo === 'quantidade' ? (
                            <span>
                              {formatCurrency(item.valor)}
                              <span className="ml-1 text-xs text-muted-foreground font-sans">({Number(item.quantidade || 0)} × {formatCurrency(Number(item.valor_unitario || 0))})</span>
                            </span>
                          ) : item.is_percentual ? `${item.valor}%` : formatCurrency(item.valor)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">
                          {new Date(item.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteMutation.mutate(item.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editId ? 'Editar Desconto' : 'Novo Desconto'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            {/* ===== Escopo ===== */}
            <div className="space-y-2">
              <Label>Escopo *</Label>
              <Select
                value={form.escopo}
                onValueChange={(v) => setForm(p => ({
                  ...p,
                  escopo: v as Escopo,
                  colaborador_ids: v === 'global' ? [] : p.colaborador_ids,
                }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global — Todos os colaboradores</SelectItem>
                  <SelectItem value="grupo">Grupo — Vários colaboradores selecionados</SelectItem>
                  <SelectItem value="individual">Individual — Um único colaborador</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {form.escopo === 'global' && 'Aplicado automaticamente a todos os ativos.'}
                {form.escopo === 'grupo' && 'Selecione os colaboradores que receberão este desconto.'}
                {form.escopo === 'individual' && 'Selecione exatamente um colaborador.'}
              </p>
            </div>

            {form.escopo === 'individual' && (
              <div className="space-y-2">
                <Label>Colaborador *</Label>
                <SearchableSelect
                  options={colaboradorOptions}
                  value={form.colaborador_ids[0] || ''}
                  onValueChange={(v) => setForm(p => ({ ...p, colaborador_ids: v ? [v] : [] }))}
                  placeholder="Selecione o colaborador"
                  emptyText="Nenhum colaborador encontrado"
                />
                {errors.colaborador_ids && <p className="text-xs text-destructive">{errors.colaborador_ids}</p>}
              </div>
            )}
            {form.escopo === 'grupo' && (
              <div className="space-y-2">
                <Label>Colaboradores * <span className="text-xs text-muted-foreground">({form.colaborador_ids.length} selecionado{form.colaborador_ids.length === 1 ? '' : 's'})</span></Label>
                {editId ? (
                  <SearchableSelect
                    options={colaboradorOptions}
                    value={form.colaborador_ids[0] || ''}
                    onValueChange={(v) => setForm(p => ({ ...p, colaborador_ids: v ? [v] : [] }))}
                    placeholder="Selecione o colaborador"
                    emptyText="Nenhum colaborador encontrado"
                  />
                ) : (
                  <SearchableSelect
                    multiple
                    options={colaboradorOptions}
                    values={form.colaborador_ids}
                    onValuesChange={(v) => setForm(p => ({ ...p, colaborador_ids: v }))}
                    placeholder="Selecione os colaboradores"
                    emptyText="Nenhum colaborador encontrado"
                  />
                )}
                {editId && <p className="text-xs text-muted-foreground">Edição altera apenas este registro do grupo.</p>}
                {errors.colaborador_ids && <p className="text-xs text-destructive">{errors.colaborador_ids}</p>}
              </div>
            )}

            <div className="space-y-2">
              <Label>Rubrica *</Label>
              {rubricas.length > 0 ? (
                <SearchableSelect
                  options={rubricas.map((r: any) => ({ value: r.nome, label: `${r.codigo} - ${r.nome}` }))}
                  value={form.descricao}
                  onValueChange={(v) => setForm(p => ({ ...p, descricao: v }))}
                  placeholder="Selecione a rubrica"
                  emptyText="Nenhuma rubrica encontrada"
                />
              ) : (
                <div className="text-sm text-muted-foreground border border-dashed rounded-md p-3">
                  Nenhuma rubrica de desconto cadastrada nesta unidade. Cadastre em <strong>Folha → Rubricas</strong> antes de continuar.
                </div>
              )}
              {errors.descricao && <p className="text-xs text-destructive">{errors.descricao}</p>}
            </div>

            <RegraCalculoFields
              state={{
                modo_calculo: form.modo_calculo,
                valor: form.valor,
                percentual: form.percentual,
                base_calculo: form.base_calculo,
                quantidade: form.quantidade,
                valor_unitario: form.valor_unitario,
              }}
              onChange={(next) => setForm(p => ({ ...p, ...next }))}
              valorLabel={form.is_percentual ? 'Valor (%) *' : 'Valor (R$) *'}
              excludeBases={['liquido', 'outra']}
              errors={{ valor: errors.valor, percentual: errors.percentual, base_calculo: errors.base_calculo, quantidade: errors.quantidade, valor_unitario: errors.valor_unitario }}
            />
            {form.modo_calculo === 'fixo' && (
              <div className="flex items-center gap-3">
                <Switch checked={form.is_percentual} onCheckedChange={(v) => setForm(p => ({ ...p, is_percentual: v }))} />
                <Label>{form.is_percentual ? 'Tratar valor digitado como percentual (%)' : 'Tratar valor digitado como R$'}</Label>
              </div>
            )}

            {/* ===== Tipo de vigência ===== */}
            <div className="space-y-2">
              <Label>Frequência *</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm(p => ({
                ...p,
                tipo: v as TipoVigencia,
                ...(v === 'recorrente' ? { mes: '', ano: '', mes_fim: '', ano_fim: '' } : {}),
                ...(v === 'eventual' ? { mes_fim: '', ano_fim: '' } : {}),
              }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="recorrente">Recorrente — vigora todos os meses</SelectItem>
                  <SelectItem value="prazo">Por prazo — período definido (início e fim)</SelectItem>
                  <SelectItem value="eventual">Eventual — uma única competência</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.tipo === 'eventual' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mês *</Label>
                  <Input type="number" min="1" max="12" placeholder="1-12" value={form.mes} onChange={(e) => setForm(p => ({ ...p, mes: e.target.value }))} className={errors.mes ? 'border-destructive' : ''} />
                  {errors.mes && <p className="text-xs text-destructive">{errors.mes}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Ano *</Label>
                  <Input type="number" min="2020" placeholder="2026" value={form.ano} onChange={(e) => setForm(p => ({ ...p, ano: e.target.value }))} className={errors.ano ? 'border-destructive' : ''} />
                  {errors.ano && <p className="text-xs text-destructive">{errors.ano}</p>}
                </div>
              </div>
            )}

            {form.tipo === 'prazo' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Mês Início *</Label>
                    <Input type="number" min="1" max="12" placeholder="1-12" value={form.mes} onChange={(e) => setForm(p => ({ ...p, mes: e.target.value }))} className={errors.mes ? 'border-destructive' : ''} />
                    {errors.mes && <p className="text-xs text-destructive">{errors.mes}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Ano Início *</Label>
                    <Input type="number" min="2020" placeholder="2026" value={form.ano} onChange={(e) => setForm(p => ({ ...p, ano: e.target.value }))} className={errors.ano ? 'border-destructive' : ''} />
                    {errors.ano && <p className="text-xs text-destructive">{errors.ano}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Mês Fim *</Label>
                    <Input type="number" min="1" max="12" placeholder="1-12" value={form.mes_fim} onChange={(e) => setForm(p => ({ ...p, mes_fim: e.target.value }))} className={errors.mes_fim ? 'border-destructive' : ''} />
                    {errors.mes_fim && <p className="text-xs text-destructive">{errors.mes_fim}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Ano Fim *</Label>
                    <Input type="number" min="2020" placeholder="2026" value={form.ano_fim} onChange={(e) => setForm(p => ({ ...p, ano_fim: e.target.value }))} className={errors.ano_fim ? 'border-destructive' : ''} />
                    {errors.ano_fim && <p className="text-xs text-destructive">{errors.ano_fim}</p>}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Vigência incompleta ou fim anterior ao início será bloqueada.</p>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!canSave || saveMutation.isPending}>
              {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Descontos;
