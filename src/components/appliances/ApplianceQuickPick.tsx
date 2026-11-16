import { useQuery } from '@tanstack/react-query';
import { Plus, Check, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export interface PickedAppliance {
  id: string;
  appliance_type: string | null;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  pnc: string | null;
}

interface Props {
  customerId?: string | null;
  selectedId?: string | null;
  onPick: (a: PickedAppliance | null) => void;
}

/** Quick, optional chooser of a customer's known appliances. Never blocks the form. */
export function ApplianceQuickPick({ customerId, selectedId, onPick }: Props) {
  const { data = [] } = useQuery({
    queryKey: ['customer-appliances', customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_appliances')
        .select('id, appliance_type, brand, model, serial_number, pnc')
        .eq('customer_id', customerId!)
        .order('updated_at', { ascending: false })
        .limit(20);
      if (error) return [];
      return data as PickedAppliance[];
    },
  });

  if (!customerId || data.length === 0) return null;

  return (
    <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        <Package className="h-3.5 w-3.5" /> Aparelhos deste cliente — toque para usar
      </p>
      <div className="flex flex-wrap gap-2">
        {data.map((a) => {
          const active = selectedId === a.id;
          const label = [a.appliance_type, a.brand, a.model].filter(Boolean).join(' · ');
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onPick(active ? null : a)}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs transition-colors active:scale-95',
                active ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-accent',
              )}
            >
              {active && <Check className="h-3 w-3" />}
              {label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onPick(null)}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border border-dashed px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent active:scale-95',
            !selectedId && 'border-primary text-primary',
          )}
        >
          <Plus className="h-3 w-3" /> Novo aparelho
        </button>
      </div>
    </div>
  );
}
