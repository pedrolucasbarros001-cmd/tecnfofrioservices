import { useMemo } from 'react';
import { SERVICE_BILLING } from '@/config/serviceBilling';

const DAY_MS = 24 * 60 * 60 * 1000;

export type BillingLevel = 'info' | 'soon' | 'due' | 'late' | 'critical';

export interface BillingCycle {
  dueDate: Date;
  daysRemaining: number;
  progress: number;
  level: BillingLevel;
  /** Mostrar a faixa no topo. */
  showNotice: boolean;
  /** Elegível para o aviso ao abrir (a frequência é controlada à parte). */
  showModal: boolean;
}

/** Data local de hoje no formato YYYY-MM-DD (sem UTC, sem parseISO). */
export function todayKey(): string {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function levelFor(daysRemaining: number): BillingLevel {
  if (daysRemaining <= -3) return 'critical';
  if (daysRemaining < 0) return 'late';
  if (daysRemaining === 0) return 'due';
  if (daysRemaining <= SERVICE_BILLING.modalDays) return 'soon';
  return 'info';
}

export function computeBillingCycle(dueDay: number): BillingCycle {
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
  const level = levelFor(daysRemaining);

  return {
    dueDate,
    daysRemaining,
    progress: Math.min(100, Math.max(0, (elapsed / total) * 100)),
    level,
    showNotice: SERVICE_BILLING.enabled && daysRemaining <= SERVICE_BILLING.noticeDays,
    showModal: SERVICE_BILLING.enabled && daysRemaining <= SERVICE_BILLING.modalDays,
  };
}

export function useServiceBillingCycle(): BillingCycle {
  return useMemo(() => computeBillingCycle(SERVICE_BILLING.dueDay), []);
}

/** Paleta partilhada pela faixa e pelo aviso — a urgência sobe de tom com o tempo. */
export const BILLING_LEVEL_STYLES: Record<
  BillingLevel,
  { container: string; icon: string; bar: string; badge: string }
> = {
  info: {
    container: 'border-border/60 bg-primary/5 text-foreground',
    icon: 'text-primary',
    bar: 'bg-primary',
    badge: 'text-muted-foreground',
  },
  soon: {
    container: 'border-amber-200 bg-amber-50 text-amber-900',
    icon: 'text-amber-600',
    bar: 'bg-amber-500',
    badge: 'text-amber-700',
  },
  due: {
    container: 'border-orange-200 bg-orange-50 text-orange-900',
    icon: 'text-orange-600',
    bar: 'bg-orange-500',
    badge: 'text-orange-700',
  },
  late: {
    container: 'border-orange-300 bg-orange-100 text-orange-950',
    icon: 'text-orange-700',
    bar: 'bg-orange-600',
    badge: 'text-orange-800',
  },
  critical: {
    container: 'border-red-200 bg-red-50 text-red-900',
    icon: 'text-red-600',
    bar: 'bg-red-500',
    badge: 'text-red-700',
  },
};

export function remainingLabel(daysRemaining: number): string {
  if (daysRemaining === 0) return 'Renova hoje';
  if (daysRemaining < 0) {
    const n = Math.abs(daysRemaining);
    return `Em atraso há ${n} ${n === 1 ? 'dia' : 'dias'}`;
  }
  return daysRemaining === 1 ? 'Falta 1 dia' : `Faltam ${daysRemaining} dias`;
}
