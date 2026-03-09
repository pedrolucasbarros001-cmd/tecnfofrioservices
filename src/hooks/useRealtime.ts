import { useEffect, useRef, useId } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const THROTTLE_MS = 15_000; // 4 invalidations/min max per subscription

export function useRealtime(
  table: string,
  queryKeys: string[][] = [['services'], ['services-paginated']],
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*' = '*'
) {
  const queryClient = useQueryClient();
  const queryKeysRef = useRef(queryKeys);
  queryKeysRef.current = queryKeys;
  const lastInvalidationRef = useRef<number>(0);
  const instanceId = useId(); // unique per component instance — prevents channel collisions

  useEffect(() => {
    const channelName = `rt:${table}:${event}:${instanceId}`;

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event, schema: 'public', table }, () => {
        // Skip when tab is hidden — no wasted disk IO
        if (document.visibilityState === 'hidden') return;

        const now = Date.now();
        if (now - lastInvalidationRef.current < THROTTLE_MS) return;

        // Only invalidate if at least one query is not already stale
        const hasNonStale = queryKeysRef.current.some(key => {
          const state = queryClient.getQueryState(key);
          return state && !state.isInvalidated;
        });
        if (!hasNonStale) return;

        lastInvalidationRef.current = now;
        queryKeysRef.current.forEach(key => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [table, event, queryClient, instanceId]);
}
