import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Shield, AlertTriangle } from 'lucide-react';
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
import { toast } from 'sonner';
import type { Service, ServiceStatus } from '@/types/database';
import {
  PriceLineItems,
  LineItem,
  DEFAULT_LINE_ITEM,
  calculateTotals
} from '@/components/pricing/PriceLineItems';
import { PricingSummary, calculateDiscount } from '@/components/pricing/PricingSummary';

// Schema for line items
const lineItemSchema = z.object({
  reference: z.string().optional(),
  description: z.string().min(1, 'Descrição é obrigatória'),
  quantity: z.number().min(1, 'Mínimo 1'),
  unit_price: z.number().min(0, 'Valor deve ser positivo'),
  tax_rate: z.number(),
});

const formSchema = z.object({
  items: z.array(lineItemSchema).min(1, 'Adicione pelo menos um artigo'),
});

type FormValues = z.infer<typeof formSchema>;

interface PricingData {
  items: Array<{
    ref?: string;
    desc: string;
    qty: number;
    price: number;
    tax: number;
  }>;
  discount?: { type: 'euro' | 'percent'; value: number };
  adjustment?: number;
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

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      items: [{ ...DEFAULT_LINE_ITEM }],
    },
  });

  // Load existing pricing data when modal opens
  useEffect(() => {
    if (service && open) {
      // Try to parse existing pricing_description as JSON
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
              tax_rate: item.tax || 23,
            }));
          }
          if (parsed.discount) {
            existingDiscount = parsed.discount;
          }
          if (parsed.adjustment !== undefined) {
            existingAdjustment = parsed.adjustment;
          }
        } catch {
          // If not JSON, create a single line from existing data
          const existingPrice = (service.labor_cost || 0) + (service.parts_cost || 0);
          if (existingPrice > 0 || service.pricing_description) {
            existingItems = [{
              reference: '',
              description: service.pricing_description || 'Serviço',
              quantity: 1,
              unit_price: existingPrice,
              tax_rate: 23,
            }];
          }
        }
      } else {
        // No pricing_description, check if there's existing price data
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

      // Set form values
      if (existingItems.length > 0) {
        form.reset({ items: existingItems });
      } else {
        form.reset({ items: [{ ...DEFAULT_LINE_ITEM }] });
      }

      // Set discount
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

      // Set adjustment
      setAdjustment(existingAdjustment ? existingAdjustment.toString() : '');

      // If warranty service, default to covered
      setWarrantyCoversAll(isWarrantyService);
    }
  }, [service, open, isWarrantyService, form]);

  const watchItems = form.watch('items') || [];
  const { subtotal, totalTax, total } = calculateTotals(watchItems as LineItem[]);
  const discountAmount = calculateDiscount(subtotal, discountValue, discountType);
  const adjustmentAmount = parseFloat(adjustment.replace(',', '.')) || 0;
  const finalPrice = warrantyCoversAll ? 0 : Math.max(0, total - discountAmount + adjustmentAmount);

  const handleSubmit = async (values: FormValues) => {
    if (!service) return;

    // Prepare pricing description as JSON
    const pricingData: PricingData = {
      items: values.items.map(item => ({
        ref: item.reference || '',
        desc: item.description,
        qty: item.quantity,
        price: item.unit_price,
        tax: item.tax_rate,
      })),
      discount: discountValue ? { type: discountType, value: parseFloat(discountValue.replace(',', '.')) || 0 } : undefined,
      adjustment: adjustmentAmount !== 0 ? adjustmentAmount : undefined,
    };

    // Determine new status
    const isClientLocation = service.service_location === 'cliente' || service.service_location === 'entregue';
    const currentStatus = service.status as ServiceStatus;

    let newStatus: ServiceStatus | undefined;

    if (currentStatus === 'a_precificar') {
      if (warrantyCoversAll) {
        // Warranty: Skip payment flow, go to concluded/finished
        newStatus = isClientLocation ? 'finalizado' : 'concluidos';
      } else {
        // Not Warranty: Go to Debit for payment collection
        newStatus = 'em_debito';
      }
    }

    await updateService.mutateAsync({
      id: service.id,
      labor_cost: subtotal,
      parts_cost: totalTax, // Store tax separately for reference
      discount: discountAmount,
      final_price: finalPrice,
      pricing_description: JSON.stringify(pricingData),
      pending_pricing: false,
      ...(newStatus && { status: newStatus }),
      skipToast: true,
    });

    // Log activity
    await logPricingSet(
      service.code || 'N/A',
      service.id,
      finalPrice,
      user?.id,
      profile?.full_name || undefined
    );

    // Contextual feedback message
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
            <ScrollArea className="flex-1 max-h-[calc(90vh-200px)] px-6">
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

                {/* Warning for warranty not covering */}
                {isWarrantyService && !warrantyCoversAll && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-700">
                      A garantia não cobre este serviço. O cliente será cobrado pelo valor definido abaixo.
                    </p>
                  </div>
                )}

                {/* Line Items Table */}
                <PriceLineItems
                  form={form}
                  fieldName="items"
                  disabled={warrantyCoversAll}
                />

                {/* Pricing Summary */}
                <div className="flex justify-end">
                  <PricingSummary
                    subtotal={subtotal}
                    totalTax={totalTax}
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
              </div>
            </ScrollArea>

            <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={updateService.isPending}
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
