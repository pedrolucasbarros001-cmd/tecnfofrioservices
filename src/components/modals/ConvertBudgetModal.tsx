import { useState } from 'react';
import { Wrench, Settings, Package, MapPin, Building2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ConvertBudgetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: any | null;
  onSuccess?: () => void;
}

type ServiceType = 'instalacao' | 'reparacao' | 'entrega';
type ServiceLocation = 'cliente' | 'oficina';

const SERVICE_TYPES = [
  {
    value: 'instalacao' as const,
    label: 'Instalação',
    description: 'Montagem de equipamento novo',
    icon: Settings,
  },
  {
    value: 'reparacao' as const,
    label: 'Reparação',
    description: 'Diagnóstico e reparação de avaria',
    icon: Wrench,
  },
  {
    value: 'entrega' as const,
    label: 'Entrega',
    description: 'Entrega de equipamento ao cliente',
    icon: Package,
  },
];

const SERVICE_LOCATIONS = [
  {
    value: 'cliente' as const,
    label: 'Cliente (Visita)',
    icon: MapPin,
  },
  {
    value: 'oficina' as const,
    label: 'Oficina',
    icon: Building2,
  },
];

export function ConvertBudgetModal({
  open,
  onOpenChange,
  budget,
  onSuccess,
}: ConvertBudgetModalProps) {
  const [serviceType, setServiceType] = useState<ServiceType>('reparacao');
  const [serviceLocation, setServiceLocation] = useState<ServiceLocation>('oficina');
  const [isLoading, setIsLoading] = useState(false);

  const handleConvert = async () => {
    if (!budget) return;

    setIsLoading(true);
    try {
      // Create service from budget with selected type and location
      const { data: service, error: serviceError } = await supabase
        .from('services')
        .insert({
          customer_id: budget.customer_id,
          appliance_type: budget.appliance_type,
          brand: budget.brand,
          model: budget.model,
          fault_description: budget.fault_description,
          notes: budget.notes,
          service_type: serviceType,
          status: 'por_fazer',
          service_location: serviceLocation,
          final_price: budget.estimated_total,
          is_installation: serviceType === 'instalacao',
        })
        .select()
        .single();

      if (serviceError) throw serviceError;

      // Update budget as converted
      const { error: updateError } = await supabase
        .from('budgets')
        .update({
          status: 'convertido',
          converted_service_id: service.id,
        })
        .eq('id', budget.id);

      if (updateError) throw updateError;

      toast.success('Orçamento convertido em serviço com sucesso!');
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error converting budget:', error);
      toast.error('Erro ao converter orçamento');
    } finally {
      setIsLoading(false);
    }
  };

  if (!budget) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Converter Orçamento em Serviço</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Service Type Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Tipo de Serviço</Label>
            <RadioGroup
              value={serviceType}
              onValueChange={(value) => setServiceType(value as ServiceType)}
              className="grid gap-3"
            >
              {SERVICE_TYPES.map((type) => (
                <label
                  key={type.value}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all",
                    serviceType === type.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <RadioGroupItem value={type.value} id={type.value} />
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <type.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{type.label}</p>
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Service Location Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Local do Serviço</Label>
            <RadioGroup
              value={serviceLocation}
              onValueChange={(value) => setServiceLocation(value as ServiceLocation)}
              className="grid grid-cols-2 gap-3"
            >
              {SERVICE_LOCATIONS.map((location) => (
                <label
                  key={location.value}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                    serviceLocation === location.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <RadioGroupItem value={location.value} id={location.value} />
                  <location.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{location.label}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Budget Info */}
          <div className="rounded-lg bg-muted/50 p-4 text-sm">
            <p className="text-muted-foreground">
              <strong>Orçamento:</strong> {budget.code}
            </p>
            <p className="text-muted-foreground">
              <strong>Cliente:</strong> {budget.customer?.name || 'Sem cliente'}
            </p>
            <p className="text-muted-foreground">
              <strong>Aparelho:</strong> {budget.appliance_type || '-'}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleConvert} disabled={isLoading}>
            {isLoading ? 'A criar...' : 'Criar Serviço'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
