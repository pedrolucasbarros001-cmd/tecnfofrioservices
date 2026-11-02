import { useEffect, useRef, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, Building2, Package, Clock, Truck,
  DollarSign, AlertCircle, CheckSquare, FileText, BarChart2,
  Timer, CalendarDays, ArrowRight, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle2, Users, Hourglass, Minus,
  RefreshCw, UserCheck, UserX, UserPlus, Repeat2,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useActivityLogs } from '@/hooks/useActivityLogs';
import { cn } from '@/lib/utils';
import {
  useBusinessHealth,
  useRevenueTrend,
  useOperationalMetrics,
  useTeamPerformance,
  useServiceBottlenecks,
  useBudgetOpportunities,
  useClientRecurrence,
} from '@/hooks/useDashboardMetrics';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { ServiceStatusChart } from '@/components/dashboard/ServiceStatusChart';
import { TeamPerformanceTable } from '@/components/dashboard/TeamPerformanceTable';

// ─── useCountUp: anima um número de 0 até target ─────────────────────────────
function useCountUp(target: number | undefined, duration = 700): number {
  const [val, setVal] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    if (target === undefined || target === null) return;
    const start = performance.now();
    const from = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setVal(Math.round(from + (target - from) * eased));
      if (progress < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return val;
}

// ─── Componente de card de status animado ────────────────────────────────────
function StatusCard({
  label, icon: Icon, count, route, loading, delay,
}: {
  label: string;
  icon: React.ElementType;
  count: number;
  route: string;
  loading: boolean;
  delay: number;
}) {
  const navigate = useNavigate();
  const animated = useCountUp(loading ? 0 : count);
  const isLit = count > 0;

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200 card-interactive',
        isLit
          ? 'bg-[hsl(207,74%,63%)] border-[hsl(207,65%,53%)] shadow-md ring-1 ring-[hsl(207,80%,73%)]/30'
          : 'bg-[hsl(207,55%,42%)] border-[hsl(207,50%,35%)]',
      )}
      style={{ animationDelay: `${delay}ms` }}
      onClick={() => navigate(route)}
    >
      <CardContent className="p-4 h-[112px] flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <Icon className="h-5 w-5 text-white/90" />
          <span className="text-3xl font-bold text-white tabular-nums">
            {loading ? '·' : animated}
          </span>
        </div>
        <p className="text-sm font-medium text-white/90">{label}</p>
      </CardContent>
    </Card>
  );
}

// ─── Centro de Ação ───────────────────────────────────────────────────────────
type AlertLevel = 'urgent' | 'attention' | 'info' | 'ok';

interface ActionAlert {
  id: string;
  level: AlertLevel;
  count: number;
  label: string;
  sublabel: string;
  route: string;
  cta: string;
}

function AlertCount({ n }: { n: number }) {
  const v = useCountUp(n, 500);
  return <span className="text-2xl font-bold tabular-nums">{v}</span>;
}

function ActionAlertCard({ alert, className }: { alert: ActionAlert; className?: string }) {
  const navigate = useNavigate();

  const borderColor =
    alert.level === 'urgent'    ? 'border-l-red-500' :
    alert.level === 'attention' ? 'border-l-amber-500' :
    alert.level === 'info'      ? 'border-l-blue-400' :
                                  'border-l-green-500';

  const dotClass =
    alert.level === 'urgent'    ? 'urgency-dot-urgent' :
    alert.level === 'attention' ? 'urgency-dot-attention' :
                                  'urgency-dot-info';

  const countColor =
    alert.level === 'urgent'    ? 'text-red-600 dark:text-red-400' :
    alert.level === 'attention' ? 'text-amber-600 dark:text-amber-400' :
                                  'text-blue-600 dark:text-blue-400';

  return (
    <div
      className={cn(
        'alert-card bg-card border border-border border-l-4 rounded-xl p-4',
        'flex flex-col gap-3 shadow-sm',
        borderColor,
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span className={dotClass} />
        <span className={cn('text-xs font-semibold uppercase tracking-wide text-muted-foreground')}>
          {alert.level === 'urgent' ? 'Urgente' :
           alert.level === 'attention' ? 'Atenção' : 'Info'}
        </span>
      </div>
      <div>
        <div className={cn('mb-0.5', countColor)}>
          <AlertCount n={alert.count} />
          <span className="ml-1 text-sm font-medium">{alert.label}</span>
        </div>
        <p className="text-xs text-muted-foreground">{alert.sublabel}</p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-between text-xs font-semibold h-8 px-3 rounded-lg bg-muted/60 hover:bg-muted"
        onClick={() => navigate(alert.route)}
      >
        {alert.cta}
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ─── Breakdown financeiro (4 blocos) ─────────────────────────────────────────
function FinancialBreakdown({
  health, navigate,
}: {
  health: ReturnType<typeof useBusinessHealth>['data'];
  navigate: ReturnType<typeof useNavigate>;
}) {
  const recebido = useCountUp(health?.recebido ?? 0, 900);
  const porReceber = useCountUp(health?.faturado_por_receber ?? 0, 900);
  const orcamentos = useCountUp(health?.orcamentos_pendentes_valor ?? 0, 900);

  const fmt = (n: number) =>
    n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger-grid">
      {/* Recebido */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-1 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Recebido
          </span>
        </div>
        <p className="text-xl font-bold text-green-600 dark:text-green-400 tabular-nums">
          {fmt(recebido)}
        </p>
        <p className="text-xs text-muted-foreground">efectivamente recebido este mês</p>
      </div>

      {/* Faturado por receber */}
      <div
        className={cn(
          'bg-card border border-border rounded-xl p-4 flex flex-col gap-1 shadow-sm cursor-pointer card-interactive',
          (health?.faturado_por_receber ?? 0) > 0 && 'border-l-4 border-l-amber-400',
        )}
        onClick={() => navigate('/em-debito')}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Por receber
          </span>
        </div>
        <p className="text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
          {fmt(porReceber)}
        </p>
        <p className="text-xs text-muted-foreground">faturado mas ainda não pago</p>
        {(health?.faturado_por_receber ?? 0) > 0 && (
          <span className="text-xs text-amber-600 flex items-center gap-1 mt-1">
            <ArrowRight className="h-3 w-3" /> Cobrar
          </span>
        )}
      </div>

      {/* Por faturar */}
      <div
        className={cn(
          'bg-card border border-border rounded-xl p-4 flex flex-col gap-1 shadow-sm cursor-pointer card-interactive',
          (health?.por_faturar_count ?? 0) > 0 && 'border-l-4 border-l-red-400',
        )}
        onClick={() => navigate('/precificar')}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Por faturar
          </span>
        </div>
        <p className="text-xl font-bold text-red-600 dark:text-red-400 tabular-nums">
          {health?.por_faturar_count ?? 0}{' '}
          <span className="text-sm font-normal">serviços</span>
        </p>
        <p className="text-xs text-muted-foreground">finalizados sem preço definido</p>
        {(health?.por_faturar_count ?? 0) > 0 && (
          <span className="text-xs text-red-600 flex items-center gap-1 mt-1">
            <ArrowRight className="h-3 w-3" /> Definir preço
          </span>
        )}
      </div>

      {/* Orçamentos pendentes */}
      <div
        className={cn(
          'bg-card border border-border rounded-xl p-4 flex flex-col gap-1 shadow-sm cursor-pointer card-interactive',
        )}
        onClick={() => navigate('/orcamentos')}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Orçamentos
          </span>
        </div>
        <p className="text-xl font-bold tabular-nums">
          {fmt(orcamentos)}
        </p>
        <p className="text-xs text-muted-foreground">
          {health?.orcamentos_pendentes_count ?? 0} pendentes de aprovação
        </p>
        {(health?.orcamentos_pendentes_count ?? 0) > 0 && (
          <span className="text-xs text-blue-600 flex items-center gap-1 mt-1">
            <ArrowRight className="h-3 w-3" /> Ver orçamentos
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Gargalos de estado ───────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  por_fazer:       'Aberto',
  em_execucao:     'Em Execução',
  na_oficina:      'Oficina',
  para_pedir_peca: 'Pedir Peça',
  em_espera_de_peca: 'Espera Peça',
  diagnostico:     'Diagnóstico',
  aguardando:      'Aguardando',
};

function BottlenecksSection({ data }: { data: ReturnType<typeof useServiceBottlenecks>['data'] }) {
  if (!data || data.length === 0) return null;

  const maxDays = Math.max(...data.map((b) => b.avg_days), 1);

  const urgency = (days: number) =>
    days >= 7 ? 'bg-red-400' : days >= 3 ? 'bg-amber-400' : 'bg-blue-400';

  return (
    <Card className="motion-enter">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Hourglass className="h-4 w-4 text-muted-foreground" />
          Onde ficam parados os serviços
          <span className="text-xs font-normal text-muted-foreground ml-1">
            tempo médio em cada estado
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data
          .sort((a, b) => b.avg_days - a.avg_days)
          .map((item, i) => (
            <div key={item.status} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">
                  {STATUS_LABELS[item.status] ?? item.status}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {item.count} serviços · média{' '}
                  <span
                    className={cn(
                      'font-semibold',
                      item.avg_days >= 7
                        ? 'text-red-600 dark:text-red-400'
                        : item.avg_days >= 3
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-foreground',
                    )}
                  >
                    {item.avg_days}d
                  </span>
                  {item.max_days > item.avg_days + 2 && (
                    <span className="text-muted-foreground ml-1">
                      (máx {item.max_days}d)
                    </span>
                  )}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full bottleneck-bar', urgency(item.avg_days))}
                  style={{
                    width: `${Math.max((item.avg_days / maxDays) * 100, 4)}%`,
                    animationDelay: `${i * 80 + 200}ms`,
                  }}
                />
              </div>
            </div>
          ))}
      </CardContent>
    </Card>
  );
}

// ─── Tendência financeira inline ──────────────────────────────────────────────
function RevenueTrendBadge({ current, previous }: { current: number; previous: number }) {
  if (!previous || previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  const isUp = pct >= 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
        isUp
          ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
          : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
      )}
    >
      {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

// ─── Tipos do dashboard ───────────────────────────────────────────────────────
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
  { key: 'por_fazer' as const,      label: 'Aberto',         icon: ClipboardList, route: '/geral?status=por_fazer' },
  { key: 'em_execucao' as const,    label: 'Em Execução',    icon: Play,          route: '/geral?status=em_execucao' },
  { key: 'na_oficina' as const,     label: 'Oficina',        icon: Building2,     route: '/oficina' },
  { key: 'para_pedir_peca' as const,label: 'Pedir Peça',     icon: Package,       route: '/geral?status=para_pedir_peca' },
  { key: 'em_espera_de_peca' as const, label: 'Espera Peça', icon: Clock,         route: '/geral?status=em_espera_de_peca' },
  { key: 'concluidos' as const,     label: 'Concluídos Oficina', icon: Truck,     route: '/concluidos' },
  { key: 'a_precificar' as const,   label: 'Orçamentar',     icon: DollarSign,    route: '/precificar' },
  { key: 'em_debito' as const,      label: 'Em Débito',      icon: AlertCircle,   route: '/em-debito' },
  { key: 'finalizado' as const,     label: 'Finalizados',    icon: CheckSquare,   route: '/geral?status=finalizado' },
  { key: 'orcamentos' as const,     label: 'Orçamentos',     icon: FileText,      route: '/orcamentos' },
];

// ─── Página principal ─────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { data: activityLogs = [] } = useActivityLogs({ limit: 10 });
  const isDono = role === 'dono';

  const { data: health,      isLoading: healthLoading } = useBusinessHealth();
  const { data: revenueTrend = [], isLoading: trendLoading } = useRevenueTrend();
  const { data: operational, isLoading: opLoading }    = useOperationalMetrics();
  const { data: team = [],   isLoading: teamLoading }  = useTeamPerformance();
  const { data: bottlenecks = [] }                     = useServiceBottlenecks();
  const { data: budgetOpp }                            = useBudgetOpportunities();
  const { data: clientRec }                            = useClientRecurrence();

  useEffect(() => {
    if (role && role !== 'dono') {
      navigate(role === 'secretaria' ? '/geral' : '/servicos', { replace: true });
    }
  }, [role, navigate]);

  const { data: stats, isLoading: loading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [
        porFazer, emExecucao, paraOrc, emEspera, paraPedir,
        finalizado, naOficina, concluidos, debtCount, budgets,
      ] = await Promise.all([
        supabase.from('services').select('*', { count: 'exact', head: true }).eq('status', 'por_fazer'),
        supabase.from('services').select('*', { count: 'exact', head: true }).eq('status', 'em_execucao'),
        supabase.from('services').select('*', { count: 'exact', head: true }).eq('pending_pricing', true).eq('final_price', 0),
        supabase.from('services').select('*', { count: 'exact', head: true }).eq('status', 'em_espera_de_peca'),
        supabase.from('services').select('*', { count: 'exact', head: true }).eq('status', 'para_pedir_peca'),
        supabase.from('services').select('*', { count: 'exact', head: true }).eq('status', 'finalizado'),
        supabase.from('services').select('*', { count: 'exact', head: true }).eq('service_location', 'oficina').neq('status', 'finalizado').neq('status', 'concluidos'),
        supabase.from('services').select('*', { count: 'exact', head: true }).eq('service_location', 'oficina').eq('status', 'concluidos'),
        (supabase.rpc as any)('count_services_in_debt'),
        supabase.from('budgets').select('*', { count: 'exact', head: true }),
      ]);
      return {
        por_fazer:        porFazer.count ?? 0,
        em_execucao:      emExecucao.count ?? 0,
        a_precificar:     paraOrc.count ?? 0,
        em_espera_de_peca: emEspera.count ?? 0,
        para_pedir_peca:  paraPedir.count ?? 0,
        finalizado:       finalizado.count ?? 0,
        na_oficina:       naOficina.count ?? 0,
        concluidos:       concluidos.count ?? 0,
        em_debito:        (debtCount.data as number | null) ?? 0,
        orcamentos:       budgets.count ?? 0,
      };
    },
    staleTime: 1000 * 30,
    enabled: role === 'dono',
  });

  const safeStats: DashboardStats = stats ?? {
    por_fazer: 0, em_execucao: 0, na_oficina: 0,
    para_pedir_peca: 0, em_espera_de_peca: 0, concluidos: 0,
    a_precificar: 0, em_debito: 0, finalizado: 0, orcamentos: 0,
  };

  // ── Alertas directivos calculados a partir dos dados existentes ──────────
  const actionAlerts: ActionAlert[] = [];
  if (isDono && health) {
    if ((health.por_faturar_count ?? 0) > 0) {
      actionAlerts.push({
        id: 'unbilled', level: 'urgent',
        count: health.por_faturar_count,
        label: 'sem faturar',
        sublabel: 'serviços finalizados sem valor definido',
        route: '/precificar', cta: 'Definir preços',
      });
    }
    if ((health.stuck_services_5d ?? 0) > 0) {
      actionAlerts.push({
        id: 'stuck', level: 'urgent',
        count: health.stuck_services_5d,
        label: 'parados há +5 dias',
        sublabel: 'sem actualização de estado',
        route: '/geral', cta: 'Ver serviços parados',
      });
    }
    if ((health.faturado_por_receber ?? 0) > 0) {
      actionAlerts.push({
        id: 'debt', level: 'attention',
        count: Math.round(health.faturado_por_receber),
        label: '€ por cobrar',
        sublabel: 'faturado mas ainda não recebido',
        route: '/em-debito', cta: 'Cobrar clientes',
      });
    }
    if (safeStats.a_precificar > 0) {
      actionAlerts.push({
        id: 'pricing', level: 'attention',
        count: safeStats.a_precificar,
        label: 'por orçamentar',
        sublabel: 'aguardam valor para o cliente avançar',
        route: '/precificar', cta: 'Orçamentar',
      });
    }
    if ((health.sem_tecnico ?? 0) > 0) {
      actionAlerts.push({
        id: 'no-tech', level: 'attention',
        count: health.sem_tecnico,
        label: 'sem técnico',
        sublabel: 'serviços em aberto sem técnico atribuído',
        route: '/geral', cta: 'Atribuir técnico',
      });
    }
    if ((health.orcamentos_pendentes_count ?? 0) > 0) {
      actionAlerts.push({
        id: 'budgets', level: 'info',
        count: health.orcamentos_pendentes_count,
        label: 'orçamentos pendentes',
        sublabel: 'aguardam resposta do cliente',
        route: '/orcamentos', cta: 'Ver orçamentos',
      });
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Correia &amp; Teixeira · vista de dono
          </p>
        </div>
        {health && (
          <div className="flex items-center gap-2">
            <RevenueTrendBadge
              current={health.revenue_this_month}
              previous={health.revenue_last_month}
            />
            <span className="text-xs text-muted-foreground">vs mês anterior</span>
          </div>
        )}
      </div>

      {/* ── CENTRO DE ACÇÃO ─────────────────────────────────────────────────── */}
      {isDono && actionAlerts.length > 0 && (
        <section aria-label="Centro de Ação">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold">Centro de Ação</h2>
            <span className="text-xs text-muted-foreground">
              — {actionAlerts.length} {actionAlerts.length === 1 ? 'ponto requer' : 'pontos requerem'} atenção
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {actionAlerts.map((alert) => (
              <ActionAlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        </section>
      )}

      {/* ── ESTADO DE TODOS OS SERVIÇOS ──────────────────────────────────────── */}
      <section aria-label="Estado dos serviços">
        <div className="flex items-center gap-2 mb-3">
          <BarChart2 className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Estado dos serviços</h2>
        </div>
        <div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 stagger-grid"
          data-tour="dashboard-cards"
        >
          {DASHBOARD_CARDS.map((card, i) => (
            <StatusCard
              key={card.key}
              label={card.label}
              icon={card.icon}
              count={safeStats[card.key as keyof DashboardStats]}
              route={card.route}
              loading={loading}
              delay={i * 40}
            />
          ))}
        </div>
      </section>

      {/* ── SAÚDE FINANCEIRA (só dono) ──────────────────────────────────────── */}
      {isDono && (
        <section aria-label="Saúde financeira" className="space-y-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Saúde financeira</h2>
            <div className="flex-1 h-px bg-border" />
            {health?.clientes_novos_mes && health.clientes_novos_mes > 0 ? (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" />
                +{health.clientes_novos_mes} cliente{health.clientes_novos_mes !== 1 ? 's' : ''} novos
              </span>
            ) : null}
          </div>

          {/* Breakdown financeiro */}
          <FinancialBreakdown health={health} navigate={navigate} />

          {/* Métricas de conversão */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="motion-enter">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Conversão de orçamentos</p>
                <p className="text-2xl font-bold">
                  {healthLoading ? '—' : `${health?.budget_conversion_rate ?? 0}%`}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">últimos 30 dias</p>
              </CardContent>
            </Card>
            <Card className="motion-enter">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Ticket médio</p>
                <p className="text-2xl font-bold">
                  {healthLoading
                    ? '—'
                    : (health?.avg_ticket ?? 0).toLocaleString('pt-PT', {
                        style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
                      })}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">serviços finalizados</p>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de tendência */}
          <RevenueChart data={revenueTrend} loading={trendLoading} />

          {/* Gráfico operacional + métricas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ServiceStatusChart data={operational?.by_status ?? null} loading={opLoading} />
            <div className="flex flex-col gap-3">
              <Card className="motion-enter">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Serviços esta semana</p>
                  <p className="text-2xl font-bold">{operational?.services_this_week ?? '—'}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">entradas desde segunda-feira</p>
                </CardContent>
              </Card>
              <Card className="motion-enter">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Resolução média</p>
                  <p className="text-2xl font-bold">
                    {operational ? `${operational.avg_resolution_days}d` : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">do início ao fecho</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Gargalos */}
          <BottlenecksSection data={bottlenecks} />

          {/* ── ORÇAMENTOS E OPORTUNIDADES ─────────────────────────────────── */}
          {budgetOpp && (
            <section aria-label="Orçamentos e oportunidades">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Orçamentos e oportunidades</h2>
                <div className="flex-1 h-px bg-border" />
                {budgetOpp.taxa_aceitacao != null && (
                  <span className="text-xs text-muted-foreground">
                    {budgetOpp.taxa_aceitacao}% taxa de aceitação (90d)
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Valor potencial */}
                <Card className="motion-enter cursor-pointer hover:border-blue-400 transition-colors" onClick={() => navigate('/orcamentos')}>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Valor em aberto</p>
                    <p className="text-xl font-bold text-blue-600">
                      {budgetOpp.valor_total_pendente.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{budgetOpp.total_pendentes} orçamento{budgetOpp.total_pendentes !== 1 ? 's' : ''} pendente{budgetOpp.total_pendentes !== 1 ? 's' : ''}</p>
                  </CardContent>
                </Card>

                {/* Sem resposta +7 dias */}
                <Card className={cn('motion-enter cursor-pointer transition-colors', budgetOpp.sem_resposta_7d > 0 ? 'border-amber-400 hover:border-amber-500' : '')} onClick={() => navigate('/orcamentos')}>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Sem resposta +7d</p>
                    <p className={cn('text-xl font-bold', budgetOpp.sem_resposta_7d > 0 ? 'text-amber-600' : 'text-muted-foreground')}>
                      {budgetOpp.sem_resposta_7d}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {budgetOpp.valor_sem_resposta_7d > 0
                        ? budgetOpp.valor_sem_resposta_7d.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }) + ' parados'
                        : 'sem valor em espera'}
                    </p>
                  </CardContent>
                </Card>

                {/* Sem resposta +14 dias */}
                <Card className={cn('motion-enter cursor-pointer transition-colors', budgetOpp.sem_resposta_14d > 0 ? 'border-red-400 hover:border-red-500' : '')} onClick={() => navigate('/orcamentos')}>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Sem resposta +14d</p>
                    <p className={cn('text-xl font-bold', budgetOpp.sem_resposta_14d > 0 ? 'text-red-600' : 'text-muted-foreground')}>
                      {budgetOpp.sem_resposta_14d}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {budgetOpp.mais_antigo_dias != null
                        ? `mais antigo há ${budgetOpp.mais_antigo_dias}d`
                        : 'nenhum em espera'}
                    </p>
                  </CardContent>
                </Card>

                {/* Aprovados vs rejeitados este mês */}
                <Card className="motion-enter">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Últimos 30 dias</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-bold text-green-600">✓ {budgetOpp.aprovados_30d}</span>
                      <span className="text-xs text-muted-foreground">aprovados</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-red-500">✗ {budgetOpp.rejeitados_30d}</span>
                      <span className="text-xs text-muted-foreground">rejeitados</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>
          )}

          {/* ── CLIENTES E RECORRÊNCIA ─────────────────────────────────────── */}
          {clientRec && (
            <section aria-label="Clientes e recorrência">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Clientes e recorrência</h2>
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">{clientRec.total_clientes} clientes na base</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                <Card className="motion-enter">
                  <CardContent className="p-4 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <UserPlus className="h-3.5 w-3.5 text-blue-500" />
                      <p className="text-xs text-muted-foreground">Novos este mês</p>
                    </div>
                    <p className="text-2xl font-bold">{clientRec.novos_mes}</p>
                  </CardContent>
                </Card>
                <Card className="motion-enter">
                  <CardContent className="p-4 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <Repeat2 className="h-3.5 w-3.5 text-green-500" />
                      <p className="text-xs text-muted-foreground">Recorrentes</p>
                    </div>
                    <p className="text-2xl font-bold">{clientRec.recorrentes}</p>
                    <p className="text-xs text-muted-foreground">≥ 2 serviços</p>
                  </CardContent>
                </Card>
                <Card className="motion-enter">
                  <CardContent className="p-4 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <RefreshCw className="h-3.5 w-3.5 text-amber-500" />
                      <p className="text-xs text-muted-foreground">Reativados</p>
                    </div>
                    <p className="text-2xl font-bold">{clientRec.reativados}</p>
                    <p className="text-xs text-muted-foreground">voltaram nos últimos 90d</p>
                  </CardContent>
                </Card>
                <Card className="motion-enter">
                  <CardContent className="p-4 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <UserX className="h-3.5 w-3.5 text-red-400" />
                      <p className="text-xs text-muted-foreground">Inativos</p>
                    </div>
                    <p className="text-2xl font-bold">{clientRec.inativos}</p>
                    <p className="text-xs text-muted-foreground">sem serviço em 90d</p>
                  </CardContent>
                </Card>
              </div>

              {/* Distribuição e métricas de valor */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card className="motion-enter">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-2">Frequência de visitas</p>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">1 visita</span>
                        <span className="font-medium">{clientRec.dist_1_servico}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">2 – 5 visitas</span>
                        <span className="font-medium text-blue-600">{clientRec.dist_2_5_servicos}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">6 ou mais</span>
                        <span className="font-medium text-green-600">{clientRec.dist_6_mais}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="motion-enter">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Média de intervenções</p>
                    <p className="text-2xl font-bold">{clientRec.media_intervencoes ?? '—'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">por cliente com serviços</p>
                  </CardContent>
                </Card>
                <Card className="motion-enter">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Receita média por cliente</p>
                    <p className="text-2xl font-bold">
                      {clientRec.receita_media_por_cliente != null
                        ? clientRec.receita_media_por_cliente.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
                        : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">lifetime · clientes com pagamento</p>
                  </CardContent>
                </Card>
              </div>
            </section>
          )}

          {/* Equipa */}
          <TeamPerformanceTable data={team} loading={teamLoading} />
        </section>
      )}

      {/* ── HISTÓRICO DE ACTIVIDADE ─────────────────────────────────────────── */}
      <Card data-tour="activity-history">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Histórico de actividade
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activityLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma actividade recente
            </p>
          ) : (
            <div className="space-y-1 stagger-children">
              {activityLogs.map((log) => {
                const isValidDate = log.created_at && !isNaN(new Date(log.created_at).getTime());
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <span className="flex-shrink-0 w-14 text-xs text-muted-foreground tabular-nums">
                      {isValidDate ? format(new Date(log.created_at), 'HH:mm') : '—'}
                    </span>
                    <span className="flex-1 text-sm">{log.description}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {isValidDate
                        ? formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: pt })
                        : ''}
                    </span>
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
