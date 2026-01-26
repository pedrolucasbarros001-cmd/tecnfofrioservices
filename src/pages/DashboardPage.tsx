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
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
  { 
    key: 'por_fazer' as const, 
    label: 'Por Fazer', 
    icon: ClipboardList,
    bgClass: 'bg-gray-200/50',
    iconClass: 'text-gray-600',
    route: '/geral?status=por_fazer'
  },
  { 
    key: 'em_execucao' as const, 
    label: 'Em Execução', 
    icon: Play,
    bgClass: 'bg-blue-100',
    iconClass: 'text-blue-600',
    route: '/geral?status=em_execucao'
  },
  { 
    key: 'na_oficina' as const, 
    label: 'Na Oficina', 
    icon: Building2,
    bgClass: 'bg-orange-100',
    iconClass: 'text-orange-600',
    route: '/geral?status=na_oficina'
  },
  { 
    key: 'para_pedir_peca' as const, 
    label: 'Para Pedir Peça', 
    icon: Package,
    bgClass: 'bg-purple-100',
    iconClass: 'text-purple-600',
    route: '/geral?status=para_pedir_peca'
  },
  { 
    key: 'em_espera_de_peca' as const, 
    label: 'Em Espera de Peça', 
    icon: Clock,
    bgClass: 'bg-yellow-100',
    iconClass: 'text-yellow-700',
    route: '/geral?status=em_espera_de_peca'
  },
  { 
    key: 'concluidos' as const, 
    label: 'Concluídos', 
    icon: Truck,
    bgClass: 'bg-teal-100',
    iconClass: 'text-teal-600',
    route: '/geral?status=concluidos'
  },
  { 
    key: 'a_precificar' as const, 
    label: 'A Precificar', 
    icon: DollarSign,
    bgClass: 'bg-green-200',
    iconClass: 'text-green-700',
    route: '/geral?status=a_precificar'
  },
  { 
    key: 'em_debito' as const, 
    label: 'Em Débito', 
    icon: AlertCircle,
    bgClass: 'bg-red-100',
    iconClass: 'text-red-600',
    route: '/geral?status=em_debito'
  },
  { 
    key: 'finalizado' as const, 
    label: 'Finalizados', 
    icon: CheckSquare,
    bgClass: 'bg-violet-100',
    iconClass: 'text-violet-600',
    route: '/geral?status=finalizado'
  },
  { 
    key: 'orcamentos' as const, 
    label: 'Orçamentos', 
    icon: FileText,
    bgClass: 'bg-purple-100',
    iconClass: 'text-purple-600',
    route: '/orcamentos'
  },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { role } = useAuth();
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
  }, [role, navigate]);

  async function fetchStats() {
    try {
      // Fetch services stats
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('status, pending_pricing');

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
        if (status in counts) {
          counts[status as keyof Omit<DashboardStats, 'orcamentos'>]++;
        }
        // Count pending pricing separately
        if (service.pending_pricing) {
          counts.a_precificar++;
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

      {/* Status Cards Grid - 5 columns x 2 rows */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {DASHBOARD_CARDS.map((card) => {
          const Icon = card.icon;
          const count = stats[card.key as keyof DashboardStats];
          
          return (
            <Card
              key={card.key}
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:-translate-y-0.5 border border-border/50 ${card.bgClass}`}
              onClick={() => navigate(card.route)}
            >
              <CardContent className="p-4 h-[120px] flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <Icon className={`h-6 w-6 ${card.iconClass}`} />
                  <span className="text-3xl font-bold text-foreground">
                    {loading ? '...' : count}
                  </span>
                </div>
                <p className="text-sm font-medium text-muted-foreground mt-auto">
                  {card.label}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
