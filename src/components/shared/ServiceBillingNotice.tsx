import { useState } from 'react';
import { Info, X } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

import { cn } from '@/lib/utils';
import {
  BILLING_LEVEL_STYLES,
  remainingLabel,
  todayKey,
  useServiceBillingCycle,
} from '@/hooks/useServiceBillingCycle';

const STORAGE_KEY = 'tecnofrio:service-billing-notice-dismissed';

export function ServiceBillingNotice() {
  const [dismissedKey, setDismissedKey] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const cycle = useServiceBillingCycle();

  if (!cycle.showNotice) return null;
  if (dismissedKey === todayKey()) return null;

  const styles = BILLING_LEVEL_STYLES[cycle.level];
  const dueLabel = format(cycle.dueDate, "d 'de' MMMM", { locale: pt });
  const isDueToday = cycle.daysRemaining === 0;
  const isOverdue = cycle.daysRemaining < 0;

  const message = isDueToday
    ? 'Lembre-se de renovar a mensalidade hoje para manter tudo a funcionar sem interrupções.'
    : isOverdue
      ? `A mensalidade está pendente desde ${dueLabel}. Renove assim que possível para evitar interrupções.`
      : `Lembre-se de renovar a mensalidade para garantir um funcionamento fluido. Renovação a ${dueLabel}.`;

  const handleDismiss = () => {
    const key = todayKey();
    try {
      localStorage.setItem(STORAGE_KEY, key);
    } catch {
      /* ignore */
    }
    setDismissedKey(key);
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
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dispensar lembrete até amanhã"
            className="rounded-md p-1 opacity-70 transition-colors hover:bg-foreground/5 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
