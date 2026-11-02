import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BusinessHealthMetrics {
  recebido: number;
  faturado_por_receber: number;
  por_faturar_count: number;
  orcamentos_pendentes_count: number;
  orcamentos_pendentes_valor: number;
  revenue_this_month: number;
  revenue_last_month: number;
  unbilled_services: number;
  open_services: number;
  budget_conversion_rate: number;
  avg_ticket: number;
  clientes_novos_mes: number;
  stuck_services_5d: number;
  sem_tecnico: number;
}

export interface RevenueTrendItem {
  month: string;
  month_date: string;
  revenue: number;
  services_count: number;
}

export interface OperationalMetrics {
  by_status: Array<{ status: string; count: number }> | null;
  by_type: Array<{ service_type: string; count: number }> | null;
  avg_resolution_days: number;
  services_this_week: number;
}

export interface TeamMember {
  technician_name: string;
  technician_color: string | null;
  total_services: number;
  completed: number;
  in_progress: number;
  revenue_generated: number;
}

export interface BottleneckItem {
  status: string;
  count: number;
  avg_days: number;
  max_days: number;
}

export interface TechnicianQuality {
  technician_id: string;
  technician_name: string | null;
  technician_color: string | null;
  total_services: number;
  completed_services: number;
  completion_rate: number;
  avg_resolution_days: number | null;
  reports_complete_pct: number | null;
  quick_resolutions: number;
  first_visit_rate: number | null;
  pending_pricing: number;
  revenue: number;
  avg_ticket: number | null;
}

export interface WarrantyReturn {
  technician_id: string;
  technician_name: string | null;
  warranty_count: number;
}

export interface BudgetOpportunities {
  total_pendentes: number;
  valor_total_pendente: number;
  sem_resposta_7d: number;
  sem_resposta_14d: number;
  valor_sem_resposta_7d: number;
  aprovados_30d: number;
  rejeitados_30d: number;
  taxa_aceitacao: number | null;
  mais_antigo_dias: number | null;
}

export interface ClientRecurrence {
  novos_mes: number;
  recorrentes: number;
  ativos_90d: number;
  inativos: number;
  reativados: number;
  total_clientes: number;
  media_intervencoes: number | null;
  receita_media_por_cliente: number | null;
  com_multiplos_aparelhos: number;
  dist_1_servico: number;
  dist_2_5_servicos: number;
  dist_6_mais: number;
}

// ─── Novos tipos (spec v2) ────────────────────────────────────────────────────

export interface FinancialSummary {
  recebido: number;
  recebido_prev: number;
  por_receber: number;
  por_receber_count: number;
  por_faturar: number;
  por_faturar_count: number;
  faturado: number;
  faturado_prev: number;
  ticket_medio: number | null;
  ticket_medio_prev: number | null;
  days: number;
  period_start: string;
  period_prev_start: string;
}

export interface ActivityMetrics {
  iniciados: number;
  concluidos: number;
  em_execucao: number;
  por_tipo: Array<{ service_type: string; count: number }> | null;
  evolucao_semanal: Array<{ week: string; count: number; faturado: number; recebido: number }> | null;
}

export interface BudgetDetail {
  criados_count: number;
  criados_valor: number;
  aceites_count: number;
  aceites_valor: number;
  rejeitados_count: number;
  rejeitados_valor: number;
  pendentes_count: number;
  pendentes_valor: number;
  taxa_aceitacao: number | null;
  sem_resposta_7d: number;
  sem_resposta_14d: number;
  sem_resposta_7d_valor: number;
  mais_antigo_dias: number | null;
  pendentes_antigos: Array<{
    id: string;
    code: string;
    estimated_total: number | null;
    created_at: string;
    dias_pendente: number;
    customer_name: string | null;
  }> | null;
}

export interface TeamOverview {
  concluidos: number;
  em_execucao: number;
  distribuicao_carga: Array<{
    technician_name: string;
    technician_color: string | null;
    total: number;
    concluidos: number;
  }> | null;
  ftfr_pct: number | null;
  doc_completa_pct: number | null;
  sem_tecnico: number;
}

export interface AlertItem {
  id: string;
  code: string;
  customer_name: string | null;
  appliance_type: string | null;
  dias: number;
  [key: string]: unknown;
}

export interface DashboardAlerts {
  por_faturar: AlertItem[] | null;
  pagamento_pendente: Array<AlertItem & { final_price: number; em_falta: number }> | null;
  orcamentos_sem_resposta: AlertItem[] | null;
  servicos_parados: Array<AlertItem & { status: string }> | null;
  sem_tecnico: AlertItem[] | null;
  counts: {
    por_faturar: number;
    pagamento_pendente: number;
    orcamento_sem_resp: number;
    servicos_parados: number;
    sem_tecnico: number;
  };
}

export interface BottleneckDetail {
  por_estado: Array<{ status: string; count: number; media_dias: number; max_dias: number }> | null;
  total_abertos: number;
  parados_5d: number;
  parados_10d: number;
  aguardar_peca: number;
  por_agendar: number;
  tempo_medio_resolucao: number | null;
}

export interface FTFRMetrics {
  por_tecnico: Array<{
    technician_id: string;
    technician_name: string;
    technician_color: string | null;
    total_elegivel: number;
    resolvido_1a: number;
    com_retorno: number;
    ftfr_pct: number | null;
  }> | null;
  equipa_ftfr: number | null;
  days: number;
}

export interface DocQualityMetrics {
  por_tecnico: Array<{
    technician_id: string;
    technician_name: string;
    technician_color: string | null;
    total: number;
    com_diagnostico: number;
    sem_diagnostico: number;
    completo_pct: number | null;
  }> | null;
  equipa_completo_pct: number | null;
  total_finalizados: number;
  sem_diagnostico: number;
}

export interface ProductivityMetrics {
  por_tecnico: Array<{
    technician_id: string;
    technician_name: string;
    technician_color: string | null;
    total_servicos: number;
    clientes_distintos: number;
    concluidos: number;
    instalacoes: number;
    vendas: number;
    receita_total: number;
    ticket_medio: number;
  }> | null;
  days: number;
}

// ─── Hooks base (mantidos para compatibilidade) ───────────────────────────────

export function useBusinessHealth() {
  return useQuery<BusinessHealthMetrics>({
    queryKey: ['dashboard', 'health'],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_business_health_metrics');
      if (error) throw error;
      return data as BusinessHealthMetrics;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useRevenueTrend() {
  return useQuery<RevenueTrendItem[]>({
    queryKey: ['dashboard', 'revenue-trend'],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_revenue_trend');
      if (error) throw error;
      return (data as RevenueTrendItem[]) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useOperationalMetrics() {
  return useQuery<OperationalMetrics>({
    queryKey: ['dashboard', 'operational'],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_operational_metrics');
      if (error) throw error;
      return data as OperationalMetrics;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useTeamPerformance() {
  return useQuery<TeamMember[]>({
    queryKey: ['dashboard', 'team'],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_team_performance');
      if (error) throw error;
      return (data as TeamMember[]) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useServiceBottlenecks() {
  return useQuery<BottleneckItem[]>({
    queryKey: ['dashboard', 'bottlenecks'],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_service_bottlenecks');
      if (error) throw error;
      return (data as BottleneckItem[]) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useTechnicianQuality(days = 90) {
  return useQuery<TechnicianQuality[]>({
    queryKey: ['performance', 'quality', days],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)(
        'get_technician_quality_metrics',
        { _days: days }
      );
      if (error) throw error;
      return (data as TechnicianQuality[]) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useWarrantyReturns(days = 180) {
  return useQuery<WarrantyReturn[]>({
    queryKey: ['performance', 'warranty', days],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)(
        'get_warranty_returns',
        { _days: days }
      );
      if (error) throw error;
      return (data as WarrantyReturn[]) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useBudgetOpportunities() {
  return useQuery<BudgetOpportunities>({
    queryKey: ['dashboard', 'budget-opportunities'],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_budget_opportunities');
      if (error) throw error;
      return data as BudgetOpportunities;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useClientRecurrence() {
  return useQuery<ClientRecurrence>({
    queryKey: ['dashboard', 'client-recurrence'],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_client_recurrence');
      if (error) throw error;
      return data as ClientRecurrence;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Hooks novos (spec v2) ────────────────────────────────────────────────────

export function useFinancialSummary(days = 30) {
  return useQuery<FinancialSummary>({
    queryKey: ['dashboard', 'financial-summary', days],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_financial_summary', { _days: days });
      if (error) throw error;
      return data as FinancialSummary;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useActivityMetrics(days = 30) {
  return useQuery<ActivityMetrics>({
    queryKey: ['dashboard', 'activity-metrics', days],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_activity_metrics', { _days: days });
      if (error) throw error;
      return data as ActivityMetrics;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useBudgetDetail(days = 30) {
  return useQuery<BudgetDetail>({
    queryKey: ['dashboard', 'budget-detail', days],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_budget_detail', { _days: days });
      if (error) throw error;
      return data as BudgetDetail;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useTeamOverview(days = 30) {
  return useQuery<TeamOverview>({
    queryKey: ['dashboard', 'team-overview', days],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_team_overview', { _days: days });
      if (error) throw error;
      return data as TeamOverview;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useDashboardAlerts() {
  return useQuery<DashboardAlerts>({
    queryKey: ['dashboard', 'alerts'],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_dashboard_alerts');
      if (error) throw error;
      return data as DashboardAlerts;
    },
    staleTime: 3 * 60 * 1000,
  });
}

export function useBottleneckDetail() {
  return useQuery<BottleneckDetail>({
    queryKey: ['dashboard', 'bottleneck-detail'],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_bottleneck_detail');
      if (error) throw error;
      return data as BottleneckDetail;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useFTFRMetrics(days = 90) {
  return useQuery<FTFRMetrics>({
    queryKey: ['performance', 'ftfr', days],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_ftfr_metrics', { _days: days });
      if (error) throw error;
      return data as FTFRMetrics;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useDocQualityMetrics(days = 30) {
  return useQuery<DocQualityMetrics>({
    queryKey: ['performance', 'doc-quality', days],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_doc_quality_metrics', { _days: days });
      if (error) throw error;
      return data as DocQualityMetrics;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useProductivityMetrics(days = 30) {
  return useQuery<ProductivityMetrics>({
    queryKey: ['performance', 'productivity', days],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_productivity_metrics', { _days: days });
      if (error) throw error;
      return data as ProductivityMetrics;
    },
    staleTime: 5 * 60 * 1000,
  });
}
