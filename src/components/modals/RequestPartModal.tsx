import { useState } from 'react';
import { Package, Plus, Trash2 } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useUpdateService } from '@/hooks/useServices';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateServiceQueries } from '@/lib/queryInvalidation';
import { useAuth } from '@/contexts/AuthContext';
import { notifyPartRequested } from '@/utils/notificationUtils';
import { logPartRequest } from '@/utils/activityLogUtils';
import { toast } from 'sonner';
import { humanizeError } from '@/utils/errorMessages';
import type { Service } from '@/types/database';

interface PartEntry {
  partName: string;
  partCode: string;
  quantity: string;
  value: string;
  estimatedArrival: string;
  notes: string;
}

const emptyPart = (): PartEntry => ({
  partName: '',
  partCode: '',
  quantity: '1',
  value: '',
  estimatedArrival: '',
  notes: '',
});

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
  const [parts, setParts] = useState<PartEntry[]>([emptyPart()]);
  const [clientApproved, setClientApproved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { profile } = useAuth();
  const updateService = useUpdateService();
  const queryClient = useQueryClient();

  const updatePart = (index: number, field: keyof PartEntry, value: string) => {
    setParts(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const addPart = () => {
    setParts(prev => [...prev, emptyPart()]);
  };

  const removePart = (index: number) => {
    if (parts.length <= 1) return;
    setParts(prev => prev.filter((_, i) => i !== index));
  };

  const hasValidParts = parts.some(p => p.partName.trim());

  const handleSubmit = async () => {
    if (!service || !hasValidParts) return;

    const ALLOWED_FOR_PART_REQUEST = ['em_execucao', 'na_oficina'];
    if (!ALLOWED_FOR_PART_REQUEST.includes(service.status)) {
      toast.error(`Não é possível solicitar peças: o serviço está em estado incompatível ("${service.status}"). Recarrega a página.`);
      return;
    }

    const validParts = parts.filter(p => p.partName.trim());

    if (requireSignature && !clientApproved) {
      toast.error('É necessária a aprovação do cliente para pedir artigo fora da oficina.');
      return;
    }

    const currentStatus = service.status;
    setIsSubmitting(true);
    try {
      // 1. Update the service status first
      await updateService.mutateAsync({
        id: service.id,
        status: 'para_pedir_peca',
        last_status_before_part_request: currentStatus,
        skipToast: true,
      });

      const inserts = validParts.map(p => ({
        service_id: service.id,
        part_name: p.partName.trim(),
        part_code: p.partCode.trim() || null,
        quantity: parseInt(p.quantity) || 1,
        cost: p.value ? parseFloat(p.value.replace(',', '.')) : null,
        estimated_arrival: p.estimatedArrival || null,
        is_requested: true,
        arrived: false,
        notes: p.notes.trim() || null,
      }));

      // 2. Insert the parts; if this fails, revert the status
      const { error: partError } = await supabase
        .from('service_parts')
        .insert(inserts);

      if (partError) {
        // Revert status back to original
        try {
          await updateService.mutateAsync({
            id: service.id,
            status: currentStatus,
            last_status_before_part_request: null,
            skipToast: true,
          });
        } catch (revertError) {
          console.error('Failed to revert service status after insert error:', revertError);
        }
        throw partError;
      }

      const technicianName = profile?.full_name || 'Técnico';
      const partNames = validParts.map(p => p.partName.trim()).join(', ');
      await notifyPartRequested(
        service.id,
        service.code || 'N/A',
        technicianName,
        partNames
      );

      await logPartRequest(
        service.code || 'N/A',
        service.id,
        partNames,
        technicianName,
        profile?.user_id
      );

      invalidateServiceQueries(queryClient, service.id);

      const count = validParts.length;
      if (count === 1) {
        toast.success(`Artigo "${validParts[0].partName.trim()}" solicitado! ${service.code} aguarda aprovação.`);
      } else {
        toast.success(`${count} artigos solicitados! ${service.code} aguarda aprovação.`);
      }

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
    setParts([emptyPart()]);
    setClientApproved(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  const validCount = parts.filter(p => p.partName.trim()).length;
  const confirmLabel = isSubmitting
    ? 'A solicitar...'
    : validCount > 1
      ? `Confirmar Pedido (${validCount})`
      : 'Confirmar Pedido';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-w-[95vw] max-h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-yellow-600" />
            <span>{parts.length > 1 ? 'Solicitar Artigos' : 'Solicitar Artigo'}</span>
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Ao confirmar, o pedido ficará disponível para o Dono registar oficialmente a encomenda.
          </p>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6">
          <div className="space-y-4 py-4">
            {service && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium">{service.code}</p>
                <p className="text-muted-foreground">
                  {[service.appliance_type, service.brand, service.model].filter(Boolean).join(' ')}
                </p>
              </div>
            )}

            {parts.map((part, index) => (
              <div key={index} className="space-y-3">
                {index > 0 ? <Separator /> : null}

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Artigo {index + 1}
                  </span>
                  {parts.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => removePart(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-3 space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground">Ref.</Label>
                    <Input
                      placeholder="Ref"
                      value={part.partCode}
                      onChange={(e) => updatePart(index, 'partCode', e.target.value)}
                      className="h-8 text-sm px-2"
                    />
                  </div>
                  <div className="col-span-5 space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground">Descrição *</Label>
                    <Input
                      placeholder="Artigo"
                      value={part.partName}
                      onChange={(e) => updatePart(index, 'partName', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground text-center block">Qtd</Label>
                    <Input
                      type="number"
                      min="1"
                      value={part.quantity}
                      onChange={(e) => updatePart(index, 'quantity', e.target.value)}
                      className="h-8 text-sm text-center px-1"
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground text-right block">Valor €</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={part.value}
                      onChange={(e) => updatePart(index, 'value', e.target.value)}
                      className="h-8 text-sm text-right px-2"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Data Estimada de Chegada</Label>
                  <Input
                    type="date"
                    value={part.estimatedArrival}
                    onChange={(e) => updatePart(index, 'estimatedArrival', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Notas (opcional)</Label>
                  <Textarea
                    placeholder="Observações sobre a peça..."
                    value={part.notes}
                    onChange={(e) => updatePart(index, 'notes', e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full border-dashed"
              onClick={addPart}
            >
              <Plus className="h-4 w-4 mr-2" />
              <span>Adicionar outro artigo</span>
            </Button>

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
          <Button type="button" variant="outline" onClick={handleClose}>
            <span>Cancelar</span>
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !hasValidParts || (requireSignature && !clientApproved)}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            <span>{confirmLabel}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
