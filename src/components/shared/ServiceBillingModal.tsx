import { useEffect, useState } from 'react';
import { AlertTriangle, CalendarClock, Check } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  const queryClient = useQueryClient();

  const cycleKey = `${cycle.dueDate.getFullYear()}-${String(cycle.dueDate.getMonth() + 1).padStart(2, '0')}`;

  const { data: settings, isLoading } = useQuery({
    queryKey: ['system_settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('system_settings').select('*').eq('id', 1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const isPaid = settings?.last_paid_billing_cycle === cycleKey;

  useEffect(() => {
    if (!cycle.showModal || isPaid || isLoading) return;

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
  }, [cycle.showModal, isPaid, isLoading]);

  const mutation = useMutation({
    mutationFn: async (key: string) => {
      const { error } = await supabase.from('system_settings').upsert({ id: 1, last_paid_billing_cycle: key });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system_settings'] });
      toast.success('Pagamento confirmado. Lembrete ocultado até o próximo ciclo.');
      setOpen(false);
    },
    onError: () => {
      toast.error('Ocorreu um erro ao confirmar o pagamento.');
    }
  });

  if (!cycle.showModal || isPaid) return null;

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

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Entendido
          </Button>
          <Button 
            onClick={() => mutation.mutate(cycleKey)}
            disabled={mutation.isPending}
            className="gap-2 bg-green-600 hover:bg-green-700 text-white"
          >
            <Check className="h-4 w-4" />
            {mutation.isPending ? 'Salvando...' : 'Confirmar Pagamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
