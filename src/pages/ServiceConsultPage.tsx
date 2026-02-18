import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Package, Calendar, MapPin, AlertCircle, Phone, Mail, Euro } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SERVICE_STATUS_CONFIG } from '@/types/database';
import type { Service, Customer } from '@/types/database';
import { COMPANY_INFO } from '@/utils/companyInfo';
import tecnofrioLogoFull from '@/assets/tecnofrio-logo-full.png';

// Friendly status messages for clients
const STATUS_CLIENT_MESSAGES: Record<string, { title: string; description: string }> = {
  por_fazer: {
    title: 'Aguarda Agendamento',
    description: 'O seu serviço está na fila de espera para agendamento.',
  },
  em_execucao: {
    title: 'Em Execução',
    description: 'O técnico está a trabalhar no seu equipamento.',
  },
  na_oficina: {
    title: 'Na Oficina',
    description: 'O seu equipamento está na nossa oficina para diagnóstico.',
  },
  para_pedir_peca: {
    title: 'A Providenciar Peças',
    description: 'Estamos a providenciar peças necessárias para a reparação.',
  },
  em_espera_de_peca: {
    title: 'A Aguardar Peça',
    description: 'A aguardar chegada de peças encomendadas.',
  },
  a_precificar: {
    title: 'A Calcular Valor',
    description: 'A reparação foi concluída. Estamos a calcular o valor final.',
  },
  concluidos: {
    title: 'Pronto para Levantamento',
    description: 'Reparação concluída! O seu equipamento está pronto para levantamento.',
  },
  em_debito: {
    title: 'Serviço Concluído',
    description: 'Serviço concluído. Aguardamos o pagamento.',
  },
  finalizado: {
    title: 'Concluído e Entregue',
    description: 'Serviço concluído e entregue. Obrigado pela preferência!',
  },
};

export default function ServiceConsultPage() {
  const { serviceId } = useParams<{ serviceId: string }>();

  const { data: service, isLoading, error } = useQuery({
    queryKey: ['service-consult', serviceId],
    queryFn: async () => {
      if (!serviceId) throw new Error('ID do serviço não fornecido');
      
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
    enabled: !!serviceId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 to-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">A carregar serviço...</p>
        </div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 to-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Serviço não encontrado</h2>
            <p className="text-muted-foreground">
              O serviço solicitado não existe ou o link está incorreto.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusConfig = SERVICE_STATUS_CONFIG[service.status];
  const statusMessage = STATUS_CLIENT_MESSAGES[service.status] || {
    title: statusConfig?.label || 'Em Processamento',
    description: 'O seu serviço está a ser processado.',
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background p-4 md:p-6">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header with Logo */}
        <div className="text-center py-4">
          <img 
            src={tecnofrioLogoFull} 
            alt="TECNOFRIO" 
            className="h-12 mx-auto mb-2"
          />
          <p className="text-sm text-muted-foreground">
            Sistema de Acompanhamento de Serviços
          </p>
        </div>

        {/* Service Code */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Serviço</p>
          <p className="text-2xl font-bold font-mono">{service.code}</p>
        </div>

        {/* Status Card - Main Focus */}
        <Card className="border-2 shadow-lg overflow-hidden">
          <div 
            className="h-2"
            style={{ backgroundColor: statusConfig?.color || '#888' }}
          />
          <CardContent className="pt-6 text-center space-y-4">
            <Badge 
              className="text-base px-4 py-2"
              style={{ 
                backgroundColor: statusConfig?.color + '20',
                borderColor: statusConfig?.color,
                color: statusConfig?.color
              }}
            >
              {statusMessage.title}
            </Badge>
            <p className="text-muted-foreground text-lg">
              {statusMessage.description}
            </p>
          </CardContent>
        </Card>

        {/* Equipment Info */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Package className="h-4 w-4" />
              Equipamento
            </div>
            <div className="text-lg font-medium">
              {[service.appliance_type, service.brand, service.model]
                .filter(Boolean)
                .join(' ') || 'Não especificado'}
            </div>
            {service.fault_description && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Avaria:</span> {service.fault_description}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Service Details */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Entrada
              </div>
              <p className="font-medium">
                {format(new Date(service.created_at), "dd 'de' MMMM", { locale: pt })}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                Localização
              </div>
              <p className="font-medium">
                {service.service_location === 'cliente' ? 'No Cliente' : 'Oficina'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Price info
            • if a price exists show total / paid / open
            • if no price but there is an amount paid, show a minimal card with the paid value
        */}
        {service.final_price && service.final_price > 0 ? (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Euro className="h-4 w-4" />
                Valor do Serviço
              </div>
              <div className="flex items-baseline justify-between">
                <p className="text-2xl font-bold">{service.final_price.toFixed(2)} €</p>
                {service.amount_paid && service.amount_paid > 0 && (
                  <p className="text-sm text-green-600">
                    Pago: {service.amount_paid.toFixed(2)} €
                  </p>
                )}
              </div>
              {service.final_price > (service.amount_paid || 0) && (
                <p className="text-sm text-amber-600 font-medium">
                  Em aberto: {(service.final_price - (service.amount_paid || 0)).toFixed(2)} €
                </p>
              )}
            </CardContent>
          </Card>
        ) : service.amount_paid && service.amount_paid > 0 ? (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Euro className="h-4 w-4" />
                Pagamento registado
              </div>
              <p className="text-2xl font-bold text-green-600">
                {service.amount_paid.toFixed(2)} €
              </p>
              <p className="text-xs text-muted-foreground">
                Preço final ainda não definido pelo administrador.
              </p>
            </CardContent>
          </Card>
        ) : null}

        <Separator />

        {/* Access Link for clients */}
        <div className="text-center space-y-2 py-4">
          <p className="text-xs text-muted-foreground">
            Link de acesso a esta página:
          </p>
          <a 
            href={window.location.href} 
            className="text-sm text-primary underline break-all font-mono"
          >
            {window.location.href}
          </a>
        </div>

        <Separator />

        {/* Company Contact */}
        <div className="text-center space-y-3 text-sm text-muted-foreground pb-6">
          <p className="font-medium text-foreground">{COMPANY_INFO.name} - {COMPANY_INFO.city}</p>
          <div className="flex items-center justify-center gap-2">
            <Phone className="h-4 w-4" />
            <span>{COMPANY_INFO.phone}</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Mail className="h-4 w-4" />
            <span>{COMPANY_INFO.email}</span>
          </div>
          <p className="text-xs">
            {COMPANY_INFO.fullAddress}
          </p>
        </div>
      </div>
    </div>
  );
}
