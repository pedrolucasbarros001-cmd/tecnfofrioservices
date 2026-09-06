import { useMemo, useState } from 'react';
import { Info, X } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

import { SERVICE_BILLING } from '@/config/serviceBilling';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'tecnofrio:service-billing-notice-dismissed';

/** Data local de hoje no formato YYYY-MM-DD. */
function todayKey(): string {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

const DAY_MS = 24 * 60 * 60 * 1000;

interface CycleInfo {
  dueDate: Date;
  cycleStart: Date;
  daysRemaining: number;
  progress: number;
}

function computeCycle(dueDay: number): CycleInfo {
  const today = startOfLocalDay(new Date());
  const dayNow = today.getDate();

  // Vencimento do ciclo actual: este mês se ainda não passou, senão o próximo.
  const dueDate =
    dayNow <= dueDay
      ? new Date(today.getFullYear(), today.getMonth(), dueDay)
      : new Date(today.getFullYear(), today.getMonth() + 1, dueDay);

  const cycleStart = new Date(dueDate.getFullYear(), dueDate.getMonth() - 1, dueDay);
  const total = Math.max(1, Math.round((dueDate.getTime() - cycleStart.getTime()) / DAY_MS));
  const elapsed = Math.round((today.getTime() - cycleStart.getTime()) / DAY_MS);
  const daysRemaining = Math.round((dueDate.getTime() - today.getTime()) / DAY_MS);

  return {
    dueDate,
    cycleStart,
    daysRemaining,
    progress: Math.min(100, Math.max(0, (elapsed / total) * 100)),
  };
}

export function ServiceBillingNotice() {
  const [dismissedKey, setDismissedKey] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const cycle = useMemo(() => computeCycle(SERVICE_BILLING.dueDay), []);

  if (!SERVICE_BILLING.enabled) return null;
  if (cycle.daysRemaining > SERVICE_BILLING.noticeDays) return null;
  if (dismissedKey === todayKey()) return null;

  const dueLabel = format(cycle.dueDate, "d 'de' MMMM", { locale: pt });
  const isDueToday = cycle.daysRemaining === 0;
  const amountLabel = new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: SERVICE_BILLING.currency,
    maximumFractionDigits: 0,
  }).format(SERVICE_BILLING.amount);

  const message = isDueToday
    ? `Manutenção e suporte — renovação hoje.`
    : `Manutenção e suporte — renovação a ${dueLabel}.`;

  const remainingLabel = isDueToday
    ? 'Renova hoje'
    : cycle.daysRemaining === 1
      ? 'Falta 1 dia'
      : `Faltam ${cycle.daysRemaining} dias`;

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
      className={cn(
        'motion-enter border-b px-4 py-2.5',
        isDueToday
          ? 'border-amber-200 bg-amber-50 text-amber-900'
          : 'border-border/60 bg-primary/5 text-foreground'
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 items-start gap-2 sm:items-center">
          <Info
            className={cn('mt-0.5 h-4 w-4 shrink-0 sm:mt-0', isDueToday ? 'text-amber-600' : 'text-primary')}
            aria-hidden="true"
          />
          <p className="text-sm leading-snug">
            <span className="font-medium">{message}</span>{' '}
            <span className="text-muted-foreground">{amountLabel} · suporte contínuo incluído</span>
          </p>
        </div>

        <div className="flex items-center gap-3 sm:ml-auto">
          <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">
            {remainingLabel}
          </span>
          <div
            className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-border sm:block"
            aria-hidden="true"
          >
            <div
              className={cn('h-full rounded-full transition-all', isDueToday ? 'bg-amber-500' : 'bg-primary')}
              style={{ width: `${cycle.progress}%` }}
            />
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dispensar lembrete até amanhã"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
