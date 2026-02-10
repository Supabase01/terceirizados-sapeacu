import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { PayrollRecord } from '@/types/payroll';

export const usePayrollData = () => {
  return useQuery({
    queryKey: ['payroll-records'],
    queryFn: async (): Promise<PayrollRecord[]> => {
      const { data, error } = await supabase
        .from('payroll_records')
        .select('*')
        .order('ano', { ascending: true })
        .order('mes', { ascending: true });
      if (error) throw error;
      return (data || []).map(r => ({
        ...r,
        bruto: Number(r.bruto),
        liquido: Number(r.liquido),
      }));
    },
  });
};
