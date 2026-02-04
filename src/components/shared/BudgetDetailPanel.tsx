import { useState } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  Printer,
  Check,
  X,
  ArrowRight,
  Package,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ConvertBudgetModal } from '@/components/modals/ConvertBudgetModal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface BudgetDetailPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: any | null;
  onUpdate?: () => void;
}

const STATUS_CONFIG = {
  pendente: { label: 'Pendente', color: 'bg-yellow-500 text-black' },
  aprovado: { label: 'Aprovado', color: 'bg-green-500 text-white' },
  recusado: { label: 'Recusado', color: 'bg-red-500 text-white' },
  convertido: { label: 'Convertido', color: 'bg-blue-500 text-white' },
};

export function BudgetDetailPanel({
  open,
  onOpenChange,
  budget,
  onUpdate,
}: BudgetDetailPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);

  if (!budget) return null;

  const customer = budget.customer;
  const statusConfig = STATUS_CONFIG[budget.status as keyof typeof STATUS_CONFIG];

  const formatCurrency = (value: number | null) => {
    if (!value && value !== 0) return '€0.00';
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const handleUpdateStatus = async (newStatus: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('budgets')
        .update({ status: newStatus })
        .eq('id', budget.id);

      if (error) throw error;
      toast.success(`Orçamento ${newStatus === 'aprovado' ? 'aprovado' : 'recusado'}`);
      onUpdate?.();
    } catch (error) {
      console.error('Error updating budget:', error);
      toast.error('Erro ao atualizar orçamento');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConvertSuccess = () => {
    onUpdate?.();
    onOpenChange(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl flex flex-col p-0">
          {/* Header */}
          <SheetHeader className="flex-shrink-0 p-6 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SheetTitle className="text-xl font-mono">{budget.code}</SheetTitle>
                <Badge className={statusConfig?.color || 'bg-gray-500'}>
                  {statusConfig?.label || budget.status}
                </Badge>
              </div>
              <Button variant="outline" size="sm">
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Criado em {format(new Date(budget.created_at), "d 'de' MMMM 'de' yyyy", { locale: pt })}
            </p>
          </SheetHeader>

          <Separator />

          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {/* Customer Section */}
              <div className="rounded-lg border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950/20 p-4">
                <h3 className="font-semibold text-sm text-blue-700 dark:text-blue-400 mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Cliente
                </h3>
                <div className="space-y-2 text-sm">
                  <p className="font-medium text-foreground">{customer?.name || 'Sem cliente'}</p>
                  {customer?.phone && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {customer.phone}
                    </p>
                  )}
                  {customer?.email && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {customer.email}
                    </p>
                  )}
                  {customer?.nif && (
                    <p className="text-muted-foreground">NIF: {customer.nif}</p>
                  )}
                  {customer?.address && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {[customer.address, customer.postal_code, customer.city]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  )}
                </div>
              </div>

              {/* Appliance Section */}
              <div className="rounded-lg border-l-4 border-l-pink-500 bg-pink-50 dark:bg-pink-950/20 p-4">
                <h3 className="font-semibold text-sm text-pink-700 dark:text-pink-400 mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Aparelho
                </h3>
                <div className="space-y-1 text-sm">
                  {budget.appliance_type && (
                    <p className="font-medium text-foreground">{budget.appliance_type}</p>
                  )}
                  <div className="flex flex-wrap gap-x-4 text-muted-foreground">
                    {budget.brand && <span>Marca: {budget.brand}</span>}
                    {budget.model && <span>Modelo: {budget.model}</span>}
                  </div>
                </div>
              </div>

              {/* Fault Section */}
              {budget.fault_description && (
                <div className="rounded-lg border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-950/20 p-4">
                  <h3 className="font-semibold text-sm text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Descrição da Avaria
                  </h3>
                  <p className="text-sm text-foreground">{budget.fault_description}</p>
                </div>
              )}

              {/* Financial Summary */}
              <div className="rounded-lg border-l-4 border-l-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 p-4">
                <h3 className="font-semibold text-sm text-emerald-700 dark:text-emerald-400 mb-3">
                  Resumo Financeiro
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Mão de Obra</span>
                    <span>{formatCurrency(budget.estimated_labor)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Peças</span>
                    <span>{formatCurrency(budget.estimated_parts)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between text-base font-bold">
                    <span className="text-foreground">Total</span>
                    <span className="text-orange-600">{formatCurrency(budget.estimated_total)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {budget.notes && (
                <div className="rounded-lg border-l-4 border-l-slate-400 bg-slate-50 dark:bg-slate-950/20 p-4">
                  <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-400 mb-3">
                    Notas / Observações
                  </h3>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{budget.notes}</p>
                </div>
              )}

              {/* Validity */}
              {budget.valid_until && (
                <p className="text-sm text-muted-foreground text-center">
                  Válido até {format(new Date(budget.valid_until), "d 'de' MMMM 'de' yyyy", { locale: pt })}
                </p>
              )}
            </div>
          </ScrollArea>

          {/* Footer Actions */}
          <div className="flex-shrink-0 border-t p-4 bg-card">
            {budget.status === 'pendente' && (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => handleUpdateStatus('recusado')}
                  disabled={isLoading}
                >
                  <X className="h-4 w-4 mr-2" />
                  Recusar
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => handleUpdateStatus('aprovado')}
                  disabled={isLoading}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Aprovar
                </Button>
              </div>
            )}

            {budget.status === 'aprovado' && !budget.converted_service_id && (
              <Button
                className="w-full"
                onClick={() => setShowConvertModal(true)}
                disabled={isLoading}
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Converter em Serviço
              </Button>
            )}

            {budget.status === 'convertido' && (
              <div className="text-center">
                <Badge variant="secondary" className="text-sm">
                  Já convertido em serviço
                </Badge>
              </div>
            )}

            {budget.status === 'recusado' && (
              <div className="text-center">
                <Badge variant="destructive" className="text-sm">
                  Orçamento recusado
                </Badge>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Convert Budget Modal */}
      <ConvertBudgetModal
        open={showConvertModal}
        onOpenChange={setShowConvertModal}
        budget={budget}
        onSuccess={handleConvertSuccess}
      />
    </>
  );
}
