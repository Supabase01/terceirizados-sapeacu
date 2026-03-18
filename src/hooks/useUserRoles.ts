import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useUserRoles() {
  return useQuery({
    queryKey: ['user-roles'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase.rpc('get_user_roles', { _user_id: user.id });
      if (error) throw error;
      return (data as string[]) || [];
    },
  });
}

export function useIsAdmin() {
  const { data: roles, isLoading } = useUserRoles();
  return { isAdmin: roles?.includes('admin') ?? false, isLoading };
}

export function useRoutePermissions() {
  return useQuery({
    queryKey: ['route-permissions'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data: roles } = await supabase.rpc('get_user_roles', { _user_id: user.id });
      if (!roles || roles.length === 0) return [];
      
      const { data, error } = await supabase
        .from('route_permissions')
        .select('route_path, module_name, allowed')
        .in('role', roles as ("admin" | "usuario")[])
        .eq('allowed', true);
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCanAccessRoute(route: string) {
  const { data: permissions, isLoading } = useRoutePermissions();
  const canAccess = permissions?.some(p => p.route_path === route) ?? false;
  return { canAccess, isLoading };
}
