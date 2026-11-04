import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Building2, Package, Clock, Truck, DollarSign, AlertCircle, CheckSquare, FileText, BarChart2, ArrowRight, AlertTriangle, Play } from 'lucide-react';
import { safeFormat } from '@/utils/safeDateFormat';
import { useManagementFallbacks } from '@/hooks/useManagementFallbacks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BudgetDetailPanel } from '@/components/shared/BudgetDetailPanel';
import { getActionCases, getTeamQuality } from '@/utils/managementInsights';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useActivityLogs } from '@/hooks/useActivityLogs';
import { cn } from '@/lib/utils';
import { useBusinessHealth, useRevenueTrend, useOperationalMetrics, useServiceBottlenecks,
  useBudgetOpportunities, useClientRecurrence, useFinancialSummary, useBudgetDetail,
  useDashboardAlerts, useBottleneckDetail, useTechnicianQuality } from '@/hooks/useDashboardMetrics';
import { RevenueChart } from '@/components/dashboard/RevenueChart';

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

function Insight({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className="min-w-0 border-l-2 border-border pl-4 py-2">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="mt-1 text-2xl font-semibold tabular-nums break-words">{value}</p>
    {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
  </div>;
}

const STATUS_LABELS: Record<string, string> = {
  por_fazer: 'Aberto', em_execucao: 'Em Execução', na_oficina: 'Oficina',
  para_pedir_peca: 'Pedir Peça', em_espera_de_peca: 'Espera Peça',
  diagnostico: 'Diagnóstico', aguardando: 'Aguardando',
};

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
  { key: 'por_fazer' as const,      label: 'Aberto',             icon: ClipboardList, route: '/geral?status=por_fazer' },
  { key: 'em_execucao' as const,    label: 'Em Execução',        icon: Play,          route: '/geral?status=em_execucao' },
  { key: 'na_oficina' as const,     label: 'Oficina',            icon: Building2,     route: '/oficina' },
  { key: 'para_pedir_peca' as const,label: 'Pedir Peça',         icon: Package,       route: '/geral?status=para_pedir_peca' },
  { key: 'em_espera_de_peca' as const, label: 'Espera Peça',     icon: Clock,         route: '/geral?status=em_espera_de_peca' },
  { key: 'concluidos' as const,     label: 'Concluídos Oficina', icon: Truck,         route: '/concluidos' },
  { key: 'a_precificar' as const,   label: 'Orçamentar',         icon: DollarSign,    route: '/precificar' },
  { key: 'em_debito' as const,      label: 'Em Débito',          icon: AlertCircle,   route: '/em-debito' },
  { key: 'finalizado' as const,     label: 'Finalizados',        icon: CheckSquare,   route: '/geral?status=finalizado' },
  { key: 'orcamentos' as const,     label: 'Orçamentos',         icon: FileText,      route: '/orcamentos' },
];

// ─── Página principal ─────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const { data: activityLogs = [] } = useActivityLogs({ limit: 10 });
  const isDono = role === 'dono';

  const { data: health, isLoading: healthLoading } = useBusinessHealth();
  const { data: revenueTrend = [], isLoading: trendLoading } = useRevenueTrend();
  const { data: operational } = useOperationalMetrics();
  const { data: bottlenecks = [] } = useServiceBottlenecks();
  const { data: budgetOpp } = useBudgetOpportunities();
  const { data: clientRec } = useClientRecurrence();
  const { data: financialSummary } = useFinancialSummary(30);
  const { data: budgetDetail } = useBudgetDetail(30);
  const { data: dashAlerts, isLoading: alertsLoading, isError: alertsError } = useDashboardAlerts();
  const { data: bottleneckDetail } = useBottleneckDetail();
  const { data: quality = [] } = useTechnicianQuality(30);
  const fallback = useManagementFallbacks(isDono && !financialSummary);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);
  const { data: selectedBudget, isLoading: budgetLoading, isError: budgetError } = useQuery({
    queryKey: ['budget-action-detail', selectedBudgetId],
    enabled: selectedBudgetId !== null,
    queryFn: async () => {
      if (!selectedBudgetId) return null;
      const { data, error } = await supabase.from('budgets')
        .select('*, customer:customers(*)').eq('id', selectedBudgetId).single();
      if (error) throw error;
      return data;
    },
  });
  const actionCases = getActionCases(dashAlerts ?? fallback.actions.data);
  const teamQuality = getTeamQuality(quality);
  const delays = (bottleneckDetail?.por_estado?.map(item => ({ status: item.status, average: item.media_dias, maximum: item.max_dias }))
    ?? bottlenecks.map(item => ({ status: item.status, average: item.avg_days, maximum: item.max_days })))
    .filter(item => !['finalizado', 'concluidos', 'concluido', 'concluído', 'cancelado'].includes(item.status))
    .sort((a, b) => b.average - a.average);

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

  const fmt = (n: number) =>
    n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

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

      </div>

      {/* ── ESTADO DE TODOS OS SERVIÇOS ──────────────────────────────────────── */}
      {/* Os 10 cards permanecem exactamente como estão — não alterar */}
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

      {isDono && <>
        <section aria-label="Centro de Ação" className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-muted-foreground" />Centro de Ação</h2>
          {alertsLoading || (alertsError && fallback.actions.isLoading) ? <Skeleton className="h-24 w-full" /> : alertsError && fallback.actions.isError ?
            <p className="text-sm text-muted-foreground">Não foi possível consultar os casos de acompanhamento.</p> : actionCases.length === 0 ?
            <p className="text-sm text-muted-foreground">Sem casos de acompanhamento sinalizados.</p> :
            <div className="divide-y border-y border-border">
              {actionCases.map(item => <div key={item.key} className="flex flex-col sm:flex-row sm:items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{item.code} · {item.customer ?? 'Cliente'}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.reason}{item.days != null && ` · ${item.days} dias`}{item.amount != null && ` · ${fmt(item.amount)} em falta`}</p>
                </div>
                <Button variant="outline" size="sm" className="self-start shrink-0" onClick={() => item.kind === 'budget' ? setSelectedBudgetId(item.id) : navigate(`/service-detail/${item.id}`)}>
                  {item.kind === 'budget' ? 'Abrir orçamento' : 'Abrir serviço'}<ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>)}
            </div>}
        </section>

        <section aria-label="Resumo financeiro" className="space-y-4">
          <h2 className="text-sm font-semibold">Resumo financeiro <span className="font-normal text-xs text-muted-foreground">· últimos {financialSummary?.days ?? 30} dias</span></h2>
          {fallback.financial.isLoading && !financialSummary ? <Skeleton className="h-24 w-full" /> :
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Insight label="Recebido" value={financialSummary || fallback.financial.data ? fmt(financialSummary?.recebido ?? fallback.financial.data?.recebido ?? 0) : '—'} detail="Pagamentos registados no período" />
              <Insight label="Por receber" value={financialSummary || fallback.financial.data ? fmt(financialSummary?.por_receber ?? fallback.financial.data?.por_receber ?? 0) : '—'} detail="Saldo atual em falta nos serviços não finalizados nem cancelados" />
              {financialSummary && <Insight label="Valor definido" value={fmt(financialSummary.faturado)} detail="Valor dos serviços no período" />}
            </div>}
        </section>

        <section aria-label="Atividade e evolução" className="space-y-4">
          <h2 className="text-sm font-semibold">Atividade e evolução</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Insight label="Ticket médio" value={(financialSummary?.ticket_medio ?? health?.avg_ticket) != null ? fmt(financialSummary?.ticket_medio ?? health?.avg_ticket ?? 0) : '—'} detail="Valor médio por serviço com preço definido" />
            <Insight label="Evolução da receita" value={health && health.revenue_last_month > 0 ? `${((health.revenue_this_month - health.revenue_last_month) / health.revenue_last_month * 100).toFixed(1)}%` : '—'} detail="Mês atual face ao mês anterior · período em curso" />
          </div>
          <RevenueChart data={revenueTrend} loading={trendLoading} />
        </section>

        <section aria-label="Orçamentos e conversão" className="space-y-4">
          <h2 className="text-sm font-semibold">Orçamentos e conversão <span className="font-normal text-xs text-muted-foreground">· últimos 30 dias</span></h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Insight label="Taxa de aceitação" value={(budgetDetail?.taxa_aceitacao ?? health?.budget_conversion_rate) != null ? `${budgetDetail?.taxa_aceitacao ?? health?.budget_conversion_rate}%` : '—'} />
            {budgetDetail ? <>
              <Insight label="Valor aceite" value={fmt(budgetDetail.aceites_valor)} />
              <Insight label="Valor recusado" value={fmt(budgetDetail.rejeitados_valor)} />
            </> : <Insight label="Valor em aberto" value={budgetOpp ? fmt(budgetOpp.valor_total_pendente) : '—'} detail="Carteira pendente de decisão" />}
          </div>
        </section>

        {clientRec && <section aria-label="Clientes e recorrência" className="space-y-4">
          <h2 className="text-sm font-semibold">Clientes e recorrência</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Insight label="Novos este mês" value={String(clientRec.novos_mes)} />
            <Insight label="Clientes recorrentes" value={String(clientRec.recorrentes)} detail="Clientes que regressaram" />
            <Insight label="Reativados" value={String(clientRec.reativados)} detail="Voltaram nos últimos 90 dias" />
            <Insight label="Inativos" value={String(clientRec.inativos)} detail="Sem serviço nos últimos 90 dias" />
          </div>
          <Insight label="Receita média por cliente" value={clientRec.receita_media_por_cliente != null ? fmt(clientRec.receita_media_por_cliente) : '—'} detail="Histórico dos clientes com pagamento" />
        </section>}

        <section aria-label="Gargalos operacionais" className="space-y-4">
          <h2 className="text-sm font-semibold">Gargalos operacionais</h2>
          <Insight label="Intervalo médio até ao fecho" value={(bottleneckDetail?.tempo_medio_resolucao ?? operational?.avg_resolution_days) != null ? `${bottleneckDetail?.tempo_medio_resolucao ?? operational?.avg_resolution_days} dias` : '—'} detail="Estimativa entre criação e última atualização dos serviços terminados" />
          {delays.length > 0 && <div className="divide-y border-y border-border">
            <p className="text-xs text-muted-foreground py-2">Tempo desde a última atualização, por etapa</p>
            {delays.map(item => <div key={item.status} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
              <span>{STATUS_LABELS[item.status] ?? item.status.replace(/_/g, ' ')}</span>
              <span className="tabular-nums text-muted-foreground">Média {item.average}d · máximo {item.maximum}d</span>
            </div>)}
          </div>}
        </section>

        <section aria-label="Visão geral da equipa" className="space-y-4">
          <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-semibold">Visão geral da equipa <span className="font-normal text-xs text-muted-foreground">· últimos 30 dias</span></h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/performance')}>Performance<ArrowRight className="ml-2 h-4 w-4" /></Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Insight label="Fecho em até 2 dias" value={teamQuality.quickResolutionPct != null ? `${teamQuality.quickResolutionPct.toFixed(1)}%` : '—'} />
            <Insight label="Descrição da avaria preenchida" value={teamQuality.descriptionPct != null ? `${teamQuality.descriptionPct.toFixed(1)}%` : '—'} />
            <Insight label="Intervalo médio até ao fecho" value={teamQuality.resolutionDays != null ? `${teamQuality.resolutionDays.toFixed(1)} dias` : '—'} />
          </div>
        </section>
      </>}

      {selectedBudgetId && budgetLoading && <p role="status" className="text-sm text-muted-foreground">A carregar orçamento…</p>}
      {selectedBudgetId && budgetError && <p role="alert" className="text-sm text-destructive">Não foi possível abrir o orçamento.</p>}
      <BudgetDetailPanel open={selectedBudgetId !== null && !!selectedBudget} onOpenChange={open => { if (!open) setSelectedBudgetId(null); }} budget={selectedBudget ?? null} onUpdate={() => {
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['budgets'] });
        queryClient.invalidateQueries({ queryKey: ['budget-action-detail', selectedBudgetId] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      }} />

      {/* ── HISTÓRICO DE ACTIVIDADE ─────────────────────────────────────────────── */}
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
                return (
                  <div
                    key={log.id}
                    className="flex flex-wrap sm:flex-nowrap items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <span className="flex-shrink-0 w-14 text-xs text-muted-foreground tabular-nums">
                      {safeFormat(log.created_at, 'HH:mm')}
                    </span>
                    <span className="flex-1 text-sm">{log.description}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {safeFormat(log.created_at, 'dd/MM HH:mm')}
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
