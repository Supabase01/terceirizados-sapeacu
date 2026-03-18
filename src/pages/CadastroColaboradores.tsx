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
import { Plus, Pencil, Check, X, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface ColaboradorForm {
  nome: string;
  cpf: string;
  matricula: string;
  secretaria_id: string;
  funcao_id: string;
  lotacao_id: string;
  salario_base: string;
  data_admissao: string;
  beneficio_social: boolean;
  banco: string;
  conta: string;
  pix: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade_id: string;
  cep: string;
}

const emptyForm: ColaboradorForm = {
  nome: '', cpf: '', matricula: '', secretaria_id: '', funcao_id: '', lotacao_id: '',
  salario_base: '', data_admissao: '', beneficio_social: false, banco: '', conta: '', pix: '',
  endereco: '', numero: '', complemento: '', bairro: '', cidade_id: '', cep: '',
};

const CadastroColaboradores = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ColaboradorForm>(emptyForm);
  const [search, setSearch] = useState('');

  const { data: colaboradores = [], isLoading } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('colaboradores')
        .select('*, secretarias(nome), funcoes(nome), lotacoes(nome), cidades(nome, estado)')
        .order('nome');
      if (error) throw error;
      return data;
    },
  });

  const { data: secretarias = [] } = useQuery({
    queryKey: ['secretarias-ativas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('secretarias').select('*').eq('ativo', true).order('nome');
      if (error) throw error;
      return data;
    },
  });

  const { data: funcoes = [] } = useQuery({
    queryKey: ['funcoes-ativas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('funcoes').select('*').eq('ativo', true).order('nome');
      if (error) throw error;
      return data;
    },
  });

  const { data: lotacoes = [] } = useQuery({
    queryKey: ['lotacoes-ativas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('lotacoes').select('*').eq('ativo', true).order('nome');
      if (error) throw error;
      return data;
    },
  });

  const { data: cidades = [] } = useQuery({
    queryKey: ['cidades-ativas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('cidades').select('*').eq('ativo', true).order('nome');
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        nome: form.nome,
        cpf: form.cpf,
        matricula: form.matricula || null,
        secretaria_id: form.secretaria_id || null,
        funcao_id: form.funcao_id || null,
        lotacao_id: form.lotacao_id || null,
        salario_base: form.salario_base ? Number(form.salario_base) : 0,
        data_admissao: form.data_admissao || null,
        beneficio_social: form.beneficio_social,
        banco: form.banco || null,
        conta: form.conta || null,
        pix: form.pix || null,
        endereco: form.endereco || null,
        numero: form.numero || null,
        complemento: form.complemento || null,
        bairro: form.bairro || null,
        cidade_id: form.cidade_id || null,
        cep: form.cep || null,
      };
      if (editId) {
        const { error } = await supabase.from('colaboradores').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('colaboradores').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      toast({ title: editId ? 'Colaborador atualizado' : 'Colaborador cadastrado' });
      closeDialog();
    },
    onError: (err: any) => toast({ title: 'Erro ao salvar', description: err?.message?.includes('unique') ? 'CPF já cadastrado' : 'Verifique os dados', variant: 'destructive' }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from('colaboradores').update({ ativo: !ativo }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['colaboradores'] }),
  });

  const closeDialog = () => { setDialogOpen(false); setEditId(null); setForm(emptyForm); };

  const openEdit = (item: any) => {
    setEditId(item.id);
    setForm({
      nome: item.nome,
      cpf: item.cpf,
      matricula: item.matricula || '',
      secretaria_id: item.secretaria_id || '',
      funcao_id: item.funcao_id || '',
      lotacao_id: item.lotacao_id || '',
      salario_base: String(item.salario_base || ''),
      data_admissao: item.data_admissao || '',
      beneficio_social: item.beneficio_social || false,
      banco: item.banco || '',
      conta: item.conta || '',
      pix: item.pix || '',
      endereco: item.endereco || '',
      numero: item.numero || '',
      complemento: item.complemento || '',
      bairro: item.bairro || '',
      cidade_id: item.cidade_id || '',
      cep: item.cep || '',
    });
    setDialogOpen(true);
  };

  const updateField = (field: keyof ColaboradorForm, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const filtered = colaboradores.filter((c: any) =>
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    c.cpf.includes(search)
  );

  const formatCPF = (cpf: string) => {
    const digits = cpf.replace(/\D/g, '');
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatCEP = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (digits.length > 5) return digits.replace(/(\d{5})(\d)/, '$1-$2');
    return digits;
  };

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Colaboradores</h1>
          <Button onClick={() => setDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Novo Colaborador
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou CPF..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead className="hidden md:table-cell">Secretaria</TableHead>
                    <TableHead className="hidden md:table-cell">Função</TableHead>
                    <TableHead className="hidden lg:table-cell">Lotação</TableHead>
                    <TableHead className="hidden lg:table-cell text-right">Sal. Base</TableHead>
                    <TableHead className="hidden lg:table-cell">Benef. Social</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="w-28">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum colaborador encontrado</TableCell></TableRow>
                  ) : (
                    filtered.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.nome}</TableCell>
                        <TableCell className="font-mono text-sm">{formatCPF(item.cpf)}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {(item.secretarias as any)?.nome || <span className="text-destructive font-semibold cursor-pointer hover:underline" onClick={() => openEdit(item)}>vincular</span>}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {(item.funcoes as any)?.nome || <span className="text-destructive font-semibold cursor-pointer hover:underline" onClick={() => openEdit(item)}>vincular</span>}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {(item.lotacoes as any)?.nome || <span className="text-destructive font-semibold cursor-pointer hover:underline" onClick={() => openEdit(item)}>vincular</span>}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-right">{formatCurrency(item.salario_base)}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Badge variant={item.beneficio_social ? 'default' : 'outline'}>{item.beneficio_social ? 'Sim' : 'Não'}</Badge>
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
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Editar Colaborador' : 'Novo Colaborador'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            {/* Dados Pessoais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Nome *</Label>
                <Input placeholder="Nome completo" value={form.nome} onChange={(e) => updateField('nome', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>CPF *</Label>
                <Input placeholder="00000000000" value={form.cpf} onChange={(e) => updateField('cpf', e.target.value.replace(/\D/g, '').slice(0, 11))} />
              </div>
              <div className="space-y-2">
                <Label>Matrícula</Label>
                <Input placeholder="Matrícula" value={form.matricula} onChange={(e) => updateField('matricula', e.target.value)} />
              </div>
            </div>

            {/* Vínculo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Secretaria</Label>
                <Select value={form.secretaria_id} onValueChange={(v) => updateField('secretaria_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {secretarias.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Função</Label>
                <Select value={form.funcao_id} onValueChange={(v) => updateField('funcao_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {funcoes.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Lotação</Label>
                <Select value={form.lotacao_id} onValueChange={(v) => updateField('lotacao_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {lotacoes.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Salário Base</Label>
                <Input type="number" placeholder="0.00" value={form.salario_base} onChange={(e) => updateField('salario_base', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Data Admissão</Label>
                <Input type="date" value={form.data_admissao} onChange={(e) => updateField('data_admissao', e.target.value)} />
              </div>
              <div className="space-y-2 flex items-center gap-3 pt-6">
                <Switch checked={form.beneficio_social} onCheckedChange={(v) => updateField('beneficio_social', v)} />
                <Label>Benefício Social</Label>
              </div>
            </div>

            {/* Endereço */}
            <div className="border-t pt-4 mt-2">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Endereço</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CEP</Label>
                  <Input placeholder="00000-000" value={form.cep} onChange={(e) => updateField('cep', formatCEP(e.target.value))} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Logradouro</Label>
                  <Input placeholder="Rua, Avenida..." value={form.endereco} onChange={(e) => updateField('endereco', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Número</Label>
                  <Input placeholder="Nº" value={form.numero} onChange={(e) => updateField('numero', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Complemento</Label>
                  <Input placeholder="Apto, Bloco..." value={form.complemento} onChange={(e) => updateField('complemento', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Bairro</Label>
                  <Input placeholder="Bairro" value={form.bairro} onChange={(e) => updateField('bairro', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Select value={form.cidade_id} onValueChange={(v) => updateField('cidade_id', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione a cidade" /></SelectTrigger>
                    <SelectContent>
                      {cidades.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome} - {c.estado}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Dados Bancários */}
            <div className="border-t pt-4 mt-2">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Dados Bancários</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Banco</Label>
                  <Input placeholder="Ex: Bradesco" value={form.banco} onChange={(e) => updateField('banco', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Conta</Label>
                  <Input placeholder="Ag/Conta" value={form.conta} onChange={(e) => updateField('conta', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>PIX</Label>
                  <Input placeholder="Chave PIX" value={form.pix} onChange={(e) => updateField('pix', e.target.value)} />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.nome.trim() || !form.cpf.trim() || saveMutation.isPending}>
              {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default CadastroColaboradores;
