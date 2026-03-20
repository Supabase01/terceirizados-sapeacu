import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Check, X, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useUnidade } from '@/contexts/UnidadeContext';

interface RubricaForm {
  codigo: string;
  nome: string;
  tipo: string;
  descricao: string;
}

const emptyForm: RubricaForm = { codigo: '', nome: '', tipo: 'adicional', descricao: '' };

export default function CadastroRubricas() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { unidadeId } = useUnidade();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<RubricaForm>(emptyForm);
  const [search, setSearch] = useState('');

  const { data: rubricas = [], isLoading } = useQuery({
    queryKey: ['rubricas', unidadeId],
    queryFn: async () => {
      let query = supabase.from('rubricas').select('*').order('codigo');
      if (unidadeId) query = query.eq('unidade_id', unidadeId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!unidadeId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        codigo: form.codigo,
        nome: form.nome,
        tipo: form.tipo,
        unidade_id: unidadeId,
      };
      if (editId) {
        const { error } = await supabase.from('rubricas').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('rubricas').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rubricas'] });
      toast({ title: editId ? 'Rubrica atualizada' : 'Rubrica cadastrada' });
      closeDialog();
    },
    onError: (err: any) => {
      const msg = err?.message || '';
      toast({
        title: msg.includes('unique') ? 'Código já existe nesta unidade' : 'Erro ao salvar',
        description: msg.includes('unique') ? 'Use outro código.' : 'Verifique os dados',
        variant: 'destructive',
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from('rubricas').update({ ativo: !ativo }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rubricas'] }),
  });

  const closeDialog = () => { setDialogOpen(false); setEditId(null); setForm(emptyForm); };
  const openNew = () => { setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (item: any) => {
    setEditId(item.id);
    setForm({ codigo: item.codigo, nome: item.nome, tipo: item.tipo || 'adicional' });
    setDialogOpen(true);
  };

  const filtered = rubricas.filter((r: any) =>
    r.codigo.toLowerCase().includes(search.toLowerCase()) ||
    r.nome.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Rubricas</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} rubricas cadastradas</p>
          </div>
          <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1" /> Nova Rubrica</Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por código ou nome..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="w-28">Tipo</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-28">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma rubrica encontrada</TableCell></TableRow>
                ) : (
                  filtered.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">{item.codigo}</TableCell>
                      <TableCell className="font-medium">{item.nome}</TableCell>
                      <TableCell>
                        <Badge variant={item.tipo === 'adicional' ? 'default' : 'destructive'}>
                          {item.tipo === 'adicional' ? 'Adicional' : 'Desconto'}
                        </Badge>
                      </TableCell>
                      <TableCell><Badge variant={item.ativo ? 'default' : 'secondary'}>{item.ativo ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleMutation.mutate({ id: item.id, ativo: item.ativo })}>
                            {item.ativo ? <X className="h-3.5 w-3.5 text-destructive" /> : <Check className="h-3.5 w-3.5 text-green-600" />}
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
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editId ? 'Editar Rubrica' : 'Nova Rubrica'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Código *</Label>
              <Input placeholder="Ex: 001" value={form.codigo} onChange={(e) => setForm(prev => ({ ...prev, codigo: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input placeholder="Nome da rubrica" value={form.nome} onChange={(e) => setForm(prev => ({ ...prev, nome: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm(prev => ({ ...prev, tipo: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="adicional">Adicional</SelectItem>
                  <SelectItem value="desconto">Desconto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.codigo.trim() || !form.nome.trim() || saveMutation.isPending}>
              {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
