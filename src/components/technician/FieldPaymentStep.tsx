import { useState } from 'react';
import { DollarSign, Check, X } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useUpdateService } from '@/hooks/useServices';
import { useAuth } from '@/contexts/AuthContext';
import { logPayment } from '@/utils/activityLogUtils';
import { parseCurrencyInput } from '@/utils/currencyUtils';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Service, PaymentMethod } from '@/types/database';

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
    { value: 'dinheiro', label: 'Dinheiro' },
    { value: 'multibanco', label: 'Multibanco' },
    { value: 'transferencia', label: 'Transferência' },
    { value: 'mbway', label: 'MB Way' },
];

interface FieldPaymentStepProps {
    service: Service;
    open: boolean;
    onSkip: () => void;
    onComplete: () => void;
    /** Color scheme for the header */
    colorClass?: string;
    /** Header background color */
    headerBg?: string;
    /** Header text color */
    headerText?: string;
    /** Badge styling */
    badgeBg?: string;
    badgeText?: string;
    /** Flow title (e.g. "Visita", "Instalação", "Entrega") */
    flowTitle?: string;
    /** Progress bar component to render */
    progressBar?: React.ReactNode;
}

export function FieldPaymentStep({
    service,
    open,
    onSkip,
    onComplete,
    headerBg = 'bg-blue-500',
    headerText = 'text-white',
    badgeBg = 'bg-blue-100',
    badgeText = 'text-blue-700',
    flowTitle = 'Serviço',
    progressBar,
}: FieldPaymentStepProps) {
    const [clientPaid, setClientPaid] = useState<boolean | null>(null);
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('dinheiro');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const updateService = useUpdateService();
    const queryClient = useQueryClient();
    const { user, profile } = useAuth();

    const amountPaid = service.amount_paid || 0;
    const finalPrice = service.final_price || 0;
    const paymentValue = parseCurrencyInput(amount);

    const handleConfirmPayment = async () => {
        if (paymentValue < 0) {
            toast.error('Insira um valor válido');
            return;
        }

        setIsSubmitting(true);
        try {
            // Insert payment record
            const { error: paymentError } = await supabase
                .from('service_payments')
                .insert({
                    service_id: service.id,
                    amount: paymentValue,
                    payment_method: paymentMethod,
                    payment_date: new Date().toISOString().split('T')[0],
                    description: description || `Pagamento registado pelo técnico no terreno`,
                    received_by: user?.id || null,
                });

            if (paymentError) throw paymentError;

            // Update amount_paid on the service
            const newAmountPaid = amountPaid + paymentValue;
            await updateService.mutateAsync({
                id: service.id,
                amount_paid: newAmountPaid,
                skipToast: true,
            });

            // Log activity
            await logPayment(
                service.code || 'N/A',
                service.id,
                paymentValue,
                user?.id,
                profile?.full_name || undefined
            );

            invalidateServiceQueries(queryClient, serviceId);

            toast.success(`Pagamento de €${paymentValue.toFixed(2)} registado`);

            // Reset and advance
            resetForm();
            onComplete();
        } catch (error) {
            console.error('Error registering field payment:', error);
            toast.error('Erro ao registar pagamento');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSkip = () => {
        resetForm();
        onSkip();
    };

    const resetForm = () => {
        setClientPaid(null);
        setAmount('');
        setPaymentMethod('dinheiro');
        setDescription('');
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) handleSkip(); }}>
            <DialogContent className="max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto p-6">
                {/* Header */}
                <DialogHeader className="p-0 mb-3">
                    <div className={cn(headerBg, headerText, 'px-4 py-2 rounded-lg -mx-6 -mt-6 mb-3')}>
                        <DialogTitle className={cn('text-base font-bold', headerText)}>{flowTitle}</DialogTitle>
                        <DialogDescription className={cn('text-xs mt-0.5 opacity-80', headerText)}>
                            {service.code} - {service.customer?.name || 'Cliente'}
                        </DialogDescription>
                    </div>
                    {progressBar}
                    <div className="flex items-center gap-2">
                        <Badge className={cn(badgeBg, badgeText, 'text-[10px]')}>Pagamento</Badge>
                        <span className="font-semibold text-sm">Registo de Pagamento</span>
                    </div>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Financial Summary */}
                    {finalPrice > 0 && (
                        <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Preço definido:</span>
                                <span className="font-medium">{finalPrice.toFixed(2)} €</span>
                            </div>
                            {amountPaid > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Já pago:</span>
                                    <span className="font-medium text-green-600">{amountPaid.toFixed(2)} €</span>
                                </div>
                            )}
                            <div className="flex justify-between border-t pt-1">
                                <span className="text-muted-foreground font-medium">Em falta:</span>
                                <span className="font-bold">{Math.max(0, finalPrice - amountPaid).toFixed(2)} €</span>
                            </div>
                        </div>
                    )}

                    {/* Question */}
                    <div className="text-center space-y-3">
                        <div className="flex items-center justify-center gap-2 text-lg font-medium">
                            <DollarSign className="h-5 w-5" />
                            O cliente pagou alguma quantia?
                        </div>

                        <div className="flex gap-3 justify-center">
                            <Button
                                variant={clientPaid === false ? 'default' : 'outline'}
                                className={cn(
                                    'flex-1 h-14 text-base gap-2',
                                    clientPaid === false && 'bg-muted-foreground hover:bg-muted-foreground/90'
                                )}
                                onClick={() => setClientPaid(false)}
                            >
                                <X className="h-5 w-5" />
                                Não
                            </Button>
                            <Button
                                variant={clientPaid === true ? 'default' : 'outline'}
                                className={cn(
                                    'flex-1 h-14 text-base gap-2',
                                    clientPaid === true && 'bg-green-600 hover:bg-green-700 text-white'
                                )}
                                onClick={() => setClientPaid(true)}
                            >
                                <Check className="h-5 w-5" />
                                Sim
                            </Button>
                        </div>
                    </div>

                    {/* Payment Form (visible only when "Sim") */}
                    {clientPaid === true && (
                        <div className="space-y-4 border-t pt-4 animate-in slide-in-from-top-2 duration-200">
                            <div className="space-y-2">
                                <Label htmlFor="field-amount">Valor (€) *</Label>
                                <Input
                                    id="field-amount"
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="text-lg h-12"
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Método de Pagamento</Label>
                                <Select
                                    value={paymentMethod}
                                    onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                                >
                                    <SelectTrigger className="h-11">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PAYMENT_METHODS.map((m) => (
                                            <SelectItem key={m.value} value={m.value}>
                                                {m.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="field-desc">Notas (opcional)</Label>
                                <Textarea
                                    id="field-desc"
                                    placeholder="Detalhes adicionais sobre o pagamento..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="min-h-[70px]"
                                />
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex gap-2 mt-4">
                    {clientPaid === false && (
                        <Button
                            className="w-full h-12 text-base"
                            onClick={handleSkip}
                        >
                            Avançar para Assinatura
                        </Button>
                    )}
                    {clientPaid === true && (
                        <Button
                            className="w-full h-12 text-base bg-green-600 hover:bg-green-700 text-white"
                            onClick={handleConfirmPayment}
                            disabled={isSubmitting || paymentValue < 0}
                        >
                            {isSubmitting ? 'A registar...' : `Registar €${paymentValue > 0 ? paymentValue.toFixed(2) : '0.00'} e Avançar`}
                        </Button>
                    )}
                    {clientPaid === null && (
                        <p className="text-xs text-muted-foreground text-center w-full">
                            Selecione uma opção acima para continuar
                        </p>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
