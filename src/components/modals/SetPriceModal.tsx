import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUpdateService } from '@/hooks/useServices';
import { useAuth } from '@/contexts/AuthContext';
import { logPricingSet } from '@/utils/activityLogUtils';
import { useServiceFinancialData } from '@/hooks/useServiceFinancialData';
import { ServicePartsHistory } from '@/components/shared/ServicePartsHistory';
import { toast } from 'sonner';
import type { Service, ServiceStatus } from '@/types/database';
import {
  PriceLineItems,
  LineItem,
  DEFAULT_LINE_ITEM,
  calculateTotals
} from '@/components/pricing/PriceLineItems';
import { PricingSummary, calculateDiscount } from '@/components/pricing/PricingSummary';

// Schema — items can be empty if history exists
const lineItemSchema = z.object({
  reference: z.string().optional(),
  description: z.string().min(1, 'Descrição é obrigatória'),
  quantity: z.number().min(0, 'A quantidade deve ser positiva'),
  unit_price: z.number().min(0, 'Valor deve ser positivo'),
  tax_rate: z.number(),
});

const formSchema = z.object({
  items: z.array(lineItemSchema),
});

type FormValues = z.infer<typeof formSchema>;

interface PricingData {
  items: Array<{
    ref?: string;
    desc: string;
    qty: number;
    price: number;
    tax_rate: number;
    tax?: number; // For backward compatibility migration
  }>;
  discount?: { type: 'euro' | 'percent'; value: number };
  adjustment?: number;
  historySubtotal?: number;
}

interface SetPriceModalProps {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SetPriceModal({ service, open, onOpenChange }: SetPriceModalProps) {
  const [discountValue, setDiscountValue] = useState('');
  const [discountType, setDiscountType] = useState<'euro' | 'percent'>('euro');
  const [adjustment, setAdjustment] = useState('');
  const [warrantyCoversAll, setWarrantyCoversAll] = useState(false);

  const updateService = useUpdateService();
  const { user, profile } = useAuth();

  const isWarrantyService = service?.is_warranty || false;

  // Fetch service history data
  const { groupedParts, historySubtotal, totalPaid, isLoading: historyLoading } = useServiceFinancialData(service?.id, open);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      items: [{ ...DEFAULT_LINE_ITEM }],
    },
  });

  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (open) setHasInitialized(false);
  }, [open]);

  // Load existing pricing data when modal opens
  useEffect(() => {
    if (service && open && !historyLoading && !hasInitialized) {
      setHasInitialized(true);
      let existingItems: LineItem[] = [];
      let existingDiscount: { type: 'euro' | 'percent'; value: number } | null = null;
      let existingAdjustment = 0;

      if (service.pricing_description) {
        try {
          const parsed = JSON.parse(service.pricing_description) as PricingData;
          if (parsed.items && Array.isArray(parsed.items)) {
            existingItems = parsed.items.map(item => ({
              reference: item.ref || '',
              description: item.desc || '',
              quantity: item.qty || 1,
              unit_price: item.price || 0,
              tax_rate: item.tax_rate ?? item.tax ?? 0,
            }));
          }
          if (parsed.discount) {
            existingDiscount = parsed.discount;
          }
          if (parsed.adjustment !== undefined) {
            existingAdjustment = parsed.adjustment;
          }
        } catch {
          // fallback
        }
      }

      if (existingItems.length === 0) {
        const parts = groupedParts.flatMap(g => g.parts);
        if (parts.length > 0) {
          existingItems = parts.map(p => ({
            reference: p.part_code || '',
            description: p.part_name || '',
            quantity: p.quantity || 1,
            unit_price: p.cost || 0,
            tax_rate: p.iva_rate ?? 0,
          }));
        } else {
          const existingPrice = (service.labor_cost || 0) + (service.parts_cost || 0);
          if (existingPrice > 0) {
            existingItems = [{
              reference: '',
              description: 'Serviço',
              quantity: 1,
              unit_price: existingPrice,
              tax_rate: 0,
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
      setWarrantyCoversAll(isWarrantyService);
    }
  }, [service, open, historyLoading, hasInitialized, form, groupedParts, isWarrantyService]);

  const watchItems = form.watch('items') || [];
  // Filter out empty additional items for calculation
  const validAdditionalItems = (watchItems as LineItem[]).filter(
    item => item.description && item.description.trim() !== ''
  );
  const { subtotal: combinedSubtotal, totalTax: combinedTax, total: combinedTotal } = calculateTotals(validAdditionalItems);

  const discountAmount = calculateDiscount(combinedSubtotal, discountValue, discountType);
  const adjustmentAmount = parseFloat(adjustment.replace(',', '.')) || 0;
  const finalPrice = warrantyCoversAll ? 0 : Math.max(0, combinedTotal - discountAmount + adjustmentAmount);

  const canSubmit = watchItems.length > 0;

  const handleSubmit = async (values: FormValues) => {
    if (!service) return;
    if (!canSubmit) {
      toast.error('Adicione artigos ou valide o histórico existente.');
      return;
    }

    // Filter out empty items
    const filteredItems = values.items.filter(item => item.description && item.description.trim() !== '');

    const pricingData: PricingData = {
      items: filteredItems.map(item => ({
        ref: item.reference || '',
        desc: item.description,
        qty: item.quantity,
        price: item.unit_price,
        tax_rate: item.tax_rate,
      })),
      discount: discountValue ? { type: discountType, value: parseFloat(discountValue.replace(',', '.')) || 0 } : undefined,
      adjustment: adjustmentAmount !== 0 ? adjustmentAmount : undefined,
    };

    const isClientLocation = service.service_location === 'cliente' || service.service_location === 'entregue';
    const currentStatus = service.status as ServiceStatus;

    // Determine next status:
    // If it's a visit (`a_precificar`), we transition it to `finalizado` automatically.
    // If it's workshop concluded (`concluidos`), it stays in `concluidos` but now without the `pending_pricing` flag.
    const nextStatus = currentStatus === 'a_precificar' ? 'finalizado' : currentStatus;

    // Determine next location:
    const nextLocation = currentStatus === 'a_precificar' ? 'entregue' : service.service_location;

    // Determine finalized date if transitioning to finalizado
    const pickupDate = nextStatus === 'finalizado' ? new Date().toISOString() : service.pickup_date;
    await updateService.mutateAsync({
      id: service.id,
      labor_cost: combinedSubtotal,
      parts_cost: combinedTax,
      discount: discountAmount,
      final_price: finalPrice,
      pricing_description: JSON.stringify(pricingData),
      pending_pricing: false,
      status: nextStatus as any,
      service_location: nextLocation as any,
      pickup_date: pickupDate,
      skipToast: true,
    });

    // NOTE: if an explicit operational transition is required after
    // pricing, invoke it separately (e.g. markServiceFinalized RPC).
    // Doing so keeps the axes orthogonal and prevents collisions.


    await logPricingSet(
      service.code || 'N/A',
      service.id,
      finalPrice,
      user?.id,
      profile?.full_name || undefined
    );

    if (warrantyCoversAll) {
      toast.success('Garantia aplicada! Serviço sem custo para o cliente.');
    } else {
      toast.success(`Preço definido: €${finalPrice.toFixed(2)}. Serviço em débito para cobrança.`);
    }

    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    form.reset({ items: [{ ...DEFAULT_LINE_ITEM }] });
    setDiscountValue('');
    setDiscountType('euro');
    setAdjustment('');
    setWarrantyCoversAll(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[900px] max-w-[95vw] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            Definir Preço - {service?.code}
            {isWarrantyService && (
              <Badge className="bg-purple-500 text-white">
                <Shield className="h-3 w-3 mr-1" />
                Garantia
              </Badge>
            )}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">O preço definido aqui será utilizado para controlo financeiro e cobrança.</p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
            <ScrollArea className="flex-1 px-6" style={{ maxHeight: 'calc(90vh - 160px)' }}>
              <div className="space-y-6 py-4 pr-4">
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

                {isWarrantyService && !warrantyCoversAll && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-700">
                      A garantia não cobre este serviço. O cliente será cobrado pelo valor definido abaixo.
                    </p>
                  </div>
                )}


                {/* Additional Line Items Table */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Artigos / Intervenções
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Edite os artigos do histórico ou adicione novos para definir o preço do serviço.
                  </p>
                  <PriceLineItems
                    form={form}
                    fieldName="items"
                    disabled={warrantyCoversAll}
                  />
                </div>

                {/* Pricing Summary */}
                <div className="flex justify-end">
                  <PricingSummary
                    subtotal={combinedSubtotal}
                    totalTax={combinedTax}
                    discountValue={discountValue}
                    discountType={discountType}
                    adjustment={adjustment}
                    onDiscountValueChange={setDiscountValue}
                    onDiscountTypeChange={setDiscountType}
                    onAdjustmentChange={setAdjustment}
                    disabled={warrantyCoversAll}
                    warrantyCoversAll={warrantyCoversAll}
                  />
                </div>

                {/* Payment Info */}
                {totalPaid > 0 && (
                  <div className="p-3 bg-green-50 border border-green-100 rounded-lg space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="flex items-center gap-1.5 text-green-700">
                        <CheckCircle2 className="h-4 w-4" />
                        Já Pago
                      </span>
                      <span className="font-semibold text-green-700">€{totalPaid.toFixed(2)}</span>
                    </div>
                    {!warrantyCoversAll && finalPrice > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Total a Cobrar</span>
                        <span className="font-bold text-red-600">
                          €{Math.max(0, finalPrice - totalPaid).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>

            <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={updateService.isPending || !canSubmit}
                className={warrantyCoversAll ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                {updateService.isPending
                  ? 'A confirmar...'
                  : (warrantyCoversAll ? 'Confirmar Garantia' : 'Confirmar Preço')
                }
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
