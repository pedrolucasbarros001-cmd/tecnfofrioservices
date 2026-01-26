import { useState, useEffect } from 'react';
import { DollarSign } from 'lucide-react';
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
import { useUpdateService } from '@/hooks/useServices';
import type { Service, ServiceStatus } from '@/types/database';

interface SetPriceModalProps {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SetPriceModal({ service, open, onOpenChange }: SetPriceModalProps) {
  const [laborCost, setLaborCost] = useState('');
  const [partsCost, setPartsCost] = useState('');
  const [discount, setDiscount] = useState('');
  
  const updateService = useUpdateService();

  useEffect(() => {
    if (service && open) {
      setLaborCost(service.labor_cost?.toString() || '0');
      setPartsCost(service.parts_cost?.toString() || '0');
      setDiscount(service.discount?.toString() || '0');
    }
  }, [service, open]);

  const laborValue = parseFloat(laborCost) || 0;
  const partsValue = parseFloat(partsCost) || 0;
  const discountValue = parseFloat(discount) || 0;
  const finalPrice = Math.max(0, laborValue + partsValue - discountValue);

  const handleSubmit = async () => {
    if (!service) return;

    // Determinar status baseado na localização e débito
    const isClientLocation = service.service_location === 'cliente';
    const hasDebt = finalPrice > (service.amount_paid || 0);

    let newStatus: ServiceStatus;
    if (hasDebt) {
      newStatus = 'em_debito';
    } else if (isClientLocation) {
      newStatus = 'finalizado'; // Cliente: sem entrega necessária
    } else {
      newStatus = 'concluidos'; // Oficina: aguarda entrega
    }

    await updateService.mutateAsync({
      id: service.id,
      labor_cost: laborValue,
      parts_cost: partsValue,
      discount: discountValue,
      final_price: finalPrice,
      pending_pricing: false,
      status: newStatus,
    });

    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setLaborCost('');
    setPartsCost('');
    setDiscount('');
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-600" />
            Precificar Serviço
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {service && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium">{service.code}</p>
              <p className="text-muted-foreground">
                {service.customer?.name} - {service.appliance_type} {service.brand}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="laborCost">Custo de Mão de Obra (€)</Label>
            <Input
              id="laborCost"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={laborCost}
              onChange={(e) => setLaborCost(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="partsCost">Custo de Peças (€)</Label>
            <Input
              id="partsCost"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={partsCost}
              onChange={(e) => setPartsCost(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="discount">Desconto (€)</Label>
            <Input
              id="discount"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Preço Final:</span>
              <span className="text-emerald-600">€{finalPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={updateService.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {updateService.isPending ? 'A guardar...' : 'Guardar Preço'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
