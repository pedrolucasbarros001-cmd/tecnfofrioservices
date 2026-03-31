import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { toLocalDateString } from '@/utils/dateUtils';
import { ChevronDown, ChevronRight, CreditCard } from 'lucide-react';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useUpdateService } from '@/hooks/useServices';
import { useAuth } from '@/contexts/AuthContext';
import { logPayment } from '@/utils/activityLogUtils';
import { parseCurrencyInput } from '@/utils/currencyUtils';
import { useServiceFinancialData } from '@/hooks/useServiceFinancialData';
import { ServicePartsHistory } from '@/components/shared/ServicePartsHistory';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateServiceQueries } from '@/lib/queryInvalidation';
import { toast } from 'sonner';
import { humanizeError } from '@/utils/errorMessages';
import type { Service, PaymentMethod, ServiceStatus } from '@/types/database';

interface RegisterPaymentModalProps {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'multibanco', label: 'Multibanco' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'mbway', label: 'MB Way' },
];

const METHOD_LABELS: Record<string, string> = {
  dinheiro: 'Dinheiro',
  multibanco: 'Multibanco',
  transferencia: 'Transferência',
  mbway: 'MB Way',
};

export function RegisterPaymentModal({ service, open, onOpenChange }: RegisterPaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('dinheiro');
  const [paymentDate, setPaymentDate] = useState(toLocalDateString(new Date()));
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const updateService = useUpdateService();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  // Fetch service history data
  const { groupedParts, historySubtotal, payments, totalPaid, nameMap } = useServiceFinancialData(service?.id, open);

  const finalPrice = service?.final_price || 0;
  const remainingBalance = finalPrice > 0 ? finalPrice - totalPaid : 0;

  useEffect(() => {
    if (service && open) {
      setAmount(finalPrice > 0 && remainingBalance > 0 ? remainingBalance.toFixed(2) : '');
      setPaymentMethod('dinheiro');
      setPaymentDate(toLocalDateString(new Date()));
      setDescription('');
      setDetailsOpen(false);
    }
  }, [service, open, finalPrice, remainingBalance]);

  const paymentValue = parseCurrencyInput(amount);
  const newBalance = finalPrice > 0 ? Math.max(0, remainingBalance - paymentValue) : 0;

  const handleSubmit = async () => {
    if (!service || paymentValue <= 0) return;

    setIsSubmitting(true);
    try {
      // Check for duplicate payment
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      const { data: duplicates } = await supabase
        .from('service_payments')
        .select('id')
        .eq('service_id', service.id)
        .eq('amount', paymentValue)
        .eq('payment_method', paymentMethod)
        .gte('created_at', twoMinutesAgo)
        .limit(1);

      if (duplicates && duplicates.length > 0) {
        toast.warning(`Já existe um pagamento de €${paymentValue.toFixed(2)} (${paymentMethod}) registado nos últimos 2 minutos.`);
        setIsSubmitting(false);
        return;
      }

      // Insert payment record
      const { error: paymentError } = await supabase
        .from('service_payments')
        .insert({
          service_id: service.id,
          amount: paymentValue,
          payment_method: paymentMethod,
          payment_date: paymentDate,
          description: description || null,
        });

      if (paymentError) throw paymentError;

      // Update service amount_paid
      const newAmountPaid = totalPaid + paymentValue;
      const isPaidInFull = newAmountPaid >= (finalPrice - 0.01);

      // The payment step should *not* automatically advance the
      // operational status.  Closing out a debt is a financial change
      // only; the technician/secretary should explicitly finalize or
      // complete the service elsewhere if desired.  Previous behaviour
      // caused invoices to mark services finished before the technician
      // had actually packed/handed over the appliance.
      await updateService.mutateAsync({
        id: service.id,
        amount_paid: newAmountPaid,
        skipToast: true,
      });

      // NOTE: if you want to transition the service after payment, call
      // a separate handler such as `handleFinalizeServiceAfterPayment()`.

      await logPayment(
        service.code || 'N/A',
        service.id,
        paymentValue,
        user?.id,
        profile?.full_name || undefined
      );

      invalidateServiceQueries(queryClient, service.id);

      if (newBalance > 0) {
        toast.success(`Pagamento de €${paymentValue.toFixed(2)} registado. Em falta: €${newBalance.toFixed(2)}`);
      } else {
        toast.success(`Pagamento completo! ${service.code} sem débito.`);
      }
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error registering payment:', error);
      toast.error(humanizeError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setAmount('');
    setPaymentMethod('dinheiro');
    setPaymentDate(toLocalDateString(new Date()));
    setDescription('');
    setDetailsOpen(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-w-[95vw] max-h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle className="text-xl font-semibold">
            Registar Pagamento - {service?.code}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">Este valor será abatido do saldo em aberto do serviço.</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 px-6">
          <div className="space-y-4 py-4">
            {/* Collapsible Service Details */}
            {groupedParts.length > 0 && (
              <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
                <CollapsibleTrigger className="flex items-center gap-2 w-full text-left text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors py-1">
                  {detailsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  Detalhes do Serviço
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <ServicePartsHistory
                    groupedParts={groupedParts}
                    historySubtotal={historySubtotal}
                  />
                  {/* Pricing info from service */}
                  {finalPrice > 0 && (
                    <div className="mt-2 p-2 bg-muted/30 rounded text-xs space-y-1">
                      {(service?.discount || 0) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Desconto</span>
                          <span className="text-red-600">-€{(service?.discount || 0).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-semibold text-sm">
                        <span>TOTAL</span>
                        <span>€{finalPrice.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Previous Payments */}
            {payments.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5" />
                  Pagamentos Anteriores
                </h4>
                <div className="space-y-1">
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-sm p-2 bg-muted/20 rounded">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span>{p.payment_date ? format(new Date(p.payment_date), 'dd/MM', { locale: pt }) : '—'}</span>
                        <span>•</span>
                        <span>{METHOD_LABELS[p.payment_method || ''] || p.payment_method}</span>
                        {p.received_by && nameMap[p.received_by] && (
                          <>
                            <span>•</span>
                            <span className="text-xs">Recebido: {nameMap[p.received_by]}</span>
                          </>
                        )}
                      </div>
                      <span className="font-semibold text-green-600">€{p.amount.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-end text-sm pt-1">
                    <span className="text-muted-foreground mr-2">Total Pago:</span>
                    <span className="font-semibold text-green-600">€{totalPaid.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Financial Summary Box */}
            <div className="p-4 bg-green-50 border border-green-100 rounded-lg space-y-2">
              {finalPrice > 0 ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Valor Total:</span>
                    <span className="font-semibold">€{finalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Já Pago:</span>
                    <span className="text-green-600 font-semibold">
                      €{totalPaid.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-red-600 font-semibold">Em Falta:</span>
                    <span className="text-red-600 font-bold">
                      €{remainingBalance.toFixed(2)}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Ainda não foi definido um preço para este serviço. Insira o montante pago pelo cliente e será registado.
                </p>
              )}
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Método de Pagamento *</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar método" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Valor deste Pagamento (€) *</Label>
              <Input
                id="amount"
                type="text"
                inputMode="decimal"
                placeholder={
                  finalPrice > 0
                    ? `Ex: 2.000,00 (Max: €${remainingBalance.toFixed(2)})`
                    : 'Ex: 20,00 (preço ainda não definido)'
                }
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Descrição (Opcional)</Label>
              <Textarea
                id="description"
                placeholder="Ex: Pagamento parcial"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            {/* Payment Date */}
            <div className="space-y-2">
              <Label htmlFor="paymentDate">Data do Pagamento *</Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>

            {/* New Balance Preview */}
            {paymentValue > 0 && finalPrice > 0 && (
              <div className="border-t pt-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Novo saldo em falta:</span>
                  <span className={newBalance > 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                    €{newBalance.toFixed(2)}
                  </span>
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
            disabled={isSubmitting || paymentValue <= 0}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? 'A confirmar...' : 'Confirmar Pagamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
