import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UseActivityLogsOptions {
  serviceId?: string;
  limit?: number;
  publicOnly?: boolean;
}

export interface ActivityLog {
  id: string;
  service_id: string | null;
  actor_id: string | null;
  action_type: string;
  description: string;
  metadata: Record<string, unknown> | null;
  is_public: boolean;
  created_at: string;
}

export function useActivityLogs(options: UseActivityLogsOptions = {}) {
  const { serviceId, limit = 20, publicOnly = false } = options;

  return useQuery({
    queryKey: ['activity-logs', serviceId, limit, publicOnly],
    queryFn: async () => {
      let query = supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (serviceId) {
        query = query.eq('service_id', serviceId);
      }

      if (publicOnly) {
        query = query.eq('is_public', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data as ActivityLog[]) || [];
    },
    refetchInterval: publicOnly ? 60000 : undefined, // 1 min for public feed; others use windowFocus only
  });
}

export function usePublicActivityLogs(limit = 10) {
  return useActivityLogs({ publicOnly: true, limit });
}
