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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle } from 'lucide-react';
import { useUpdateService } from '@/hooks/useServices';
import { useAuth } from '@/contexts/AuthContext';
import { logPricingSet } from '@/utils/activityLogUtils';
import { toast } from 'sonner';
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
  const [warrantyCoversAll, setWarrantyCoversAll] = useState(false);
  
  const updateService = useUpdateService();
  const { user, profile } = useAuth();

  const isWarrantyService = service?.is_warranty || false;

  useEffect(() => {
    if (service && open) {
      setLaborCost(service.labor_cost?.toString() || '');
      setPartsCost(service.parts_cost?.toString() || '');
      setDiscount(service.discount?.toString() || '0');
      // If warranty service, default to covered
      setWarrantyCoversAll(isWarrantyService);
    }
  }, [service, open, isWarrantyService]);

  const laborValue = parseFloat(laborCost) || 0;
  const partsValue = parseFloat(partsCost) || 0;
  const discountValue = parseFloat(discount) || 0;
  const subtotal = laborValue + partsValue;
  const finalPrice = warrantyCoversAll ? 0 : Math.max(0, subtotal - discountValue);

  const handleSubmit = async () => {
    if (!service) return;

    // Determinar novo status:
    // - Se já está finalizado (instalação entregue), permanece finalizado
    // - Se estava em a_precificar e location=cliente → finalizado
    // - Se estava em a_precificar e location=oficina → concluidos
    // - Qualquer outro caso: não muda status (mantém operacional)
    const isClientLocation = service.service_location === 'cliente' || service.service_location === 'entregue';
    const currentStatus = service.status as ServiceStatus;
    
    let newStatus: ServiceStatus | undefined;
    
    // Apenas transita status se estiver em a_precificar (status operacional de precificação)
    if (currentStatus === 'a_precificar') {
      if (warrantyCoversAll || !isClientLocation) {
        newStatus = 'concluidos'; // Oficina: aguarda entrega
      } else {
        newStatus = 'finalizado'; // Cliente: entrega já feita
      }
    }
    // Se está finalizado/concluidos, NÃO muda status (mantém operacional intacto)
    // O débito é tratado como estado financeiro calculado, não como status

    await updateService.mutateAsync({
      id: service.id,
      labor_cost: laborValue,
      parts_cost: partsValue,
      discount: discountValue,
      final_price: finalPrice,
      pending_pricing: false,
      ...(newStatus && { status: newStatus }),
    });

    // Log activity
    await logPricingSet(
      service.code || 'N/A',
      service.id,
      finalPrice,
      user?.id,
      profile?.full_name || undefined
    );

    toast.success(warrantyCoversAll 
      ? 'Serviço de garantia registado - sem cobrança ao cliente!' 
      : `Preço definido: €${finalPrice.toFixed(2)}`
    );

    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setLaborCost('');
    setPartsCost('');
    setDiscount('');
    setWarrantyCoversAll(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            Definir Preço - {service?.code}
            {isWarrantyService && (
              <Badge className="bg-purple-500 text-white">
                <Shield className="h-3 w-3 mr-1" />
                Garantia
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warranty Option */}
          {isWarrantyService && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="warrantyCoversAll"
                  checked={warrantyCoversAll}
                  onCheckedChange={(checked) => setWarrantyCoversAll(checked === true)}
                />
                <Label htmlFor="warrantyCoversAll" className="cursor-pointer font-medium text-purple-800">
                  A garantia cobre todo o serviço
                </Label>
              </div>
              <p className="text-xs text-purple-600">
                Se marcado, o cliente não será cobrado e o serviço avançará diretamente para conclusão.
              </p>
            </div>
          )}

          {/* Warning for warranty not covering */}
          {isWarrantyService && !warrantyCoversAll && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700">
                A garantia não cobre este serviço. O cliente será cobrado pelo valor definido abaixo.
              </p>
            </div>
          )}

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
              disabled={warrantyCoversAll}
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
              disabled={warrantyCoversAll}
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
              disabled={warrantyCoversAll}
            />
          </div>

          {/* Summary Box */}
          <div className={`p-4 rounded-lg space-y-2 ${warrantyCoversAll ? 'bg-green-50 border border-green-200' : 'bg-violet-50 border border-violet-100'}`}>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className={warrantyCoversAll ? 'line-through text-muted-foreground' : ''}>
                €{subtotal.toFixed(2)}
              </span>
            </div>
            <div className={`border-t ${warrantyCoversAll ? 'border-green-200' : 'border-violet-200'}`} />
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total a cobrar:</span>
              <span className={`font-bold text-lg ${warrantyCoversAll ? 'text-green-600' : 'text-violet-600'}`}>
                {warrantyCoversAll ? 'Sem cobrança' : `€${finalPrice.toFixed(2)}`}
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
            className={warrantyCoversAll ? 'bg-green-600 hover:bg-green-700' : 'bg-violet-600 hover:bg-violet-700'}
          >
            {updateService.isPending ? 'A confirmar...' : (warrantyCoversAll ? 'Confirmar Garantia' : 'Confirmar Preço')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
