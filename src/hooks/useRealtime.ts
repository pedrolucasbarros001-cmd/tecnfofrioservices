import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const THROTTLE_MS = 5000;

export function useRealtime(
  table: string,
  queryKeys: string[][] = [['services'], ['services-paginated']],
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*' = '*'
) {
  const queryClient = useQueryClient();
  const queryKeysRef = useRef(queryKeys);
  queryKeysRef.current = queryKeys;
  const lastInvalidationRef = useRef<number>(0);

  useEffect(() => {
    const channel = supabase
      .channel(`rt:${table}:${event}`)
      .on('postgres_changes', { event, schema: 'public', table }, () => {
        const now = Date.now();
        if (now - lastInvalidationRef.current < THROTTLE_MS) return;
        lastInvalidationRef.current = now;
        queryKeysRef.current.forEach(key => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [table, event, queryClient]);
}
