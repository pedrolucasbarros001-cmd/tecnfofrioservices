import { useState, useEffect } from 'react';
import { Package, DollarSign, Info, Plus, Trash2 } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useUpdateService } from '@/hooks/useServices';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { invalidateServiceQueries } from '@/lib/queryInvalidation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { humanizeError } from '@/utils/errorMessages';
import { parseCurrencyInput } from '@/utils/currencyUtils';
import { addBusinessDays } from '@/utils/dateUtils';
import { useAuth } from '@/contexts/AuthContext';
import { logPartOrdered } from '@/utils/activityLogUtils';
import type { Service, ServicePart } from '@/types/database';

interface ConfirmPartOrderModalProps {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface NewPartEntry {
  name: string;
  code: string;
  quantity: string;
}

const emptyNewPart = (): NewPartEntry => ({ name: '', code: '', quantity: '1' });

const BUSINESS_DAYS_ESTIMATE = 5;

export function ConfirmPartOrderModal({ service, open, onOpenChange }: ConfirmPartOrderModalProps) {
  const { user } = useAuth();
  const [supplier, setSupplier] = useState('');
  const [cost, setCost] = useState('');
  const [ivaRate, setIvaRate] = useState('0');
  const [partReference, setPartReference] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletedRequestedPartIds, setDeletedRequestedPartIds] = useState<string[]>([]);
  const [newParts, setNewParts] = useState<NewPartEntry[]>([]);

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
      setIvaRate('0');
      setPartReference('');
      setNotes('');
      setNewParts([]);
      setDeletedRequestedPartIds([]);
    }
  }, [open]);

  const estimatedArrivalDate = addBusinessDays(new Date(), BUSINESS_DAYS_ESTIMATE);
  const estimatedArrivalFormatted = format(estimatedArrivalDate, 'dd/MM/yyyy', { locale: pt });

  const baseCost = cost ? parseCurrencyInput(cost) : 0;
  const ivaAmount = baseCost * (parseFloat(ivaRate) / 100);
  const totalCost = baseCost + ivaAmount;

  const addNewPart = () => setNewParts(prev => [...prev, emptyNewPart()]);
  const removeNewPart = (index: number) => setNewParts(prev => prev.filter((_, i) => i !== index));
  const updateNewPart = (index: number, field: keyof NewPartEntry, value: string) => {
    setNewParts(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const removeRequestedPart = (id: string) => {
    setDeletedRequestedPartIds(prev => [...prev, id]);
  };

  const handleSubmit = async () => {
    if (!service) return;

    if (service.status !== 'para_pedir_peca') {
      toast.error(
        `Não é possível registar o pedido: ${service.code} não está no estado correcto. Recarrega a página e tenta de novo.`
      );
      onOpenChange(false);
      return;
    }

    const estimatedArrival = format(estimatedArrivalDate, 'yyyy-MM-dd');

    setIsSubmitting(true);
    try {
      // 1. Handle deleted requested parts (unmark them as requested)
      if (deletedRequestedPartIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('service_parts')
          .update({
            is_requested: false,
            estimated_arrival: null,
          })
          .in('id', deletedRequestedPartIds);

        if (deleteError) throw deleteError;
      }

      // 2. Update remaining pending parts
      const remainingPendingParts = pendingParts.filter(p => !deletedRequestedPartIds.includes(p.id));
      if (remainingPendingParts.length > 0) {
        const updatePromises = remainingPendingParts.map(part =>
          supabase
            .from('service_parts')
            .update({
              estimated_arrival: estimatedArrival,
              cost: part.cost ? parseCurrencyInput(part.cost.toString()) : null,
              iva_rate: 0,
              part_code: part.part_code,
              part_name: part.part_name,
              quantity: part.quantity,
              notes: notes ? `${part.notes || ''}\nNotas Admin: ${notes}`.trim() : part.notes,
            })
            .eq('id', part.id)
        );
        await Promise.all(updatePromises);
      }

      // 3. Insert new parts added by admin
      const validNewParts = newParts.filter(p => p.name.trim());
      if (validNewParts.length > 0) {
        const { error: insertError } = await supabase
          .from('service_parts')
          .insert(
            validNewParts.map(p => ({
              service_id: service.id,
              part_name: p.name.trim(),
              part_code: p.code.trim() || null,
              quantity: parseInt(p.quantity) || 1,
              is_requested: true,
              arrived: false,
              estimated_arrival: estimatedArrival,
              cost: (p as any).value ? parseCurrencyInput((p as any).value.toString()) : null,
              iva_rate: 0,
            }))
          );
        if (insertError) throw insertError;
      }

      // 4. Update service status to em_espera_de_peca if there are any parts left/added
      const totalPartsToOrder = remainingPendingParts.length + validNewParts.length;
      if (totalPartsToOrder > 0) {
        await updateService.mutateAsync({
          id: service.id,
          status: 'em_espera_de_peca',
          skipToast: true,
        });

        const partNames = [...remainingPendingParts.map(p => p.part_name), ...validNewParts.map(p => p.name)].join(', ');
        await logPartOrdered(
          service.code || 'N/A',
          service.id,
          partNames,
          estimatedArrivalFormatted,
          user?.id
        );

        toast.success(`Pedido registado! Artigo previsto para ${estimatedArrivalFormatted}.`);
      } else {
        // If all parts were deleted and no new ones added, maybe revert to technician state?
        // For now, just toast and close.
        toast.info('Nenhum artigo registado.');
      }

      invalidateServiceQueries(queryClient, service.id);

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
      <DialogContent className="sm:max-w-lg max-w-[95vw] max-h-[95vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Registar Pedido de Artigo
          </DialogTitle>
          <p className="text-sm text-muted-foreground">Confirme os detalhes do pedido. A previsão de chegada serve como termómetro de urgência.</p>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6">
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

            {/* Pending Articles */}
            {pendingParts.filter(p => !deletedRequestedPartIds.includes(p.id)).length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Artigos Solicitados</Label>
                <div className="space-y-3">
                  {pendingParts.filter(p => !deletedRequestedPartIds.includes(p.id)).map((part) => (
                    <div key={part.id} className="p-3 bg-muted/30 border rounded-lg relative group/item">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 absolute -right-2 -top-2 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover/item:opacity-100 transition-opacity z-10"
                        onClick={() => removeRequestedPart(part.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                      <div className="grid grid-cols-12 gap-2">
                        <div className="col-span-2 space-y-1">
                          <Label className="text-[10px] uppercase text-muted-foreground">Ref.</Label>
                          <Input
                            placeholder="Ref"
                            defaultValue={part.part_code || ''}
                            onChange={(e) => {
                              part.part_code = e.target.value;
                            }}
                            className="h-8 text-sm px-2"
                          />
                        </div>
                        <div className="col-span-4 space-y-1">
                          <Label className="text-[10px] uppercase text-muted-foreground">Descrição *</Label>
                          <Input
                            placeholder="Artigo"
                            defaultValue={part.part_name}
                            onChange={(e) => {
                              part.part_name = e.target.value;
                            }}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label className="text-[10px] uppercase text-muted-foreground text-center block">Qtd</Label>
                          <Input
                            type="number"
                            min="1"
                            defaultValue={part.quantity || 1}
                            onChange={(e) => {
                              part.quantity = parseInt(e.target.value) || 1;
                            }}
                            className="h-8 text-sm text-center px-1"
                          />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label className="text-[10px] uppercase text-muted-foreground text-right block">Valor Unit.</Label>
                          <Input
                            type="text"
                            placeholder="0,00"
                            defaultValue={part.cost || ''}
                            onChange={(e) => {
                              (part as any).cost = e.target.value;
                            }}
                            className="h-8 text-sm text-right px-2"
                          />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label className="text-[10px] uppercase text-muted-foreground text-right block">Total</Label>
                          <div className="h-8 flex items-center justify-end px-2 bg-muted/50 rounded text-xs font-medium">
                            {((parseInt(part.quantity?.toString()) || 0) * (parseFloat(part.cost?.toString().replace(',', '.')) || 0)).toFixed(2)} €
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Articles */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Artigos Adicionais</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs border-dashed"
                  onClick={addNewPart}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Adicionar Artigo
                </Button>
              </div>

              {newParts.length === 0 && pendingParts.length === 0 && (
                <p className="text-xs text-center py-4 text-muted-foreground border-2 border-dashed rounded-lg">
                  Nenhum artigo registado.
                </p>
              )}

              {newParts.map((part, index) => (
                <div key={index} className="p-3 border rounded-lg bg-muted/20 relative group">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 absolute -right-2 -top-2 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeNewPart(index)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground">Ref.</Label>
                      <Input
                        placeholder="Ref"
                        value={part.code}
                        onChange={(e) => updateNewPart(index, 'code', e.target.value)}
                        className="h-8 text-sm px-2"
                      />
                    </div>
                    <div className="col-span-4 space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground">Descrição *</Label>
                      <Input
                        placeholder="Artigo"
                        value={part.name}
                        onChange={(e) => updateNewPart(index, 'name', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground text-center block">Qtd</Label>
                      <Input
                        type="number"
                        min="1"
                        value={part.quantity}
                        onChange={(e) => updateNewPart(index, 'quantity', e.target.value)}
                        className="h-8 text-sm text-center px-1"
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground text-right block">Valor Unit.</Label>
                      <Input
                        type="text"
                        placeholder="0,00"
                        value={(part as any).value || ''}
                        onChange={(e) => {
                          const newList = [...newParts];
                          (newList[index] as any).value = e.target.value;
                          setNewParts(newList);
                        }}
                        className="h-8 text-sm text-right px-2"
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground text-right block">Total</Label>
                      <div className="h-8 flex items-center justify-end px-2 bg-muted/50 rounded text-xs font-medium">
                        {((parseInt(part.quantity?.toString()) || 0) * (parseFloat((part as any).value?.toString().replace(',', '.')) || 0)).toFixed(2)} €
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

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
        </div>

        <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
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
