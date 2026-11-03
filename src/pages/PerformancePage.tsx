import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Package, Wrench, Truck } from 'lucide-react';
import { formatLocalDate } from '@/utils/dateUtils';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ServiceStatusBadge } from '@/components/shared/ServiceStatusBadge';
import { useTechnicians } from '@/hooks/useTechnicians';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useTechnicianQuality, useWarrantyReturns } from '@/hooks/useDashboardMetrics';
import { Skeleton } from '@/components/ui/skeleton';

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

  const { data: expandedServices = [], isLoading: servicesLoading, isError: servicesError } = useQuery({
    queryKey: ['performance-services', expandedTechs],
    enabled: expandedTechs.length > 0,
    queryFn: async () => {
      const rows: PerfServiceRow[] = [];
      for (const techId of expandedTechs) {
        let offset = 0;
        while (true) {
          const { data, error } = await supabase.from('services')
            .select('id, code, technician_id, service_type, is_sale, is_installation, status, pending_pricing, final_price, amount_paid, awaiting_budget_approval, service_location, scheduled_date, appliance_type, fault_description, customer:customers(id, name)')
            .eq('technician_id', techId).order('created_at', { ascending: false }).order('id')
            .range(offset, offset + 499);
          if (error) throw error;
          const batch = (data ?? []) as unknown as PerfServiceRow[];
          rows.push(...batch);
          if (batch.length < 500) break;
          offset += 500;
        }
      }
      return rows;
    },
  });

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

  const { data: qualityData = [], isLoading: qualityLoading, isError: qualityError } = useTechnicianQuality(days);
  const { data: warrantyData = [], isError: warrantyError } = useWarrantyReturns(days);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Performance de Técnicos</h1>
          <p className="text-muted-foreground">Volume por técnico e qualidade de execução</p>
        </div>

      </div>

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
                    ) : servicesLoading ? <Skeleton className="h-24 w-full" /> : servicesError ? (
                      <p className="text-sm text-muted-foreground">Não foi possível consultar os serviços.</p>
                    ) : (
                      <>
                        {d.services.map((service) => {
                          const serviceType = getServiceType(service);
                          return (
                            <div
                              key={service.id}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-muted/50 rounded-lg"
                            >
                              <div className="flex items-start gap-3 min-w-0">
                                <div className={cn('p-2 rounded-lg', getServiceColor(serviceType))}>
                                  {getServiceIcon(serviceType)}
                                </div>
                                <div className="min-w-0 break-words">
                                  <div className="flex flex-wrap items-center gap-2">
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
                              <div className="sm:text-right shrink-0 sm:ml-2">
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

      <section aria-label="Qualidade e eficiência" className="space-y-4 border-t pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Qualidade e eficiência</h2>
          <div role="group" aria-label="Período da análise de qualidade" className="flex flex-wrap gap-1 rounded-lg border bg-muted/40 p-1">
            {PERIOD_OPTIONS.map(option => <Button key={option.value} size="sm" variant={days === option.value ? 'secondary' : 'ghost'} aria-pressed={days === option.value} onClick={() => setDays(option.value)}>{option.label}</Button>)}
          </div>
        </div>
        {qualityLoading ? <Skeleton className="h-40 w-full" /> : qualityError ?
          <p className="text-sm text-muted-foreground">Não foi possível consultar a análise de qualidade.</p> :
          <div className="divide-y border-y border-border">
            {technicians.map(tech => {
              const q = qualityData.find(row => row.technician_id === tech.id);
              const returns = warrantyData.find(row => row.technician_id === tech.id)?.warranty_count;
              const measured = q && q.completed_services > 0;
              return <div key={tech.id} className="py-4 space-y-3">
                <p className="font-medium">{tech.profile?.full_name ?? 'Técnico'}</p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-5">
                  <div><p className="text-xs text-muted-foreground">Fecho em até 2 dias</p><p className="mt-1 text-xl font-semibold tabular-nums">{measured && q.first_visit_rate != null ? `${q.first_visit_rate}%` : '—'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Descrição da avaria preenchida</p><p className="mt-1 text-xl font-semibold tabular-nums">{measured && q.reports_complete_pct != null ? `${q.reports_complete_pct}%` : '—'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Intervalo médio até ao fecho</p><p className="mt-1 text-xl font-semibold tabular-nums">{measured && q.avg_resolution_days != null ? `${q.avg_resolution_days}d` : '—'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Novos serviços do mesmo cliente</p><p className="mt-1 text-xl font-semibold tabular-nums">{!warrantyError && returns != null ? returns : '—'}</p><p className="text-xs text-muted-foreground mt-1">Até 60 dias após o fecho</p></div>
                </div>
                {!measured && <p className="text-xs text-muted-foreground">Sem serviços finalizados para análise neste período.</p>}
              </div>;
            })}
          </div>}
        <p className="text-xs text-muted-foreground">Período: últimos {days} dias, pela criação do serviço. O intervalo até ao fecho usa a última atualização. Novos serviços do mesmo cliente não confirmam a mesma avaria. Estes dados não medem primeira visita, pontualidade, fotografias ou assinaturas.</p>
      </section>

      {technicians.length === 0 && (
        <Card className="p-12">
          <p className="text-center text-muted-foreground">Nenhum técnico cadastrado</p>
        </Card>
      )}
    </div>
  );
}
