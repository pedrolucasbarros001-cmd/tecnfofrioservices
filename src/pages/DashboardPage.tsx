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
  { key: 'por_fazer' as const, label: 'Por Fazer', icon: ClipboardList, route: '/geral?status=por_fazer' },
  { key: 'em_execucao' as const, label: 'Em Execução', icon: Play, route: '/geral?status=em_execucao' },
  { key: 'na_oficina' as const, label: 'Na Oficina', icon: Building2, route: '/geral?status=na_oficina' },
  { key: 'para_pedir_peca' as const, label: 'Para Pedir Peça', icon: Package, route: '/geral?status=para_pedir_peca' },
  { key: 'em_espera_de_peca' as const, label: 'Em Espera de Peça', icon: Clock, route: '/geral?status=em_espera_de_peca' },
  { key: 'concluidos' as const, label: 'Concluídos', icon: Truck, route: '/geral?status=concluidos' },
  { key: 'a_precificar' as const, label: 'A Precificar', icon: DollarSign, route: '/geral?status=a_precificar' },
  { key: 'em_debito' as const, label: 'Em Débito', icon: AlertCircle, route: '/em-debito' },
  { key: 'finalizado' as const, label: 'Finalizados', icon: CheckSquare, route: '/geral?status=finalizado' },
  { key: 'orcamentos' as const, label: 'Orçamentos', icon: FileText, route: '/orcamentos' },
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
      // Fetch services stats (incluindo final_price e amount_paid para cálculo de débito)
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('status, pending_pricing, final_price, amount_paid, is_warranty');

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
        
        // Contagem de status operacionais (excluindo a_precificar e em_debito que são calculados)
        if (status !== 'a_precificar' && status !== 'em_debito' && status in counts) {
          counts[status as keyof Omit<DashboardStats, 'orcamentos' | 'a_precificar' | 'em_debito'>]++;
        }
        
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
                  ? "bg-[hsl(214,50%,92%)] border-[hsl(214,40%,80%)] shadow-md ring-1 ring-primary/30 hover:shadow-lg hover:-translate-y-0.5" 
                  : "bg-[hsl(214,40%,95%)] border-[hsl(214,30%,88%)] hover:bg-[hsl(214,45%,93%)]"
              )}
              onClick={() => navigate(card.route)}
            >
              <CardContent className="p-4 h-[120px] flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <Icon className={cn(
                    "h-6 w-6",
                    isLit ? "text-primary" : "text-[hsl(214,35%,70%)]"
                  )} />
                  <span className={cn(
                    "text-3xl font-bold",
                    isLit ? "text-primary" : "text-[hsl(214,30%,75%)]"
                  )}>
                    {loading ? '...' : count}
                  </span>
                </div>
                <p className={cn(
                  "text-sm font-medium mt-auto",
                  isLit ? "text-[hsl(214,40%,30%)]" : "text-[hsl(214,25%,60%)]"
                )}>
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
