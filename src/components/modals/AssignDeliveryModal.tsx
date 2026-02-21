import { useState } from 'react';
import { Truck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUpdateService } from '@/hooks/useServices';
import { useTechnicians } from '@/hooks/useTechnicians';
import { toast } from 'sonner';
import type { Service } from '@/types/database';

interface AssignDeliveryModalProps {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignDeliveryModal({ service, open, onOpenChange }: AssignDeliveryModalProps) {
  const [technicianId, setTechnicianId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');

  const { data: technicians = [] } = useTechnicians();
  const updateService = useUpdateService();

  const handleSubmit = async () => {
    if (!service || !technicianId || !deliveryDate) {
      toast.error('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    try {
      const deliveryDateTime = deliveryTime 
        ? `${deliveryDate}T${deliveryTime}:00`
        : `${deliveryDate}T09:00:00`;

      await updateService.mutateAsync({
        id: service.id,
        delivery_method: 'technician_delivery',
        delivery_technician_id: technicianId,
        delivery_date: deliveryDateTime,
      });

      toast.success('Entrega agendada com sucesso!');
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error assigning delivery:', error);
      toast.error('Erro ao agendar entrega');
    }
  };

  const resetForm = () => {
    setTechnicianId('');
    setDeliveryDate('');
    setDeliveryTime('');
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg w-[95vw] max-h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-teal-600" />
            Atribuir Técnico para Entrega
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 px-6">
         <div className="space-y-4 py-4">
          {service && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium">{service.code}</p>
              <p className="text-muted-foreground">{service.customer?.name}</p>
              {service.customer?.address && (
                <p className="text-muted-foreground text-xs mt-1">
                  📍 {service.customer.address}, {service.customer.city}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="technician">Técnico *</Label>
            <Select value={technicianId} onValueChange={setTechnicianId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar técnico" />
              </SelectTrigger>
              <SelectContent>
                {technicians.map((tech) => (
                  <SelectItem key={tech.id} value={tech.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tech.color || '#3B82F6' }}
                      />
                      {tech.profile?.full_name || 'Técnico'}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deliveryDate">Data *</Label>
              <Input
                id="deliveryDate"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliveryTime">Hora</Label>
              <Input
                id="deliveryTime"
                type="time"
                value={deliveryTime}
                onChange={(e) => setDeliveryTime(e.target.value)}
              />
            </div>
          </div>
         </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={updateService.isPending || !technicianId || !deliveryDate}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {updateService.isPending ? 'A agendar...' : 'Confirmar Agendamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
