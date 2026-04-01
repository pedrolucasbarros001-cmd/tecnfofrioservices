import { useEffect, useRef, useId } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const DEBOUNCE_MS = 800; // debounce instead of throttle — ensures last event is always processed

export function useRealtime(
  table: string,
  queryKeys: string[][] = [['services'], ['services-paginated']],
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*' = '*'
) {
  const queryClient = useQueryClient();
  const queryKeysRef = useRef(queryKeys);
  queryKeysRef.current = queryKeys;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const instanceId = useId();

  useEffect(() => {
    const channelName = `rt:${table}:${event}:${instanceId}`;

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event, schema: 'public', table }, () => {
        if (document.visibilityState === 'hidden') return;

        // Debounce: cancel previous timer and reschedule
        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
          queryKeysRef.current.forEach(key => {
            queryClient.invalidateQueries({ queryKey: key });
          });
        }, DEBOUNCE_MS);
      })
      .subscribe();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      supabase.removeChannel(channel);
    };
  }, [table, event, queryClient, instanceId]);
}
