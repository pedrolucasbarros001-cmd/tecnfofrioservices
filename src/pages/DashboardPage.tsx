import { useEffect, useState } from 'react';
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
import type { ServiceStatus } from '@/types/database';

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
  const [stats, setStats] = useState<DashboardStats>({
    por_fazer: 0,
    em_execucao: 0,
    na_oficina: 0,
    para_pedir_peca: 0,
    em_espera_de_peca: 0,
    concluidos: 0,
    a_precificar: 0,
    em_debito: 0,
    finalizado: 0,
    orcamentos: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Redirect non-owners
    if (role && role !== 'dono') {
      navigate(role === 'secretaria' ? '/geral' : '/servicos', { replace: true });
      return;
    }

    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, [role, navigate]);

  async function fetchStats() {
    try {
      // Fetch services stats (incluindo final_price e amount_paid para cálculo de débito)
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('status, pending_pricing, final_price, amount_paid, is_warranty, service_location');

      if (servicesError) throw servicesError;

      // Fetch budgets count
      const { count: budgetsCount, error: budgetsError } = await supabase
        .from('budgets')
        .select('*', { count: 'exact', head: true });

      if (budgetsError) throw budgetsError;

      const counts: DashboardStats = {
        por_fazer: 0,
        em_execucao: 0,
        na_oficina: 0,
        para_pedir_peca: 0,
        em_espera_de_peca: 0,
        concluidos: 0,
        a_precificar: 0,
        em_debito: 0,
        finalizado: 0,
        orcamentos: budgetsCount || 0,
      };

      services?.forEach((service) => {
        const status = service.status as ServiceStatus;

        // "A Precificar" = pending_pricing=true (estado financeiro, não operacional)
        if (service.pending_pricing) {
          counts.a_precificar++;
        }

        // "Em Débito" = tem preço, não é garantia, e amount_paid < final_price (estado financeiro calculado)
        const finalPrice = service.final_price || 0;
        const amountPaid = service.amount_paid || 0;
        const isWarranty = service.is_warranty || false;
        if (!isWarranty && finalPrice > 0 && amountPaid < finalPrice) {
          counts.em_debito++;
        }

        // Count for "Oficina" card based on LOCATION
        // Includes any service physically in workshop, excluding finalized/concluded
        if (service.service_location === 'oficina' && status !== 'finalizado' && status !== 'concluidos') {
          counts.na_oficina++;
        }

        // Count for "Oficina Reparados" - must be in workshop AND concluded
        if (service.service_location === 'oficina' && status === 'concluidos') {
          counts.concluidos++;
        }

        // Other operacional status counts (excluding na_oficina and concluidos which are location-based above)
        if (
          status !== 'a_precificar' &&
          status !== 'em_debito' &&
          status !== 'na_oficina' &&
          status !== 'concluidos' &&
          status in counts
        ) {
          counts[status as keyof Omit<DashboardStats, 'orcamentos' | 'a_precificar' | 'em_debito' | 'na_oficina' | 'concluidos'>]++;
        }
      });

      setStats(counts);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }

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
          const count = stats[card.key as keyof DashboardStats];
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
