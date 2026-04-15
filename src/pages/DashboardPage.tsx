import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Play,
  Building2,
  Package,
  Clock,
  Truck,
  DollarSign,
  AlertCircle,
  CheckSquare,
  FileText,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useActivityLogs } from '@/hooks/useActivityLogs';
import { cn } from '@/lib/utils';


interface DashboardStats {
  por_fazer: number;
  em_execucao: number;
  na_oficina: number;
  para_pedir_peca: number;
  em_espera_de_peca: number;
  concluidos: number;
  a_precificar: number;
  em_debito: number;
  finalizado: number;
  orcamentos: number;
}

const DASHBOARD_CARDS = [
  { key: 'por_fazer' as const, label: 'Aberto', icon: ClipboardList, route: '/geral?status=por_fazer' },
  { key: 'em_execucao' as const, label: 'Em Execução', icon: Play, route: '/geral?status=em_execucao' },
  { key: 'na_oficina' as const, label: 'Oficina', icon: Building2, route: '/oficina' },
  { key: 'para_pedir_peca' as const, label: 'Pedir Peça', icon: Package, route: '/geral?status=para_pedir_peca' },
  { key: 'em_espera_de_peca' as const, label: 'Espera de Peça', icon: Clock, route: '/geral?status=em_espera_de_peca' },
  { key: 'concluidos' as const, label: 'Oficina Reparados', icon: Truck, route: '/concluidos' },
  { key: 'a_precificar' as const, label: 'Orçamentar', icon: DollarSign, route: '/precificar' },
  { key: 'em_debito' as const, label: 'Em Débito', icon: AlertCircle, route: '/em-debito' },
  { key: 'finalizado' as const, label: 'Concluídos', icon: CheckSquare, route: '/geral?status=finalizado' },
  { key: 'orcamentos' as const, label: 'Orçamentos', icon: FileText, route: '/orcamentos' },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { data: activityLogs = [] } = useActivityLogs({ limit: 10 });

  // Redirect non-owners (kept in a separate effect from data fetching)
  useEffect(() => {
    if (role && role !== 'dono') {
      navigate(role === 'secretaria' ? '/geral' : '/servicos', { replace: true });
    }
  }, [role, navigate]);

  // React Query manages lifecycle — AppLayout Realtime channel will invalidate
  // ['dashboard-stats'] on any services/budgets change, so no setInterval needed.
  const { data: stats, isLoading: loading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      // Use HEAD COUNT queries (zero data transfer) — no rows returned.
      const [
        porFazerRes,
        emExecucaoRes,
        paraOrçamentarRes,
        emEsperaPecaRes,
        paraPedirPecaRes,
        finalizadoRes,
        naOficinaRes,
        concluidosRes,
        emDebitoRes,
        budgetsRes,
      ] = await Promise.all([
        supabase.from('services').select('*', { count: 'exact', head: true }).eq('status', 'por_fazer'),
        supabase.from('services').select('*', { count: 'exact', head: true }).eq('status', 'em_execucao'),
        supabase.from('services').select('*', { count: 'exact', head: true }).eq('pending_pricing', true).eq('final_price', 0),
        supabase.from('services').select('*', { count: 'exact', head: true }).eq('status', 'em_espera_de_peca'),
        supabase.from('services').select('*', { count: 'exact', head: true }).eq('status', 'para_pedir_peca'),
        supabase.from('services').select('*', { count: 'exact', head: true }).eq('status', 'finalizado'),
        supabase.from('services').select('*', { count: 'exact', head: true }).eq('service_location', 'oficina').neq('status', 'finalizado').neq('status', 'concluidos'),
        supabase.from('services').select('*', { count: 'exact', head: true }).eq('service_location', 'oficina').eq('status', 'concluidos'),
        supabase.from('services').select('*').gt('final_price', 0),
        supabase.from('budgets').select('*', { count: 'exact', head: true }),
      ]);

      const emDebitoCount = (emDebitoRes.data || []).filter(s => {
        const finalPrice = s.final_price || 0;
        const amountPaid = s.amount_paid || 0;
        return finalPrice > 0 && amountPaid < finalPrice;
      }).length;

      return {
        por_fazer: porFazerRes.count ?? 0,
        em_execucao: emExecucaoRes.count ?? 0,
        a_precificar: paraOrçamentarRes.count ?? 0,
        em_espera_de_peca: emEsperaPecaRes.count ?? 0,
        para_pedir_peca: paraPedirPecaRes.count ?? 0,
        finalizado: finalizadoRes.count ?? 0,
        na_oficina: naOficinaRes.count ?? 0,
        concluidos: concluidosRes.count ?? 0,
        em_debito: emDebitoCount,
        orcamentos: budgetsRes.count ?? 0,
      };
    },
    // 30s stale — Realtime will kick in proactively for most changes
    staleTime: 1000 * 30,
    enabled: role === 'dono',
  });

  const safeStats: DashboardStats = stats ?? {
    por_fazer: 0, em_execucao: 0, na_oficina: 0,
    para_pedir_peca: 0, em_espera_de_peca: 0, concluidos: 0,
    a_precificar: 0, em_debito: 0, finalizado: 0, orcamentos: 0,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral de todos os serviços
        </p>
      </div>

      {/* Status Cards Grid - 5 columns x 2 rows - Lit/Dim Logic */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4" data-tour="dashboard-cards" data-demo="dashboard-cards">
        {DASHBOARD_CARDS.map((card) => {
          const Icon = card.icon;
          const count = safeStats[card.key as keyof DashboardStats];
          const isLit = count > 0;

          return (
            <Card
              key={card.key}
              className={cn(
                "cursor-pointer transition-all duration-200",
                isLit
                  ? "bg-[hsl(207,74%,63%)] border-[hsl(207,65%,53%)] shadow-md ring-1 ring-[hsl(207,80%,73%)]/30 hover:shadow-lg hover:-translate-y-0.5"
                  : "bg-[hsl(207,55%,42%)] border-[hsl(207,50%,35%)] hover:bg-[hsl(207,55%,47%)]"
              )}
              onClick={() => navigate(card.route)}
            >
              <CardContent className="p-4 h-[120px] flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <Icon className="h-6 w-6 text-white" />
                  <span className="text-3xl font-bold text-white">
                    {loading ? '...' : count}
                  </span>
                </div>
                <p className="text-sm font-medium mt-auto text-white">
                  {card.label}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Activity History Section */}
      <Card data-tour="activity-history" data-demo="activity-history">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Histórico de Atividades
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activityLogs.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              Nenhuma atividade recente
            </p>
          ) : (
            <div className="space-y-2">
              {activityLogs.map((log) => {
                const isValidDate = log.created_at && !isNaN(new Date(log.created_at).getTime());
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-shrink-0 w-16 text-xs text-muted-foreground">
                      {isValidDate ? format(new Date(log.created_at), 'HH:mm') : '--:--'}
                    </div>
                    <div className="flex-1 text-sm">
                      {log.description}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {isValidDate ? formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: pt }) : 'data inválida'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
