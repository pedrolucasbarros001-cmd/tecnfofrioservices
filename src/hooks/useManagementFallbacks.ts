import { useQuery } from '@tanstack/react-query';
import { differenceInCalendarDays, format, subDays } from 'date-fns';
import { parseLocalDate } from '@/utils/dateUtils';
import { supabase } from '@/integrations/supabase/client';
import type { DashboardAlerts } from './useDashboardMetrics';

/** Read existing, RLS-protected records when optional analytics RPCs are absent. */
export function useManagementFallbacks(enabled: boolean) {
  const financial = useQuery({
    queryKey: ['dashboard', 'financial-existing-records'], enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const cutoff = format(subDays(Date.now(), 30), 'yyyy-MM-dd');
      let recebido = 0;
      let porReceber = 0;
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase.from('service_payments').select('id, amount')
          .gte('payment_date', cutoff).order('id').range(offset, offset + 499);
        if (error) throw error;
        recebido += (data ?? []).reduce((sum, row) => sum + Number(row.amount), 0);
        if (!data || data.length < 500) break;
      }
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase.from('services').select('id, final_price, amount_paid')
          .not('status', 'in', '(cancelado,finalizado)').gt('final_price', 0)
          .order('id').range(offset, offset + 499);
        if (error) throw error;
        porReceber += (data ?? []).reduce((sum, row) => sum + Math.max(Number(row.final_price) - Number(row.amount_paid ?? 0), 0), 0);
        if (!data || data.length < 500) break;
      }
      return { recebido, por_receber: porReceber };
    },
  });
  const actions = useQuery({
    queryKey: ['dashboard', 'action-existing-records'], enabled,
    staleTime: 3 * 60 * 1000,
    queryFn: async (): Promise<DashboardAlerts> => {
      const cutoff = format(subDays(Date.now(), 7), 'yyyy-MM-dd');
      const { data, error } = await supabase.from('budgets')
        .select('id, code, created_at, customer:customers(name)').eq('status', 'pendente')
        .lt('created_at', cutoff).order('created_at').limit(10);
      if (error) throw error;
      return {
        por_faturar: null, pagamento_pendente: null, servicos_parados: null, sem_tecnico: null,
        orcamentos_sem_resposta: (data ?? []).map(row => ({ id: row.id, code: row.code ?? 'Orçamento',
          customer_name: row.customer?.name ?? null, appliance_type: null,
          dias: differenceInCalendarDays(Date.now(), parseLocalDate(row.created_at.slice(0, 10))) })),
        counts: { por_faturar: 0, pagamento_pendente: 0, orcamento_sem_resp: 0, servicos_parados: 0, sem_tecnico: 0 },
      };
    },
  });
  return { financial, actions };
}