import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Shield, Route, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsAdmin } from '@/hooks/useUserRoles';

const ROLES = [
  { value: 'admin', label: 'Administrador', color: 'bg-destructive text-destructive-foreground' },
  { value: 'usuario', label: 'Usuário', color: 'bg-secondary text-secondary-foreground' },
];

const AdminConfig = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin, isLoading: loadingAdmin } = useIsAdmin();

  // Fetch all profiles with their roles
  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, nome, created_at')
        .order('created_at', { ascending: true });
      if (error) throw error;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      if (rolesError) throw rolesError;

      return (profiles || []).map(p => ({
        ...p,
        roles: (roles || []).filter(r => r.user_id === p.id).map(r => r.role),
      }));
    },
    enabled: isAdmin,
  });

  // Fetch route permissions
  const { data: permissions, isLoading: loadingPerms } = useQuery({
    queryKey: ['admin-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('route_permissions')
        .select('*')
        .order('module_name');
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  // Assign role mutation
  const assignRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      // Remove existing roles first
      await supabase.from('user_roles').delete().eq('user_id', userId);
      // Insert new role
      const { error } = await supabase.from('user_roles').insert({ user_id: userId, role: role as any });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: 'Papel atualizado com sucesso' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });

  // Toggle route permission
  const togglePermission = useMutation({
    mutationFn: async ({ id, allowed }: { id: string; allowed: boolean }) => {
      const { error } = await supabase
        .from('route_permissions')
        .update({ allowed })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-permissions'] });
      toast({ title: 'Permissão atualizada' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });

  if (loadingAdmin) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Shield className="h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium text-muted-foreground">Acesso restrito a administradores</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Administração</h1>
          <p className="text-muted-foreground">Gerencie usuários e permissões do sistema</p>
        </div>

        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users" className="gap-1.5">
              <Users className="h-4 w-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="permissions" className="gap-1.5">
              <Route className="h-4 w-4" />
              Permissões por Rota
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Usuários do Sistema</CardTitle>
                <CardDescription>Atribua papéis aos usuários cadastrados</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingUsers ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>E-mail</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Papel Atual</TableHead>
                        <TableHead className="w-[200px]">Alterar Papel</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users?.map(user => {
                        const currentRole = user.roles[0] || 'sem papel';
                        const roleInfo = ROLES.find(r => r.value === currentRole);
                        return (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.email}</TableCell>
                            <TableCell>{user.nome || '—'}</TableCell>
                            <TableCell>
                              <Badge className={roleInfo?.color || 'bg-muted text-muted-foreground'}>
                                {roleInfo?.label || 'Sem papel'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={currentRole}
                                onValueChange={(role) => assignRole.mutate({ userId: user.id, role })}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {ROLES.map(r => (
                                    <SelectItem key={r.value} value={r.value}>
                                      {r.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {(!users || users.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            Nenhum usuário cadastrado
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Permissions Tab */}
          <TabsContent value="permissions">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Permissões por Rota</CardTitle>
                <CardDescription>Controle quais papéis podem acessar cada módulo e rota</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingPerms ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Módulo</TableHead>
                        <TableHead>Rota</TableHead>
                        <TableHead>Papel</TableHead>
                        <TableHead className="text-center w-[100px]">Permitido</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {permissions?.map(perm => {
                        const roleInfo = ROLES.find(r => r.value === perm.role);
                        return (
                          <TableRow key={perm.id}>
                            <TableCell>
                              <Badge variant="outline">{perm.module_name}</Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{perm.route_path}</TableCell>
                            <TableCell>
                              <Badge className={roleInfo?.color || ''}>
                                {roleInfo?.label || perm.role}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Switch
                                checked={perm.allowed}
                                onCheckedChange={(checked) =>
                                  togglePermission.mutate({ id: perm.id, allowed: checked })
                                }
                                disabled={perm.role === 'admin' && perm.route_path === '/admin/config'}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default AdminConfig;
