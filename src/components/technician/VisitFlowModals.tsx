import { useState, useEffect } from 'react';
import { 
  Navigation, 
  MapPin, 
  Camera, 
  FileText, 
  CheckCircle2, 
  ArrowLeft, 
  ArrowRight,
  Wrench,
  Package,
  Truck
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { useUpdateService } from '@/hooks/useServices';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CameraCapture } from '@/components/shared/CameraCapture';
import { SignatureCanvas } from '@/components/shared/SignatureCanvas';
import type { Service } from '@/types/database';

type ModalStep = 'resumo' | 'deslocacao' | 'foto' | 'diagnostico' | 'decisao' | 'finalizacao';
type DecisionType = 'reparar_local' | 'levantar_oficina' | 'pedir_peca';

interface VisitFlowModalsProps {
  service: Service;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface FormData {
  detectedFault: string;
  photoFile: string | null;
  decision: DecisionType;
}

export function VisitFlowModals({ service, isOpen, onClose, onComplete }: VisitFlowModalsProps) {
  const updateService = useUpdateService();
  const [currentStep, setCurrentStep] = useState<ModalStep>('resumo');
  const [formData, setFormData] = useState<FormData>({
    detectedFault: '',
    photoFile: null,
    decision: 'reparar_local',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showSignature, setShowSignature] = useState(false);

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('resumo');
      setFormData({
        detectedFault: service.detected_fault || '',
        photoFile: null,
        decision: 'reparar_local',
      });
    }
  }, [isOpen, service]);

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
        photo_type: 'visita',
        file_url: imageData,
        description: 'Foto da visita',
      });
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
        signature_type: formData.decision === 'levantar_oficina' ? 'recolha' : 'visita',
        file_url: signatureData,
        signer_name: signerName || service.customer?.name,
      });

      // Update service based on decision
      if (formData.decision === 'reparar_local') {
        await updateService.mutateAsync({
          id: service.id,
          status: 'concluidos',
          pending_pricing: true,
          detected_fault: formData.detectedFault,
        });
        toast.success('Visita concluída! Aguarda precificação.');
      } else if (formData.decision === 'levantar_oficina') {
        await updateService.mutateAsync({
          id: service.id,
          status: 'na_oficina',
          service_location: 'oficina',
          detected_fault: formData.detectedFault,
        });
        toast.success('Aparelho recolhido para oficina!');
      }

      setShowSignature(false);
      onComplete();
    } catch (error) {
      console.error('Error completing visit:', error);
      toast.error('Erro ao concluir visita');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePedirPeca = async () => {
    setIsSubmitting(true);
    try {
      await updateService.mutateAsync({
        id: service.id,
        status: 'para_pedir_peca',
        detected_fault: formData.detectedFault,
      });
      toast.success('Pedido de peça registado!');
      onComplete();
    } catch (error) {
      console.error('Error requesting part:', error);
      toast.error('Erro ao registar pedido');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecisionConfirm = () => {
    if (formData.decision === 'pedir_peca') {
      handlePedirPeca();
    } else {
      setShowSignature(true);
    }
  };

  const handleClose = () => {
    setCurrentStep('resumo');
    setFormData({
      detectedFault: '',
      photoFile: null,
      decision: 'reparar_local',
    });
    onClose();
  };

  // Validation
  const canProceedFromFoto = formData.photoFile !== null;
  const canProceedFromDiagnostico = formData.detectedFault.trim().length > 0;

  // Progress calculation (steps 2-6 = indices 0-4)
  const stepIndex = ['deslocacao', 'foto', 'diagnostico', 'decisao', 'finalizacao'].indexOf(currentStep);
  const showProgress = currentStep !== 'resumo';

  const ProgressBar = () => (
    <div className="flex gap-1.5 mb-4">
      {[0, 1, 2, 3, 4].map((idx) => (
        <div
          key={idx}
          className={cn(
            'h-1.5 flex-1 rounded-full transition-colors',
            idx <= stepIndex ? 'bg-blue-500' : 'bg-muted'
          )}
        />
      ))}
    </div>
  );

  const ModalHeader = ({ title, step }: { title: string; step: string }) => (
    <DialogHeader className="p-0 mb-3">
      <div className="bg-blue-500 text-white px-4 py-2 rounded-lg -mx-6 -mt-6 mb-3">
        <DialogTitle className="text-base font-bold text-white">Visita</DialogTitle>
        <DialogDescription className="text-blue-100 text-xs mt-0.5">
          {service.code} - {service.customer?.name || 'Cliente'}
        </DialogDescription>
      </div>
      {showProgress && <ProgressBar />}
      <div className="flex items-center gap-2">
        <Badge className="bg-blue-100 text-blue-700 text-[10px]">{step}</Badge>
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
          <ModalHeader title="Resumo do Serviço" step="Passo 1" />

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
                <MapPin className="h-3 w-3" /> Morada
              </p>
              <p className="font-medium">
                {service.service_address || service.customer?.address || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Aparelho</p>
              <p className="font-medium">{service.appliance_type || 'N/A'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Avaria Reportada</p>
              <p className="font-medium">{service.fault_description || 'Sem descrição'}</p>
            </div>
          </div>

          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={handleClose}>
              Cancelar
            </Button>
            <Button 
              className="flex-1 bg-blue-500 hover:bg-blue-600" 
              onClick={() => setCurrentStep('deslocacao')}
            >
              Começar Visita
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Deslocação */}
      <Dialog open={currentStep === 'deslocacao' && !showCamera && !showSignature} onOpenChange={() => handleClose()}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-6">
          <ModalHeader title="Deslocação" step="Passo 2" />

          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4 text-sm">
              <p className="text-muted-foreground text-xs flex items-center gap-1 mb-1">
                <MapPin className="h-3 w-3" /> Morada do Cliente
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
              Caminho para o Cliente
            </Button>
          </div>

          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setCurrentStep('resumo')}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <Button
              className="flex-1 bg-blue-500 hover:bg-blue-600"
              onClick={() => setCurrentStep('foto')}
            >
              Cheguei ao Local <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Foto */}
      <Dialog open={currentStep === 'foto' && !showCamera && !showSignature} onOpenChange={() => handleClose()}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-6">
          <ModalHeader title="Tirar Foto" step="Passo 3" />

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Tire uma foto do aparelho para documentação.
            </p>

            {formData.photoFile ? (
              <div className="relative">
                <img
                  src={formData.photoFile}
                  alt="Foto do aparelho"
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
                <span>Tirar Foto</span>
              </Button>
            )}
          </div>

          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setCurrentStep('deslocacao')}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <Button
              className="flex-1 bg-blue-500 hover:bg-blue-600"
              onClick={() => setCurrentStep('diagnostico')}
              disabled={!canProceedFromFoto}
            >
              Continuar <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 4: Diagnóstico */}
      <Dialog open={currentStep === 'diagnostico' && !showCamera && !showSignature} onOpenChange={() => handleClose()}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-6">
          <ModalHeader title="Diagnóstico" step="Passo 4" />

          <div className="space-y-4">
            <div>
              <Label htmlFor="detected_fault" className="text-sm">
                Avaria Detectada <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="detected_fault"
                placeholder="Descreva a avaria que detectou no local..."
                value={formData.detectedFault}
                onChange={(e) => setFormData(prev => ({ ...prev, detectedFault: e.target.value }))}
                rows={4}
                className="mt-1.5 text-sm"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setCurrentStep('foto')}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <Button
              className="flex-1 bg-blue-500 hover:bg-blue-600"
              onClick={() => setCurrentStep('decisao')}
              disabled={!canProceedFromDiagnostico}
            >
              Continuar <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 5: Decisão */}
      <Dialog open={currentStep === 'decisao' && !showCamera && !showSignature} onOpenChange={() => handleClose()}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-6">
          <ModalHeader title="Decisão" step="Passo 5" />

          <RadioGroup
            value={formData.decision}
            onValueChange={(val) => setFormData(prev => ({ ...prev, decision: val as DecisionType }))}
            className="space-y-3"
          >
            <label
              htmlFor="reparar_local"
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors',
                formData.decision === 'reparar_local'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-muted hover:border-muted-foreground/30'
              )}
            >
              <RadioGroupItem value="reparar_local" id="reparar_local" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-blue-500 shrink-0" />
                  <span className="font-medium text-sm">Reparar no Local</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Serviço concluído no local do cliente
                </p>
              </div>
            </label>

            <label
              htmlFor="levantar_oficina"
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors',
                formData.decision === 'levantar_oficina'
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-muted hover:border-muted-foreground/30'
              )}
            >
              <RadioGroupItem value="levantar_oficina" id="levantar_oficina" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-orange-500 shrink-0" />
                  <span className="font-medium text-sm">Levantar para Oficina</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Recolher aparelho para reparação na oficina
                </p>
              </div>
            </label>

            <label
              htmlFor="pedir_peca"
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors',
                formData.decision === 'pedir_peca'
                  ? 'border-yellow-500 bg-yellow-50'
                  : 'border-muted hover:border-muted-foreground/30'
              )}
            >
              <RadioGroupItem value="pedir_peca" id="pedir_peca" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-yellow-600 shrink-0" />
                  <span className="font-medium text-sm">Pedir Peça</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Necessita de uma peça não disponível
                </p>
              </div>
            </label>
          </RadioGroup>

          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setCurrentStep('diagnostico')}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <Button
              className={cn(
                'flex-1',
                formData.decision === 'reparar_local'
                  ? 'bg-blue-500 hover:bg-blue-600'
                  : formData.decision === 'levantar_oficina'
                    ? 'bg-orange-500 hover:bg-orange-600'
                    : 'bg-yellow-500 hover:bg-yellow-600 text-black'
              )}
              onClick={handleDecisionConfirm}
              disabled={isSubmitting}
            >
              {formData.decision === 'pedir_peca' ? 'Confirmar Pedido' : 'Continuar'}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Camera Modal */}
      <CameraCapture
        open={showCamera}
        onOpenChange={setShowCamera}
        onCapture={handlePhotoCapture}
        title="Foto do Aparelho"
      />

      {/* Signature Modal */}
      <SignatureCanvas
        open={showSignature}
        onOpenChange={setShowSignature}
        onConfirm={handleSignatureComplete}
        title={formData.decision === 'levantar_oficina' 
          ? 'Assinatura de Recolha do Aparelho' 
          : 'Assinatura de Conclusão da Visita'}
      />
    </>
  );
}
