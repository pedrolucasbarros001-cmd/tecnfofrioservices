import { useState, useEffect } from 'react';
import { Package, DollarSign, Info } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
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
import { supabase } from '@/integrations/supabase/client';
import { useUpdateService } from '@/hooks/useServices';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { humanizeError } from '@/utils/errorMessages';
import { parseCurrencyInput } from '@/utils/currencyUtils';
import { addBusinessDays } from '@/utils/dateUtils';
import type { Service, ServicePart } from '@/types/database';

interface ConfirmPartOrderModalProps {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BUSINESS_DAYS_ESTIMATE = 5;

export function ConfirmPartOrderModal({ service, open, onOpenChange }: ConfirmPartOrderModalProps) {
  const [supplier, setSupplier] = useState('');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateService = useUpdateService();
  const queryClient = useQueryClient();

  // Fetch pending parts for this service
  const { data: pendingParts = [] } = useQuery({
    queryKey: ['pending-parts', service?.id],
    queryFn: async () => {
      if (!service?.id) return [];
      const { data, error } = await supabase
        .from('service_parts')
        .select('*')
        .eq('service_id', service.id)
        .eq('is_requested', true)
        .eq('arrived', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ServicePart[];
    },
    enabled: !!service?.id && open,
  });

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setSupplier('');
      setCost('');
      setNotes('');
    }
  }, [open]);

  // Calculate estimated arrival date (5 business days from today)
  const estimatedArrivalDate = addBusinessDays(new Date(), BUSINESS_DAYS_ESTIMATE);
  const estimatedArrivalFormatted = format(estimatedArrivalDate, 'dd/MM/yyyy', { locale: pt });

  const handleSubmit = async () => {
    if (!service) return;

    const estimatedArrival = format(estimatedArrivalDate, 'yyyy-MM-dd');

    setIsSubmitting(true);
    try {
      // Update all pending parts with the estimated arrival and cost
      if (pendingParts.length > 0) {
        const updatePromises = pendingParts.map(part =>
          supabase
            .from('service_parts')
            .update({
              estimated_arrival: estimatedArrival,
              cost: cost ? parseCurrencyInput(cost) : null,
              notes: supplier ? `${part.notes || ''}\nFornecedor: ${supplier}`.trim() : part.notes,
            })
            .eq('id', part.id)
        );
        await Promise.all(updatePromises);
      }

      // Update service status to em_espera_de_peca
      await updateService.mutateAsync({
        id: service.id,
        status: 'em_espera_de_peca',
        skipToast: true,
      });

      queryClient.invalidateQueries({ queryKey: ['service-parts'] });
      queryClient.invalidateQueries({ queryKey: ['pending-parts'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });

      toast.success(`Pedido registado! Peça prevista para ${estimatedArrivalFormatted}.`);
      onOpenChange(false);
    } catch (error) {
      console.error('Error confirming part order:', error);
      toast.error(humanizeError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Registar Pedido de Peça
          </DialogTitle>
          <p className="text-sm text-muted-foreground">Confirme os detalhes do pedido. A previsão de chegada serve como termómetro de urgência.</p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Service Info */}
          {service && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium">{service.code}</p>
              <p className="text-muted-foreground">
                {service.appliance_type} {service.brand} {service.model}
              </p>
            </div>
          )}

          {/* Pending Parts */}
          {pendingParts.length > 0 && (
            <div className="space-y-2">
              <Label>Peças Solicitadas</Label>
              <div className="space-y-1">
                {pendingParts.map((part) => (
                  <div key={part.id} className="p-2 bg-muted/50 rounded text-sm flex justify-between items-center">
                    <span>{part.part_name}</span>
                    <span className="text-muted-foreground">x{part.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Estimated Arrival Info */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-blue-800">
                  Previsão de Chegada: {estimatedArrivalFormatted}
                </p>
                <p className="text-sm text-blue-600 mt-1">
                  {BUSINESS_DAYS_ESTIMATE} dias úteis a partir de hoje. Esta previsão serve como termómetro para o indicador de urgência.
                </p>
              </div>
            </div>
          </div>

          {/* Supplier (optional) */}
          <div className="space-y-2">
            <Label htmlFor="supplier">Fornecedor</Label>
            <Input
              id="supplier"
              placeholder="Nome do fornecedor"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
            />
          </div>

          {/* Cost (optional) */}
          <div className="space-y-2">
            <Label htmlFor="cost">Custo da Peça (€)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="cost"
                type="text"
                inputMode="decimal"
                placeholder="Ex: 150,00"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Notes (optional) */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              placeholder="Observações sobre o pedido..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'A registar...' : 'Confirmar Pedido'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
