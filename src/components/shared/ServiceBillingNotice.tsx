import { useState } from 'react';
import { Info, Check } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import {
  BILLING_LEVEL_STYLES,
  remainingLabel,
  useServiceBillingCycle,
} from '@/hooks/useServiceBillingCycle';

export function ServiceBillingNotice() {
  const cycle = useServiceBillingCycle();
  const queryClient = useQueryClient();

  // Identifier for the current billing cycle month (e.g. "2026-10")
  const cycleKey = `${cycle.dueDate.getFullYear()}-${String(cycle.dueDate.getMonth() + 1).padStart(2, '0')}`;

  const { data: settings, isLoading } = useQuery({
    queryKey: ['system_settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('system_settings').select('*').eq('id', 1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (key: string) => {
      const { error } = await supabase.from('system_settings').upsert({ id: 1, last_paid_billing_cycle: key });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system_settings'] });
      toast.success('Pagamento confirmado. Lembrete ocultado até o próximo ciclo.');
    },
    onError: () => {
      toast.error('Ocorreu um erro ao confirmar o pagamento.');
    }
  });

  const isPaid = settings?.last_paid_billing_cycle === cycleKey;

  // Don't render anything if the banner shouldn't show, if it's loading, or if the current cycle is already paid.
  if (!cycle.showNotice || isPaid || isLoading) return null;

  const styles = BILLING_LEVEL_STYLES[cycle.level];
  const dueLabel = format(cycle.dueDate, "d 'de' MMMM", { locale: pt });
  const isDueToday = cycle.daysRemaining === 0;
  const isOverdue = cycle.daysRemaining < 0;

  const message = isDueToday
    ? 'Lembre-se de renovar a mensalidade hoje para manter tudo a funcionar sem interrupções.'
    : isOverdue
      ? `A mensalidade está pendente desde ${dueLabel}. Renove assim que possível para evitar interrupções.`
      : `Lembre-se de renovar a mensalidade para garantir um funcionamento fluido. Renovação a ${dueLabel}.`;

  const handleConfirmPayment = () => {
    mutation.mutate(cycleKey);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('motion-enter border-b px-4 py-2.5', styles.container)}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 items-start gap-2 sm:items-center">
          <Info className={cn('mt-0.5 h-4 w-4 shrink-0 sm:mt-0', styles.icon)} aria-hidden="true" />
          <div className="text-sm leading-snug">
            <p className="font-medium">{message}</p>
            <p className="opacity-80">
              A renovação mantém o plano de hospedagem ativo. Sem ela, o sistema pode ficar indisponível quando os limites de armazenamento forem excedidos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:ml-auto">
          <span className={cn('whitespace-nowrap text-xs font-medium', styles.badge)}>
            {remainingLabel(cycle.daysRemaining)}
          </span>
          <div
            className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-border sm:block"
            aria-hidden="true"
          >
            <div
              className={cn('h-full rounded-full transition-all', styles.bar)}
              style={{ width: `${cycle.progress}%` }}
            />
          </div>
          <Button 
            variant="default"
            size="sm"
            onClick={handleConfirmPayment}
            disabled={mutation.isPending}
            className="gap-2 bg-green-600 text-white hover:bg-green-700 h-8"
          >
            <Check className="h-4 w-4" />
            {mutation.isPending ? 'Salvando...' : 'Confirmar Pagamento'}
          </Button>
        </div>
      </div>
    </div>
  );
}
