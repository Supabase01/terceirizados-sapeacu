import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useIsMaster() {
  const { data: isMaster = false, isLoading } = useQuery({
    queryKey: ['is-master'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      return user.email === 'nailton.alsampaio@gmail.com';
    },
  });
  return { isMaster, isLoading };
}
