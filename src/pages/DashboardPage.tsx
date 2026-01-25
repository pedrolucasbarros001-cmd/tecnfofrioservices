import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Wrench,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Calendar,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SERVICE_STATUS_CONFIG, type ServiceStatus } from '@/types/database';

interface DashboardStats {
  total: number;
  por_fazer: number;
  em_execucao: number;
  na_oficina: number;
  concluidos: number;
  em_debito: number;
}

const statusCards = [
  { key: 'por_fazer' as ServiceStatus, icon: ClipboardList, label: 'Por Fazer' },
  { key: 'em_execucao' as ServiceStatus, icon: Clock, label: 'Em Execução' },
  { key: 'na_oficina' as ServiceStatus, icon: Wrench, label: 'Na Oficina' },
  { key: 'concluidos' as ServiceStatus, icon: CheckCircle2, label: 'Concluídos' },
  { key: 'em_debito' as ServiceStatus, icon: AlertCircle, label: 'Em Débito' },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { profile, role } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    por_fazer: 0,
    em_execucao: 0,
    na_oficina: 0,
    concluidos: 0,
    em_debito: 0,
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
      const { data, error } = await supabase
        .from('services')
        .select('status');

      if (error) throw error;

      const counts: DashboardStats = {
        total: data?.length || 0,
        por_fazer: 0,
        em_execucao: 0,
        na_oficina: 0,
        concluidos: 0,
        em_debito: 0,
      };

      data?.forEach((service) => {
        if (service.status in counts) {
          counts[service.status as keyof DashboardStats]++;
        }
      });

      setStats(counts);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 19) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">
          {getGreeting()}, {profile?.full_name?.split(' ')[0] || 'Utilizador'}! 👋
        </h1>
        <p className="text-muted-foreground">
          Aqui está o resumo dos seus serviços.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {statusCards.map((card) => {
          const config = SERVICE_STATUS_CONFIG[card.key];
          return (
            <Card
              key={card.key}
              className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]"
              onClick={() => navigate(`/geral?status=${card.key}`)}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </CardTitle>
                <div className={`p-2 rounded-lg ${config.color}`}>
                  <card.icon className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {loading ? '...' : stats[card.key as keyof DashboardStats]}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => navigate('/geral')}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Ver Serviços</CardTitle>
                <CardDescription>Todos os serviços</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => navigate('/oficina')}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Wrench className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <CardTitle className="text-base">Oficina</CardTitle>
                <CardDescription>Serviços na oficina</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => navigate('/clientes')}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Users className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <CardTitle className="text-base">Clientes</CardTitle>
                <CardDescription>Gerir clientes</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => navigate('/performance')}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <TrendingUp className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <CardTitle className="text-base">Performance</CardTitle>
                <CardDescription>Estatísticas</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Total Services Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Resumo Total
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-primary">
            {loading ? '...' : stats.total}
          </div>
          <p className="text-muted-foreground mt-1">
            Total de serviços no sistema
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
