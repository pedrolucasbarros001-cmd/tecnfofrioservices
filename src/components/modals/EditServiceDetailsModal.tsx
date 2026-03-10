import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Package, Plus, Trash2, Wrench, FileText, Check, X, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PriceLineItems, calculateTotals, DEFAULT_LINE_ITEM, LineItem } from '@/components/pricing/PriceLineItems';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useQuery } from '@tanstack/react-query';
import { logActivity } from '@/utils/activityLogUtils';
import { useAuth } from '@/contexts/AuthContext';

interface Part {
  id?: string;
  part_name: string;
  part_code: string;
  quantity: number;
  cost: number;
  is_requested: boolean;
  arrived?: boolean;
}

interface EditServiceDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: any; // We receive raw service data
  onSuccess: () => void;
}

// Reuse the exact same schema from SetPriceModal for consistency
const formSchema = z.object({
  items: z.array(z.object({
    reference: z.string().optional(),
    description: z.string(),
    quantity: z.number().min(0, 'Quantidade inválida'),
    unit_price: z.number().min(0, 'Preço inválido'),
    tax_rate: z.number(),
  })).min(1, 'Adicione pelo menos um artigo'),
});

type FormValues = z.infer<typeof formSchema>;

export function EditServiceDetailsModal({ open, onOpenChange, service, onSuccess }: EditServiceDetailsModalProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [applianceType, setApplianceType] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [pnc, setPnc] = useState('');
  const [faultDescription, setFaultDescription] = useState('');
  const [detectedFault, setDetectedFault] = useState('');
  const [workPerformed, setWorkPerformed] = useState('');
  const [notes, setNotes] = useState('');

  // Pricing Modifiers
  const [discountType, setDiscountType] = useState<'euro' | 'percent'>('euro');
  const [discountValue, setDiscountValue] = useState<string>('');
  const [adjustment, setAdjustment] = useState<string>('');
  const [hasInitialized, setHasInitialized] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      items: [{ ...DEFAULT_LINE_ITEM }],
    },
  });

  // Fetch ONLY to see if we need to migrate parts into pricing
  const { data: oldParts = [], isLoading: historyLoading } = useQuery({
    queryKey: ['service-parts-for-edit', service?.id],
    queryFn: async () => {
      if (!service?.id) return [];
      const { data, error } = await supabase
        .from('service_parts')
        .select('*')
        .eq('service_id', service.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!service?.id && open,
  });

  useEffect(() => {
    if (open) setHasInitialized(false);
  }, [open]);

  useEffect(() => {
    if (open && service) {
      setApplianceType(service.appliance_type || '');
      setBrand(service.brand || '');
      setModel(service.model || '');
      setSerialNumber(service.serial_number || '');
      setPnc(service.pnc || '');
      setFaultDescription(service.fault_description || '');
      setDetectedFault(service.detected_fault || '');
      setWorkPerformed(service.work_performed || '');
      setNotes(service.notes || '');
    }
  }, [open, service]);

  useEffect(() => {
    if (service && open && !historyLoading && !hasInitialized) {
      setHasInitialized(true);

      let existingItems: LineItem[] = [];
      let existingDiscount: { type: 'euro' | 'percent'; value: number } | null = null;
      let existingAdjustment = 0;

      if (service.pricing_description) {
        try {
          const parsed = JSON.parse(service.pricing_description);
          if (parsed.items && Array.isArray(parsed.items)) {
            existingItems = parsed.items.map((item: any) => ({
              reference: item.ref || '',
              description: item.desc || '',
              quantity: item.qty || 1,
              unit_price: item.price || 0,
              tax_rate: item.tax || 23,
            }));
          }
          if (parsed.discount) existingDiscount = parsed.discount;
          if (parsed.adjustment !== undefined) existingAdjustment = parsed.adjustment;
        } catch { }
      }

      // If no pricing_description yet, migrate from service_parts or base costs
      if (existingItems.length === 0) {
        if (oldParts.length > 0) {
          existingItems = oldParts.map((p: any) => ({
            reference: p.part_code || '',
            description: p.part_name || '',
            quantity: p.quantity || 1,
            unit_price: p.cost || 0,
            tax_rate: p.iva_rate || 23,
          }));
        } else {
          const existingPrice = (service.labor_cost || 0) + (service.parts_cost || 0);
          if (existingPrice > 0) {
            existingItems = [{
              reference: '',
              description: 'Serviço',
              quantity: 1,
              unit_price: existingPrice,
              tax_rate: 23,
            }];
          }
        }
      }

      if (existingItems.length > 0) {
        form.reset({ items: existingItems });
      } else {
        form.reset({ items: [{ ...DEFAULT_LINE_ITEM }] });
      }

      if (existingDiscount) {
        setDiscountType(existingDiscount.type);
        setDiscountValue(existingDiscount.value.toString());
      } else if (service.discount && service.discount > 0) {
        setDiscountType('euro');
        setDiscountValue(service.discount.toString());
      } else {
        setDiscountValue('');
        setDiscountType('euro');
      }

      setAdjustment(existingAdjustment ? existingAdjustment.toString() : '');
    }
  }, [service, open, historyLoading, hasInitialized, form, oldParts]);

  const watchItems = form.watch('items') || [];
  const validItems = watchItems.filter(item => item.description && item.description.trim() !== '');
  const { subtotal, totalTax, total: baseTotal } = calculateTotals(validItems as LineItem[]);

  // Discount calc
  const calculateDiscount = (base: number, dValue: string, dType: string) => {
    const val = parseFloat(dValue.replace(',', '.')) || 0;
    if (val <= 0) return 0;
    if (dType === 'percent') return base * (val / 100);
    return val;
  };

  const discountAmount = calculateDiscount(subtotal, discountValue, discountType);
  const adjustmentAmount = parseFloat(adjustment.replace(',', '.')) || 0;
  const finalPrice = Math.max(0, baseTotal - discountAmount + adjustmentAmount);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Create Pricing Data matching the format in SetPriceModal
      const pricingData = {
        items: validItems.map(item => ({
          ref: item.reference,
          desc: item.description,
          qty: item.quantity,
          price: item.unit_price,
          tax: item.tax_rate,
        })),
        discount: discountValue ? { type: discountType, value: parseFloat(discountValue.replace(',', '.')) || 0 } : undefined,
        adjustment: adjustmentAmount !== 0 ? adjustmentAmount : undefined,
      };

      const finalValForDB = finalPrice;
      const amountPaid = service.amount_paid || 0;

      const { error: serviceError } = await supabase
        .from('services')
        .update({
          appliance_type: applianceType || null,
          brand: brand || null,
          model: model || null,
          serial_number: serialNumber || null,
          pnc: pnc || null,
          fault_description: faultDescription || null,
          detected_fault: detectedFault || null,
          work_performed: workPerformed || null,
          notes: notes || null,

          // Pricing Updates
          pricing_description: JSON.stringify(pricingData),
          parts_cost: subtotal,
          labor_cost: 0,
          discount: discountAmount,
          final_price: finalValForDB,
          status: amountPaid < finalValForDB && (service.status === 'finalizado' || service.status === 'em_debito') ? 'em_debito' : service.status
        })
        .eq('id', service.id);

      if (serviceError) throw serviceError;

      // Sync service_parts: Delete non-requested parts and insert current items
      await supabase
        .from('service_parts')
        .delete()
        .eq('service_id', service.id)
        .eq('is_requested', false);

      if (validItems.length > 0) {
        const partsToInsert = validItems.map(item => ({
          service_id: service.id,
          part_name: item.description,
          part_code: item.reference || '',
          quantity: item.quantity,
          cost: item.unit_price,
          iva_rate: item.tax_rate,
          is_requested: false,
          arrived: true,
          registered_by: user?.id,
          registered_location: 'oficina' // Edits via this modal are administrative
        }));

        const { error: partsError } = await supabase
          .from('service_parts')
          .insert(partsToInsert);

        if (partsError) {
          console.error('Error syncing service parts:', partsError);
          // We don't throw here to avoid blocking the main service save, 
          // but we log it.
        }
      }

      await logActivity({
        serviceId: service.id,
        actorId: user?.id,
        actionType: 'servico_editado',
        description: `Serviço ${service.code} editado (Detalhes, diagnóstico ou artigos atualizados)`,
        isPublic: true,
      });

      toast.success('Serviço atualizado com sucesso');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating service:', error);
      toast.error('Erro ao atualizar serviço');
    } finally {
      setIsLoading(false);
    }
  };

  if (!service) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-w-[95vw] max-h-[90vh] flex flex-col overflow-hidden p-0 bg-gray-50">
        <div className="px-6 pt-6 pb-4 flex-shrink-0 bg-white border-b">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-indigo-600" />
              Editar Serviço {service.code}
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
          {/* Section: Equipamento */}
          <div className="bg-white p-5 rounded-xl border border-border/50 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Equipamento</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Tipo de Aparelho</Label>
                <Input value={applianceType} onChange={e => setApplianceType(e.target.value)} placeholder="Ex: Frigorífico" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Marca</Label>
                <Input value={brand} onChange={e => setBrand(e.target.value)} placeholder="Ex: Samsung" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Modelo</Label>
                <Input value={model} onChange={e => setModel(e.target.value)} placeholder="Ex: RB34" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nº Série</Label>
                <Input value={serialNumber} onChange={e => setSerialNumber(e.target.value)} placeholder="Número de série" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">PNC</Label>
                <Input value={pnc} onChange={e => setPnc(e.target.value)} placeholder="Product Number Code" />
              </div>
            </div>
          </div>

          {/* Section: Artigos (Substitui Peças antigas) */}
          <div className="bg-white p-5 rounded-xl border border-border/50 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Artigos</h3>
            </div>

            <Form {...form}>
              <div className="space-y-4">
                <PriceLineItems form={form} fieldName="items" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-dashed">
                  {/* Modifiers */}
                  <div className="space-y-4 bg-gray-100 p-4 rounded-lg border">
                    <h4 className="text-sm font-medium">Ajustes</h4>
                    <div className="flex gap-2">
                      <div className="flex-1 space-y-2">
                        <Label>Desconto</Label>
                        <div className="flex gap-2">
                          <Select value={discountType} onValueChange={(v: any) => setDiscountType(v)}>
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="euro">€</SelectItem>
                              <SelectItem value="percent">%</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="0,00"
                            value={discountValue}
                            onChange={(e) => setDiscountValue(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="flex-1 space-y-2">
                        <Label>Ajuste Manual (€)</Label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="+/- 0,00"
                          value={adjustment}
                          onChange={(e) => setAdjustment(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="bg-[#f2fff8] border border-green-200 rounded-lg p-5">
                    <h4 className="font-semibold text-green-900 mb-4">Resumo Financeiro</h4>

                    <div className="space-y-2 text-sm text-green-800">
                      <div className="flex justify-between">
                        <span>Subtotal Artigos</span>
                        <span>{subtotal.toFixed(2)} €</span>
                      </div>
                      <div className="flex justify-between">
                        <span>IVA</span>
                        <span>{totalTax.toFixed(2)} €</span>
                      </div>
                      {discountAmount > 0 && (
                        <div className="flex justify-between text-green-700">
                          <span>Desconto</span>
                          <span>-{discountAmount.toFixed(2)} €</span>
                        </div>
                      )}
                      {adjustmentAmount !== 0 && (
                        <div className="flex justify-between text-green-700">
                          <span>Ajuste</span>
                          <span>{adjustmentAmount > 0 ? '+' : ''}{adjustmentAmount.toFixed(2)} €</span>
                        </div>
                      )}

                      <div className="pt-2 mt-2 border-t border-green-200">
                        <div className="flex justify-between items-center text-lg font-bold text-green-950">
                          <span>Total</span>
                          <span>{finalPrice.toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between items-center text-sm font-medium mt-1 text-green-800">
                          <span>Total Pago</span>
                          <span>{(service.amount_paid || 0).toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between items-center text-sm font-bold mt-1 text-green-950 pt-1 border-t border-green-200/50">
                          <span>Restante</span>
                          <span>{Math.max(0, finalPrice - (service.amount_paid || 0)).toFixed(2)} €</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Form>
          </div>

          {/* Section: Diagnóstico e Trabalho */}
          <div className="bg-white p-5 rounded-xl border border-border/50 shadow-sm space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <FileText className="h-3 w-3" /> Avaria Detectada
              </Label>
              <Textarea
                value={detectedFault}
                onChange={e => setDetectedFault(e.target.value)}
                placeholder="Descreva o que foi detectado no diagnóstico..."
                rows={3}
                className="text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Check className="h-3 w-3" /> Trabalho Realizado
              </Label>
              <Textarea
                value={workPerformed}
                onChange={e => setWorkPerformed(e.target.value)}
                placeholder="Descreva as ações tomadas para resolver o problema..."
                rows={3}
                className="text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descrição Original</Label>
                <Textarea
                  value={faultDescription}
                  onChange={e => setFaultDescription(e.target.value)}
                  rows={2}
                  className="text-xs bg-muted/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notas Internas</Label>
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  className="text-xs bg-muted/30"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t bg-white flex-shrink-0">
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isLoading || validItems.length === 0} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {isLoading ? 'A guardar...' : 'Guardar Alterações'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
