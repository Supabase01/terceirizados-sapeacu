import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
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

interface DescontoForm {
  colaborador_id: string;
  descricao: string;
  valor: string;
  is_percentual: boolean;
  escopo: string;
  mes: string;
  ano: string;
}

const emptyForm: DescontoForm = {
  colaborador_id: '', descricao: '', valor: '', is_percentual: false, escopo: 'individual', mes: '', ano: '',
};

const Descontos = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<DescontoForm>(emptyForm);
  const [search, setSearch] = useState('');
  const [filterEscopo, setFilterEscopo] = useState<string>('todos');

  const { data: descontos = [], isLoading } = useQuery({
    queryKey: ['descontos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('descontos')
        .select('*, colaboradores(nome, cpf)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores-ativos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('colaboradores').select('id, nome, cpf').eq('ativo', true).order('nome');
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        colaborador_id: form.escopo === 'global' ? null : form.colaborador_id || null,
        descricao: form.descricao,
        valor: Number(form.valor) || 0,
        is_percentual: form.is_percentual,
        escopo: form.escopo,
        mes: form.mes ? Number(form.mes) : null,
        ano: form.ano ? Number(form.ano) : null,
      };
      if (editId) {
        const { error } = await supabase.from('descontos').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('descontos').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['descontos'] });
      toast({ title: editId ? 'Desconto atualizado' : 'Desconto cadastrado' });
      closeDialog();
    },
    onError: () => toast({ title: 'Erro ao salvar', variant: 'destructive' }),
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

  const closeDialog = () => { setDialogOpen(false); setEditId(null); setForm(emptyForm); };

  const openEdit = (item: any) => {
    setEditId(item.id);
    setForm({
      colaborador_id: item.colaborador_id || '',
      descricao: item.descricao,
      valor: String(item.valor),
      is_percentual: item.is_percentual,
      escopo: item.escopo,
      mes: item.mes ? String(item.mes) : '',
      ano: item.ano ? String(item.ano) : '',
    });
    setDialogOpen(true);
  };

  const filtered = descontos.filter((d: any) => {
    const matchSearch = d.descricao.toLowerCase().includes(search.toLowerCase()) ||
      (d.colaboradores as any)?.nome?.toLowerCase().includes(search.toLowerCase());
    const matchEscopo = filterEscopo === 'todos' || d.escopo === filterEscopo;
    return matchSearch && matchEscopo;
  });

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

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
          <Select value={filterEscopo} onValueChange={setFilterEscopo}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
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
                    <TableHead className="hidden md:table-cell">Competência</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="w-28">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum desconto encontrado</TableCell></TableRow>
                  ) : (
                    filtered.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.descricao}</TableCell>
                        <TableCell>
                          <Badge variant={item.escopo === 'global' ? 'destructive' : 'secondary'}>
                            {item.escopo === 'global' ? 'Global' : 'Individual'}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.escopo === 'global' ? 'Todos' : (item.colaboradores as any)?.nome || '—'}</TableCell>
                        <TableCell className="hidden md:table-cell">{item.mes && item.ano ? `${String(item.mes).padStart(2, '0')}/${item.ano}` : 'Recorrente'}</TableCell>
                        <TableCell className="text-right font-mono">
                          {item.is_percentual ? `${item.valor}%` : formatCurrency(item.valor)}
                        </TableCell>
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
          <DialogHeader><DialogTitle>{editId ? 'Editar Desconto' : 'Novo Desconto'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Escopo *</Label>
              <Select value={form.escopo} onValueChange={(v) => setForm(p => ({ ...p, escopo: v, colaborador_id: v === 'global' ? '' : p.colaborador_id }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global (Todos os colaboradores)</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.escopo === 'individual' && (
              <div className="space-y-2">
                <Label>Colaborador *</Label>
                <Select value={form.colaborador_id} onValueChange={(v) => setForm(p => ({ ...p, colaborador_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {colaboradores.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input placeholder="Ex: INSS, ISS, Pensão" value={form.descricao} onChange={(e) => setForm(p => ({ ...p, descricao: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor *</Label>
                <Input type="number" placeholder="0.00" value={form.valor} onChange={(e) => setForm(p => ({ ...p, valor: e.target.value }))} />
              </div>
              <div className="space-y-2 flex items-end gap-3 pb-0.5">
                <Switch checked={form.is_percentual} onCheckedChange={(v) => setForm(p => ({ ...p, is_percentual: v }))} />
                <Label>{form.is_percentual ? 'Percentual (%)' : 'Valor fixo (R$)'}</Label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mês (vazio = recorrente)</Label>
                <Input type="number" min="1" max="12" placeholder="1-12" value={form.mes} onChange={(e) => setForm(p => ({ ...p, mes: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Ano (vazio = recorrente)</Label>
                <Input type="number" min="2020" placeholder="2026" value={form.ano} onChange={(e) => setForm(p => ({ ...p, ano: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!form.descricao.trim() || !form.valor || (form.escopo === 'individual' && !form.colaborador_id) || saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Descontos;
