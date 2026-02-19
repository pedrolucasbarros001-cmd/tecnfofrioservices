import { useRef, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { AlertTriangle, Download, PenTool, Loader2, Printer, ArrowLeft, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { SERVICE_STATUS_CONFIG } from '@/types/database';
import type { Service, ServicePart, ServicePayment, ServiceSignature, Customer } from '@/types/database';
import tecnofrioLogoFull from '@/assets/tecnofrio-logo-full.png';
import tecnofrioLogoIcon from '@/assets/tecnofrio-logo-icon.png';
import { generatePDF } from '@/utils/pdfUtils';
import { COMPANY_INFO } from '@/utils/companyInfo';
import { useAuth } from '@/contexts/AuthContext';
import { usePrintSessionBridge } from '@/hooks/usePrintSessionBridge';

// Helper: descrição amigável para tipos de assinatura
const getSignatureDescription = (type: string | null): string => {
  switch (type) {
    case 'recolha':
      return 'Autorização de levantamento do aparelho para reparação em oficina';
    case 'entrega':
      return 'Confirmação da entrega do aparelho';
    case 'visita':
      return 'Confirmação da execução do serviço no local';
    case 'pedido_peca':
      return 'Autorização para encomenda de peça';
    default:
      return 'Assinatura do cliente';
  }
};

export default function ServicePrintPage() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const printSheetRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Session bridge for new tab authentication
  const { isSettling: sessionSettling, sessionRestored } = usePrintSessionBridge();

  // Auth state from context
  const { isAuthenticated, loading: authLoading } = useAuth();

  // Fetch service data with customer - ONLY after auth is confirmed
  const { data: service, isLoading: loadingService } = useQuery({
    queryKey: ['service-print', serviceId],
    queryFn: async () => {
      if (!serviceId) return null;
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          customer:customers(*)
        `)
        .eq('id', serviceId)
        .single();
      if (error) throw error;
      return data as Service & { customer: Customer };
    },
    enabled: !!serviceId && isAuthenticated && !authLoading,
  });

  // Fetch parts used for this service
  const { data: parts = [] } = useQuery({
    queryKey: ['service-parts-print', serviceId],
    queryFn: async () => {
      if (!serviceId) return [];
      const { data, error } = await supabase
        .from('service_parts')
        .select('*')
        .eq('service_id', serviceId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as ServicePart[];
    },
    enabled: !!serviceId && isAuthenticated && !authLoading,
  });

  // Fetch payment history
  const { data: payments = [] } = useQuery({
    queryKey: ['service-payments-print', serviceId],
    queryFn: async () => {
      if (!serviceId) return [];
      const { data, error } = await supabase
        .from('service_payments')
        .select('*')
        .eq('service_id', serviceId)
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return data as ServicePayment[];
    },
    enabled: !!serviceId && isAuthenticated && !authLoading,
  });

  // Fetch service signatures
  const { data: signatures = [] } = useQuery({
    queryKey: ['service-signatures-print', serviceId],
    queryFn: async () => {
      if (!serviceId) return [];
      const { data, error } = await supabase
        .from('service_signatures')
        .select('*')
        .eq('service_id', serviceId)
        .order('signed_at', { ascending: true });
      if (error) throw error;
      return data as ServiceSignature[];
    },
    enabled: !!serviceId && isAuthenticated && !authLoading,
  });

  // Parse pricing_description to extract subtotal and IVA - must be before any returns
  const pricingDetails = useMemo(() => {
    if (!service?.pricing_description) {
      return { subtotal: service?.labor_cost || 0, iva: service?.parts_cost || 0, hasItemizedPricing: false };
    }

    try {
      const parsed = JSON.parse(service.pricing_description);
      if (parsed.items && Array.isArray(parsed.items)) {
        const subtotal = parsed.items.reduce((sum: number, item: { qty?: number; quantity?: number; price?: number; unit_price?: number }) => {
          const qty = item.qty || item.quantity || 1;
          const price = item.price || item.unit_price || 0;
          return sum + (qty * price);
        }, 0);

        const iva = parsed.items.reduce((sum: number, item: { qty?: number; quantity?: number; price?: number; unit_price?: number; tax?: number; tax_rate?: number }) => {
          const qty = item.qty || item.quantity || 1;
          const price = item.price || item.unit_price || 0;
          const tax = item.tax || item.tax_rate || 0;
          return sum + ((qty * price) * (tax / 100));
        }, 0);

        return { subtotal, iva, hasItemizedPricing: true };
      }
    } catch {
      // Fallback to existing fields
    }

    return { subtotal: service.labor_cost || 0, iva: service.parts_cost || 0, hasItemizedPricing: false };
  }, [service?.pricing_description, service?.labor_cost, service?.parts_cost]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!printSheetRef.current || !service) return;

    setIsGenerating(true);
    try {
      await generatePDF({
        element: printSheetRef.current,
        filename: `Ficha-${service.code}`
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Combined loading state: auth settling + session bridge + query loading
  const isLoading = authLoading || sessionSettling || loadingService;

  // If session bridge is done and we're still not authenticated, show login prompt
  const showLoginPrompt = !sessionSettling && !authLoading && !isAuthenticated;

  if (showLoginPrompt) {
    return (
      <div className="print-page">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <LogIn className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground text-center">
            Sessão não encontrada nesta aba.
          </p>
          <Link to={`/login?redirect=/print/service/${serviceId}`}>
            <Button>
              <LogIn className="h-4 w-4 mr-2" />
              Fazer Login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="print-page">
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">
            {sessionSettling ? 'A verificar sessão...' : authLoading ? 'A autenticar...' : 'A carregar ficha...'}
          </span>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="print-page">
        <div className="print-controls no-print">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
        <div className="flex items-center justify-center min-h-[50vh]">
          <p className="text-muted-foreground">Serviço não encontrado</p>
        </div>
      </div>
    );
  }

  const statusConfig = SERVICE_STATUS_CONFIG[service.status];
  const usedParts = parts.filter(p => !p.is_requested);
  const totalPartsCost = usedParts.reduce((sum, p) => sum + (p.cost || 0) * (p.quantity || 1), 0);
  const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="print-page">
      {/* Controls - hidden in print */}
      <div className="print-controls no-print">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
            <Button onClick={handleDownloadPDF} disabled={isGenerating}>
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {isGenerating ? 'A gerar...' : 'Baixar PDF'}
            </Button>
          </div>
        </div>
      </div>

      {/* A4 Sheet - this is what prints */}
      <div ref={printSheetRef} className="print-sheet relative bg-white">
        {/* Watermark */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04]"
          aria-hidden="true"
        >
          <img
            src={tecnofrioLogoIcon}
            alt=""
            className="w-[180mm] h-[180mm] object-contain"
          />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-1.5 relative z-10">
          <div className="flex flex-col">
            <img
              src={tecnofrioLogoFull}
              alt="TECNOFRIO"
              className="h-10 object-contain"
            />
            <div className="mt-1 text-[10px] text-muted-foreground leading-tight">
              <p>{COMPANY_INFO.address}</p>
              <p>{COMPANY_INFO.postalCode} {COMPANY_INFO.city}</p>
              <p>Tel: {COMPANY_INFO.phone} | {COMPANY_INFO.email}</p>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-lg font-bold">Ficha de Serviço</h1>
          </div>
        </div>

        <div className="mb-2">
          <p className="text-base font-mono font-bold">Código: {service.code}</p>
          <p className="text-xs text-muted-foreground">
            Data de Entrada: {format(new Date(service.created_at), "dd/MM/yyyy HH:mm", { locale: pt })}
          </p>
        </div>

        {/* Customer Data */}
        <section className="mb-2">
          <h2 className="text-xs font-semibold mb-1.5 border-b pb-0.5">Dados do Cliente</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
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

        <Separator className="my-1" />

        {/* Service Details */}
        <section className="mb-2">
          <h2 className="text-xs font-semibold mb-1.5 border-b pb-0.5">Detalhes do Serviço</h2>
          <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs">
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
              <span className="text-muted-foreground">Estado:</span>{' '}
              <span className="font-medium">{statusConfig?.label || 'N/A'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Prioridade:</span>{' '}
              <span className="font-medium">{service.is_urgent ? 'Urgente' : 'Normal'}</span>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Data Agendada:</span>{' '}
              <span className="font-medium">
                {service.scheduled_date
                  ? format(new Date(service.scheduled_date), "dd/MM/yyyy", { locale: pt })
                  : 'Não agendado'}
              </span>
            </div>
          </div>
        </section>

        <Separator className="my-1" />

        {/* Equipment Details */}
        <section className="mb-2">
          <h2 className="text-xs font-semibold mb-1.5 border-b pb-0.5">Detalhes do Equipamento</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
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
            <div>
              <span className="text-muted-foreground">PNC:</span>{' '}
              <span className="font-medium">{service.pnc || 'N/A'}</span>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Avaria:</span>{' '}
              <span className="font-medium">{service.fault_description || 'N/A'}</span>
            </div>
            {service.detected_fault && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Diagnóstico:</span>{' '}
                <span className="font-medium">{service.detected_fault}</span>
              </div>
            )}
          </div>
        </section>

        {/* Warranty Section */}
        {service.is_warranty && (
          <>
            <Separator className="my-1" />
            <section className="mb-2 bg-purple-50 rounded p-1.5">
              <h2 className="text-xs font-semibold mb-0.5 text-purple-800">Serviço em Garantia</h2>
              <div className="grid grid-cols-2 gap-x-6 text-xs">
                <div>
                  <span className="text-purple-600">Marca:</span>{' '}
                  <span className="font-medium">{service.warranty_brand || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-purple-600">Processo:</span>{' '}
                  <span className="font-medium">{service.warranty_process_number || 'N/A'}</span>
                </div>
              </div>
            </section>
          </>
        )}

        {/* Work Performed */}
        {service.work_performed && (
          <>
            <Separator className="my-1" />
            <section className="mb-2">
              <h2 className="text-xs font-semibold mb-0.5 border-b pb-0.5">Trabalho Realizado</h2>
              <p className="text-xs whitespace-pre-wrap leading-tight">{service.work_performed}</p>
            </section>
          </>
        )}

        {/* Parts Used */}
        {usedParts.length > 0 && (
          <>
            <Separator className="my-1" />
            <section className="mb-2">
              <h2 className="text-xs font-semibold mb-0.5 border-b pb-0.5">Peças Utilizadas</h2>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1">Peça</th>
                    <th className="text-left py-1">Código</th>
                    <th className="text-center py-1">Qtd</th>
                    <th className="text-right py-1">Custo</th>
                  </tr>
                </thead>
                <tbody>
                  {usedParts.map((part) => (
                    <tr key={part.id} className="border-b">
                      <td className="py-1">{part.part_name}</td>
                      <td className="py-1">{part.part_code || '-'}</td>
                      <td className="py-1 text-center">{part.quantity || 1}</td>
                      <td className="py-1 text-right">{((part.cost || 0) * (part.quantity || 1)).toFixed(2)} €</td>
                    </tr>
                  ))}
                  <tr className="font-medium">
                    <td colSpan={3} className="py-1 text-right">Total:</td>
                    <td className="py-1 text-right">{totalPartsCost.toFixed(2)} €</td>
                  </tr>
                </tbody>
              </table>
            </section>
          </>
        )}

        {/* Pricing Summary */}
        {service.final_price && service.final_price > 0 && (
          <>
            <Separator className="my-1" />
            <section className="mb-2">
              <h2 className="text-xs font-semibold mb-0.5 border-b pb-0.5">Resumo Financeiro</h2>
              <div className="grid grid-cols-2 gap-1 text-xs max-w-xs ml-auto">
                {pricingDetails.subtotal > 0 && (
                  <div className="flex justify-between col-span-2">
                    <span className="text-muted-foreground">Subtotal (s/ IVA):</span>
                    <span>{pricingDetails.subtotal.toFixed(2)} €</span>
                  </div>
                )}
                {pricingDetails.iva > 0 && (
                  <div className="flex justify-between col-span-2">
                    <span className="text-muted-foreground">IVA:</span>
                    <span>{pricingDetails.iva.toFixed(2)} €</span>
                  </div>
                )}
                {service.discount && service.discount > 0 && (
                  <div className="flex justify-between col-span-2 text-green-600">
                    <span>Desconto:</span>
                    <span>-{service.discount.toFixed(2)} €</span>
                  </div>
                )}
                <div className="flex justify-between col-span-2 font-bold text-sm border-t pt-1">
                  <span>TOTAL:</span>
                  <span>{service.final_price.toFixed(2)} €</span>
                </div>
                {totalPayments > 0 && (
                  <div className="flex justify-between col-span-2 text-green-600">
                    <span>Pago:</span>
                    <span>{totalPayments.toFixed(2)} €</span>
                  </div>
                )}
                {service.final_price > totalPayments && (
                  <div className="flex justify-between col-span-2 text-red-600 font-medium">
                    <span>Em Débito:</span>
                    <span>{(service.final_price - totalPayments).toFixed(2)} €</span>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {/* Payment History */}
        {payments.length > 0 && (
          <>
            <Separator className="my-1" />
            <section className="mb-2">
              <h2 className="text-xs font-semibold mb-0.5 border-b pb-0.5">Histórico de Pagamentos</h2>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1">Data</th>
                    <th className="text-left py-1">Método</th>
                    <th className="text-left py-1">Descrição</th>
                    <th className="text-right py-1">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b">
                      <td className="py-1">
                        {payment.payment_date
                          ? format(new Date(payment.payment_date), "dd/MM/yy", { locale: pt })
                          : '-'}
                      </td>
                      <td className="py-1 capitalize">{payment.payment_method || '-'}</td>
                      <td className="py-1">{payment.description || '-'}</td>
                      <td className="py-1 text-right">{payment.amount.toFixed(2)} €</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}

        {/* Service Signatures */}
        {signatures.length > 0 && (
          <>
            <Separator className="my-1" />
            <section className="mb-2">
              <h2 className="text-xs font-semibold mb-1 border-b pb-0.5 flex items-center gap-1">
                <PenTool className="h-3 w-3" />
                Assinaturas Recolhidas
              </h2>
              <div className="space-y-2">
                {signatures.map((sig) => (
                  <div key={sig.id} className="flex gap-2 p-1.5 border rounded bg-gray-50">
                    <img
                      src={sig.file_url}
                      alt="Assinatura"
                      className="w-24 h-14 object-contain border bg-white rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs">{sig.signer_name || 'Cliente'}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight break-words">
                        {getSignatureDescription(sig.signature_type)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {format(new Date(sig.signed_at), "dd/MM/yy HH:mm")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* Terms Section - Only for workshop services */}
        {service.service_location === 'oficina' && (
          <>
            <Separator className="my-1" />
            <section className="bg-amber-50 border border-amber-200 rounded p-1.5 text-xs">
              <h3 className="font-semibold text-amber-800 mb-0.5 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                IMPORTANTE - Termos de Guarda
              </h3>
              <p className="text-amber-700 leading-tight text-[10px]">
                Os equipamentos só podem permanecer nas instalações por <strong>30 dias</strong> após
                conclusão e notificação. Após este prazo, a empresa <strong>não se responsabiliza</strong>
                pela guarda ou danos.
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
