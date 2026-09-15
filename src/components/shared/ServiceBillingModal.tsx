import { useEffect, useState } from 'react';
import { AlertTriangle, CalendarClock } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  BILLING_LEVEL_STYLES,
  remainingLabel,
  todayKey,
  useServiceBillingCycle,
} from '@/hooks/useServiceBillingCycle';

const STORAGE_KEY = 'tecnofrio:service-billing-modal-shown';
const OPEN_DELAY_MS = 1200;

/**
 * Aviso de renovação apresentado ao abrir o sistema.
 * Regras anti-spam: só a partir de `modalDays`, no máximo uma vez por dia
 * (a marca é escrita no momento em que abre, para resistir a recarregamentos
 * e a vários separadores abertos).
 */
export function ServiceBillingModal() {
  const cycle = useServiceBillingCycle();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!cycle.showModal) return;

    const today = todayKey();
    let alreadyShown = false;
    try {
      alreadyShown = localStorage.getItem(STORAGE_KEY) === today;
    } catch {
      alreadyShown = false;
    }
    if (alreadyShown) return;

    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, today);
      } catch {
        /* ignore */
      }
      setOpen(true);
    }, OPEN_DELAY_MS);

    return () => clearTimeout(timer);
  }, [cycle.showModal]);

  if (!cycle.showModal) return null;

  const styles = BILLING_LEVEL_STYLES[cycle.level];
  const dueLabel = format(cycle.dueDate, "d 'de' MMMM", { locale: pt });
  const isOverdue = cycle.daysRemaining < 0;
  const isDueToday = cycle.daysRemaining === 0;

  const title = isOverdue
    ? 'Renovação em atraso'
    : isDueToday
      ? 'Renovação é hoje'
      : cycle.daysRemaining === 1
        ? 'Renovação é amanhã'
        : `Renovação em ${cycle.daysRemaining} dias`;

  const Icon = isOverdue || isDueToday ? AlertTriangle : CalendarClock;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <div className={cn('mb-3 flex h-11 w-11 items-center justify-center rounded-full border', styles.container)}>
            <Icon className={cn('h-5 w-5', styles.icon)} aria-hidden="true" />
          </div>
          <DialogTitle className="text-left text-lg">{title}</DialogTitle>
          <DialogDescription className="text-left">
            A renovação mantém o plano de hospedagem ativo. Sem ela, o sistema pode ficar indisponível quando os limites de armazenamento forem excedidos.
          </DialogDescription>
        </DialogHeader>

        <div className={cn('rounded-lg border px-3 py-2.5 text-sm', styles.container)}>
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium">Renovação a {dueLabel}</span>
            <span className={cn('whitespace-nowrap text-xs font-semibold', styles.badge)}>
              {remainingLabel(cycle.daysRemaining)}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => setOpen(false)}>Entendido</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
