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
    gradient: 'from-blue-500 to-cyan-500',
    hoverGradient: 'hover:from-blue-600 hover:to-cyan-600',
  },
  {
    id: 'instalacao' as const,
    title: 'Instalação',
    description: 'Instalação de novo equipamento',
    icon: Settings,
    gradient: 'from-purple-500 to-pink-500',
    hoverGradient: 'hover:from-purple-600 hover:to-pink-600',
  },
  {
    id: 'entrega' as const,
    title: 'Entrega Direta',
    description: 'Entrega de equipamento ao cliente',
    icon: Package,
    gradient: 'from-green-500 to-emerald-500',
    hoverGradient: 'hover:from-green-600 hover:to-emerald-600',
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
          <DialogTitle className="text-xl">Criar Novo Serviço</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {SERVICE_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => handleSelect(type.id)}
              className={cn(
                "flex items-center gap-4 p-4 rounded-xl text-left transition-all",
                "bg-gradient-to-r text-white shadow-lg",
                type.gradient,
                type.hoverGradient,
                "hover:scale-[1.02] hover:shadow-xl"
              )}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/20">
                <type.icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{type.title}</h3>
                <p className="text-sm text-white/80">{type.description}</p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
