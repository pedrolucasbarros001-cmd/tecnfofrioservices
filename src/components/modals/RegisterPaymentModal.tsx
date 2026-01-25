import { useState, useEffect } from 'react';
import { CreditCard } from 'lucide-react';
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

  useEffect(() => {
    if (service && open) {
      const remaining = (service.final_price || 0) - (service.amount_paid || 0);
      setAmount(remaining > 0 ? remaining.toFixed(2) : '');
    }
  }, [service, open]);

  const amountPaid = service?.amount_paid || 0;
  const finalPrice = service?.final_price || 0;
  const remainingBalance = finalPrice - amountPaid;
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
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-orange-600" />
            Registar Pagamento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {service && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium">{service.code}</p>
              <p className="text-muted-foreground">{service.customer?.name}</p>
            </div>
          )}

          {/* Financial Summary */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-muted/50 rounded-lg text-sm">
            <div className="text-center">
              <p className="text-muted-foreground">Total</p>
              <p className="font-semibold">€{finalPrice.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">Pago</p>
              <p className="font-semibold text-green-600">€{amountPaid.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">Em Falta</p>
              <p className="font-semibold text-red-600">€{remainingBalance.toFixed(2)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Valor do Pagamento (€)</Label>
            <Input
              id="amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Método de Pagamento</Label>
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

          <div className="space-y-2">
            <Label htmlFor="paymentDate">Data do Pagamento</Label>
            <Input
              id="paymentDate"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              placeholder="Notas sobre o pagamento..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

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
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isSubmitting ? 'A registar...' : 'Registar Pagamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
