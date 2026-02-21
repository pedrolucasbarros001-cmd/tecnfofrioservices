import { Truck, User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useUpdateService } from '@/hooks/useServices';
import { toast } from 'sonner';
import { humanizeError } from '@/utils/errorMessages';
import type { Service } from '@/types/database';

interface DeliveryManagementModalProps {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssignDelivery: () => void;
}

export function DeliveryManagementModal({
  service,
  open,
  onOpenChange,
  onAssignDelivery,
}: DeliveryManagementModalProps) {
  const updateService = useUpdateService();

  const handleClientPickup = async () => {
    if (!service) return;

    try {
      await updateService.mutateAsync({
        id: service.id,
        status: 'finalizado',
        delivery_method: 'client_pickup',
        skipToast: true,
      });

      // Contextual feedback
      const customerName = service.customer?.name || 'cliente';
      toast.success(`${service.code} finalizado — ${customerName} recolheu o equipamento.`);
      onOpenChange(false);
    } catch (error) {
      console.error('Error setting client pickup:', error);
      toast.error(humanizeError(error));
    }
  };

  const handleTechnicianDelivery = () => {
    onOpenChange(false);
    onAssignDelivery();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-teal-600" />
            Opções de Entrega
          </DialogTitle>
          <p className="text-sm text-muted-foreground">Escolha como o equipamento será devolvido ao cliente.</p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {service && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium">{service.code}</p>
              <p className="text-muted-foreground">{service.customer?.name}</p>
              <p className="text-muted-foreground">
                {service.appliance_type} {service.brand}
              </p>
            </div>
          )}

          <p className="text-sm text-muted-foreground text-center">
            Como será feita a entrega deste equipamento?
          </p>

          <div className="grid gap-3">
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2 border-2 hover:border-teal-500 hover:bg-teal-50"
              onClick={handleTechnicianDelivery}
            >
              <Truck className="h-8 w-8 text-teal-600" />
              <div className="text-center">
                <p className="font-semibold">Atribuir Técnico e Enviar</p>
                <p className="text-xs text-muted-foreground">
                  O técnico faz a entrega ao cliente
                </p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2 border-2 hover:border-blue-500 hover:bg-blue-50"
              onClick={handleClientPickup}
              disabled={updateService.isPending}
            >
              <User className="h-8 w-8 text-blue-600" />
              <div className="text-center">
                <p className="font-semibold">Cliente Recolhe</p>
                <p className="text-xs text-muted-foreground">
                  O cliente vem buscar à oficina
                </p>
              </div>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
