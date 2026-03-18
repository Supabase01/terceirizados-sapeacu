import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Users, Shield, Loader2, Plus, Pencil, Trash2, Briefcase, Lock, Search, KeyRound, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsAdmin } from '@/hooks/useUserRoles';

const ALL_ROUTES = [
  { path: '/admin/config', module: 'Administrador', label: 'Painel Admin' },
  { path: '/admin/instituicoes', module: 'Administrador', label: 'Instituições' },
  { path: '/admin/unidades', module: 'Administrador', label: 'Unidades de Folha' },
  { path: '/indicadores', module: 'Folha de Pagamentos', label: 'Indicadores' },
  { path: '/import', module: 'Folha de Pagamentos', label: 'Importação' },
  { path: '/folha/adicionais', module: 'Folha de Pagamentos', label: 'Adicionais' },
  { path: '/folha/descontos', module: 'Folha de Pagamentos', label: 'Descontos' },
  { path: '/relatorios', module: 'Folha de Pagamentos', label: 'Relatórios' },
  { path: '/cadastro/colaboradores', module: 'Cadastros', label: 'Colaboradores' },
  { path: '/cadastro/secretarias', module: 'Cadastros', label: 'Secretarias' },
  { path: '/cadastro/funcoes', module: 'Cadastros', label: 'Funções' },
  { path: '/cadastro/lotacoes', module: 'Cadastros', label: 'Lotações' },
  { path: '/alertas', module: 'Auditoria', label: 'Alertas' },
];

const ROUTE_LABELS: Record<string, string> = {};
ALL_ROUTES.forEach(r => { ROUTE_LABELS[r.path] = r.label; });

const AdminConfig = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin, isLoading: loadingAdmin } = useIsAdmin();

  // --- State ---
  const [funcaoDialog, setFuncaoDialog] = useState(false);
  const [editingFuncao, setEditingFuncao] = useState<any>(null);
  const [funcaoNome, setFuncaoNome] = useState('');
  const [funcaoDesc, setFuncaoDesc] = useState('');
  const [funcaoRoutes, setFuncaoRoutes] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [userDialog, setUserDialog] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserNome, setNewUserNome] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserFuncoes, setNewUserFuncoes] = useState<string[]>([]);
  const [newUserUnidades, setNewUserUnidades] = useState<string[]>([]);

  const [userSearch, setUserSearch] = useState('');

  // Dialog for linking unidades to a user
  const [unidadeDialogUserId, setUnidadeDialogUserId] = useState<string | null>(null);
  const [unidadeDialogSelected, setUnidadeDialogSelected] = useState<Set<string>>(new Set());

  // --- Queries ---
  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, nome, created_at')
        .order('created_at', { ascending: true });
      if (error) throw error;
      const { data: roles } = await supabase.from('user_roles').select('user_id, role');
      const { data: userFuncoes } = await supabase.from('usuario_funcoes_sistema').select('user_id, funcao_sistema_id');
      const { data: userUnidades } = await supabase.from('usuario_unidades').select('user_id, unidade_id');
      return (profiles || []).map(p => ({
        ...p,
        roles: (roles || []).filter(r => r.user_id === p.id).map(r => r.role),
        funcoes_sistema: (userFuncoes || []).filter(f => f.user_id === p.id).map(f => f.funcao_sistema_id),
        unidades: (userUnidades || []).filter(u => u.user_id === p.id).map(u => u.unidade_id),
      }));
    },
    enabled: isAdmin,
  });

  const { data: funcoesSistema = [], isLoading: loadingFuncoes } = useQuery({
    queryKey: ['funcoes-sistema'],
    queryFn: async () => {
      const { data, error } = await supabase.from('funcoes_sistema').select('*').order('nome');
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  const { data: funcaoPermissoes } = useQuery({
    queryKey: ['funcao-sistema-permissoes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('funcao_sistema_permissoes').select('*');
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  const { data: unidadesFolha = [] } = useQuery({
    queryKey: ['unidades-folha'],
    queryFn: async () => {
      const { data, error } = await supabase.from('unidades_folha').select('id, nome, ativo').eq('ativo', true).order('nome');
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  // --- Derived data ---
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!userSearch.trim()) return users;
    const q = userSearch.toLowerCase();
    return users.filter(u =>
      u.email.toLowerCase().includes(q) ||
      (u.nome && u.nome.toLowerCase().includes(q))
    );
  }, [users, userSearch]);

  const routesByModule = useMemo(() =>
    ALL_ROUTES.reduce((acc, r) => {
      if (!acc[r.module]) acc[r.module] = [];
      acc[r.module].push(r);
      return acc;
    }, {} as Record<string, typeof ALL_ROUTES>),
  []);

  const getUnidadeNome = (id: string) => unidadesFolha.find(u => u.id === id)?.nome || id;

  const stats = useMemo(() => ({
    totalUsers: users?.length || 0,
    funcaoCount: funcoesSistema?.length || 0,
    unidadeCount: unidadesFolha.length,
    routeCount: ALL_ROUTES.length,
  }), [users, funcoesSistema, unidadesFolha]);

  // --- Mutations ---
  const assignFuncao = useMutation({
    mutationFn: async ({ userId, funcaoId, assign }: { userId: string; funcaoId: string; assign: boolean }) => {
      if (assign) {
        const { error } = await supabase.from('usuario_funcoes_sistema').insert({ user_id: userId, funcao_sistema_id: funcaoId });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('usuario_funcoes_sistema').delete().eq('user_id', userId).eq('funcao_sistema_id', funcaoId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['allowed-routes'] });
      toast({ title: 'Função atualizada' });
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const saveUserUnidades = useMutation({
    mutationFn: async ({ userId, unidadeIds }: { userId: string; unidadeIds: string[] }) => {
      await supabase.from('usuario_unidades').delete().eq('user_id', userId);
      if (unidadeIds.length > 0) {
        const rows = unidadeIds.map(unidade_id => ({ user_id: userId, unidade_id }));
        const { error } = await supabase.from('usuario_unidades').insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: 'Unidades vinculadas com sucesso' });
      setUnidadeDialogUserId(null);
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const saveFuncao = useMutation({
    mutationFn: async () => {
      if (!funcaoNome.trim()) throw new Error('Nome é obrigatório');
      let funcaoId: string;
      if (editingFuncao) {
        const { error } = await supabase.from('funcoes_sistema')
          .update({ nome: funcaoNome.trim(), descricao: funcaoDesc.trim() || null })
          .eq('id', editingFuncao.id);
        if (error) throw error;
        funcaoId = editingFuncao.id;
        await supabase.from('funcao_sistema_permissoes').delete().eq('funcao_sistema_id', funcaoId);
      } else {
        const { data, error } = await supabase.from('funcoes_sistema')
          .insert({ nome: funcaoNome.trim(), descricao: funcaoDesc.trim() || null })
          .select('id').single();
        if (error) throw error;
        funcaoId = data.id;
      }
      if (funcaoRoutes.length > 0) {
        const perms = funcaoRoutes.map(r => ({
          funcao_sistema_id: funcaoId,
          route_path: r,
          module_name: ALL_ROUTES.find(ar => ar.path === r)?.module || '',
          allowed: true,
        }));
        const { error } = await supabase.from('funcao_sistema_permissoes').insert(perms);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funcoes-sistema'] });
      queryClient.invalidateQueries({ queryKey: ['funcao-sistema-permissoes'] });
      queryClient.invalidateQueries({ queryKey: ['allowed-routes'] });
      setFuncaoDialog(false);
      resetFuncaoForm();
      toast({ title: editingFuncao ? 'Função atualizada' : 'Função criada' });
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const deleteFuncao = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('funcoes_sistema').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funcoes-sistema'] });
      queryClient.invalidateQueries({ queryKey: ['funcao-sistema-permissoes'] });
      setDeleteConfirm(null);
      toast({ title: 'Função excluída' });
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const createUser = useMutation({
    mutationFn: async () => {
      if (!newUserEmail || !newUserPassword) throw new Error('E-mail e senha são obrigatórios');
      if (newUserPassword.length < 6) throw new Error('Senha deve ter no mínimo 6 caracteres');
      const res = await supabase.functions.invoke('create-user', {
        body: { email: newUserEmail, password: newUserPassword, nome: newUserNome || newUserEmail, role: 'usuario' },
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);

      const userId = res.data?.user?.id;
      if (userId) {
        // Assign functions
        for (const funcaoId of newUserFuncoes) {
          await supabase.from('usuario_funcoes_sistema').insert({ user_id: userId, funcao_sistema_id: funcaoId });
        }
        // Assign unidades
        if (newUserUnidades.length > 0) {
          const rows = newUserUnidades.map(unidade_id => ({ user_id: userId, unidade_id }));
          await supabase.from('usuario_unidades').insert(rows);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setUserDialog(false);
      setNewUserEmail('');
      setNewUserNome('');
      setNewUserPassword('');
      setNewUserFuncoes([]);
      setNewUserUnidades([]);
      toast({ title: 'Usuário criado com sucesso' });
    },
    onError: (err: any) => toast({ title: 'Erro ao criar usuário', description: err.message, variant: 'destructive' }),
  });

  const togglePermission = useMutation({
    mutationFn: async ({ funcaoId, routePath, module, currentlyAllowed }: { funcaoId: string; routePath: string; module: string; currentlyAllowed: boolean }) => {
      if (currentlyAllowed) {
        const { error } = await supabase.from('funcao_sistema_permissoes').delete()
          .eq('funcao_sistema_id', funcaoId).eq('route_path', routePath);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('funcao_sistema_permissoes')
          .insert({ funcao_sistema_id: funcaoId, route_path: routePath, module_name: module, allowed: true });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funcao-sistema-permissoes'] });
      queryClient.invalidateQueries({ queryKey: ['allowed-routes'] });
    },
    onError: (err: any) => toast({ title: 'Erro ao atualizar permissão', description: err.message, variant: 'destructive' }),
  });

  const toggleAllModulePermissions = useMutation({
    mutationFn: async ({ funcaoId, modulePaths, allChecked }: { funcaoId: string; modulePaths: typeof ALL_ROUTES; allChecked: boolean }) => {
      for (const route of modulePaths) {
        const isAllowed = (funcaoPermissoes || []).some(
          p => p.funcao_sistema_id === funcaoId && p.route_path === route.path && p.allowed
        );
        if (allChecked && isAllowed) {
          await supabase.from('funcao_sistema_permissoes').delete()
            .eq('funcao_sistema_id', funcaoId).eq('route_path', route.path);
        } else if (!allChecked && !isAllowed) {
          await supabase.from('funcao_sistema_permissoes')
            .insert({ funcao_sistema_id: funcaoId, route_path: route.path, module_name: route.module, allowed: true });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funcao-sistema-permissoes'] });
      queryClient.invalidateQueries({ queryKey: ['allowed-routes'] });
    },
  });

  const toggleAllPermissions = useMutation({
    mutationFn: async ({ funcaoId, allChecked }: { funcaoId: string; allChecked: boolean }) => {
      if (allChecked) {
        const { error } = await supabase.from('funcao_sistema_permissoes').delete()
          .eq('funcao_sistema_id', funcaoId);
        if (error) throw error;
      } else {
        await supabase.from('funcao_sistema_permissoes').delete()
          .eq('funcao_sistema_id', funcaoId);
        const perms = ALL_ROUTES.map(r => ({
          funcao_sistema_id: funcaoId,
          route_path: r.path,
          module_name: r.module,
          allowed: true,
        }));
        const { error } = await supabase.from('funcao_sistema_permissoes').insert(perms);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funcao-sistema-permissoes'] });
      queryClient.invalidateQueries({ queryKey: ['allowed-routes'] });
    },
    onError: (err: any) => toast({ title: 'Erro ao atualizar permissões', description: err.message, variant: 'destructive' }),
  });

  // --- Helpers ---
  const resetFuncaoForm = () => {
    setEditingFuncao(null);
    setFuncaoNome('');
    setFuncaoDesc('');
    setFuncaoRoutes([]);
  };

  const openEditFuncao = (funcao: any) => {
    setEditingFuncao(funcao);
    setFuncaoNome(funcao.nome);
    setFuncaoDesc(funcao.descricao || '');
    const perms = (funcaoPermissoes || []).filter(p => p.funcao_sistema_id === funcao.id);
    setFuncaoRoutes(perms.map(p => p.route_path));
    setFuncaoDialog(true);
  };

  const toggleRoute = (path: string) => {
    setFuncaoRoutes(prev =>
      prev.includes(path) ? prev.filter(r => r !== path) : [...prev, path]
    );
  };

  const openUnidadeDialog = (user: any) => {
    setUnidadeDialogUserId(user.id);
    setUnidadeDialogSelected(new Set(user.unidades || []));
  };

  // --- Guard ---
  if (loadingAdmin) {
    return <Layout><div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></Layout>;
  }
  if (!isAdmin) {
    return <Layout><div className="flex flex-col items-center justify-center py-20 gap-3"><Shield className="h-12 w-12 text-muted-foreground" /><p className="text-lg font-medium text-muted-foreground">Acesso restrito a administradores</p></div></Layout>;
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Administração</h1>
          <p className="text-sm text-muted-foreground">Gerencie usuários, funções e permissões do sistema</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2.5">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalUsers}</p>
                <p className="text-xs text-muted-foreground">Usuários</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg bg-accent p-2.5">
                <Briefcase className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.funcaoCount}</p>
                <p className="text-xs text-muted-foreground">Funções</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2.5">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.unidadeCount}</p>
                <p className="text-xs text-muted-foreground">Unidades</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg bg-muted p-2.5">
                <KeyRound className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.routeCount}</p>
                <p className="text-xs text-muted-foreground">Rotas</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users" className="gap-1.5"><Users className="h-4 w-4" />Usuários</TabsTrigger>
            <TabsTrigger value="funcoes" className="gap-1.5"><Briefcase className="h-4 w-4" />Funções</TabsTrigger>
            <TabsTrigger value="permissoes" className="gap-1.5"><Lock className="h-4 w-4" />Permissões</TabsTrigger>
          </TabsList>

          {/* ===== USERS TAB ===== */}
          <TabsContent value="users">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg">Usuários do Sistema</CardTitle>
                  <CardDescription>Gerencie usuários, funções e unidades vinculadas</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar..."
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      className="pl-9 w-[200px] h-9"
                    />
                  </div>
                  <Button size="sm" className="gap-1.5" onClick={() => setUserDialog(true)}>
                    <Plus className="h-4 w-4" />
                    Novo Usuário
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingUsers ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Usuário</TableHead>
                          <TableHead>Função</TableHead>
                          <TableHead>Unidades de Folha</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map(user => {
                          const isMaster = user.email === 'nailton.alsampaio@gmail.com';
                          const isAdminUser = user.roles.includes('admin');
                          return (
                            <TableRow key={user.id}>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium text-foreground">
                                    {user.nome || user.email}
                                    {isMaster && <Badge className="ml-2 text-[10px]" variant="default">Master</Badge>}
                                    {isAdminUser && !isMaster && <Badge className="ml-2 text-[10px]" variant="destructive">Admin</Badge>}
                                  </span>
                                  {user.nome && (
                                    <span className="text-xs text-muted-foreground">{user.email}</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {funcoesSistema?.map(f => {
                                    const assigned = user.funcoes_sistema.includes(f.id);
                                    return (
                                      <Badge
                                        key={f.id}
                                        variant={assigned ? 'default' : 'outline'}
                                        className="cursor-pointer text-[10px] transition-colors hover:opacity-80"
                                        onClick={() => assignFuncao.mutate({ userId: user.id, funcaoId: f.id, assign: !assigned })}
                                      >
                                        {f.nome}
                                        {assigned ? ' ✓' : ' +'}
                                      </Badge>
                                    );
                                  })}
                                  {(!funcoesSistema || funcoesSistema.length === 0) && (
                                    <span className="text-xs text-muted-foreground italic">Nenhuma função criada</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                                    {user.unidades.length > 0 ? (
                                      user.unidades.map((uid: string) => (
                                        <Badge key={uid} variant="secondary" className="text-[10px]">
                                          {getUnidadeNome(uid)}
                                        </Badge>
                                      ))
                                    ) : (
                                      <span className="text-xs text-muted-foreground italic">Nenhuma</span>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 shrink-0"
                                    onClick={() => openUnidadeDialog(user)}
                                    title="Vincular Unidades"
                                  >
                                    <Building2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {filteredUsers.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                              {userSearch ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== FUNÇÕES TAB ===== */}
          <TabsContent value="funcoes">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Funções do Sistema</CardTitle>
                  <CardDescription>Crie funções com permissões específicas por rota</CardDescription>
                </div>
                <Button size="sm" className="gap-1.5" onClick={() => { resetFuncaoForm(); setFuncaoDialog(true); }}>
                  <Plus className="h-4 w-4" />
                  Nova Função
                </Button>
              </CardHeader>
              <CardContent>
                {loadingFuncoes ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Rotas Permitidas</TableHead>
                          <TableHead className="w-[100px] text-center">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {funcoesSistema?.map(f => {
                          const perms = (funcaoPermissoes || []).filter(p => p.funcao_sistema_id === f.id);
                          const usersWithFunc = users?.filter(u => u.funcoes_sistema.includes(f.id)).length || 0;
                          return (
                            <TableRow key={f.id}>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium text-foreground">{f.nome}</span>
                                  <span className="text-[10px] text-muted-foreground">{usersWithFunc} usuário(s)</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{f.descricao || '—'}</TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {perms.map(p => (
                                    <Badge key={p.id} variant="outline" className="text-[10px]">
                                      {ROUTE_LABELS[p.route_path] || p.route_path}
                                    </Badge>
                                  ))}
                                  {perms.length === 0 && <span className="text-xs text-muted-foreground italic">Nenhuma rota</span>}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex justify-center gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditFuncao(f)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(f.id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {(!funcoesSistema || funcoesSistema.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                              Nenhuma função criada. Clique em "Nova Função" para começar.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== PERMISSÕES TAB ===== */}
          <TabsContent value="permissoes">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Matriz de Permissões</CardTitle>
                <CardDescription>Marque as rotas que cada função pode acessar. Use os checkboxes do cabeçalho para marcar/desmarcar tudo.</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingFuncoes ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : !funcoesSistema || funcoesSistema.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Crie funções do sistema primeiro na aba "Funções".</p>
                ) : (
                  <ScrollArea className="w-full">
                    <div className="rounded-lg border border-border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/60">
                            <TableHead className="sticky left-0 bg-muted/60 z-10 min-w-[240px] text-foreground font-bold text-sm">
                              Módulo / Rota
                            </TableHead>
                            {funcoesSistema.map(f => {
                              const totalAllowed = (funcaoPermissoes || []).filter(p => p.funcao_sistema_id === f.id && p.allowed).length;
                              const allChecked = totalAllowed === ALL_ROUTES.length;
                              const someChecked = totalAllowed > 0;
                              return (
                                <TableHead key={f.id} className="text-center min-w-[130px] bg-muted/60">
                                  <div className="flex flex-col items-center gap-1.5 py-1">
                                    <span className="text-xs font-bold text-foreground">{f.nome}</span>
                                    <Badge variant={allChecked ? 'default' : someChecked ? 'secondary' : 'outline'} className="text-[10px] px-1.5 py-0">
                                      {totalAllowed}/{ALL_ROUTES.length}
                                    </Badge>
                                    <Checkbox
                                      checked={allChecked ? true : someChecked ? 'indeterminate' : false}
                                      onCheckedChange={() => toggleAllPermissions.mutate({ funcaoId: f.id, allChecked })}
                                      className="mx-auto"
                                    />
                                  </div>
                                </TableHead>
                              );
                            })}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(routesByModule).map(([module, routes]) => {
                            return (
                              <React.Fragment key={`mod-${module}`}>
                                <TableRow className="bg-primary/5 border-t-2 border-border">
                                  <TableCell className="sticky left-0 bg-primary/5 z-10 font-bold text-xs uppercase tracking-wider text-primary py-2.5">
                                    📁 {module}
                                  </TableCell>
                                  {funcoesSistema.map(f => {
                                    const allChecked = routes.every(r =>
                                      (funcaoPermissoes || []).some(p => p.funcao_sistema_id === f.id && p.route_path === r.path && p.allowed)
                                    );
                                    const someChecked = routes.some(r =>
                                      (funcaoPermissoes || []).some(p => p.funcao_sistema_id === f.id && p.route_path === r.path && p.allowed)
                                    );
                                    return (
                                      <TableCell key={f.id} className="text-center py-2.5 bg-primary/5">
                                        <Checkbox
                                          checked={allChecked ? true : someChecked ? 'indeterminate' : false}
                                          onCheckedChange={() => toggleAllModulePermissions.mutate({
                                            funcaoId: f.id,
                                            modulePaths: routes,
                                            allChecked,
                                          })}
                                          className="mx-auto"
                                        />
                                      </TableCell>
                                    );
                                  })}
                                </TableRow>
                                {routes.map((route, idx) => (
                                  <TableRow key={route.path} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                                    <TableCell className={`sticky left-0 z-10 pl-8 ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}>
                                      <div className="flex flex-col gap-0.5">
                                        <span className="text-sm font-semibold text-foreground">{route.label}</span>
                                        <span className="text-[11px] text-muted-foreground font-mono">{route.path}</span>
                                      </div>
                                    </TableCell>
                                    {funcoesSistema.map(f => {
                                      const isAllowed = (funcaoPermissoes || []).some(
                                        p => p.funcao_sistema_id === f.id && p.route_path === route.path && p.allowed
                                      );
                                      return (
                                        <TableCell key={f.id} className="text-center">
                                          <div className={`inline-flex items-center justify-center w-8 h-8 rounded-md ${isAllowed ? 'bg-primary/10' : ''}`}>
                                            <Checkbox
                                              checked={isAllowed}
                                              onCheckedChange={() => togglePermission.mutate({
                                                funcaoId: f.id,
                                                routePath: route.path,
                                                module,
                                                currentlyAllowed: isAllowed,
                                              })}
                                            />
                                          </div>
                                        </TableCell>
                                      );
                                    })}
                                  </TableRow>
                                ))}
                              </React.Fragment>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ===== DIALOG CREATE/EDIT FUNCAO ===== */}
      <Dialog open={funcaoDialog} onOpenChange={setFuncaoDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingFuncao ? 'Editar Função' : 'Nova Função do Sistema'}</DialogTitle>
            <DialogDescription>
              {editingFuncao ? 'Altere o nome, descrição e permissões da função.' : 'Defina o nome e as permissões da nova função.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Função</Label>
              <Input value={funcaoNome} onChange={e => setFuncaoNome(e.target.value)} placeholder="Ex: Gestor de Folha" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={funcaoDesc} onChange={e => setFuncaoDesc(e.target.value)} placeholder="Descrição opcional..." rows={2} />
            </div>
            <Separator />
            <div className="space-y-3">
              <Label>Permissões por Rota</Label>
              {Object.entries(routesByModule).map(([module, routes]) => (
                <div key={module} className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{module}</p>
                  {routes.map(route => (
                    <label key={route.path} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-2 py-1.5 transition-colors">
                      <Checkbox
                        checked={funcaoRoutes.includes(route.path)}
                        onCheckedChange={() => toggleRoute(route.path)}
                      />
                      <div className="flex flex-col">
                        <span className="text-sm">{route.label}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{route.path}</span>
                      </div>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFuncaoDialog(false)}>Cancelar</Button>
            <Button onClick={() => saveFuncao.mutate()} disabled={!funcaoNome.trim() || saveFuncao.isPending}>
              {saveFuncao.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== DIALOG CREATE USER ===== */}
      <Dialog open={userDialog} onOpenChange={setUserDialog}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
            <DialogDescription>Crie uma conta de acesso ao sistema.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={newUserNome} onChange={e => setNewUserNome(e.target.value)} placeholder="Nome do usuário" />
            </div>
            <div className="space-y-2">
              <Label>E-mail *</Label>
              <Input type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="email@exemplo.com" required />
            </div>
            <div className="space-y-2">
              <Label>Senha *</Label>
              <Input type="password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6} required />
            </div>
            {funcoesSistema && funcoesSistema.length > 0 && (
              <div className="space-y-2">
                <Label>Função do Sistema</Label>
                <div className="space-y-1.5 rounded-md border p-3">
                  {funcoesSistema.map(f => (
                    <label key={f.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-2 py-1 transition-colors">
                      <Checkbox
                        checked={newUserFuncoes.includes(f.id)}
                        onCheckedChange={(checked) => {
                          setNewUserFuncoes(prev =>
                            checked ? [...prev, f.id] : prev.filter(id => id !== f.id)
                          );
                        }}
                      />
                      <span className="text-sm">{f.nome}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            {unidadesFolha.length > 0 && (
              <div className="space-y-2">
                <Label>Unidades de Folha</Label>
                <div className="space-y-1.5 rounded-md border p-3 max-h-[200px] overflow-y-auto">
                  {unidadesFolha.map(u => (
                    <label key={u.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-2 py-1 transition-colors">
                      <Checkbox
                        checked={newUserUnidades.includes(u.id)}
                        onCheckedChange={(checked) => {
                          setNewUserUnidades(prev =>
                            checked ? [...prev, u.id] : prev.filter(id => id !== u.id)
                          );
                        }}
                      />
                      <span className="text-sm">{u.nome}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialog(false)}>Cancelar</Button>
            <Button onClick={() => createUser.mutate()} disabled={createUser.isPending}>
              {createUser.isPending ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== DIALOG VINCULAR UNIDADES ===== */}
      <Dialog open={!!unidadeDialogUserId} onOpenChange={(open) => !open && setUnidadeDialogUserId(null)}>
        <DialogContent className="max-w-md max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Vincular Unidades de Folha
            </DialogTitle>
            <DialogDescription>
              Selecione as unidades que este usuário terá acesso.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {unidadesFolha.map(u => {
              const isChecked = unidadeDialogSelected.has(u.id);
              return (
                <label
                  key={u.id}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/50 cursor-pointer"
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={(checked) => {
                      setUnidadeDialogSelected(prev => {
                        const next = new Set(prev);
                        if (checked) next.add(u.id);
                        else next.delete(u.id);
                        return next;
                      });
                    }}
                  />
                  <span className="text-sm font-medium">{u.nome}</span>
                </label>
              );
            })}
            {unidadesFolha.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma unidade cadastrada</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnidadeDialogUserId(null)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (unidadeDialogUserId) {
                  saveUserUnidades.mutate({
                    userId: unidadeDialogUserId,
                    unidadeIds: Array.from(unidadeDialogSelected),
                  });
                }
              }}
              disabled={saveUserUnidades.isPending}
            >
              {saveUserUnidades.isPending ? 'Salvando...' : 'Salvar Vínculos'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== DELETE CONFIRMATION ===== */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Função</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta função? Os usuários vinculados perderão as permissões associadas. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirm && deleteFuncao.mutate(deleteConfirm)}
            >
              {deleteFuncao.isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default AdminConfig;
