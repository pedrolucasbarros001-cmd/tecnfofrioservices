import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Package, User, Wrench, Calendar, MapPin, AlertCircle, PenTool } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SERVICE_STATUS_CONFIG } from '@/types/database';
import type { Service, ServiceSignature } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { getDefaultRouteForRole } from '@/contexts/AuthContext';

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

export default function ServiceConsultPage() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();

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
      return data as Service;
    },
    enabled: !!serviceId,
  });

  // Fetch service signatures
  const { data: signatures = [] } = useQuery({
    queryKey: ['service-consult-signatures', serviceId],
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
    enabled: !!serviceId,
  });

  const handleBack = () => {
    const defaultRoute = getDefaultRouteForRole(role);
    navigate(defaultRoute);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">A carregar serviço...</p>
        </div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Serviço não encontrado</h2>
            <p className="text-muted-foreground mb-4">
              O serviço solicitado não existe ou você não tem permissão para visualizá-lo.
            </p>
            <Button onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusConfig = SERVICE_STATUS_CONFIG[service.status];

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Ficha de Serviço</h1>
            <p className="text-sm text-muted-foreground font-mono">{service.code}</p>
          </div>
          <Badge 
            variant="outline"
            style={{ 
              backgroundColor: statusConfig?.color + '20',
              borderColor: statusConfig?.color,
              color: statusConfig?.color
            }}
          >
            {statusConfig?.label || service.status}
          </Badge>
        </div>

        {/* Customer Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4" />
              Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium">{service.customer?.name || 'N/A'}</p>
            {service.customer?.phone && (
              <p className="text-muted-foreground">{service.customer.phone}</p>
            )}
            {service.customer?.email && (
              <p className="text-muted-foreground">{service.customer.email}</p>
            )}
            {(service.customer?.address || service.customer?.city) && (
              <p className="text-muted-foreground">
                {[service.customer.address, service.customer.postal_code, service.customer.city]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Equipment Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4" />
              Equipamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
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
              {service.serial_number && (
                <div>
                  <span className="text-muted-foreground">Nº Série:</span>{' '}
                  <span className="font-medium">{service.serial_number}</span>
                </div>
              )}
            </div>
            {service.fault_description && (
              <>
                <Separator />
                <div>
                  <span className="text-muted-foreground">Avaria reportada:</span>
                  <p className="font-medium mt-1">{service.fault_description}</p>
                </div>
              </>
            )}
            {service.detected_fault && (
              <div>
                <span className="text-muted-foreground">Diagnóstico:</span>
                <p className="font-medium mt-1">{service.detected_fault}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Service Details Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Detalhes do Serviço
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-muted-foreground">Categoria:</span>{' '}
                <span className="font-medium capitalize">{service.service_type || 'Reparação'}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium">
                  {service.service_location === 'cliente' ? 'Visita ao cliente' : 'Oficina'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Entrada:</span>{' '}
                <span className="font-medium">
                  {format(new Date(service.created_at), "dd/MM/yyyy", { locale: pt })}
                </span>
              </div>
              {service.scheduled_date && (
                <div>
                  <span className="text-muted-foreground">Agendado:</span>{' '}
                  <span className="font-medium">
                    {format(new Date(service.scheduled_date), "dd/MM/yyyy", { locale: pt })}
                  </span>
                </div>
              )}
            </div>
            {service.is_urgent && (
              <Badge variant="destructive" className="mt-2">Urgente</Badge>
            )}
            {service.is_warranty && (
              <Badge variant="secondary" className="mt-2 ml-2">Garantia</Badge>
            )}
          </CardContent>
        </Card>

        {/* Work Performed */}
        {service.work_performed && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Trabalho Realizado</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{service.work_performed}</p>
            </CardContent>
          </Card>
        )}

        {/* Pricing */}
        {service.final_price && service.final_price > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Valor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total:</span>
                <span className="text-lg font-bold">{service.final_price.toFixed(2)} €</span>
              </div>
              {service.amount_paid && service.amount_paid > 0 && (
                <div className="flex justify-between items-center text-sm text-green-600 mt-1">
                  <span>Pago:</span>
                  <span>{service.amount_paid.toFixed(2)} €</span>
                </div>
              )}
              {service.final_price > (service.amount_paid || 0) && (
                <div className="flex justify-between items-center text-sm text-red-600 mt-1">
                  <span>Em débito:</span>
                  <span>{(service.final_price - (service.amount_paid || 0)).toFixed(2)} €</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Signatures */}
        {signatures.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <PenTool className="h-4 w-4" />
                Assinaturas Recolhidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {signatures.map((sig) => (
                <div key={sig.id} className="flex gap-3 p-3 border rounded-lg bg-muted/30">
                  <img 
                    src={sig.file_url} 
                    alt="Assinatura" 
                    className="w-28 h-20 object-contain border bg-white rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{sig.signer_name || 'Cliente'}</p>
                    <p className="text-xs text-muted-foreground mt-1 break-words">
                      {getSignatureDescription(sig.signature_type)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(sig.signed_at), "dd/MM/yyyy 'às' HH:mm", { locale: pt })}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {service.notes && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{service.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
