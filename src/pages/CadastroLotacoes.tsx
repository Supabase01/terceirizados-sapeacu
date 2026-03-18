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
import { Plus, Pencil, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useUnidade } from '@/contexts/UnidadeContext';

const CadastroLotacoes = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { unidadeId } = useUnidade();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [secretariaId, setSecretariaId] = useState('');
  const [search, setSearch] = useState('');

  const { data: lotacoes = [], isLoading } = useQuery({
    queryKey: ['lotacoes', unidadeId],
    queryFn: async () => {
      let query = supabase.from('lotacoes').select('*, secretarias(nome)').order('nome');
      if (unidadeId) query = query.eq('unidade_id', unidadeId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!unidadeId,
  });

  const { data: secretarias = [] } = useQuery({
    queryKey: ['secretarias-ativas', unidadeId],
    queryFn: async () => {
      let query = supabase.from('secretarias').select('*').eq('ativo', true).order('nome');
      if (unidadeId) query = query.eq('unidade_id', unidadeId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!unidadeId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { nome, secretaria_id: secretariaId || null, unidade_id: unidadeId };
      if (editId) {
        const { error } = await supabase.from('lotacoes').update({ nome, secretaria_id: secretariaId || null }).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('lotacoes').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lotacoes'] });
      toast({ title: editId ? 'Lotação atualizada' : 'Lotação cadastrada' });
      closeDialog();
    },
    onError: () => toast({ title: 'Erro ao salvar', variant: 'destructive' }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from('lotacoes').update({ ativo: !ativo }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lotacoes'] }),
  });

  const closeDialog = () => { setDialogOpen(false); setEditId(null); setNome(''); setSecretariaId(''); };
  const openEdit = (item: any) => { setEditId(item.id); setNome(item.nome); setSecretariaId(item.secretaria_id || ''); setDialogOpen(true); };
  const filtered = lotacoes.filter((s: any) => s.nome.toLowerCase().includes(search.toLowerCase()));

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Lotações</h1>
          <Button onClick={() => setDialogOpen(true)} size="sm"><Plus className="h-4 w-4 mr-1" /> Nova Lotação</Button>
        </div>
        <Input placeholder="Buscar lotação..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Secretaria</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-28">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhuma lotação encontrada</TableCell></TableRow>
                ) : (
                  filtered.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.nome}</TableCell>
                      <TableCell>{(item.secretarias as any)?.nome || '—'}</TableCell>
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
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? 'Editar Lotação' : 'Nova Lotação'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input placeholder="Nome da lotação" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Secretaria</Label>
              <Select value={secretariaId} onValueChange={setSecretariaId}>
                <SelectTrigger><SelectValue placeholder="Selecione a secretaria" /></SelectTrigger>
                <SelectContent>
                  {secretarias.map((s: any) => (<SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!nome.trim() || saveMutation.isPending}>
              {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default CadastroLotacoes;
