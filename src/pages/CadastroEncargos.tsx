import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { SearchableSelect } from '@/components/SearchableSelect';
import { Plus, Pencil, Trash2, Search, Percent } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUnidade } from '@/contexts/UnidadeContext';

interface EncargoForm {
  nome: string;
  percentual: string;
  escopo: string;
  colaborador_ids: string[];
}

const emptyForm: EncargoForm = {
  nome: '',
  percentual: '',
  escopo: 'global',
  colaborador_ids: [],
};

const CadastroEncargos = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { unidadeId } = useUnidade();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<EncargoForm>(emptyForm);
  const [search, setSearch] = useState('');
  const [filterEscopo, setFilterEscopo] = useState('todos');

  const { data: encargos = [], isLoading } = useQuery({
    queryKey: ['encargos', unidadeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('encargos')
        .select('*, colaboradores(nome, cpf)')
        .eq('unidade_id', unidadeId!)
        .order('nome');
      if (error) throw error;
      return data || [];
    },
    enabled: !!unidadeId,
  });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores-ativos', unidadeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('colaboradores')
        .select('id, nome, cpf')
        .eq('ativo', true)
        .eq('unidade_id', unidadeId!)
        .order('nome');
      if (error) throw error;
      return data || [];
    },
    enabled: !!unidadeId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const percentual = parseFloat(form.percentual) || 0;

      if (editId) {
        const { error } = await supabase.from('encargos').update({
          nome: form.nome,
          percentual,
          escopo: form.escopo,
          colaborador_id: form.escopo === 'individual' ? form.colaborador_ids[0] || null : null,
        }).eq('id', editId);
        if (error) throw error;
      } else {
        if (form.escopo === 'global') {
          const { error } = await supabase.from('encargos').insert({
            nome: form.nome,
            percentual,
            escopo: 'global',
            colaborador_id: null,
            unidade_id: unidadeId,
          });
          if (error) throw error;
        } else {
          const rows = form.colaborador_ids.map(cid => ({
            nome: form.nome,
            percentual,
            escopo: 'individual',
            colaborador_id: cid,
            unidade_id: unidadeId,
          }));
          const { error } = await supabase.from('encargos').insert(rows);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encargos'] });
      toast({ title: editId ? 'Encargo atualizado' : 'Encargo cadastrado' });
      closeDialog();
    },
    onError: () => toast({ title: 'Erro ao salvar encargo', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('encargos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encargos'] });
      toast({ title: 'Encargo removido' });
    },
    onError: () => toast({ title: 'Erro ao remover', variant: 'destructive' }),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditId(null);
    setForm(emptyForm);
  };

  const openEdit = (item: any) => {
    setEditId(item.id);
    setForm({
      nome: item.nome,
      percentual: String(item.percentual),
      escopo: item.escopo,
      colaborador_ids: item.colaborador_id ? [item.colaborador_id] : [],
    });
    setDialogOpen(true);
  };

  const filtered = encargos.filter((e: any) => {
    const matchSearch = e.nome?.toLowerCase().includes(search.toLowerCase()) ||
      (e.colaboradores as any)?.nome?.toLowerCase().includes(search.toLowerCase());
    const matchEscopo = filterEscopo === 'todos' || e.escopo === filterEscopo;
    return matchSearch && matchEscopo;
  });

  const canSave = form.nome.trim() && form.percentual &&
    (form.escopo === 'global' || form.colaborador_ids.length > 0);

  const colaboradorOptions = colaboradores.map((c: any) => ({
    value: c.id,
    label: c.nome,
    sublabel: c.cpf,
  }));

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Encargos</h1>
            <p className="text-sm text-muted-foreground">Percentuais aplicados sobre o salário líquido para apurar o bruto</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Novo Encargo
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterEscopo} onValueChange={setFilterEscopo}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="global">Global</SelectItem>
              <SelectItem value="individual">Individual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Percentual</TableHead>
                  <TableHead>Escopo</TableHead>
                  <TableHead>Colaborador</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum encargo cadastrado</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.nome}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          {Number(item.percentual).toFixed(2)}%
                          <Percent className="h-3 w-3 text-muted-foreground" />
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.escopo === 'global' ? 'default' : 'outline'}>
                          {item.escopo === 'global' ? 'Global' : 'Individual'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.escopo === 'global' ? 'Todos' : (item.colaboradores as any)?.nome || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteMutation.mutate(item.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar Encargo' : 'Novo Encargo'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome do Encargo *</Label>
              <Input placeholder="Ex: INSS Patronal" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <Label>Percentual (%) *</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={form.percentual} onChange={(e) => setForm({ ...form, percentual: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <Label>Escopo *</Label>
              <Select value={form.escopo} onValueChange={(v) => setForm({ ...form, escopo: v, colaborador_ids: [] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global (todos os colaboradores)</SelectItem>
                  <SelectItem value="individual">Individual (colaboradores específicos)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.escopo === 'individual' && (
              <div className="space-y-1.5">
                <Label>Colaboradores *</Label>
                {editId ? (
                  <SearchableSelect
                    options={colaboradorOptions}
                    value={form.colaborador_ids[0] || ''}
                    onValueChange={(v) => setForm({ ...form, colaborador_ids: [v] })}
                    placeholder="Selecione o colaborador"
                    emptyText="Nenhum colaborador encontrado"
                  />
                ) : (
                  <SearchableSelect
                    multiple
                    options={colaboradorOptions}
                    values={form.colaborador_ids}
                    onValuesChange={(v) => setForm({ ...form, colaborador_ids: v })}
                    placeholder="Selecione colaboradores"
                    emptyText="Nenhum colaborador encontrado"
                  />
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!canSave}>
              {editId ? 'Salvar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default CadastroEncargos;
