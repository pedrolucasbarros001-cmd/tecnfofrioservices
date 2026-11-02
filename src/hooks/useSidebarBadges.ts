import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SidebarBadges {
  orcamentos: number;   // orçamentos pendentes → /orcamentos
  precificar: number;   // serviços concluídos sem preço → /oficina
  semTecnico: number;   // serviços sem técnico atribuído → /geral
}

export function useSidebarBadges() {
  return useQuery<SidebarBadges>({
    queryKey: ['sidebar', 'badges'],
    queryFn: async () => {
      const [budgets, precificar, semTecnico] = await Promise.all([
        supabase
          .from('budgets')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pendente'),
        supabase
          .from('services')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'finalizado')
          .or('final_price.is.null,final_price.eq.0'),
        supabase
          .from('services')
          .select('id', { count: 'exact', head: true })
          .not('status', 'in', '("finalizado","cancelado")')
          .is('technician_id', null),
      ]);

      return {
        orcamentos: budgets.count ?? 0,
        precificar: precificar.count ?? 0,
        semTecnico: semTecnico.count ?? 0,
      };
    },
    staleTime: 2 * 60 * 1000,
    refetchInterval: 3 * 60 * 1000,
  });
}
