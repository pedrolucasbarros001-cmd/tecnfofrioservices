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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useUpdateService } from '@/hooks/useServices';
import { useAuth } from '@/contexts/AuthContext';
import { logPayment } from '@/utils/activityLogUtils';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Service, PaymentMethod } from '@/types/database';

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

export function RegisterPaymentModal({ service, open, onOpenChange }: RegisterPaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('dinheiro');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateService = useUpdateService();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  const amountPaid = service?.amount_paid || 0;
  const finalPrice = service?.final_price || 0;
  const remainingBalance = finalPrice - amountPaid;

  useEffect(() => {
    if (service && open) {
      // Pre-fill with remaining balance
      setAmount(remainingBalance > 0 ? remainingBalance.toFixed(2) : '');
      setPaymentMethod('dinheiro');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setDescription('');
    }
  }, [service, open, remainingBalance]);

  const paymentValue = parseFloat(amount) || 0;
  const newBalance = Math.max(0, remainingBalance - paymentValue);

  const handleSubmit = async () => {
    if (!service || paymentValue <= 0) return;

    setIsSubmitting(true);
    try {
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

      // Update service amount_paid and status
      const newAmountPaid = amountPaid + paymentValue;
      const isPaidOff = newAmountPaid >= finalPrice;

      await updateService.mutateAsync({
        id: service.id,
        amount_paid: newAmountPaid,
        status: isPaidOff ? 'concluidos' : 'em_debito',
      });

      // Log activity
      await logPayment(
        service.code || 'N/A',
        service.id,
        paymentValue,
        user?.id,
        profile?.full_name || undefined
      );

      queryClient.invalidateQueries({ queryKey: ['service-payments'] });
      toast.success('Pagamento registado com sucesso!');
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error registering payment:', error);
      toast.error('Erro ao registar pagamento');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setAmount('');
    setPaymentMethod('dinheiro');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setDescription('');
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Registar Pagamento - {service?.code}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Financial Summary Box */}
          <div className="p-4 bg-green-50 border border-green-100 rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Valor Total:</span>
              <span className="font-semibold">€{finalPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Já Pago:</span>
              <span className="text-green-600 font-semibold">
                €{amountPaid.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-red-600 font-semibold">Em Falta:</span>
              <span className="text-red-600 font-bold">
                €{remainingBalance.toFixed(2)}
              </span>
            </div>
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
            <Label htmlFor="amount">Valor a Pagar (€) *</Label>
            <Input
              id="amount"
              type="number"
              min="0.01"
              max={remainingBalance}
              step="0.01"
              placeholder={`Max: €${remainingBalance.toFixed(2)}`}
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
          {paymentValue > 0 && (
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

        <DialogFooter>
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
