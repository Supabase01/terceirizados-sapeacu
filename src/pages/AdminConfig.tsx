import { useState } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Users, Shield, Route, Loader2, Plus, Pencil, Trash2, Briefcase } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsAdmin } from '@/hooks/useUserRoles';

const ALL_ROUTES = [
  { path: '/admin/config', module: 'Administrador' },
  { path: '/indicadores', module: 'Folha de Pagamentos' },
  { path: '/import', module: 'Folha de Pagamentos' },
  { path: '/relatorios', module: 'Folha de Pagamentos' },
  { path: '/cadastro/colaboradores', module: 'Cadastros' },
  { path: '/cadastro/secretarias', module: 'Cadastros' },
  { path: '/cadastro/funcoes', module: 'Cadastros' },
  { path: '/cadastro/lotacoes', module: 'Cadastros' },
  { path: '/alertas', module: 'Auditoria' },
];

const AdminConfig = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin, isLoading: loadingAdmin } = useIsAdmin();

  // --- State for dialogs ---
  const [funcaoDialog, setFuncaoDialog] = useState(false);
  const [editingFuncao, setEditingFuncao] = useState<any>(null);
  const [funcaoNome, setFuncaoNome] = useState('');
  const [funcaoDesc, setFuncaoDesc] = useState('');
  const [funcaoRoutes, setFuncaoRoutes] = useState<string[]>([]);

  // --- State for user creation ---
  const [userDialog, setUserDialog] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserNome, setNewUserNome] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('usuario');

  // --- Fetch users with roles and system functions ---
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

      return (profiles || []).map(p => ({
        ...p,
        roles: (roles || []).filter(r => r.user_id === p.id).map(r => r.role),
        funcoes_sistema: (userFuncoes || []).filter(f => f.user_id === p.id).map(f => f.funcao_sistema_id),
      }));
    },
    enabled: isAdmin,
  });

  // --- Fetch system functions ---
  const { data: funcoesSistema, isLoading: loadingFuncoes } = useQuery({
    queryKey: ['funcoes-sistema'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('funcoes_sistema')
        .select('*')
        .order('nome');
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  // --- Fetch function permissions ---
  const { data: funcaoPermissoes } = useQuery({
    queryKey: ['funcao-sistema-permissoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('funcao_sistema_permissoes')
        .select('*');
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  // --- Mutations ---
  const assignRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await supabase.from('user_roles').delete().eq('user_id', userId);
      const { error } = await supabase.from('user_roles').insert({ user_id: userId, role: role as any });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: 'Papel atualizado' });
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

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

  const saveFuncao = useMutation({
    mutationFn: async () => {
      if (!funcaoNome.trim()) throw new Error('Nome é obrigatório');

      let funcaoId: string;

      if (editingFuncao) {
        const { error } = await supabase
          .from('funcoes_sistema')
          .update({ nome: funcaoNome.trim(), descricao: funcaoDesc.trim() || null })
          .eq('id', editingFuncao.id);
        if (error) throw error;
        funcaoId = editingFuncao.id;

        // Delete old permissions
        await supabase.from('funcao_sistema_permissoes').delete().eq('funcao_sistema_id', funcaoId);
      } else {
        const { data, error } = await supabase
          .from('funcoes_sistema')
          .insert({ nome: funcaoNome.trim(), descricao: funcaoDesc.trim() || null })
          .select('id')
          .single();
        if (error) throw error;
        funcaoId = data.id;
      }

      // Insert permissions
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
      toast({ title: 'Função excluída' });
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const createUser = useMutation({
    mutationFn: async () => {
      if (!newUserEmail || !newUserPassword) throw new Error('E-mail e senha são obrigatórios');
      if (newUserPassword.length < 6) throw new Error('Senha deve ter no mínimo 6 caracteres');

      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('create-user', {
        body: { email: newUserEmail, password: newUserPassword, nome: newUserNome || newUserEmail, role: newUserRole },
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setUserDialog(false);
      setNewUserEmail('');
      setNewUserNome('');
      setNewUserPassword('');
      setNewUserRole('usuario');
      toast({ title: 'Usuário criado com sucesso' });
    },
    onError: (err: any) => toast({ title: 'Erro ao criar usuário', description: err.message, variant: 'destructive' }),
  });

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

  // --- Guard ---
  if (loadingAdmin) {
    return <Layout><div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></Layout>;
  }
  if (!isAdmin) {
    return <Layout><div className="flex flex-col items-center justify-center py-20 gap-3"><Shield className="h-12 w-12 text-muted-foreground" /><p className="text-lg font-medium text-muted-foreground">Acesso restrito a administradores</p></div></Layout>;
  }

  // Group routes by module for the form
  const routesByModule = ALL_ROUTES.reduce((acc, r) => {
    if (!acc[r.module]) acc[r.module] = [];
    acc[r.module].push(r.path);
    return acc;
  }, {} as Record<string, string[]>);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Administração</h1>
          <p className="text-muted-foreground">Gerencie usuários, funções e permissões</p>
        </div>

        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users" className="gap-1.5"><Users className="h-4 w-4" />Usuários</TabsTrigger>
            <TabsTrigger value="funcoes" className="gap-1.5"><Briefcase className="h-4 w-4" />Funções do Sistema</TabsTrigger>
          </TabsList>

          {/* ===== USERS TAB ===== */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Usuários do Sistema</CardTitle>
                <CardDescription>Atribua papéis e funções aos usuários</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingUsers ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>E-mail</TableHead>
                        <TableHead>Papel</TableHead>
                        <TableHead>Funções do Sistema</TableHead>
                        <TableHead className="w-[180px]">Alterar Papel</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users?.map(user => {
                        const currentRole = user.roles[0] || 'sem papel';
                        const isMaster = user.email === 'nailton.alsampaio@gmail.com';
                        return (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">
                              {user.email}
                              {isMaster && <Badge className="ml-2 bg-primary text-primary-foreground text-[10px]">Master</Badge>}
                            </TableCell>
                            <TableCell>
                              <Badge variant={currentRole === 'admin' ? 'destructive' : 'secondary'}>
                                {currentRole === 'admin' ? 'Administrador' : currentRole === 'usuario' ? 'Usuário' : 'Sem papel'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {funcoesSistema?.map(f => {
                                  const assigned = user.funcoes_sistema.includes(f.id);
                                  return (
                                    <Badge
                                      key={f.id}
                                      variant={assigned ? 'default' : 'outline'}
                                      className="cursor-pointer text-[10px]"
                                      onClick={() => assignFuncao.mutate({ userId: user.id, funcaoId: f.id, assign: !assigned })}
                                    >
                                      {f.nome}
                                      {assigned ? ' ✓' : ' +'}
                                    </Badge>
                                  );
                                })}
                                {(!funcoesSistema || funcoesSistema.length === 0) && (
                                  <span className="text-xs text-muted-foreground">Nenhuma função criada</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={currentRole}
                                onValueChange={(role) => assignRole.mutate({ userId: user.id, role })}
                                disabled={isMaster}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Administrador</SelectItem>
                                  <SelectItem value="usuario">Usuário</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {(!users || users.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum usuário cadastrado</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
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
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Rotas Permitidas</TableHead>
                        <TableHead className="w-[100px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {funcoesSistema?.map(f => {
                        const perms = (funcaoPermissoes || []).filter(p => p.funcao_sistema_id === f.id);
                        return (
                          <TableRow key={f.id}>
                            <TableCell className="font-medium">{f.nome}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{f.descricao || '—'}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {perms.map(p => (
                                  <Badge key={p.id} variant="outline" className="text-[10px]">{p.route_path}</Badge>
                                ))}
                                {perms.length === 0 && <span className="text-xs text-muted-foreground">Nenhuma</span>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditFuncao(f)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteFuncao.mutate(f.id)}>
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
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ===== DIALOG CREATE/EDIT FUNCAO ===== */}
      <Dialog open={funcaoDialog} onOpenChange={setFuncaoDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingFuncao ? 'Editar Função' : 'Nova Função do Sistema'}</DialogTitle>
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
            <div className="space-y-3">
              <Label>Permissões por Rota</Label>
              {Object.entries(routesByModule).map(([module, paths]) => (
                <div key={module} className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{module}</p>
                  {paths.map(path => (
                    <label key={path} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-2 py-1">
                      <Checkbox
                        checked={funcaoRoutes.includes(path)}
                        onCheckedChange={() => toggleRoute(path)}
                      />
                      <span className="text-sm font-mono">{path}</span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFuncaoDialog(false)}>Cancelar</Button>
            <Button onClick={() => saveFuncao.mutate()} disabled={saveFuncao.isPending}>
              {saveFuncao.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default AdminConfig;
