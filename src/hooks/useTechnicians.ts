import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TechnicianWithProfile {
  id: string;
  profile_id: string;
  color: string | null;
  specialization: string | null;
  active: boolean | null;
  created_at: string;
  profile: {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
  } | null;
}

export function useTechnicians(onlyActive = true) {
  return useQuery({
    queryKey: ['technicians', onlyActive],
    queryFn: async () => {
      let query = supabase
        .from('technicians')
        .select(`
          *,
          profile:profiles(*)
        `)
        .order('created_at', { ascending: true });

      if (onlyActive) {
        query = query.eq('active', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data as unknown as TechnicianWithProfile[]) || [];
    },
  });
}
