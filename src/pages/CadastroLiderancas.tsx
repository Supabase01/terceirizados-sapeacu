import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnidade } from '@/contexts/UnidadeContext';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Search, Crown, Users } from 'lucide-react';

interface LiderancaForm {
  nome: string;
  cargo: string;
}

const emptyForm: LiderancaForm = { nome: '', cargo: '' };

export default function CadastroLiderancas() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { unidadeId } = useUnidade();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<LiderancaForm>(emptyForm);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedLideranca, setSelectedLideranca] = useState<any>(null);

  const { data: liderancas = [], isLoading } = useQuery({
    queryKey: ['liderancas', unidadeId],
    queryFn: async () => {
      let query = supabase.from('liderancas').select('*').order('nome');
      if (unidadeId) query = query.eq('unidade_id', unidadeId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!unidadeId,
  });
  const { data: indicacoes = [] } = useQuery({
    queryKey: ['colaboradores-indicacoes', unidadeId],
    queryFn: async () => {
      let query = supabase.from('colaboradores').select('lideranca_id, nome, cpf').not('lideranca_id', 'is', null);
      if (unidadeId) query = query.eq('unidade_id', unidadeId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!unidadeId,
  });
  const contagemMap = indicacoes.reduce((acc: Record<string, number>, c: any) => {
    if (c.lideranca_id) {
      acc[c.lideranca_id] = (acc[c.lideranca_id] || 0) + 1;
    }
    return acc;
  }, {});

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editId) {
        const { error } = await supabase.from('liderancas').update({ nome: form.nome, cargo: form.cargo || null }).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('liderancas').insert({ nome: form.nome, cargo: form.cargo || null, unidade_id: unidadeId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liderancas'] });
      toast({ title: editId ? 'Liderança atualizada' : 'Liderança cadastrada' });
      closeDialog();
    },
    onError: () => toast({ title: 'Erro ao salvar', variant: 'destructive' }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from('liderancas').update({ ativo: !ativo }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liderancas'] });
      toast({ title: 'Status atualizado' });
    },
  });

  const closeDialog = () => { setDialogOpen(false); setEditId(null); setForm(emptyForm); };
  const openNew = () => { setForm(emptyForm); setEditId(null); setDialogOpen(true); };
  const openEdit = (item: any) => { setForm({ nome: item.nome, cargo: item.cargo || '' }); setEditId(item.id); setDialogOpen(true); };

  const openDetail = (lideranca: any) => {
    setSelectedLideranca(lideranca);
    setDetailOpen(true);
  };

  const indicadosDaLideranca = selectedLideranca
    ? indicacoes.filter((c: any) => c.lideranca_id === selectedLideranca.id)
    : [];

  const filtered = liderancas.filter((l: any) =>
    l.nome.toLowerCase().includes(search.toLowerCase()) ||
    (l.cargo || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Crown className="h-6 w-6" /> Cadastro de Lideranças
            </h1>
            <p className="text-muted-foreground text-sm">Gerencie as lideranças e veja suas indicações</p>
          </div>
          <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nova Liderança</Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Lideranças</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">Carregando...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead className="text-center">Indicações</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhuma liderança encontrada</TableCell></TableRow>
                  ) : filtered.map((l: any) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.nome}</TableCell>
                      <TableCell>{l.cargo || '—'}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => openDetail(l)}
                        >
                          <Users className="h-3.5 w-3.5" />
                          <span className="font-semibold">{contagemMap[l.id] || 0}</span>
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Badge variant={l.ativo ? 'default' : 'secondary'}>{l.ativo ? 'Ativo' : 'Inativo'}</Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(l)}><Pencil className="h-3 w-3" /></Button>
                        <Button size="sm" variant={l.ativo ? 'secondary' : 'default'} onClick={() => toggleMutation.mutate({ id: l.id, ativo: l.ativo })}>
                          {l.ativo ? 'Desativar' : 'Ativar'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Dialog Criar/Editar */}
        <Dialog open={dialogOpen} onOpenChange={v => !v && closeDialog()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? 'Editar Liderança' : 'Nova Liderança'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome *</Label>
                <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome da liderança" />
              </div>
              <div>
                <Label>Cargo</Label>
                <Input value={form.cargo} onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))} placeholder="Cargo da liderança" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={!form.nome.trim() || saveMutation.isPending}>
                {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Indicações */}
        <Dialog open={detailOpen} onOpenChange={v => !v && setDetailOpen(false)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Indicações de {selectedLideranca?.nome}</DialogTitle>
            </DialogHeader>
            {indicadosDaLideranca.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">Nenhum colaborador vinculado a esta liderança.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {indicadosDaLideranca.map((c: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{c.nome}</TableCell>
                      <TableCell className="font-mono text-sm">{c.cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
