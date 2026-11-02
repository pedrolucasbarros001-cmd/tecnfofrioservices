import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BusinessHealthMetrics {
  // Breakdown financeiro correto
  recebido: number;               // dinheiro efectivamente recebido este mês
  faturado_por_receber: number;   // faturado mas não pago
  por_faturar_count: number;      // finalizados sem preço definido
  orcamentos_pendentes_count: number;
  orcamentos_pendentes_valor: number;
  // Comparação mês anterior
  revenue_this_month: number;
  revenue_last_month: number;
  // Legados / compatibilidade
  unbilled_services: number;
  open_services: number;
  budget_conversion_rate: number;
  avg_ticket: number;
  // Novos indicadores
  clientes_novos_mes: number;
  stuck_services_5d: number;      // serviços parados há +5 dias
  sem_tecnico: number;            // sem técnico atribuído
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

// ─── Hooks ────────────────────────────────────────────────────────────────────

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

// ─── Quality Metrics ──────────────────────────────────────────────────────────

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
