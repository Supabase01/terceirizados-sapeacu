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
import { Plus, Pencil, Search, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/SearchableSelect';

interface AdicionalForm {
  escopo: string;
  colaborador_ids: string[];
  descricao: string;
  valor: string;
  tipo: string;
  mes: string;
  ano: string;
  mes_fim: string;
  ano_fim: string;
}

const emptyForm: AdicionalForm = {
  escopo: 'individual', colaborador_ids: [], descricao: '', valor: '', tipo: 'fixo', mes: '', ano: '', mes_fim: '', ano_fim: '',
};

const Adicionais = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { unidadeId } = useUnidade();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<AdicionalForm>(emptyForm);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [filterEscopo, setFilterEscopo] = useState<string>('todos');

  const { data: adicionais = [], isLoading } = useQuery({
    queryKey: ['adicionais', unidadeId],
    queryFn: async () => {
      let query = supabase
        .from('adicionais')
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
      let query = supabase.from('colaboradores').select('id, nome, cpf').eq('ativo', true).order('nome');
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
      const isEventual = form.tipo === 'eventual';
      const basePayload: any = {
        descricao: form.descricao,
        valor: Number(form.valor) || 0,
        tipo: form.tipo,
        escopo: form.escopo,
        mes: isEventual && form.mes ? Number(form.mes) : null,
        ano: isEventual && form.ano ? Number(form.ano) : null,
        mes_fim: isEventual && form.mes_fim ? Number(form.mes_fim) : null,
        ano_fim: isEventual && form.ano_fim ? Number(form.ano_fim) : null,
        unidade_id: unidadeId,
      };

      if (editId) {
        const payload = {
          ...basePayload,
          colaborador_id: form.escopo === 'global' ? null : (form.colaborador_ids[0] || null),
        };
        const { error } = await supabase.from('adicionais').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        if (form.escopo === 'global') {
          const { error } = await supabase.from('adicionais').insert({ ...basePayload, colaborador_id: null });
          if (error) throw error;
        } else {
          // Insert one row per selected collaborator
          const rows = form.colaborador_ids.map(cid => ({ ...basePayload, colaborador_id: cid }));
          if (rows.length === 0) throw new Error('Selecione ao menos um colaborador');
          const { error } = await supabase.from('adicionais').insert(rows);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adicionais'] });
      toast({ title: editId ? 'Adicional atualizado' : 'Adicional cadastrado' });
      closeDialog();
    },
    onError: (e: any) => toast({ title: e?.message || 'Erro ao salvar', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('adicionais').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adicionais'] });
      toast({ title: 'Adicional removido' });
    },
  });

  const closeDialog = () => { setDialogOpen(false); setEditId(null); setForm(emptyForm); };

  const openEdit = (item: any) => {
    setEditId(item.id);
    setForm({
      escopo: item.escopo || 'individual',
      colaborador_ids: item.colaborador_id ? [item.colaborador_id] : [],
      descricao: item.descricao,
      valor: String(item.valor),
      tipo: item.tipo,
      mes: item.mes ? String(item.mes) : '',
      ano: item.ano ? String(item.ano) : '',
      mes_fim: item.mes_fim ? String(item.mes_fim) : '',
      ano_fim: item.ano_fim ? String(item.ano_fim) : '',
    });
    setDialogOpen(true);
  };

  const filtered = adicionais.filter((a: any) => {
    const matchSearch = a.descricao.toLowerCase().includes(search.toLowerCase()) ||
      (a.colaboradores as any)?.nome?.toLowerCase().includes(search.toLowerCase());
    const matchTipo = filterTipo === 'todos' || a.tipo === filterTipo;
    const matchEscopo = filterEscopo === 'todos' || (a.escopo || 'individual') === filterEscopo;
    return matchSearch && matchTipo && matchEscopo;
  });

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const formatCompetencia = (item: any) => {
    if (!item.mes || !item.ano) return 'Recorrente';
    const inicio = `${String(item.mes).padStart(2, '0')}/${item.ano}`;
    if (item.mes_fim && item.ano_fim) {
      const fim = `${String(item.mes_fim).padStart(2, '0')}/${item.ano_fim}`;
      return `${inicio} → ${fim}`;
    }
    return inicio;
  };

  const canSave = form.descricao.trim() && form.valor &&
    (form.escopo === 'global' || form.colaborador_ids.length > 0);

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Adicionais</h1>
          <Button onClick={() => setDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Novo Adicional
          </Button>
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos tipos</SelectItem>
              <SelectItem value="fixo">Fixos</SelectItem>
              <SelectItem value="eventual">Eventuais</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterEscopo} onValueChange={setFilterEscopo}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos escopos</SelectItem>
              <SelectItem value="global">Globais</SelectItem>
              <SelectItem value="individual">Individuais</SelectItem>
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
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum adicional encontrado</TableCell></TableRow>
                  ) : (
                    filtered.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.descricao}</TableCell>
                        <TableCell>
                          <Badge variant={(item.escopo || 'individual') === 'global' ? 'destructive' : 'secondary'}>
                            {(item.escopo || 'individual') === 'global' ? 'Global' : 'Individual'}
                          </Badge>
                        </TableCell>
                        <TableCell>{(item.escopo || 'individual') === 'global' ? 'Todos' : (item.colaboradores as any)?.nome || '—'}</TableCell>
                        <TableCell><Badge variant={item.tipo === 'fixo' ? 'default' : 'secondary'}>{item.tipo === 'fixo' ? 'Fixo' : 'Eventual'}</Badge></TableCell>
                        <TableCell className="hidden md:table-cell">{formatCompetencia(item)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(item.valor)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteMutation.mutate(item.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editId ? 'Editar Adicional' : 'Novo Adicional'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Escopo *</Label>
              <Select value={form.escopo} onValueChange={(v) => setForm(p => ({ ...p, escopo: v, colaborador_ids: v === 'global' ? [] : p.colaborador_ids }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global (Todos os colaboradores)</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.escopo === 'individual' && (
              <div className="space-y-2">
                <Label>{editId ? 'Colaborador *' : 'Colaborador(es) *'}</Label>
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
              </div>
            )}
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input placeholder="Ex: Insalubridade, Hora Extra" value={form.descricao} onChange={(e) => setForm(p => ({ ...p, descricao: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor (R$) *</Label>
                <Input type="number" placeholder="0.00" value={form.valor} onChange={(e) => setForm(p => ({ ...p, valor: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm(p => ({ ...p, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixo">Fixo (Recorrente)</SelectItem>
                    <SelectItem value="eventual">Eventual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.tipo === 'eventual' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Mês Início *</Label>
                    <Input type="number" min="1" max="12" placeholder="1-12" value={form.mes} onChange={(e) => setForm(p => ({ ...p, mes: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Ano Início *</Label>
                    <Input type="number" min="2020" placeholder="2026" value={form.ano} onChange={(e) => setForm(p => ({ ...p, ano: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Mês Fim (opcional)</Label>
                    <Input type="number" min="1" max="12" placeholder="1-12" value={form.mes_fim} onChange={(e) => setForm(p => ({ ...p, mes_fim: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Ano Fim (opcional)</Label>
                    <Input type="number" min="2020" placeholder="2026" value={form.ano_fim} onChange={(e) => setForm(p => ({ ...p, ano_fim: e.target.value }))} />
                  </div>
                </div>
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

export default Adicionais;
