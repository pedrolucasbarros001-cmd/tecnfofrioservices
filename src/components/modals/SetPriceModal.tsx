import { useState, useEffect } from 'react';
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
      setLaborCost(service.labor_cost?.toString() || '');
      setPartsCost(service.parts_cost?.toString() || '');
      setDiscount(service.discount?.toString() || '0');
    }
  }, [service, open]);

  const laborValue = parseFloat(laborCost) || 0;
  const partsValue = parseFloat(partsCost) || 0;
  const discountValue = parseFloat(discount) || 0;
  const subtotal = laborValue + partsValue;
  const finalPrice = Math.max(0, subtotal - discountValue);

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
          <DialogTitle className="text-xl font-semibold">
            Definir Preço - {service?.code}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="laborCost">Mão de Obra (€) *</Label>
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
            <Label htmlFor="partsCost">Peças (€) *</Label>
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
              placeholder="0"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
          </div>

          {/* Summary Box */}
          <div className="p-4 bg-violet-50 border border-violet-100 rounded-lg space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>€{subtotal.toFixed(2)}</span>
            </div>
            <div className="border-t border-violet-200" />
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total:</span>
              <span className="text-violet-600 font-bold text-lg">
                €{finalPrice.toFixed(2)}
              </span>
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
            className="bg-violet-600 hover:bg-violet-700"
          >
            {updateService.isPending ? 'A confirmar...' : 'Confirmar Preço'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
