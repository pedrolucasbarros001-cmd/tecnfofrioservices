import { useEffect, useState } from 'react';
import { Search, Zap, History, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export const APPLIANCE_ANNOUNCEMENT_KEY = 'tecnofrio_announcement_appliances_v1';

const items = [
  { icon: Search, title: 'Escolha rápida', text: 'Ao criar um serviço, os aparelhos que o cliente já tem aparecem logo. Basta tocar para preencher.' },
  { icon: Zap, title: 'Nunca bloqueia', text: 'Cliente novo ou aparelho diferente? Escreva como sempre. O sistema guarda o aparelho sozinho.' },
  { icon: History, title: 'Histórico sem repetidos', text: 'Aparelhos iguais ficam num só registo, com todos os serviços e orçamentos anteriores na ficha do cliente.' },
];

/** One-time "what's new" notice for owners and secretaries. */
export function ApplianceAnnouncementModal() {
  const { role, user } = useAuth();
  const [open, setOpen] = useState(false);
  const key = user ? `${APPLIANCE_ANNOUNCEMENT_KEY}_${user.id}` : null;

  useEffect(() => {
    if (!key || (role !== 'dono' && role !== 'secretaria')) return;
    try {
      if (!localStorage.getItem(key)) setOpen(true);
    } catch { /* storage unavailable: skip */ }
  }, [key, role]);

  const dismiss = () => {
    try { if (key) localStorage.setItem(key, new Date().toISOString()); } catch { /* ignore */ }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) dismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-left">
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Novidade
          </span>
          <DialogTitle className="text-xl">Agora temos aparelhos do cliente</DialogTitle>
          <DialogDescription>Menos tempo a preencher e todo o histórico à mão.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2.5">
          {items.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-3 rounded-lg border bg-muted/40 p-3">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            </div>
          ))}
        </div>
        <Button className="w-full" onClick={dismiss}>Entendido</Button>
      </DialogContent>
    </Dialog>
  );
}
