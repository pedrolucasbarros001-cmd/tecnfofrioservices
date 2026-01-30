import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { AlertTriangle, Download, PenTool, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { SERVICE_STATUS_CONFIG } from '@/types/database';
import type { Service, ServicePart, ServicePayment, ServiceSignature } from '@/types/database';
import tecnofrioLogoFull from '@/assets/tecnofrio-logo-full.png';
import tecnofrioLogoIcon from '@/assets/tecnofrio-logo-icon.png';
import { generatePDF } from '@/utils/pdfUtils';

interface ServicePrintModalProps {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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

  // Fetch service signatures
  const { data: signatures = [] } = useQuery({
    queryKey: ['service-signatures-print', service?.id],
    queryFn: async () => {
      if (!service?.id) return [];
      const { data, error } = await supabase
        .from('service_signatures')
        .select('*')
        .eq('service_id', service.id)
        .order('signed_at', { ascending: true });
      if (error) throw error;
      return data as ServiceSignature[];
    },
    enabled: !!service?.id && open,
  });

  const printSheetRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

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

  const statusConfig = SERVICE_STATUS_CONFIG[service.status];

  const usedParts = parts.filter(p => !p.is_requested);
  const totalPartsCost = usedParts.reduce((sum, p) => sum + (p.cost || 0) * (p.quantity || 1), 0);
  const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);

  // Print content component - rendered via portal
  const PrintContent = () => (
    <div className="print-portal print-only">
      <div className="print-content">
        {/* Watermark */}
        <div 
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          aria-hidden="true"
          style={{ opacity: 0.04 }}
        >
          <img 
            src={tecnofrioLogoIcon} 
            alt="" 
            style={{ width: '180mm', height: '180mm', objectFit: 'contain' }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-3 relative z-10">
          <img 
            src={tecnofrioLogoFull} 
            alt="TECNOFRIO" 
            style={{ height: '40px', objectFit: 'contain' }}
          />
          <div className="text-right">
            <h1 style={{ fontSize: '18px', fontWeight: 'bold' }}>Ficha de Serviço</h1>
          </div>
        </div>

        <div className="mb-3">
          <p style={{ fontSize: '14px', fontFamily: 'monospace', fontWeight: 'bold' }}>Código: {service.code}</p>
          <p style={{ fontSize: '11px', color: '#666' }}>
            Data de Entrada: {format(new Date(service.created_at), "dd/MM/yyyy HH:mm", { locale: pt })}
          </p>
        </div>

        <Separator className="my-2" />

        {/* Customer Data */}
        <section className="mb-3">
          <h2 style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px' }}>Dados do Cliente</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px', fontSize: '11px' }}>
            <div>
              <span style={{ color: '#666' }}>Nome:</span>{' '}
              <span style={{ fontWeight: '500' }}>{service.customer?.name || 'N/A'}</span>
            </div>
            <div>
              <span style={{ color: '#666' }}>Contribuinte:</span>{' '}
              <span style={{ fontWeight: '500' }}>{service.customer?.nif || 'N/A'}</span>
            </div>
            <div>
              <span style={{ color: '#666' }}>Telefone:</span>{' '}
              <span style={{ fontWeight: '500' }}>{service.customer?.phone || 'N/A'}</span>
            </div>
            <div>
              <span style={{ color: '#666' }}>Email:</span>{' '}
              <span style={{ fontWeight: '500' }}>{service.customer?.email || 'N/A'}</span>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <span style={{ color: '#666' }}>Morada:</span>{' '}
              <span style={{ fontWeight: '500' }}>
                {[service.customer?.address, service.customer?.postal_code, service.customer?.city]
                  .filter(Boolean)
                  .join(', ') || 'N/A'}
              </span>
            </div>
          </div>
        </section>

        <Separator className="my-2" />

        {/* Service Details */}
        <section className="mb-3">
          <h2 style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px' }}>Detalhes do Serviço</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px 16px', fontSize: '11px' }}>
            <div>
              <span style={{ color: '#666' }}>Categoria:</span>{' '}
              <span style={{ fontWeight: '500', textTransform: 'capitalize' }}>{service.service_type || 'Reparação'}</span>
            </div>
            <div>
              <span style={{ color: '#666' }}>Tipo:</span>{' '}
              <span style={{ fontWeight: '500' }}>
                {service.service_location === 'cliente' ? 'Visita' : 'Oficina'}
              </span>
            </div>
            <div>
              <span style={{ color: '#666' }}>Estado:</span>{' '}
              <span style={{ fontWeight: '500' }}>{statusConfig?.label || 'N/A'}</span>
            </div>
            <div>
              <span style={{ color: '#666' }}>Prioridade:</span>{' '}
              <span style={{ fontWeight: '500' }}>{service.is_urgent ? 'Urgente' : 'Normal'}</span>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <span style={{ color: '#666' }}>Data Agendada:</span>{' '}
              <span style={{ fontWeight: '500' }}>
                {service.scheduled_date 
                  ? format(new Date(service.scheduled_date), "dd/MM/yyyy", { locale: pt })
                  : 'Não agendado'}
              </span>
            </div>
          </div>
        </section>

        <Separator className="my-2" />

        {/* Equipment Details */}
        <section className="mb-3">
          <h2 style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px' }}>Detalhes do Equipamento</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px', fontSize: '11px' }}>
            <div>
              <span style={{ color: '#666' }}>Tipo:</span>{' '}
              <span style={{ fontWeight: '500' }}>{service.appliance_type || 'N/A'}</span>
            </div>
            <div>
              <span style={{ color: '#666' }}>Marca:</span>{' '}
              <span style={{ fontWeight: '500' }}>{service.brand || 'N/A'}</span>
            </div>
            <div>
              <span style={{ color: '#666' }}>Modelo:</span>{' '}
              <span style={{ fontWeight: '500' }}>{service.model || 'N/A'}</span>
            </div>
            <div>
              <span style={{ color: '#666' }}>Nº Série:</span>{' '}
              <span style={{ fontWeight: '500' }}>{service.serial_number || 'N/A'}</span>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <span style={{ color: '#666' }}>Avaria:</span>{' '}
              <span style={{ fontWeight: '500' }}>{service.fault_description || 'N/A'}</span>
            </div>
            {service.detected_fault && (
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ color: '#666' }}>Diagnóstico:</span>{' '}
                <span style={{ fontWeight: '500' }}>{service.detected_fault}</span>
              </div>
            )}
          </div>
        </section>

        {/* Warranty Section */}
        {service.is_warranty && (
          <>
            <Separator className="my-2" />
            <section className="mb-3" style={{ backgroundColor: '#faf5ff', borderRadius: '4px', padding: '8px' }}>
              <h2 style={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: '#6b21a8' }}>Serviço em Garantia</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px', fontSize: '11px' }}>
                <div>
                  <span style={{ color: '#7c3aed' }}>Marca:</span>{' '}
                  <span style={{ fontWeight: '500' }}>{service.warranty_brand || 'N/A'}</span>
                </div>
                <div>
                  <span style={{ color: '#7c3aed' }}>Processo:</span>{' '}
                  <span style={{ fontWeight: '500' }}>{service.warranty_process_number || 'N/A'}</span>
                </div>
              </div>
            </section>
          </>
        )}

        {/* Work Performed */}
        {service.work_performed && (
          <>
            <Separator className="my-2" />
            <section className="mb-3">
              <h2 style={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px' }}>Trabalho Realizado</h2>
              <p style={{ fontSize: '11px', whiteSpace: 'pre-wrap' }}>{service.work_performed}</p>
            </section>
          </>
        )}

        {/* Parts Used */}
        {usedParts.length > 0 && (
          <>
            <Separator className="my-2" />
            <section className="mb-3">
              <h2 style={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px' }}>Peças Utilizadas</h2>
              <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ textAlign: 'left', padding: '4px' }}>Peça</th>
                    <th style={{ textAlign: 'left', padding: '4px' }}>Código</th>
                    <th style={{ textAlign: 'center', padding: '4px' }}>Qtd</th>
                    <th style={{ textAlign: 'right', padding: '4px' }}>Custo</th>
                  </tr>
                </thead>
                <tbody>
                  {usedParts.map((part) => (
                    <tr key={part.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '4px' }}>{part.part_name}</td>
                      <td style={{ padding: '4px' }}>{part.part_code || '-'}</td>
                      <td style={{ textAlign: 'center', padding: '4px' }}>{part.quantity || 1}</td>
                      <td style={{ textAlign: 'right', padding: '4px' }}>{((part.cost || 0) * (part.quantity || 1)).toFixed(2)} €</td>
                    </tr>
                  ))}
                  <tr style={{ fontWeight: '500' }}>
                    <td colSpan={3} style={{ textAlign: 'right', padding: '4px' }}>Total:</td>
                    <td style={{ textAlign: 'right', padding: '4px' }}>{totalPartsCost.toFixed(2)} €</td>
                  </tr>
                </tbody>
              </table>
            </section>
          </>
        )}

        {/* Pricing Summary */}
        {service.final_price > 0 && (
          <>
            <Separator className="my-2" />
            <section className="mb-3">
              <h2 style={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px' }}>Resumo Financeiro</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', maxWidth: '200px', marginLeft: 'auto' }}>
                {service.labor_cost > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#666' }}>Mão de Obra:</span>
                    <span>{service.labor_cost.toFixed(2)} €</span>
                  </div>
                )}
                {service.parts_cost > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#666' }}>Peças:</span>
                    <span>{service.parts_cost.toFixed(2)} €</span>
                  </div>
                )}
                {service.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                    <span>Desconto:</span>
                    <span>-{service.discount.toFixed(2)} €</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '12px', borderTop: '1px solid #e5e7eb', paddingTop: '4px' }}>
                  <span>TOTAL:</span>
                  <span>{service.final_price.toFixed(2)} €</span>
                </div>
                {totalPayments > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                    <span>Pago:</span>
                    <span>{totalPayments.toFixed(2)} €</span>
                  </div>
                )}
                {service.final_price > totalPayments && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626', fontWeight: '500' }}>
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
            <Separator className="my-2" />
            <section className="mb-3">
              <h2 style={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px' }}>Histórico de Pagamentos</h2>
              <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ textAlign: 'left', padding: '4px' }}>Data</th>
                    <th style={{ textAlign: 'left', padding: '4px' }}>Método</th>
                    <th style={{ textAlign: 'left', padding: '4px' }}>Descrição</th>
                    <th style={{ textAlign: 'right', padding: '4px' }}>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '4px' }}>
                        {payment.payment_date 
                          ? format(new Date(payment.payment_date), "dd/MM/yy", { locale: pt })
                          : '-'}
                      </td>
                      <td style={{ padding: '4px', textTransform: 'capitalize' }}>{payment.payment_method || '-'}</td>
                      <td style={{ padding: '4px' }}>{payment.description || '-'}</td>
                      <td style={{ textAlign: 'right', padding: '4px' }}>{payment.amount.toFixed(2)} €</td>
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
            <Separator className="my-2" />
            <section className="mb-3">
              <h2 style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <PenTool style={{ width: '14px', height: '14px' }} />
                Assinaturas Recolhidas
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {signatures.map((sig) => (
                  <div key={sig.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px', backgroundColor: '#f9fafb' }}>
                    <img 
                      src={sig.file_url} 
                      alt="Assinatura" 
                      style={{ width: '64px', height: '32px', objectFit: 'contain', border: '1px solid #e5e7eb', backgroundColor: 'white', borderRadius: '4px' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: '500', fontSize: '11px' }}>{sig.signer_name || 'Cliente'}</p>
                      <p style={{ fontSize: '10px', color: '#666', lineHeight: '1.3' }}>
                        {getSignatureDescription(sig.signature_type)}
                      </p>
                      <p style={{ fontSize: '10px', color: '#666' }}>
                        {format(new Date(sig.signed_at), "dd/MM/yy HH:mm")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        <Separator className="my-2" />

        {/* Terms Section */}
        <section style={{ backgroundColor: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '4px', padding: '8px', fontSize: '11px' }}>
          <h3 style={{ fontWeight: '600', color: '#92400e', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <AlertTriangle style={{ width: '14px', height: '14px' }} />
            IMPORTANTE - Termos de Guarda
          </h3>
          <p style={{ color: '#a16207', lineHeight: '1.4' }}>
            Os equipamentos só podem permanecer nas instalações por <strong>30 dias</strong> após 
            conclusão e notificação. Após este prazo, a empresa <strong>não se responsabiliza</strong> 
            pela guarda ou danos.
          </p>
        </section>

      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="print-modal-a4">
        {/* Header com botões - escondido na impressão */}
        <div className="no-print flex items-center justify-between p-3 border-b bg-muted/30">
          <h2 className="font-semibold text-foreground">Pré-visualização da Ficha</h2>
          <Button onClick={handleDownloadPDF} size="sm" disabled={isGenerating}>
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {isGenerating ? 'A gerar...' : 'Baixar PDF'}
          </Button>
        </div>

        {/* Conteúdo A4 - isto é o que será impresso */}
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
            <div className="flex items-center justify-between mb-3 relative z-10">
              <img 
                src={tecnofrioLogoFull} 
                alt="TECNOFRIO" 
                className="h-10 object-contain"
              />
              <div className="text-right">
                <h1 className="text-lg font-bold">Ficha de Serviço</h1>
              </div>
            </div>

            <div className="mb-3">
              <p className="text-base font-mono font-bold">Código: {service.code}</p>
              <p className="text-xs text-muted-foreground">
                Data de Entrada: {format(new Date(service.created_at), "dd/MM/yyyy HH:mm", { locale: pt })}
              </p>
            </div>

            <Separator className="my-2" />

            {/* Customer Data */}
            <section className="mb-3">
              <h2 className="text-sm font-semibold mb-2 border-b pb-1">Dados do Cliente</h2>
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

            <Separator className="my-2" />

            {/* Service Details */}
            <section className="mb-3">
              <h2 className="text-sm font-semibold mb-2 border-b pb-1">Detalhes do Serviço</h2>
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

            <Separator className="my-2" />

            {/* Equipment Details */}
            <section className="mb-3">
              <h2 className="text-sm font-semibold mb-2 border-b pb-1">Detalhes do Equipamento</h2>
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
                <Separator className="my-2" />
                <section className="mb-3 bg-purple-50 rounded p-2">
                  <h2 className="text-sm font-semibold mb-1 text-purple-800">Serviço em Garantia</h2>
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
                <Separator className="my-2" />
                <section className="mb-3">
                  <h2 className="text-sm font-semibold mb-1 border-b pb-1">Trabalho Realizado</h2>
                  <p className="text-xs whitespace-pre-wrap">{service.work_performed}</p>
                </section>
              </>
            )}

            {/* Parts Used */}
            {usedParts.length > 0 && (
              <>
                <Separator className="my-2" />
                <section className="mb-3">
                  <h2 className="text-sm font-semibold mb-1 border-b pb-1">Peças Utilizadas</h2>
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
            {service.final_price > 0 && (
              <>
                <Separator className="my-2" />
                <section className="mb-3">
                  <h2 className="text-sm font-semibold mb-1 border-b pb-1">Resumo Financeiro</h2>
                  <div className="grid grid-cols-2 gap-1 text-xs max-w-xs ml-auto">
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
                <Separator className="my-2" />
                <section className="mb-3">
                  <h2 className="text-sm font-semibold mb-1 border-b pb-1">Histórico de Pagamentos</h2>
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
                <Separator className="my-2" />
                <section className="mb-3">
                  <h2 className="text-sm font-semibold mb-2 border-b pb-1 flex items-center gap-1">
                    <PenTool className="h-4 w-4" />
                    Assinaturas Recolhidas
                  </h2>
                  <div className="grid grid-cols-2 gap-2">
                    {signatures.map((sig) => (
                      <div key={sig.id} className="flex items-center gap-2 p-2 border rounded bg-gray-50">
                        <img 
                          src={sig.file_url} 
                          alt="Assinatura" 
                          className="w-16 h-8 object-contain border bg-white rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs truncate">{sig.signer_name || 'Cliente'}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-tight">
                            {getSignatureDescription(sig.signature_type)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(sig.signed_at), "dd/MM/yy HH:mm")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}

            <Separator className="my-2" />

            {/* Terms Section */}
            <section className="bg-amber-50 border border-amber-200 rounded p-2 text-xs">
              <h3 className="font-semibold text-amber-800 mb-1 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                IMPORTANTE - Termos de Guarda
              </h3>
              <p className="text-amber-700 leading-tight">
                Os equipamentos só podem permanecer nas instalações por <strong>30 dias</strong> após 
                conclusão e notificação. Após este prazo, a empresa <strong>não se responsabiliza</strong> 
                pela guarda ou danos.
              </p>
            </section>

        </div>
      </DialogContent>
    </Dialog>
  );
}
