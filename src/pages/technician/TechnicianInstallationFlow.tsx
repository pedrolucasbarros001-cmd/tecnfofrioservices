import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Play, Camera, CheckCircle2, MapPin, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CameraCapture } from '@/components/shared/CameraCapture';
import { SignatureCanvas } from '@/components/shared/SignatureCanvas';
import { useUpdateService } from '@/hooks/useServices';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Service } from '@/types/database';

type FlowStep = 'initial' | 'in_progress' | 'photos' | 'signature' | 'completed';

export default function TechnicianInstallationFlow() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<FlowStep>('initial');
  const [showCamera, setShowCamera] = useState(false);
  const [showSignature, setShowSignature] = useState(false);

  const updateService = useUpdateService();

  const { data: service, isLoading } = useQuery({
    queryKey: ['service', serviceId],
    queryFn: async () => {
      if (!serviceId) return null;
      const { data, error } = await supabase
        .from('services')
        .select('*, customer:customers(*), technician:technicians!services_technician_id_fkey(*, profile:profiles(*))')
        .eq('id', serviceId)
        .single();

      if (error) throw error;
      return data as unknown as Service;
    },
    enabled: !!serviceId,
  });

  const handleStartInstallation = async () => {
    if (!service) return;
    try {
      await updateService.mutateAsync({
        id: service.id,
        status: 'em_execucao',
      });
      setCurrentStep('in_progress');
      toast.success('Instalação iniciada!');
    } catch (error) {
      console.error('Error starting installation:', error);
    }
  };

  const handlePhotoCapture = async (photoData: string) => {
    if (!service) return;
    try {
      // Save photo to service_photos
      await supabase.from('service_photos').insert({
        service_id: service.id,
        photo_type: 'instalacao',
        file_url: photoData,
        description: 'Foto da instalação',
      });
      toast.success('Foto guardada!');
      setShowCamera(false);
      setCurrentStep('photos');
    } catch (error) {
      console.error('Error saving photo:', error);
      toast.error('Erro ao guardar foto');
    }
  };

  const handleSignatureComplete = async (signatureData: string) => {
    if (!service) return;
    try {
      // Save signature
      await supabase.from('service_signatures').insert({
        service_id: service.id,
        signature_type: 'entrega',
        file_url: signatureData,
        signer_name: service.customer?.name,
      });

      // Update service to finalizado
      await updateService.mutateAsync({
        id: service.id,
        status: 'finalizado',
        service_location: 'entregue',
      });

      setShowSignature(false);
      setCurrentStep('completed');
      toast.success('Instalação concluída com sucesso!');
      
      // Navigate back after delay
      setTimeout(() => navigate('/servicos'), 2000);
    } catch (error) {
      console.error('Error completing installation:', error);
      toast.error('Erro ao concluir instalação');
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
            Instalação
            <Badge className="bg-blue-500">{service.code}</Badge>
          </h1>
          <p className="text-muted-foreground">Fluxo de instalação de equipamento</p>
        </div>
      </div>

      {/* Service Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            Dados do Serviço
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
              Morada
            </p>
            <p className="font-medium">
              {service.service_address || service.customer?.address || 'N/A'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Equipamento</p>
              <p className="font-medium">
                {[service.appliance_type, service.brand, service.model].filter(Boolean).join(' ') || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Data Agendada</p>
              <p className="font-medium">
                {service.scheduled_date || 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 1: Start Installation */}
          <Button
            className="w-full h-14 text-lg"
            onClick={handleStartInstallation}
            disabled={currentStep !== 'initial' && currentStep !== 'in_progress'}
          >
            <Play className="h-5 w-5 mr-2" />
            {currentStep === 'initial' ? 'Iniciar Instalação' : 'Instalação Iniciada'}
          </Button>

          {/* Step 2: Take Photos */}
          <Button
            className="w-full h-14 text-lg"
            variant="outline"
            onClick={() => setShowCamera(true)}
            disabled={currentStep === 'initial'}
          >
            <Camera className="h-5 w-5 mr-2" />
            Tirar Fotos da Instalação
          </Button>

          {/* Step 3: Complete Installation */}
          <Button
            className="w-full h-14 text-lg bg-green-600 hover:bg-green-700"
            onClick={() => setShowSignature(true)}
            disabled={currentStep === 'initial'}
          >
            <CheckCircle2 className="h-5 w-5 mr-2" />
            Concluir Instalação
          </Button>
        </CardContent>
      </Card>

      {/* Completion Message */}
      {currentStep === 'completed' && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="py-8 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-green-800">Instalação Concluída!</h2>
            <p className="text-green-600 mt-2">A redirecionar...</p>
          </CardContent>
        </Card>
      )}

      {/* Camera Modal */}
      {showCamera && (
        <CameraCapture
          open={showCamera}
          onOpenChange={setShowCamera}
          onCapture={handlePhotoCapture}
        />
      )}

      {/* Signature Modal */}
      {showSignature && (
        <SignatureCanvas
          open={showSignature}
          onOpenChange={setShowSignature}
          onComplete={handleSignatureComplete}
          title="Assinatura do Cliente para Conclusão de Instalação"
        />
      )}
    </div>
  );
}
