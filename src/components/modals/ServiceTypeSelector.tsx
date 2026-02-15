import { Wrench, Settings, Package } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export type ServiceCreationType = 'reparacao' | 'instalacao' | 'entrega';

interface ServiceTypeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: ServiceCreationType) => void;
}

const SERVICE_TYPES = [
  {
    id: 'reparacao' as const,
    title: 'Reparação',
    description: 'Serviço de reparação de equipamento',
    icon: Wrench,
  },
  {
    id: 'instalacao' as const,
    title: 'Instalação',
    description: 'Instalação de novo equipamento',
    icon: Settings,
  },
  {
    id: 'entrega' as const,
    title: 'Entrega Direta',
    description: 'Entrega de equipamento ao cliente',
    icon: Package,
  },
];

export function ServiceTypeSelector({ open, onOpenChange, onSelect }: ServiceTypeSelectorProps) {
  const handleSelect = (type: ServiceCreationType) => {
    onSelect(type);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Escolha o Tipo de Serviço</DialogTitle>
          <p className="text-sm text-muted-foreground">O tipo de serviço define o fluxo que será seguido pelo técnico.</p>
        </DialogHeader>
        
        <div className="grid grid-cols-3 gap-4 py-4">
          {SERVICE_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => handleSelect(type.id)}
              className={cn(
                "flex flex-col items-center gap-3 p-4 rounded-xl text-center transition-all",
                "bg-card border-2 border-border hover:border-primary hover:bg-accent",
                "hover:shadow-md"
              )}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                <type.icon className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{type.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{type.description}</p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
