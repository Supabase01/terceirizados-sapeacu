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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

type TipoInstituicao = 'prefeitura' | 'terceirizada' | 'cooperativa';

interface InstituicaoForm {
  nome: string;
  tipo: TipoInstituicao;
  cnpj: string;
  responsavel: string;
  endereco: string;
  cidade: string;
  estado: string;
  telefone: string;
  email: string;
}

const emptyForm: InstituicaoForm = {
  nome: '', tipo: 'prefeitura', cnpj: '', responsavel: '', endereco: '', cidade: '', estado: 'BA', telefone: '', email: '',
};

const formatCNPJ = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
};

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) return digits.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  return digits.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
};

const tipoLabels: Record<TipoInstituicao, string> = {
  prefeitura: 'Prefeitura',
  terceirizada: 'Terceirizada',
  cooperativa: 'Cooperativa',
};

const tipoBadgeVariant = (tipo: TipoInstituicao) => {
  if (tipo === 'prefeitura') return 'default' as const;
  return 'outline' as const;
};

const CadastroInstituicoes = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editSource, setEditSource] = useState<'prefeituras' | 'terceirizadas' | null>(null);
  const [form, setForm] = useState<InstituicaoForm>(emptyForm);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<string>('todas');

  const { data: prefeituras = [], isLoading: loadingPref } = useQuery({
    queryKey: ['prefeituras'],
    queryFn: async () => {
      const { data, error } = await supabase.from('prefeituras').select('*').order('nome');
      if (error) throw error;
      return (data || []).map((p: any) => ({ ...p, _tipo: 'prefeitura' as TipoInstituicao, _source: 'prefeituras' as const }));
    },
  });

  const { data: terceirizadas = [], isLoading: loadingTerc } = useQuery({
    queryKey: ['terceirizadas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('terceirizadas').select('*').order('nome');
      if (error) throw error;
      return (data || []).map((t: any) => ({
        ...t,
        _tipo: (t.tipo === 'cooperativa' ? 'cooperativa' : 'terceirizada') as TipoInstituicao,
        _source: 'terceirizadas' as const,
      }));
    },
  });

  const isLoading = loadingPref || loadingTerc;

  const allItems = [...prefeituras, ...terceirizadas].sort((a, b) => a.nome.localeCompare(b.nome));

  const filtered = allItems.filter((item) => {
    const matchesSearch =
      item.nome.toLowerCase().includes(search.toLowerCase()) ||
      (item.cnpj && item.cnpj.includes(search)) ||
      (item.responsavel && item.responsavel.toLowerCase().includes(search.toLowerCase()));
    if (activeTab === 'todas') return matchesSearch;
    if (activeTab === 'prefeituras') return matchesSearch && item._tipo === 'prefeitura';
    if (activeTab === 'terceirizadas') return matchesSearch && (item._tipo === 'terceirizada' || item._tipo === 'cooperativa');
    return matchesSearch;
  });

  const getTable = (tipo: TipoInstituicao): 'prefeituras' | 'terceirizadas' =>
    tipo === 'prefeitura' ? 'prefeituras' : 'terceirizadas';

  const saveMutation = useMutation({
    mutationFn: async () => {
      const table = editSource || getTable(form.tipo);
      const isChangingType = editSource && getTable(form.tipo) !== editSource;

      const payload: any = {
        nome: form.nome,
        cnpj: form.cnpj || null,
        responsavel: form.responsavel || null,
        endereco: form.endereco || null,
        cidade: form.cidade || null,
        estado: form.estado || null,
        telefone: form.telefone || null,
        email: form.email || null,
      };

      if (table === 'terceirizadas' || getTable(form.tipo) === 'terceirizadas') {
        payload.tipo = form.tipo === 'cooperativa' ? 'cooperativa' : 'terceirizada';
      }

      if (editId && !isChangingType) {
        const { error } = await supabase.from(table).update(payload).eq('id', editId);
        if (error) throw error;
      } else if (editId && isChangingType) {
        // Delete from old table, insert into new
        await supabase.from(editSource!).delete().eq('id', editId);
        const newTable = getTable(form.tipo);
        const { error } = await supabase.from(newTable).insert(payload);
        if (error) throw error;
      } else {
        const newTable = getTable(form.tipo);
        const { error } = await supabase.from(newTable).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prefeituras'] });
      queryClient.invalidateQueries({ queryKey: ['terceirizadas'] });
      toast({ title: editId ? 'Registro atualizado' : 'Instituição cadastrada' });
      closeDialog();
    },
    onError: () => toast({ title: 'Erro ao salvar', variant: 'destructive' }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, ativo, source }: { id: string; ativo: boolean; source: 'prefeituras' | 'terceirizadas' }) => {
      const { error } = await supabase.from(source).update({ ativo: !ativo }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prefeituras'] });
      queryClient.invalidateQueries({ queryKey: ['terceirizadas'] });
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditId(null);
    setEditSource(null);
    setForm(emptyForm);
  };

  const openNew = (tipo?: TipoInstituicao) => {
    setForm({ ...emptyForm, tipo: tipo || 'prefeitura' });
    setDialogOpen(true);
  };

  const openEdit = (item: any) => {
    setEditId(item.id);
    setEditSource(item._source);
    setForm({
      nome: item.nome || '',
      tipo: item._tipo,
      cnpj: item.cnpj || '',
      responsavel: item.responsavel || '',
      endereco: item.endereco || '',
      cidade: item.cidade || '',
      estado: item.estado || '',
      telefone: item.telefone || '',
      email: item.email || '',
    });
    setDialogOpen(true);
  };

  const updateField = (field: keyof InstituicaoForm, value: string) => {
    if (field === 'cnpj') value = formatCNPJ(value);
    if (field === 'telefone') value = formatPhone(value);
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Instituições</h1>
          <Button onClick={() => openNew()} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Nova Instituição
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Input
            placeholder="Buscar por nome, CNPJ ou responsável..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="todas">Todas</TabsTrigger>
            <TabsTrigger value="prefeituras">Prefeituras</TabsTrigger>
            <TabsTrigger value="terceirizadas">Terceirizadas / Cooperativas</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>CNPJ</TableHead>
                      <TableHead>Cidade/UF</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                      <TableHead className="w-28">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
                      </TableRow>
                    ) : filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum registro encontrado</TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((item: any) => (
                        <TableRow key={`${item._source}-${item.id}`}>
                          <TableCell className="font-medium">{item.nome}</TableCell>
                          <TableCell>
                            <Badge variant={tipoBadgeVariant(item._tipo)}>
                              {tipoLabels[item._tipo as TipoInstituicao]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{item.responsavel || '—'}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{item.cnpj || '—'}</TableCell>
                          <TableCell className="text-sm">{[item.cidade, item.estado].filter(Boolean).join('/') || '—'}</TableCell>
                          <TableCell className="text-sm">{item.telefone || '—'}</TableCell>
                          <TableCell>
                            <Badge variant={item.ativo ? 'default' : 'secondary'}>
                              {item.ativo ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => toggleMutation.mutate({ id: item.id, ativo: item.ativo, source: item._source })}
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
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar Instituição' : 'Nova Instituição'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nome *</Label>
                <Input placeholder="Razão social" value={form.nome} onChange={(e) => updateField('nome', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Select value={form.tipo} onValueChange={(v) => updateField('tipo', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prefeitura">Prefeitura</SelectItem>
                    <SelectItem value="terceirizada">Terceirizada</SelectItem>
                    <SelectItem value="cooperativa">Cooperativa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Responsável</Label>
              <Input placeholder="Nome do responsável" value={form.responsavel} onChange={(e) => updateField('responsavel', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>CNPJ</Label>
                <Input placeholder="00.000.000/0000-00" value={form.cnpj} onChange={(e) => updateField('cnpj', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input placeholder="(00) 00000-0000" value={form.telefone} onChange={(e) => updateField('telefone', e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Endereço</Label>
              <Input placeholder="Rua, número, bairro" value={form.endereco} onChange={(e) => updateField('endereco', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Cidade</Label>
                <Input placeholder="Cidade" value={form.cidade} onChange={(e) => updateField('cidade', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Input placeholder="UF" value={form.estado} onChange={(e) => updateField('estado', e.target.value)} maxLength={2} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input type="email" placeholder="contato@instituicao.com.br" value={form.email} onChange={(e) => updateField('email', e.target.value)} />
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
    </Layout>
  );
};

export default CadastroInstituicoes;
