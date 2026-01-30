import { useState, useEffect } from 'react';
import { 
  Navigation, 
  MapPin, 
  Camera, 
  ArrowLeft, 
  ArrowRight,
  Package,
  CheckCircle2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useUpdateService } from '@/hooks/useServices';
import { useAuth } from '@/contexts/AuthContext';
import { logDelivery } from '@/utils/activityLogUtils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { CameraCapture } from '@/components/shared/CameraCapture';
import { SignatureCanvas } from '@/components/shared/SignatureCanvas';
import type { Service } from '@/types/database';

type ModalStep = 'resumo' | 'deslocacao' | 'foto' | 'finalizacao';

interface DeliveryFlowModalsProps {
  service: Service;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface FormData {
  photoFile: string | null;
}

export function DeliveryFlowModals({ service, isOpen, onClose, onComplete }: DeliveryFlowModalsProps) {
  const updateService = useUpdateService();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const [currentStep, setCurrentStep] = useState<ModalStep>('resumo');
  const [formData, setFormData] = useState<FormData>({
    photoFile: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showSignature, setShowSignature] = useState(false);

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('resumo');
      setFormData({
        photoFile: null,
      });
    }
  }, [isOpen]);

  const handleNavigateToClient = () => {
    const address = service.service_address || service.customer?.address;
    if (address) {
      const encodedAddress = encodeURIComponent(address);
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
    } else {
      toast.error('Morada não disponível');
    }
  };

  const handlePhotoCapture = async (imageData: string) => {
    try {
      await supabase.from('service_photos').insert({
        service_id: service.id,
        photo_type: 'entrega',
        file_url: imageData,
        description: 'Foto da entrega',
      });
      queryClient.invalidateQueries({ queryKey: ['service-photos', service.id] });
      setFormData(prev => ({ ...prev, photoFile: imageData }));
      setShowCamera(false);
      toast.success('Foto guardada!');
    } catch (error) {
      console.error('Error saving photo:', error);
      toast.error('Erro ao guardar foto');
    }
  };

  const handleSignatureComplete = async (signatureData: string, signerName: string) => {
    setIsSubmitting(true);
    try {
      // Save signature
      await supabase.from('service_signatures').insert({
        service_id: service.id,
        signature_type: 'entrega',
        file_url: signatureData,
        signer_name: signerName || service.customer?.name,
      });

      // Update service to finalizado
      await updateService.mutateAsync({
        id: service.id,
        status: 'finalizado',
        service_location: 'entregue',
        delivery_date: new Date().toISOString(),
      });

      // Log activity
      await logDelivery(
        service.code || 'N/A',
        service.id,
        service.customer?.name || 'Cliente',
        user?.id
      );

      queryClient.invalidateQueries({ queryKey: ['service-signatures', service.id] });
      setShowSignature(false);
      toast.success('Entrega concluída com sucesso!');
      onComplete();
    } catch (error) {
      console.error('Error completing delivery:', error);
      toast.error('Erro ao concluir entrega');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCurrentStep('resumo');
    setFormData({
      photoFile: null,
    });
    onClose();
  };

  // Progress calculation (steps 2-4 = indices 0-2)
  const stepIndex = ['deslocacao', 'foto', 'finalizacao'].indexOf(currentStep);
  const showProgress = currentStep !== 'resumo';

  const ProgressBar = () => (
    <div className="flex gap-1.5 mb-4">
      {[0, 1, 2].map((idx) => (
        <div
          key={idx}
          className={cn(
            'h-1.5 flex-1 rounded-full transition-colors',
            idx <= stepIndex ? 'bg-green-500' : 'bg-muted'
          )}
        />
      ))}
    </div>
  );

  const ModalHeader = ({ title, step }: { title: string; step: string }) => (
    <DialogHeader className="p-0 mb-3">
      <div className="bg-green-500 text-white px-4 py-2 rounded-lg -mx-6 -mt-6 mb-3">
        <DialogTitle className="text-base font-bold text-white">Entrega</DialogTitle>
        <DialogDescription className="text-green-100 text-xs mt-0.5">
          {service.code} - {service.customer?.name || 'Cliente'}
        </DialogDescription>
      </div>
      {showProgress && <ProgressBar />}
      <div className="flex items-center gap-2">
        <Badge className="bg-green-100 text-green-700 text-[10px]">{step}</Badge>
        <span className="font-semibold text-sm">{title}</span>
      </div>
    </DialogHeader>
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Modal 1: Resumo */}
      <Dialog open={currentStep === 'resumo' && !showCamera && !showSignature} onOpenChange={() => handleClose()}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-6">
          <ModalHeader title="Resumo da Entrega" step="Passo 1" />

          <div className="space-y-3 bg-muted/50 rounded-lg p-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-muted-foreground text-xs">Cliente</p>
                <p className="font-medium">{service.customer?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Telefone</p>
                <p className="font-medium">{service.customer?.phone || 'N/A'}</p>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground text-xs flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Morada de Entrega
              </p>
              <p className="font-medium">
                {service.service_address || service.customer?.address || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs flex items-center gap-1">
                <Package className="h-3 w-3" /> Item a Entregar
              </p>
              <p className="font-medium">
                {[service.appliance_type, service.brand, service.model].filter(Boolean).join(' ') || 'N/A'}
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={handleClose}>
              Cancelar
            </Button>
            <Button 
              className="flex-1 bg-green-500 hover:bg-green-600" 
              onClick={() => setCurrentStep('deslocacao')}
            >
              Caminho para o Cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Deslocação */}
      <Dialog open={currentStep === 'deslocacao' && !showCamera && !showSignature} onOpenChange={() => handleClose()}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-6">
          <ModalHeader title="Deslocação" step="Passo 2" />

          <div className="space-y-4">
            <div className="bg-green-50 rounded-lg p-4 text-sm">
              <p className="text-muted-foreground text-xs flex items-center gap-1 mb-1">
                <MapPin className="h-3 w-3" /> Morada de Entrega
              </p>
              <p className="font-medium">
                {service.service_address || service.customer?.address || 'N/A'}
              </p>
              <p className="text-muted-foreground mt-2">
                {service.customer?.phone || ''}
              </p>
            </div>

            <Button
              variant="outline"
              className="w-full h-14 text-base"
              onClick={handleNavigateToClient}
            >
              <Navigation className="h-5 w-5 mr-2" />
              Abrir no Mapa
            </Button>
          </div>

          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setCurrentStep('resumo')}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <Button
              className="flex-1 bg-green-500 hover:bg-green-600"
              onClick={() => setCurrentStep('foto')}
            >
              Cheguei ao Local <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Foto (opcional) */}
      <Dialog open={currentStep === 'foto' && !showCamera && !showSignature} onOpenChange={() => handleClose()}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-6">
          <ModalHeader title="Foto da Entrega" step="Passo 3" />

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Tire uma foto da entrega para documentação <span className="text-muted-foreground/60">(opcional)</span>.
            </p>

            {formData.photoFile ? (
              <div className="relative">
                <img
                  src={formData.photoFile}
                  alt="Foto da entrega"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute bottom-2 right-2"
                  onClick={() => setShowCamera(true)}
                >
                  Nova Foto
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full h-32 flex-col gap-2"
                onClick={() => setShowCamera(true)}
              >
                <Camera className="h-8 w-8 text-muted-foreground" />
                <span>Tirar Foto (Opcional)</span>
              </Button>
            )}
          </div>

          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setCurrentStep('deslocacao')}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <Button
              className="flex-1 bg-green-500 hover:bg-green-600"
              onClick={() => setShowSignature(true)}
              disabled={isSubmitting}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Marcar como Entregue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Camera Modal */}
      <CameraCapture
        open={showCamera}
        onOpenChange={setShowCamera}
        onCapture={handlePhotoCapture}
        title="Foto da Entrega"
      />

      {/* Signature Modal - Updated title */}
      <SignatureCanvas
        open={showSignature}
        onOpenChange={setShowSignature}
        onConfirm={handleSignatureComplete}
        title="Comprovativo de entrega"
      />
    </>
  );
}
