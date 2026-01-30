import { useState, useEffect } from 'react';
import { Package, Calendar, DollarSign } from 'lucide-react';
import { addDays, format } from 'date-fns';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { useUpdateService } from '@/hooks/useServices';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Service, ServicePart } from '@/types/database';

interface ConfirmPartOrderModalProps {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ARRIVAL_PRESETS = [
  { label: '3 dias', days: 3 },
  { label: '1 semana', days: 7 },
  { label: '2 semanas', days: 14 },
  { label: 'Data específica', days: -1 },
];

export function ConfirmPartOrderModal({ service, open, onOpenChange }: ConfirmPartOrderModalProps) {
  const [arrivalPreset, setArrivalPreset] = useState<string>('7');
  const [specificDate, setSpecificDate] = useState<Date | undefined>();
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
      setArrivalPreset('7');
      setSpecificDate(undefined);
      setSupplier('');
      setCost('');
      setNotes('');
    }
  }, [open]);

  const getEstimatedArrivalDate = (): string => {
    const days = parseInt(arrivalPreset);
    if (days === -1 && specificDate) {
      return format(specificDate, 'yyyy-MM-dd');
    }
    if (days > 0) {
      return format(addDays(new Date(), days), 'yyyy-MM-dd');
    }
    return '';
  };

  const handleSubmit = async () => {
    if (!service) return;

    const estimatedArrival = getEstimatedArrivalDate();
    if (!estimatedArrival) {
      toast.error('Por favor, defina a previsão de chegada da peça.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Update all pending parts with the estimated arrival and cost
      if (pendingParts.length > 0) {
        const updatePromises = pendingParts.map(part =>
          supabase
            .from('service_parts')
            .update({
              estimated_arrival: estimatedArrival,
              cost: cost ? parseFloat(cost) : null,
              notes: notes ? `${part.notes || ''}\nFornecedor: ${supplier}`.trim() : part.notes,
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

      toast.success(`Pedido registado! Peça prevista para ${format(new Date(estimatedArrival), 'dd/MM/yyyy', { locale: pt })}.`);
      onOpenChange(false);
    } catch (error) {
      console.error('Error confirming part order:', error);
      toast.error('Erro ao registar pedido de peça');
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

          {/* Estimated Arrival */}
          <div className="space-y-2">
            <Label htmlFor="arrivalPreset">Previsão de Chegada *</Label>
            <Select value={arrivalPreset} onValueChange={setArrivalPreset}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o prazo" />
              </SelectTrigger>
              <SelectContent>
                {ARRIVAL_PRESETS.map((preset) => (
                  <SelectItem key={preset.days} value={preset.days.toString()}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Specific Date Picker - only show when "Data específica" is selected */}
          {arrivalPreset === '-1' && (
            <div className="space-y-2">
              <Label>Data Específica *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !specificDate && 'text-muted-foreground'
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {specificDate
                      ? format(specificDate, 'PPP', { locale: pt })
                      : 'Selecione a data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={specificDate}
                    onSelect={setSpecificDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

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
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
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
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || (arrivalPreset === '-1' && !specificDate)}
          >
            {isSubmitting ? 'A registar...' : 'Confirmar Pedido'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
