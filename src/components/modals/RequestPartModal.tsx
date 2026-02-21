import { useState } from 'react';
import { Package } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useUpdateService } from '@/hooks/useServices';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { notifyPartRequested } from '@/utils/notificationUtils';
import { toast } from 'sonner';
import { humanizeError } from '@/utils/errorMessages';
import type { Service } from '@/types/database';

interface RequestPartModalProps {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requireSignature?: boolean;
}

export function RequestPartModal({ 
  service, 
  open, 
  onOpenChange,
  requireSignature = false,
}: RequestPartModalProps) {
  const [partName, setPartName] = useState('');
  const [partCode, setPartCode] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [estimatedArrival, setEstimatedArrival] = useState('');
  const [notes, setNotes] = useState('');
  const [clientApproved, setClientApproved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { profile } = useAuth();
  const updateService = useUpdateService();
  const queryClient = useQueryClient();

  const handleSubmit = async () => {
    if (!service || !partName.trim()) return;

    // If outside workshop and signature required, must have approval
    if (requireSignature && !clientApproved) {
      toast.error('É necessária a aprovação do cliente para pedir peça fora da oficina.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Insert part request
      const { error: partError } = await supabase
        .from('service_parts')
        .insert({
          service_id: service.id,
          part_name: partName.trim(),
          part_code: partCode.trim() || null,
          quantity: parseInt(quantity) || 1,
          estimated_arrival: estimatedArrival || null,
          is_requested: true,
          arrived: false,
          notes: notes.trim() || null,
        });

      if (partError) throw partError;

      // Save current status before changing to para_pedir_peca
      const currentStatus = service.status;

      // Update service status to para_pedir_peca
      await updateService.mutateAsync({
        id: service.id,
        status: 'para_pedir_peca',
        last_status_before_part_request: currentStatus,
        skipToast: true, // Contextual message below
      });

      // Notify owners and secretaries about the part request
      const technicianName = profile?.full_name || 'Técnico';
      await notifyPartRequested(
        service.id,
        service.code || 'N/A',
        technicianName,
        partName.trim()
      );

      queryClient.invalidateQueries({ queryKey: ['service-parts'] });
      
      // Contextual feedback message
      toast.success(`Peça "${partName.trim()}" solicitada! ${service.code} aguarda aprovação.`);
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error requesting part:', error);
      toast.error(humanizeError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setPartName('');
    setPartCode('');
    setQuantity('1');
    setEstimatedArrival('');
    setNotes('');
    setClientApproved(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-w-[95vw] max-h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-yellow-600" />
            Solicitar Peça
          </DialogTitle>
          <p className="text-sm text-muted-foreground">Ao confirmar, o pedido ficará disponível para o Dono registar oficialmente a encomenda.</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 px-6">
         <div className="space-y-4 py-4">
          {service && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium">{service.code}</p>
              <p className="text-muted-foreground">
                {service.appliance_type} {service.brand} {service.model}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="partName">Nome da Peça *</Label>
            <Input
              id="partName"
              placeholder="Ex: Compressor, Termostato..."
              value={partName}
              onChange={(e) => setPartName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="partCode">Código/Referência</Label>
              <Input
                id="partCode"
                placeholder="Código da peça"
                value={partCode}
                onChange={(e) => setPartCode(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantidade</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimatedArrival">Data Estimada de Chegada</Label>
            <Input
              id="estimatedArrival"
              type="date"
              value={estimatedArrival}
              onChange={(e) => setEstimatedArrival(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Observações sobre a peça..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {requireSignature && (
            <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <Checkbox
                id="clientApproved"
                checked={clientApproved}
                onCheckedChange={(checked) => setClientApproved(checked as boolean)}
              />
              <div className="space-y-1">
                <Label htmlFor="clientApproved" className="text-sm font-medium cursor-pointer">
                  Cliente aprovou o pedido de peça
                </Label>
                <p className="text-xs text-muted-foreground">
                  Para serviços fora da oficina, é necessária a aprovação do cliente antes de solicitar peças.
                </p>
              </div>
            </div>
          )}
         </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !partName.trim() || (requireSignature && !clientApproved)}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            {isSubmitting ? 'A solicitar...' : 'Confirmar Pedido'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
