import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to subscribe to realtime changes on a table and invalidate specific queries.
 * @param table The table name to subscribe to.
 * @param queryKeys Array of query keys to invalidate when a change occurs.
 * @param event The type of event to listen for ('*' for all, 'INSERT', 'UPDATE', or 'DELETE').
 */
export function useRealtime(
    table: string,
    queryKeys: string[][] = [['services'], ['services-paginated']],
    event: 'INSERT' | 'UPDATE' | 'DELETE' | '*' = '*'
) {
    const queryClient = useQueryClient();

    useEffect(() => {
        console.log(`[Realtime] Subscribing to ${table}:${event}`);

        const channel = supabase
            .channel(`public:${table}`)
            .on(
                'postgres_changes',
                {
                    event,
                    schema: 'public',
                    table: table,
                },
                (payload) => {
                    console.log(`[Realtime] Change detected in ${table}:`, payload);
                    // Invalidate all provided query keys
                    queryKeys.forEach(key => {
                        queryClient.invalidateQueries({ queryKey: key });
                    });
                }
            )
            .subscribe((status) => {
                console.log(`[Realtime] Subscription status for ${table}:`, status);
            });

        return () => {
            console.log(`[Realtime] Unsubscribing from ${table}`);
            supabase.removeChannel(channel);
        };
    }, [table, queryKeys, event, queryClient]);
}
