import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
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
import { useUnidade } from '@/contexts/UnidadeContext';
import { isValidCPF, cleanCPF } from '@/lib/cpf';

interface ColaboradorForm {
  nome: string;
  cpf: string;
  matricula: string;
  secretaria_id: string;
  funcao_id: string;
  lotacao_id: string;
  salario_base: string;
  data_admissao: string;
  data_nascimento: string;
  beneficio_social: boolean;
  banco: string;
  conta: string;
  pix: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade_id: string;
  lideranca_id: string;
}

const emptyForm: ColaboradorForm = {
  nome: '', cpf: '', matricula: '', secretaria_id: '', funcao_id: '', lotacao_id: '',
  salario_base: '', data_admissao: '', data_nascimento: '', beneficio_social: false, banco: '', conta: '', pix: '',
  endereco: '', numero: '', complemento: '', bairro: '', cidade_id: '', lideranca_id: '',
};

const PAGE_SIZE = 20;

const CadastroColaboradores = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { unidadeId } = useUnidade();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ColaboradorForm>(emptyForm);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterSecretaria, setFilterSecretaria] = useState('');
  const [filterFuncao, setFilterFuncao] = useState('');
  const [filterLotacao, setFilterLotacao] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(0);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Server-side paginated query
  const { data: queryResult, isLoading } = useQuery({
    queryKey: ['colaboradores', unidadeId, debouncedSearch, filterSecretaria, filterFuncao, filterLotacao, filterStatus, page],
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let countQuery = supabase
        .from('colaboradores')
        .select('id', { count: 'exact', head: true });
      if (unidadeId) countQuery = countQuery.eq('unidade_id', unidadeId);
      if (filterSecretaria === '__pending__') countQuery = countQuery.is('secretaria_id', null);
      else if (filterSecretaria) countQuery = countQuery.eq('secretaria_id', filterSecretaria);
      if (filterFuncao === '__pending__') countQuery = countQuery.is('funcao_id', null);
      else if (filterFuncao) countQuery = countQuery.eq('funcao_id', filterFuncao);
      if (filterLotacao === '__pending__') countQuery = countQuery.is('lotacao_id', null);
      else if (filterLotacao) countQuery = countQuery.eq('lotacao_id', filterLotacao);
      if (filterStatus === 'ativo') countQuery = countQuery.eq('ativo', true);
      if (filterStatus === 'inativo') countQuery = countQuery.eq('ativo', false);
      if (debouncedSearch) {
        countQuery = countQuery.or(`nome.ilike.%${debouncedSearch}%,cpf.ilike.%${debouncedSearch}%`);
      }
      const { count } = await countQuery;

      let query = supabase
        .from('colaboradores')
        .select('*, secretarias(nome), funcoes(nome), lotacoes(nome), cidades(nome, estado)')
        .order('nome')
        .range(from, to);
      if (unidadeId) query = query.eq('unidade_id', unidadeId);
      if (filterSecretaria === '__pending__') query = query.is('secretaria_id', null);
      else if (filterSecretaria) query = query.eq('secretaria_id', filterSecretaria);
      if (filterFuncao === '__pending__') query = query.is('funcao_id', null);
      else if (filterFuncao) query = query.eq('funcao_id', filterFuncao);
      if (filterLotacao === '__pending__') query = query.is('lotacao_id', null);
      else if (filterLotacao) query = query.eq('lotacao_id', filterLotacao);
      if (filterStatus === 'ativo') query = query.eq('ativo', true);
      if (filterStatus === 'inativo') query = query.eq('ativo', false);
      if (debouncedSearch) {
        query = query.or(`nome.ilike.%${debouncedSearch}%,cpf.ilike.%${debouncedSearch}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return { data: data || [], total: count || 0 };
    },
    enabled: !!unidadeId,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const colaboradores = queryResult?.data || [];
  const totalRecords = queryResult?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));

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

  const { data: funcoes = [] } = useQuery({
    queryKey: ['funcoes-ativas', unidadeId],
    queryFn: async () => {
      let query = supabase.from('funcoes').select('*').eq('ativo', true).order('nome');
      if (unidadeId) query = query.eq('unidade_id', unidadeId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!unidadeId,
  });

  const { data: lotacoes = [] } = useQuery({
    queryKey: ['lotacoes-ativas', unidadeId],
    queryFn: async () => {
      let query = supabase.from('lotacoes').select('*').eq('ativo', true).order('nome');
      if (unidadeId) query = query.eq('unidade_id', unidadeId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!unidadeId,
  });

  const { data: cidades = [] } = useQuery({
    queryKey: ['cidades-ativas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('cidades').select('*').eq('ativo', true).order('nome');
      if (error) throw error;
      return data;
    },
  });

  const { data: liderancas = [] } = useQuery({
    queryKey: ['liderancas-ativas', unidadeId],
    queryFn: async () => {
      let query = supabase.from('liderancas').select('*').eq('ativo', true).order('nome');
      if (unidadeId) query = query.eq('unidade_id', unidadeId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!unidadeId,
  });

  const generateMatricula = async () => {
    if (!unidadeId) return '';
    const { data, error } = await supabase.rpc('next_matricula', { _unidade_id: unidadeId });
    if (error) { console.error('Erro ao gerar matrícula:', error); return ''; }
    return data as string;
  };

  const openNew = async () => {
    const matricula = await generateMatricula();
    setForm({ ...emptyForm, matricula });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const cpfDigits = cleanCPF(form.cpf);
      if (!isValidCPF(cpfDigits)) {
        throw new Error('CPF inválido. Verifique os dígitos informados.');
      }
      const payload: any = {
        nome: form.nome,
        cpf: cpfDigits,
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
        data_nascimento: form.data_nascimento || null,
        lideranca_id: form.lideranca_id || null,
        unidade_id: unidadeId,
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
    onError: (err: any) => {
      const msg = err?.message || '';
      const isDuplicate = msg.includes('colaboradores_unidade_matricula_unique');
      const isInvalidCpf = msg.startsWith('CPF inválido');
      toast({
        title: isInvalidCpf
          ? 'CPF inválido'
          : isDuplicate
            ? 'Matrícula já existe nesta unidade'
            : 'Erro ao salvar',
        description: isInvalidCpf
          ? msg
          : isDuplicate
            ? 'Use outra matrícula ou deixe em branco para gerar automaticamente.'
            : msg.includes('unique') ? 'CPF já cadastrado' : 'Verifique os dados',
        variant: 'destructive',
      });
    },
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
      data_nascimento: item.data_nascimento || '',
      beneficio_social: item.beneficio_social || false,
      banco: item.banco || '',
      conta: item.conta || '',
      pix: item.pix || '',
      endereco: item.endereco || '',
      numero: item.numero || '',
      complemento: item.complemento || '',
      bairro: item.bairro || '',
      cidade_id: item.cidade_id || '',
      lideranca_id: item.lideranca_id || '',
    });
    setDialogOpen(true);
  };

  const updateField = (field: keyof ColaboradorForm, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // Server-side filtering — no client filter needed

  const formatCPF = (cpf: string) => {
    const digits = cpf.replace(/\D/g, '');
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);


  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Colaboradores</h1>
            <p className="text-sm text-muted-foreground">{totalRecords} colaboradores cadastrados</p>
          </div>
          <Button onClick={openNew} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Novo Colaborador
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome ou CPF..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterSecretaria} onValueChange={(v) => { setFilterSecretaria(v === 'all' ? '' : v); setPage(0); }}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Todas as secretarias" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as secretarias</SelectItem>
              <SelectItem value="__pending__" className="text-destructive font-medium">⚠ Pendente de vinculação</SelectItem>
              {secretarias.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterFuncao} onValueChange={(v) => { setFilterFuncao(v === 'all' ? '' : v); setPage(0); }}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Todas as funções" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as funções</SelectItem>
              <SelectItem value="__pending__" className="text-destructive font-medium">⚠ Pendente de vinculação</SelectItem>
              {funcoes.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterLotacao} onValueChange={(v) => { setFilterLotacao(v === 'all' ? '' : v); setPage(0); }}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Todas as lotações" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as lotações</SelectItem>
              <SelectItem value="__pending__" className="text-destructive font-medium">⚠ Pendente de vinculação</SelectItem>
              {lotacoes.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v === 'all' ? '' : v); setPage(0); }}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Todos os status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
            </SelectContent>
          </Select>
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
                  ) : colaboradores.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum colaborador encontrado</TableCell></TableRow>
                  ) : (
                    colaboradores.map((item: any) => (
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

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {totalRecords} colaboradores — Página {page + 1} de {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-1 text-sm rounded-md border disabled:opacity-40"
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
              >Anterior</button>
              <span className="text-sm text-muted-foreground">{page + 1}/{totalPages}</span>
              <button
                className="px-3 py-1 text-sm rounded-md border disabled:opacity-40"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
              >Próximo</button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Editar Colaborador' : 'Novo Colaborador'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Matrícula</Label>
                <Input value={form.matricula} readOnly disabled className="bg-muted" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Nome *</Label>
                <Input placeholder="Nome completo" value={form.nome} onChange={(e) => updateField('nome', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>CPF *</Label>
                <Input
                  placeholder="000.000.000-00"
                  value={formatCPF(form.cpf)}
                  onChange={(e) => updateField('cpf', e.target.value.replace(/\D/g, '').slice(0, 11))}
                  className={form.cpf.length === 11 && !isValidCPF(form.cpf) ? 'border-destructive focus-visible:ring-destructive' : ''}
                />
                {form.cpf.length === 11 && !isValidCPF(form.cpf) && (
                  <p className="text-xs text-destructive">CPF inválido. Verifique os dígitos.</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Data de Nascimento</Label>
                <Input type="date" value={form.data_nascimento} onChange={(e) => updateField('data_nascimento', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Secretaria *</Label>
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
                <Label>{(() => { const p = sessionStorage.getItem('unidade_padrao'); return p === 'padrao_02' ? 'Salário Líquido' : 'Salário Base'; })()}</Label>
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
              <div className="space-y-2">
                <Label>Indicação (Liderança)</Label>
                <Select value={form.lideranca_id} onValueChange={(v) => updateField('lideranca_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione a liderança" /></SelectTrigger>
                  <SelectContent>
                    {liderancas.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.nome}{l.cargo ? ` — ${l.cargo}` : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t pt-4 mt-2">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Endereço</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div className="border-t pt-4 mt-2">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Dados Bancários</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Banco</Label>
                  <Input placeholder="Nome do banco" value={form.banco} onChange={(e) => updateField('banco', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Conta</Label>
                  <Input placeholder="Número da conta" value={form.conta} onChange={(e) => updateField('conta', e.target.value)} />
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
            <Button onClick={() => saveMutation.mutate()} disabled={!form.nome.trim() || !isValidCPF(form.cpf) || !form.secretaria_id || saveMutation.isPending}>
              {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default CadastroColaboradores;
