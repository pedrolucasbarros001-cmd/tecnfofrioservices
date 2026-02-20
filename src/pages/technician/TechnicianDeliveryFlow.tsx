import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Navigation, CheckCircle2, MapPin, User, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SignatureCanvas } from '@/components/shared/SignatureCanvas';
import { useUpdateService, useFullServiceData } from '@/hooks/useServices';
import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Service } from '@/types/database';

export default function TechnicianDeliveryFlow() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const [showSignature, setShowSignature] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const updateService = useUpdateService();

  const { data: service, isLoading } = useFullServiceData(serviceId);

  // Initialize state from DB
  React.useEffect(() => {
    if (service && !isInitialized) {
      if (service.flow_step === 'completed' || service.status === 'finalizado' || service.service_location === 'entregue') {
        setIsCompleted(true);
      }
      setIsInitialized(true);
    }
  }, [service, isInitialized]);

  const persistStep = async (step: string) => {
    if (!serviceId) return;
    try {
      await updateService.mutateAsync({
        id: serviceId,
        flow_step: step,
      });
    } catch (error) {
      console.error('Error persisting step:', error);
    }
  };

  const handleNavigate = () => {
    if (!service) return;
    const address = service.service_address || service.customer?.address;
    if (address) {
      const encodedAddress = encodeURIComponent(address);
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
    } else {
      toast.error('Morada não disponível');
    }
  };

  const handleSignatureComplete = async (signatureData: string, signerName: string) => {
    if (!service) return;
    try {
      // Save signature
      await supabase.from('service_signatures').insert({
        service_id: service.id,
        signature_type: 'entrega',
        file_url: signatureData,
        signer_name: service.customer?.name,
      });

      // Verificar se precisa de precificacao (nao e garantia e nao tem preco)
      const needsPricing = !service.is_warranty && (service.final_price || 0) === 0;

      // Update service to finalizado - pending_pricing coexiste com status finalizado
      await updateService.mutateAsync({
        id: service.id,
        status: 'finalizado',
        service_location: 'entregue',
        delivery_date: new Date().toISOString(),
        pending_pricing: needsPricing,
      });

      setShowSignature(false);
      setIsCompleted(true);
      await persistStep('completed');
      toast.success('Entrega concluída com sucesso!');

      // Navigate back after delay
      setTimeout(() => navigate('/servicos'), 2000);
    } catch (error) {
      console.error('Error completing delivery:', error);
      toast.error('Erro ao concluir entrega');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">A carregar...</p>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Serviço não encontrado</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            Entrega
            <Badge className="bg-green-500">{service.code}</Badge>
          </h1>
          <p className="text-muted-foreground">Fluxo de entrega de equipamento</p>
        </div>
      </div>

      {/* Service Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            Dados da Entrega
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Cliente</p>
              <p className="font-medium">{service.customer?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Telefone</p>
              <p className="font-medium">{service.customer?.phone || 'N/A'}</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              Morada de Entrega
            </p>
            <p className="font-medium">
              {service.service_address || service.customer?.address || 'N/A'}
            </p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Package className="h-4 w-4" />
              Item a Entregar
            </p>
            <p className="font-medium">
              {[service.appliance_type, service.brand, service.model].filter(Boolean).join(' ') || 'N/A'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {!isCompleted && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Navigate to Client */}
            <Button
              className="w-full h-14 text-lg"
              variant="outline"
              onClick={handleNavigate}
            >
              <Navigation className="h-5 w-5 mr-2" />
              Caminho para o Cliente
            </Button>

            {/* Mark as Delivered */}
            <Button
              className="w-full h-14 text-lg bg-green-600 hover:bg-green-700"
              onClick={() => setShowSignature(true)}
            >
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Marcar como Entregue
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Completion Message */}
      {isCompleted && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="py-8 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-green-800">Entrega Concluída!</h2>
            <p className="text-green-600 mt-2">A redirecionar...</p>
          </CardContent>
        </Card>
      )}

      {/* Signature Modal */}
      {showSignature && (
        <SignatureCanvas
          open={showSignature}
          onOpenChange={setShowSignature}
          onConfirm={handleSignatureComplete}
          title="Assinatura do Cliente para Comprovativo de Entrega"
        />
      )}
    </div>
  );
}
