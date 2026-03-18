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

export function useAllowedRoutes() {
  return useQuery({
    queryKey: ['allowed-routes'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase.rpc('get_user_allowed_routes', { _user_id: user.id });
      if (error) throw error;
      return (data as { route_path: string; module_name: string }[]) || [];
    },
  });
}

export function useCanAccessRoute(route: string) {
  const { data: routes, isLoading } = useAllowedRoutes();
  const canAccess = routes?.some(r => r.route_path === route) ?? false;
  return { canAccess, isLoading };
}
