import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Package, Wrench, Truck, TrendingUp, CheckCircle2, Clock, Star,
  FileCheck, RotateCcw, Zap, Trophy, AlertTriangle, BarChart3, Users, Target,
} from 'lucide-react';
import { formatLocalDate } from '@/utils/dateUtils';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ServiceStatusBadge } from '@/components/shared/ServiceStatusBadge';
import { useTechnicians } from '@/hooks/useTechnicians';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  useTechnicianQuality,
  useWarrantyReturns,
  useFTFRMetrics,
  useDocQualityMetrics,
  useProductivityMetrics,
} from '@/hooks/useDashboardMetrics';

// ── Period options ─────────────────────────────────────────────────────────────
const PERIOD_OPTIONS = [
  { label: '30 dias', value: 30 },
  { label: '60 dias', value: 60 },
  { label: '90 dias', value: 90 },
  { label: '180 dias', value: 180 },
];

export default function PerformancePage() {
  const [days, setDays] = useState(90);
  const { data: technicians = [] } = useTechnicians(false);
  const [expandedTechs, setExpandedTechs] = useState<string[]>([]);

  const toggleExpanded = (techId: string) =>
    setExpandedTechs((prev) =>
      prev.includes(techId) ? prev.filter((id) => id !== techId) : [...prev, techId]
    );

  interface PerfSummaryRow {
    technician_id: string;
    technician_name: string | null;
    technician_color: string | null;
    total_services: number;
    completed_services: number;
    revenue: number;
    repairs: number;
    sales: number;
    installations: number;
    pending_pricing: number;
  }

  interface PerfServiceRow {
    id: string;
    code: string;
    technician_id: string | null;
    service_type: string | null;
    is_sale: boolean | null;
    is_installation: boolean | null;
    status: string;
    pending_pricing: boolean | null;
    final_price: number | null;
    amount_paid: number | null;
    awaiting_budget_approval: boolean | null;
    service_location: string | null;
    scheduled_date: string | null;
    appliance_type: string | null;
    fault_description: string | null;
    customer: { id: string; name: string } | null;
  }

  const { data: summaries = [] } = useQuery({
    queryKey: ['performance-summary'],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('technician_performance_summary', {
        _from: null,
        _to: null,
      });
      if (error) throw error;
      return (data || []) as PerfSummaryRow[];
    },
  });

  const { data: expandedServices = [] } = useQuery({
    queryKey: ['performance-services', expandedTechs],
    enabled: expandedTechs.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id, code, technician_id, service_type, is_sale, is_installation, status, pending_pricing, final_price, amount_paid, awaiting_budget_approval, service_location, scheduled_date, appliance_type, fault_description, customer:customers(id, name)')
        .in('technician_id', expandedTechs)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      return (data || []) as unknown as PerfServiceRow[];
    },
  });

  // ── Totais da equipa ──────────────────────────────────────────────────────
  const teamTotals = summaries.reduce(
    (acc, s) => ({
      total: acc.total + Number(s.total_services),
      completed: acc.completed + Number(s.completed_services),
      revenue: acc.revenue + Number(s.revenue),
    }),
    { total: 0, completed: 0, revenue: 0 }
  );

  const getServiceType = (service: any) => {
    if (service.service_type === 'entrega' || service.is_sale) return 'entregas';
    if (service.service_type === 'instalacao' || service.is_installation) return 'instalacoes';
    return 'reparacoes';
  };

  const getTechnicianData = (techId: string) => {
    const summary = summaries.find((s) => s.technician_id === techId);
    const total = summary ? Number(summary.total_services) : 0;
    const completed = summary ? Number(summary.completed_services) : 0;
    const revenue = summary ? Number(summary.revenue) : 0;
    const entregasCount = summary ? Number(summary.sales) : 0;
    const instalacoesCount = summary ? Number(summary.installations) : 0;
    const reparacoesCount = summary ? Number(summary.repairs) : 0;
    const pendingPricing = summary ? Number(summary.pending_pricing) : 0;

    const isEmpty = total === 0;
    const chartData = !isEmpty
      ? [
          { name: 'Reparações', value: reparacoesCount, color: '#3b82f6' },
          { name: 'Instalações', value: instalacoesCount, color: '#f59e0b' },
          { name: 'Entregas', value: entregasCount, color: '#10b981' },
        ].filter((item) => item.value > 0)
      : [{ name: 'Sem serviços', value: 1, color: 'hsl(var(--muted))' }];

    const services = expandedTechs.includes(techId)
      ? expandedServices.filter((s) => s.technician_id === techId)
      : [];

    return {
      services,
      entregasCount,
      instalacoesCount,
      reparacoesCount,
      pendingPricing,
      chartData,
      total,
      completed,
      revenue,
      isEmpty,
    };
  };

  const getServiceIcon = (type: string) => {
    switch (type) {
      case 'entregas': return <Truck className="h-4 w-4" />;
      case 'instalacoes': return <Package className="h-4 w-4" />;
      default: return <Wrench className="h-4 w-4" />;
    }
  };

  const getServiceColor = (type: string) => {
    switch (type) {
      case 'entregas': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'instalacoes': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      default: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  const getServiceLabel = (type: string) => {
    switch (type) {
      case 'entregas': return 'Entrega';
      case 'instalacoes': return 'Instalação';
      default: return 'Reparação';
    }
  };

  const techniciansWithData = technicians.map((tech) => ({
    ...tech,
    data: getTechnicianData(tech.id),
  }));

  const { data: qualityData = [] } = useTechnicianQuality(days);
  const { data: warrantyData = [] } = useWarrantyReturns(180);

  // ── Novos hooks (spec v2) ─────────────────────────────────────────────────
  const { data: ftfrData } = useFTFRMetrics(days);
  const { data: docQualityData } = useDocQualityMetrics(days);
  const { data: productivityData } = useProductivityMetrics(days);

  // Find best performers for highlights
  const highlights = (() => {
    if (qualityData.length === 0) return null;
    const withActivity = qualityData.filter(q => q.completed_services > 0);
    if (withActivity.length === 0) return null;

    const bestCompletion = [...withActivity].sort((a, b) => (b.completion_rate ?? 0) - (a.completion_rate ?? 0))[0];
    const bestFirstVisit  = [...withActivity].filter(q => q.first_visit_rate != null).sort((a, b) => (b.first_visit_rate ?? 0) - (a.first_visit_rate ?? 0))[0];
    const bestReports     = [...withActivity].filter(q => q.reports_complete_pct != null).sort((a, b) => (b.reports_complete_pct ?? 0) - (a.reports_complete_pct ?? 0))[0];
    const fastest         = [...withActivity].filter(q => q.avg_resolution_days != null).sort((a, b) => (a.avg_resolution_days ?? 99) - (b.avg_resolution_days ?? 99))[0];

    return { bestCompletion, bestFirstVisit, bestReports, fastest };
  })();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Performance de Técnicos</h1>
          <p className="text-muted-foreground">Carga de trabalho, qualidade e resultados por técnico</p>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDays(opt.value)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                days === opt.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Totais da equipa */}
      {summaries.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-md bg-muted p-2">
                <Wrench className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total de serviços</p>
                <p className="text-2xl font-bold">{teamTotals.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-md bg-emerald-100 dark:bg-emerald-900/30 p-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Concluídos</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {teamTotals.completed}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-md bg-muted p-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Receita gerada</p>
                <p className="text-2xl font-bold">
                  {teamTotals.revenue.toLocaleString('pt-PT', {
                    style: 'currency',
                    currency: 'EUR',
                    maximumFractionDigits: 0,
                  })}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── 2.2 Secção FTFR — Resolução à 1ª visita ──────────────────────── */}
      {ftfrData && ftfrData.por_tecnico && ftfrData.por_tecnico.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold">Resolução à 1ª Visita (FTFR)</h2>
            <Badge variant="secondary" className="text-xs">últimos {days} dias</Badge>
            {ftfrData.equipa_ftfr != null && (
              <span className={cn(
                'ml-auto text-2xl font-bold',
                ftfrData.equipa_ftfr >= 70 ? 'text-emerald-600' :
                ftfrData.equipa_ftfr >= 50 ? 'text-amber-500' : 'text-red-500'
              )}>
                {ftfrData.equipa_ftfr}% <span className="text-sm font-normal text-muted-foreground">equipa</span>
              </span>
            )}
          </div>

          <div className="grid gap-3">
            {ftfrData.por_tecnico.map((t) => {
              const pct = t.ftfr_pct ?? 0;
              const color = pct >= 70 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
              return (
                <Card key={t.technician_id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-2.5 h-10 rounded-full shrink-0"
                        style={{ background: t.technician_color ?? '#94a3b8' }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-sm">{t.technician_name}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                            <span>{t.resolvido_1a}/{t.total_elegivel} resolvidos</span>
                            {t.com_retorno > 0 && (
                              <span className="text-rose-500 flex items-center gap-1">
                                <RotateCcw className="h-3 w-3" />
                                {t.com_retorno} retornos
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: color }}
                          />
                        </div>
                        <p className="text-right text-xs font-semibold mt-0.5" style={{ color }}>
                          {t.ftfr_pct != null ? `${t.ftfr_pct}%` : '—'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Indicadores de Qualidade (existente) ─────────────────────────── */}
      {qualityData.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Indicadores de Qualidade</h2>
            <Badge variant="secondary" className="text-xs">últimos {days} dias</Badge>
          </div>

          {/* Quality grid per technician */}
          <div className="grid gap-3">
            {qualityData.filter(q => q.total_services > 0).map(q => {
              const warrantyCount = warrantyData.find(w => w.technician_id === q.technician_id)?.warranty_count ?? 0;
              return (
                <Card key={q.technician_id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex items-center gap-0 divide-x">
                      {/* Name */}
                      <div className="flex items-center gap-3 px-4 py-4 w-[180px] shrink-0">
                        <div
                          className="w-2.5 h-10 rounded-full shrink-0"
                          style={{ background: q.technician_color ?? '#94a3b8' }}
                        />
                        <div>
                          <p className="font-semibold text-sm leading-tight">{q.technician_name ?? 'Técnico'}</p>
                          <p className="text-xs text-muted-foreground">{q.completed_services}/{q.total_services} concluídos</p>
                        </div>
                      </div>

                      {/* Resolução à 1ª visita */}
                      <div className="flex flex-col items-center justify-center px-5 py-4 flex-1">
                        <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 mb-0.5">
                          <Zap className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium">1ª Visita</span>
                        </div>
                        <p className={cn(
                          'text-xl font-bold',
                          (q.first_visit_rate ?? 0) >= 70 ? 'text-emerald-600' :
                          (q.first_visit_rate ?? 0) >= 50 ? 'text-amber-500' : 'text-red-500'
                        )}>
                          {q.first_visit_rate != null ? `${q.first_visit_rate}%` : '—'}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{q.quick_resolutions} rápidos</p>
                      </div>

                      {/* Relatórios completos */}
                      <div className="flex flex-col items-center justify-center px-5 py-4 flex-1">
                        <div className="flex items-center gap-1.5 text-violet-600 dark:text-violet-400 mb-0.5">
                          <FileCheck className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium">Relatórios</span>
                        </div>
                        <p className={cn(
                          'text-xl font-bold',
                          (q.reports_complete_pct ?? 0) >= 80 ? 'text-emerald-600' :
                          (q.reports_complete_pct ?? 0) >= 50 ? 'text-amber-500' : 'text-red-500'
                        )}>
                          {q.reports_complete_pct != null ? `${q.reports_complete_pct}%` : '—'}
                        </p>
                        <p className="text-[10px] text-muted-foreground">c/ descrição</p>
                      </div>

                      {/* Tempo médio resolução */}
                      <div className="flex flex-col items-center justify-center px-5 py-4 flex-1">
                        <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400 mb-0.5">
                          <Clock className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium">Tempo médio</span>
                        </div>
                        <p className={cn(
                          'text-xl font-bold',
                          (q.avg_resolution_days ?? 99) <= 2 ? 'text-emerald-600' :
                          (q.avg_resolution_days ?? 99) <= 5 ? 'text-amber-500' : 'text-red-500'
                        )}>
                          {q.avg_resolution_days != null ? `${q.avg_resolution_days}d` : '—'}
                        </p>
                        <p className="text-[10px] text-muted-foreground">por serviço</p>
                      </div>

                      {/* Retornos/Garantia */}
                      <div className="flex flex-col items-center justify-center px-5 py-4 flex-1">
                        <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 mb-0.5">
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium">Retornos</span>
                        </div>
                        <p className={cn(
                          'text-xl font-bold',
                          warrantyCount === 0 ? 'text-emerald-600' :
                          warrantyCount <= 2 ? 'text-amber-500' : 'text-red-500'
                        )}>
                          {warrantyCount}
                        </p>
                        <p className="text-[10px] text-muted-foreground">em 60 dias</p>
                      </div>

                      {/* Pendentes precificar */}
                      {q.pending_pricing > 0 && (
                        <div className="flex flex-col items-center justify-center px-5 py-4 flex-1">
                          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 mb-0.5">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span className="text-xs font-medium">Por faturar</span>
                          </div>
                          <p className="text-xl font-bold text-amber-600">{q.pending_pricing}</p>
                          <p className="text-[10px] text-muted-foreground">serviços</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Destaques individuais */}
          {highlights && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold">Destaques da equipa</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {highlights.bestFirstVisit && (
                  <div className="rounded-xl border bg-blue-50/60 dark:bg-blue-900/10 p-3">
                    <p className="text-[10px] uppercase tracking-wide text-blue-600 dark:text-blue-400 font-semibold mb-1 flex items-center gap-1"><Zap className="h-3 w-3" /> Melhor 1ª Visita</p>
                    <p className="font-bold text-sm leading-tight">{highlights.bestFirstVisit.technician_name}</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{highlights.bestFirstVisit.first_visit_rate}%</p>
                  </div>
                )}
                {highlights.bestReports && (
                  <div className="rounded-xl border bg-violet-50/60 dark:bg-violet-900/10 p-3">
                    <p className="text-[10px] uppercase tracking-wide text-violet-600 dark:text-violet-400 font-semibold mb-1 flex items-center gap-1"><FileCheck className="h-3 w-3" /> Relatórios</p>
                    <p className="font-bold text-sm leading-tight">{highlights.bestReports.technician_name}</p>
                    <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">{highlights.bestReports.reports_complete_pct}%</p>
                  </div>
                )}
                {highlights.fastest && (
                  <div className="rounded-xl border bg-orange-50/60 dark:bg-orange-900/10 p-3">
                    <p className="text-[10px] uppercase tracking-wide text-orange-600 dark:text-orange-400 font-semibold mb-1 flex items-center gap-1"><Clock className="h-3 w-3" /> Mais Rápido</p>
                    <p className="font-bold text-sm leading-tight">{highlights.fastest.technician_name}</p>
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{highlights.fastest.avg_resolution_days}d</p>
                  </div>
                )}
                {highlights.bestCompletion && (
                  <div className="rounded-xl border bg-emerald-50/60 dark:bg-emerald-900/10 p-3">
                    <p className="text-[10px] uppercase tracking-wide text-emerald-600 dark:text-emerald-400 font-semibold mb-1 flex items-center gap-1"><Star className="h-3 w-3" /> Taxa de Conclusão</p>
                    <p className="font-bold text-sm leading-tight">{highlights.bestCompletion.technician_name}</p>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{highlights.bestCompletion.completion_rate}%</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 2.4 Qualidade de Documentação ─────────────────────────────────── */}
      {docQualityData && docQualityData.por_tecnico && docQualityData.por_tecnico.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-violet-500" />
            <h2 className="text-lg font-semibold">Qualidade de Documentação</h2>
            <Badge variant="secondary" className="text-xs">últimos {days} dias</Badge>
            {docQualityData.equipa_completo_pct != null && (
              <span className={cn(
                'ml-auto text-2xl font-bold',
                docQualityData.equipa_completo_pct >= 80 ? 'text-emerald-600' :
                docQualityData.equipa_completo_pct >= 50 ? 'text-amber-500' : 'text-red-500'
              )}>
                {docQualityData.equipa_completo_pct}% <span className="text-sm font-normal text-muted-foreground">equipa</span>
              </span>
            )}
          </div>

          <div className="grid gap-2">
            {/* Summary row */}
            {docQualityData.total_finalizados > 0 && (
              <div className="flex items-center gap-4 px-4 py-3 rounded-lg border bg-muted/30 text-sm text-muted-foreground">
                <span>{docQualityData.total_finalizados} serviços concluídos</span>
                {docQualityData.sem_diagnostico > 0 && (
                  <span className="text-rose-500 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {docQualityData.sem_diagnostico} sem diagnóstico
                  </span>
                )}
              </div>
            )}

            {docQualityData.por_tecnico.map((t) => {
              const pct = t.completo_pct ?? 0;
              const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
              return (
                <Card key={t.technician_id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-2.5 h-10 rounded-full shrink-0"
                        style={{ background: t.technician_color ?? '#94a3b8' }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-sm">{t.technician_name}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                            <span>{t.com_diagnostico}/{t.total} c/ diagnóstico</span>
                            {t.sem_diagnostico > 0 && (
                              <span className="text-rose-500">{t.sem_diagnostico} sem</span>
                            )}
                          </div>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: color }}
                          />
                        </div>
                        <p className="text-right text-xs font-semibold mt-0.5" style={{ color }}>
                          {t.completo_pct != null ? `${t.completo_pct}%` : '—'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 2.6 Produtividade por Técnico ────────────────────────────────── */}
      {productivityData && productivityData.por_tecnico && productivityData.por_tecnico.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-500" />
            <h2 className="text-lg font-semibold">Produtividade</h2>
            <Badge variant="secondary" className="text-xs">últimos {days} dias</Badge>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Técnico</th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">Serviços</th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">Concluídos</th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">Clientes</th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">Instalações</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Receita</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ticket médio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {productivityData.por_tecnico.map((t) => (
                      <tr key={t.technician_id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-8 rounded-full shrink-0"
                              style={{ background: t.technician_color ?? '#94a3b8' }}
                            />
                            <span className="font-medium">{t.technician_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-semibold">{t.total_servicos}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn(
                            'font-semibold',
                            t.total_servicos > 0 && (t.concluidos / t.total_servicos) >= 0.8
                              ? 'text-emerald-600' : ''
                          )}>
                            {t.concluidos}
                          </span>
                          {t.total_servicos > 0 && (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({Math.round((t.concluidos / t.total_servicos) * 100)}%)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            <span>{t.clientes_distintos}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {t.instalacoes > 0 ? (
                            <span className="inline-flex items-center gap-1 text-orange-600">
                              <Package className="h-3 w-3" />
                              {t.instalacoes}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {t.receita_total > 0
                            ? t.receita_total.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
                            : <span className="text-muted-foreground font-normal">—</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          {t.ticket_medio > 0
                            ? t.ticket_medio.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
                            : '—'
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="border-t pt-2" />

      {/* Cards por técnico */}
      <div className="space-y-6" data-tour="performance-cards" data-demo="performance-cards">
        {techniciansWithData.map((tech) => {
          const d = tech.data;
          const completionRate = d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0;

          return (
            <Card key={tech.id} className="overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  {/* Nome + avatar */}
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
                      style={{ backgroundColor: tech.color || '#3B82F6' }}
                    >
                      {tech.profile?.full_name?.charAt(0).toUpperCase() || 'T'}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{tech.profile?.full_name || 'Técnico'}</h3>
                      <p className="text-sm text-muted-foreground">{d.total} serviços no total</p>
                    </div>
                  </div>

                  {/* Métricas principais */}
                  <div className="flex gap-4 flex-wrap">
                    <div className="text-center min-w-[64px]">
                      <p className="text-xs text-muted-foreground mb-0.5">Reparações</p>
                      <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{d.reparacoesCount}</p>
                    </div>
                    <div className="text-center min-w-[64px]">
                      <p className="text-xs text-muted-foreground mb-0.5">Instalações</p>
                      <p className="text-xl font-bold text-orange-600 dark:text-orange-400">{d.instalacoesCount}</p>
                    </div>
                    <div className="text-center min-w-[64px]">
                      <p className="text-xs text-muted-foreground mb-0.5">Entregas</p>
                      <p className="text-xl font-bold text-green-600 dark:text-green-400">{d.entregasCount}</p>
                    </div>
                    <div className="text-center min-w-[64px]">
                      <p className="text-xs text-muted-foreground mb-0.5">Concluídos</p>
                      <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{d.completed}</p>
                    </div>
                    <div className="text-center min-w-[72px]">
                      <p className="text-xs text-muted-foreground mb-0.5">Receita</p>
                      <p className="text-xl font-bold">
                        {d.revenue.toLocaleString('pt-PT', {
                          style: 'currency',
                          currency: 'EUR',
                          maximumFractionDigits: 0,
                        })}
                      </p>
                    </div>
                    {d.pendingPricing > 0 && (
                      <div className="text-center min-w-[64px]">
                        <p className="text-xs text-muted-foreground mb-0.5">Por orçamentar</p>
                        <p className="text-xl font-bold text-amber-500">{d.pendingPricing}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Barra de progresso de conclusão */}
                {!d.isEmpty && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Taxa de conclusão</span>
                      <span className="font-medium">{completionRate}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardHeader>

              <CardContent className="pt-0">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Pie Chart */}
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={d.chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={d.isEmpty ? 0 : 2}
                          dataKey="value"
                          stroke="none"
                        >
                          {d.chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} opacity={d.isEmpty ? 0.3 : 1} />
                          ))}
                        </Pie>
                        {!d.isEmpty && <Tooltip />}
                        {!d.isEmpty && <Legend />}
                      </PieChart>
                    </ResponsiveContainer>
                    {d.isEmpty && (
                      <p className="text-xs text-muted-foreground text-center -mt-4">Sem serviços</p>
                    )}
                  </div>

                  {/* Lista de serviços */}
                  <div className="lg:col-span-2 space-y-2 max-h-[300px] overflow-y-auto overscroll-contain pr-1">
                    {d.isEmpty ? (
                      <div className="flex items-center justify-center h-full min-h-[100px] text-muted-foreground text-sm">
                        Nenhum serviço atribuído
                      </div>
                    ) : !expandedTechs.includes(tech.id) ? (
                      <div className="flex items-center justify-center h-full min-h-[100px]">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-sm text-muted-foreground"
                          onClick={() => toggleExpanded(tech.id)}
                        >
                          {`Ver todos (${d.total})`}
                        </Button>
                      </div>
                    ) : (
                      <>
                        {d.services.map((service) => {
                          const serviceType = getServiceType(service);
                          return (
                            <div
                              key={service.id}
                              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn('p-2 rounded-lg', getServiceColor(serviceType))}>
                                  {getServiceIcon(serviceType)}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm font-semibold text-primary">
                                      {service.code}
                                    </span>
                                    <Badge variant="secondary" className="text-xs">
                                      {getServiceLabel(serviceType)}
                                    </Badge>
                                  </div>
                                  <p className="text-sm">{service.customer?.name || 'Cliente'}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {service.appliance_type}
                                    {service.fault_description && ` — ${service.fault_description}`}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right shrink-0 ml-2">
                                {service.scheduled_date && (
                                  <p className="text-xs text-muted-foreground mb-1">
                                    {formatLocalDate(service.scheduled_date, 'dd/MM/yyyy')}
                                  </p>
                                )}
                                <ServiceStatusBadge
                                  service={{
                                    status: service.status as any,
                                    pending_pricing: service.pending_pricing,
                                    final_price: service.final_price ?? 0,
                                    amount_paid: service.amount_paid ?? 0,
                                    awaiting_budget_approval: service.awaiting_budget_approval ?? false,
                                    service_location: service.service_location as any,
                                    service_type: service.service_type as any,
                                    technician_id: service.technician_id ?? null,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-sm text-muted-foreground"
                          onClick={() => toggleExpanded(tech.id)}
                        >
                          Ver menos
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {technicians.length === 0 && (
        <Card className="p-12">
          <p className="text-center text-muted-foreground">Nenhum técnico cadastrado</p>
        </Card>
      )}
    </div>
  );
}
