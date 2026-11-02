import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BusinessHealthMetrics {
  revenue_this_month: number;
  revenue_last_month: number;
  unbilled_services: number;
  open_services: number;
  budget_conversion_rate: number;
  avg_ticket: number;
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
  total_services: number;
  completed: number;
  in_progress: number;
  revenue_generated: number;
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
