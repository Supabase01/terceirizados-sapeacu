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
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Pencil, Check, X, Users, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface UnidadeForm {
  nome: string;
  instituicao_id: string;
  instituicao_tipo: string;
  cidade: string;
  estado: string;
  padrao: string;
}

const emptyForm: UnidadeForm = {
  nome: '',
  instituicao_id: '',
  instituicao_tipo: 'prefeitura',
  cidade: '',
  estado: 'BA',
  padrao: 'padrao_01',
};

const CadastroUnidades = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [usersDialogOpen, setUsersDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<UnidadeForm>(emptyForm);
  const [search, setSearch] = useState('');
  const [selectedUnidadeId, setSelectedUnidadeId] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  // Fetch unidades
  const { data: unidades = [], isLoading } = useQuery({
    queryKey: ['unidades-folha'],
    queryFn: async () => {
      const { data, error } = await supabase.from('unidades_folha').select('*').order('nome');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch institutions for the select
  const { data: prefeituras = [] } = useQuery({
    queryKey: ['prefeituras'],
    queryFn: async () => {
      const { data, error } = await supabase.from('prefeituras').select('id, nome').eq('ativo', true).order('nome');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: terceirizadas = [] } = useQuery({
    queryKey: ['terceirizadas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('terceirizadas').select('id, nome, tipo').eq('ativo', true).order('nome');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all profiles (users) for linking
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, nome, email');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch linked users for selected unidade
  const { data: linkedUsers = [] } = useQuery({
    queryKey: ['usuario-unidades', selectedUnidadeId],
    queryFn: async () => {
      if (!selectedUnidadeId) return [];
      const { data, error } = await supabase
        .from('usuario_unidades')
        .select('user_id')
        .eq('unidade_id', selectedUnidadeId);
      if (error) throw error;
      return data?.map(d => d.user_id) || [];
    },
    enabled: !!selectedUnidadeId,
  });

  const allInstitutions = [
    ...prefeituras.map(p => ({ id: p.id, nome: p.nome, tipo: 'prefeitura' })),
    ...terceirizadas.map(t => ({ id: t.id, nome: t.nome, tipo: t.tipo || 'terceirizada' })),
  ];

  const getInstituicaoNome = (id: string | null) => {
    if (!id) return '—';
    const inst = allInstitutions.find(i => i.id === id);
    return inst?.nome || '—';
  };

  const filtered = unidades.filter((u: any) =>
    u.nome?.toLowerCase().includes(search.toLowerCase()) ||
    u.cidade?.toLowerCase().includes(search.toLowerCase())
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        nome: form.nome,
        instituicao_id: form.instituicao_id || null,
        instituicao_tipo: form.instituicao_tipo,
        cidade: form.cidade || null,
        estado: form.estado || null,
        padrao: form.padrao,
      };

      if (editId) {
        const { error } = await supabase.from('unidades_folha').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('unidades_folha').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades-folha'] });
      toast({ title: editId ? 'Unidade atualizada' : 'Unidade cadastrada' });
      closeDialog();
    },
    onError: () => toast({ title: 'Erro ao salvar', variant: 'destructive' }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from('unidades_folha').update({ ativo: !ativo }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['unidades-folha'] }),
  });

  const saveUsersMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUnidadeId) return;
      // Remove all existing links
      await supabase.from('usuario_unidades').delete().eq('unidade_id', selectedUnidadeId);
      // Insert new links
      if (selectedUsers.size > 0) {
        const rows = Array.from(selectedUsers).map(user_id => ({
          user_id,
          unidade_id: selectedUnidadeId,
        }));
        const { error } = await supabase.from('usuario_unidades').insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuario-unidades', selectedUnidadeId] });
      toast({ title: 'Usuários vinculados com sucesso' });
      setUsersDialogOpen(false);
    },
    onError: () => toast({ title: 'Erro ao vincular usuários', variant: 'destructive' }),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditId(null);
    setForm(emptyForm);
  };

  const openNew = () => {
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (item: any) => {
    setEditId(item.id);
    setForm({
      nome: item.nome || '',
      instituicao_id: item.instituicao_id || '',
      instituicao_tipo: item.instituicao_tipo || 'prefeitura',
      cidade: item.cidade || '',
      estado: item.estado || 'BA',
      padrao: item.padrao || 'padrao_01',
    });
    setDialogOpen(true);
  };

  const openUsersDialog = (unidadeId: string) => {
    setSelectedUnidadeId(unidadeId);
    setUsersDialogOpen(true);
  };

  // Sync selected users when linkedUsers data changes
  const currentLinkedSet = new Set(linkedUsers);

  const handleUserToggle = (userId: string, checked: boolean) => {
    setSelectedUsers(prev => {
      const next = new Set(prev);
      if (checked) next.add(userId);
      else next.delete(userId);
      return next;
    });
  };

  // Initialize selectedUsers when opening dialog
  const handleUsersDialogOpen = (open: boolean) => {
    if (!open) {
      setUsersDialogOpen(false);
      setSelectedUnidadeId(null);
    }
  };

  // When linkedUsers loads, sync the checkboxes
  const effectiveSelected = usersDialogOpen ? selectedUsers : currentLinkedSet;

  // Sync on open
  if (usersDialogOpen && selectedUsers.size === 0 && linkedUsers.length > 0 && !selectedUsers.has(linkedUsers[0])) {
    // Only initialize once
    const init = new Set(linkedUsers);
    if (init.size > 0) {
      setTimeout(() => setSelectedUsers(init), 0);
    }
  }

  const filteredInstitutions = form.instituicao_tipo === 'prefeitura'
    ? prefeituras
    : terceirizadas;

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Unidades de Folha de Pagamento</h1>
          <Button onClick={openNew} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Nova Unidade
          </Button>
        </div>

        <Input
          placeholder="Buscar por nome ou cidade..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome da Unidade</TableHead>
                  <TableHead>Instituição</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Padrão</TableHead>
                  <TableHead>Cidade/UF</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-36">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                   <TableRow>
                     <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
                   </TableRow>
                ) : filtered.length === 0 ? (
                   <TableRow>
                     <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma unidade encontrada</TableCell>
                   </TableRow>
                ) : (
                  filtered.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.nome}</TableCell>
                      <TableCell className="text-sm">{getInstituicaoNome(item.instituicao_id)}</TableCell>
                      <TableCell>
                        <Badge variant={item.instituicao_tipo === 'prefeitura' ? 'default' : 'outline'}>
                          {item.instituicao_tipo === 'prefeitura' ? 'Prefeitura' : 'Terceirizada'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {item.padrao === 'padrao_02' ? 'Padrão 02' : 'Padrão 01'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {[item.cidade, item.estado].filter(Boolean).join('/') || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.ativo ? 'default' : 'secondary'}>
                          {item.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)} title="Editar">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openUsersDialog(item.id)} title="Vincular Usuários">
                            <Users className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => toggleMutation.mutate({ id: item.id, ativo: item.ativo })}
                          >
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

      {/* Dialog: Cadastro / Edição */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar Unidade' : 'Nova Unidade'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome da Unidade *</Label>
              <Input placeholder="Ex: Convênio Prefeitura X - 2025" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label>Tipo de Instituição *</Label>
              <Select value={form.instituicao_tipo} onValueChange={(v) => setForm({ ...form, instituicao_tipo: v, instituicao_id: '' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="prefeitura">Prefeitura</SelectItem>
                  <SelectItem value="terceirizada">Terceirizada / Cooperativa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Instituição *</Label>
              <Select value={form.instituicao_id} onValueChange={(v) => setForm({ ...form, instituicao_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione a instituição" /></SelectTrigger>
                <SelectContent>
                  {filteredInstitutions.map((inst: any) => (
                    <SelectItem key={inst.id} value={inst.id}>{inst.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label>Padrão do Sistema *</Label>
              <Select value={form.padrao} onValueChange={(v) => setForm({ ...form, padrao: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="padrao_01">Padrão 01 — Salário Base (Base + Adicionais = Bruto)</SelectItem>
                  <SelectItem value="padrao_02">Padrão 02 — Salário Líquido + Encargos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Cidade</Label>
                <Input placeholder="Cidade" value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Input placeholder="UF" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} maxLength={2} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.nome || !form.instituicao_id}>
              {editId ? 'Salvar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Vincular Usuários */}
      <Dialog open={usersDialogOpen} onOpenChange={handleUsersDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Vincular Usuários
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Selecione os usuários que terão acesso a esta unidade. Apenas usuários vinculados poderão visualizar os dados.
          </p>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {profiles.map((profile: any) => {
              const isChecked = selectedUsers.has(profile.id);
              return (
                <label
                  key={profile.id}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/50 cursor-pointer"
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={(checked) => handleUserToggle(profile.id, !!checked)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{profile.nome || profile.email}</p>
                    <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                  </div>
                </label>
              );
            })}
            {profiles.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum usuário cadastrado</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUsersDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveUsersMutation.mutate()}>
              Salvar Vínculos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default CadastroUnidades;
