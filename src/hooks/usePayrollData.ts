import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { PayrollRecord } from '@/types/payroll';

export const usePayrollData = () => {
  return useQuery({
    queryKey: ['payroll-records'],
    queryFn: async (): Promise<PayrollRecord[]> => {
      const PAGE_SIZE = 1000;
      let allData: any[] = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('payroll_records')
          .select('*')
          .order('ano', { ascending: true })
          .order('mes', { ascending: true })
          .range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        const chunk = data || [];
        allData = allData.concat(chunk);
        if (chunk.length < PAGE_SIZE) {
          hasMore = false;
        } else {
          from += PAGE_SIZE;
        }
      }

      return allData.map(r => ({
        ...r,
        bruto: Number(r.bruto),
        liquido: Number(r.liquido),
      }));
    },
  });
};
