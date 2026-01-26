import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { AlertTriangle, Printer, Snowflake } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { SERVICE_STATUS_CONFIG } from '@/types/database';
import type { Service, ServicePart, ServicePayment } from '@/types/database';

interface ServicePrintModalProps {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ServicePrintModal({ service, open, onOpenChange }: ServicePrintModalProps) {
  // Fetch parts used for this service
  const { data: parts = [] } = useQuery({
    queryKey: ['service-parts', service?.id],
    queryFn: async () => {
      if (!service?.id) return [];
      const { data, error } = await supabase
        .from('service_parts')
        .select('*')
        .eq('service_id', service.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as ServicePart[];
    },
    enabled: !!service?.id && open,
  });

  // Fetch payment history
  const { data: payments = [] } = useQuery({
    queryKey: ['service-payments', service?.id],
    queryFn: async () => {
      if (!service?.id) return [];
      const { data, error } = await supabase
        .from('service_payments')
        .select('*')
        .eq('service_id', service.id)
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return data as ServicePayment[];
    },
    enabled: !!service?.id && open,
  });

  if (!service) return null;

  const handlePrint = () => {
    window.print();
  };

  const statusConfig = SERVICE_STATUS_CONFIG[service.status];
  const qrData = JSON.stringify({ code: service.code, id: service.id });

  const usedParts = parts.filter(p => !p.is_requested);
  const totalPartsCost = usedParts.reduce((sum, p) => sum + (p.cost || 0) * (p.quantity || 1), 0);
  const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Pré-visualização da Ficha</DialogTitle>
          <Button onClick={handlePrint} size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </DialogHeader>

        {/* Printable Content */}
        <div className="border rounded-lg p-6 bg-white print:border-0 print:p-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Snowflake className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold">TECNOFRIO</span>
            </div>
            <div className="text-right">
              <h1 className="text-xl font-bold">Ficha de Serviço</h1>
            </div>
          </div>

          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-lg font-mono font-bold">Código: {service.code}</p>
              <p className="text-sm text-muted-foreground">
                Data de Entrada: {format(new Date(service.created_at), "dd/MM/yyyy HH:mm", { locale: pt })}
              </p>
            </div>
            <QRCodeSVG value={qrData} size={80} level="M" />
          </div>

          <Separator className="my-4" />

          {/* Customer Data */}
          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-3 border-b pb-1">Dados do Cliente</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Nome:</span>{' '}
                <span className="font-medium">{service.customer?.name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Contribuinte:</span>{' '}
                <span className="font-medium">{service.customer?.nif || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Telefone:</span>{' '}
                <span className="font-medium">{service.customer?.phone || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Email:</span>{' '}
                <span className="font-medium">{service.customer?.email || 'N/A'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Morada:</span>{' '}
                <span className="font-medium">
                  {[service.customer?.address, service.customer?.postal_code, service.customer?.city]
                    .filter(Boolean)
                    .join(', ') || 'N/A'}
                </span>
              </div>
            </div>
          </section>

          <Separator className="my-4" />

          {/* Service Details */}
          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-3 border-b pb-1">Detalhes do Serviço</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Categoria:</span>{' '}
                <span className="font-medium capitalize">{service.service_type || 'Reparação'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Tipo:</span>{' '}
                <span className="font-medium">
                  {service.service_location === 'cliente' ? 'Visita' : 'Oficina'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Localização:</span>{' '}
                <span className="font-medium capitalize">{service.service_location || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Estado:</span>{' '}
                <span className="font-medium">{statusConfig?.label || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Prioridade:</span>{' '}
                <span className="font-medium">{service.is_urgent ? 'Urgente' : 'Normal'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Data Agendada:</span>{' '}
                <span className="font-medium">
                  {service.scheduled_date 
                    ? format(new Date(service.scheduled_date), "dd/MM/yyyy", { locale: pt })
                    : 'Não agendado'}
                </span>
              </div>
            </div>
          </section>

          <Separator className="my-4" />

          {/* Equipment Details */}
          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-3 border-b pb-1">Detalhes do Equipamento</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Tipo:</span>{' '}
                <span className="font-medium">{service.appliance_type || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Marca:</span>{' '}
                <span className="font-medium">{service.brand || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Modelo:</span>{' '}
                <span className="font-medium">{service.model || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Nº Série:</span>{' '}
                <span className="font-medium">{service.serial_number || 'N/A'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Avaria Reportada:</span>{' '}
                <span className="font-medium">{service.fault_description || 'N/A'}</span>
              </div>
              {service.detected_fault && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Avaria Detectada:</span>{' '}
                  <span className="font-medium">{service.detected_fault}</span>
                </div>
              )}
            </div>
          </section>

          {/* Warranty Section */}
          {service.is_warranty && (
            <>
              <Separator className="my-4" />
              <section className="mb-6 bg-purple-50 rounded-lg p-4">
                <h2 className="text-lg font-semibold mb-3 text-purple-800">Serviço em Garantia</h2>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <div>
                    <span className="text-purple-600">Marca da Garantia:</span>{' '}
                    <span className="font-medium">{service.warranty_brand || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-purple-600">Nº Processo:</span>{' '}
                    <span className="font-medium">{service.warranty_process_number || 'N/A'}</span>
                  </div>
                </div>
              </section>
            </>
          )}

          {/* Work Performed */}
          {service.work_performed && (
            <>
              <Separator className="my-4" />
              <section className="mb-6">
                <h2 className="text-lg font-semibold mb-3 border-b pb-1">Trabalho Realizado</h2>
                <p className="text-sm whitespace-pre-wrap">{service.work_performed}</p>
              </section>
            </>
          )}

          {/* Parts Used */}
          {usedParts.length > 0 && (
            <>
              <Separator className="my-4" />
              <section className="mb-6">
                <h2 className="text-lg font-semibold mb-3 border-b pb-1">Peças Utilizadas</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Peça</th>
                      <th className="text-left py-2">Código</th>
                      <th className="text-center py-2">Qtd</th>
                      <th className="text-right py-2">Custo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usedParts.map((part) => (
                      <tr key={part.id} className="border-b">
                        <td className="py-2">{part.part_name}</td>
                        <td className="py-2">{part.part_code || '-'}</td>
                        <td className="py-2 text-center">{part.quantity || 1}</td>
                        <td className="py-2 text-right">{((part.cost || 0) * (part.quantity || 1)).toFixed(2)} €</td>
                      </tr>
                    ))}
                    <tr className="font-medium">
                      <td colSpan={3} className="py-2 text-right">Total Peças:</td>
                      <td className="py-2 text-right">{totalPartsCost.toFixed(2)} €</td>
                    </tr>
                  </tbody>
                </table>
              </section>
            </>
          )}

          {/* Pricing Summary */}
          {(service.final_price && service.final_price > 0) && (
            <>
              <Separator className="my-4" />
              <section className="mb-6">
                <h2 className="text-lg font-semibold mb-3 border-b pb-1">Resumo Financeiro</h2>
                <div className="grid grid-cols-2 gap-2 text-sm max-w-xs ml-auto">
                  {service.labor_cost > 0 && (
                    <div className="flex justify-between col-span-2">
                      <span className="text-muted-foreground">Mão de Obra:</span>
                      <span>{service.labor_cost.toFixed(2)} €</span>
                    </div>
                  )}
                  {service.parts_cost > 0 && (
                    <div className="flex justify-between col-span-2">
                      <span className="text-muted-foreground">Peças:</span>
                      <span>{service.parts_cost.toFixed(2)} €</span>
                    </div>
                  )}
                  {service.discount > 0 && (
                    <div className="flex justify-between col-span-2 text-green-600">
                      <span>Desconto:</span>
                      <span>-{service.discount.toFixed(2)} €</span>
                    </div>
                  )}
                  <div className="flex justify-between col-span-2 font-bold text-base border-t pt-2">
                    <span>TOTAL:</span>
                    <span>{service.final_price.toFixed(2)} €</span>
                  </div>
                  {totalPayments > 0 && (
                    <>
                      <div className="flex justify-between col-span-2 text-green-600">
                        <span>Pago:</span>
                        <span>{totalPayments.toFixed(2)} €</span>
                      </div>
                      {service.final_price > totalPayments && (
                        <div className="flex justify-between col-span-2 text-red-600 font-medium">
                          <span>Em Débito:</span>
                          <span>{(service.final_price - totalPayments).toFixed(2)} €</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </section>
            </>
          )}

          {/* Payment History */}
          {payments.length > 0 && (
            <>
              <Separator className="my-4" />
              <section className="mb-6">
                <h2 className="text-lg font-semibold mb-3 border-b pb-1">Histórico de Pagamentos</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Data</th>
                      <th className="text-left py-2">Método</th>
                      <th className="text-left py-2">Descrição</th>
                      <th className="text-right py-2">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id} className="border-b">
                        <td className="py-2">
                          {payment.payment_date 
                            ? format(new Date(payment.payment_date), "dd/MM/yyyy", { locale: pt })
                            : '-'}
                        </td>
                        <td className="py-2 capitalize">{payment.payment_method || '-'}</td>
                        <td className="py-2">{payment.description || '-'}</td>
                        <td className="py-2 text-right">{payment.amount.toFixed(2)} €</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </>
          )}

          <Separator className="my-4" />

          {/* Terms Section with QR */}
          <section className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
            <div className="flex gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  IMPORTANTE - Termos de Guarda
                </h3>
                <p className="text-amber-700 text-xs leading-relaxed mb-2">
                  Os equipamentos deixados para reparação, venda ou instalação só podem 
                  permanecer nas nossas instalações por um período máximo de{' '}
                  <strong>30 (trinta) dias</strong> após a conclusão do serviço e 
                  notificação ao cliente.
                </p>
                <p className="text-amber-700 text-xs leading-relaxed">
                  Após este prazo, a empresa <strong>não se responsabiliza</strong> pela 
                  guarda, estado ou eventuais danos ao equipamento. O cliente será 
                  notificado por telefone e/ou email para proceder ao levantamento.
                </p>
              </div>
              <div className="flex-shrink-0">
                <QRCodeSVG value={qrData} size={80} level="M" />
              </div>
            </div>
          </section>

          {/* Signature Area */}
          <div className="grid grid-cols-2 gap-8 mt-8 pt-4">
            <div className="border-t border-gray-400 pt-2">
              <p className="text-xs text-muted-foreground text-center">Assinatura do Cliente</p>
            </div>
            <div className="border-t border-gray-400 pt-2">
              <p className="text-xs text-muted-foreground text-center">Assinatura do Funcionário</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
