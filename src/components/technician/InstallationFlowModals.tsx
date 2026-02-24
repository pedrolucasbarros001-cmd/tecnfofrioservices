import { useState, useEffect } from 'react';
import {
  Navigation,
  MapPin,
  Camera,
  ArrowLeft,
  ArrowRight,
  ImageIcon,
  Package,
  FileText
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
import { cn } from '@/lib/utils';
import { useUpdateService } from '@/hooks/useServices';
import { useAuth } from '@/contexts/AuthContext';
import { logServiceCompletion } from '@/utils/activityLogUtils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { CameraCapture } from '@/components/shared/CameraCapture';
import { SignatureCanvas } from '@/components/shared/SignatureCanvas';
import { UsedPartsModal, PartEntry } from '@/components/modals/UsedPartsModal';
import { FieldPaymentStep } from '@/components/technician/FieldPaymentStep';
import { useFlowPersistence, deriveStepFromDb } from '@/hooks/useFlowPersistence';
import type { Service } from '@/types/database';

type ModalStep = 'resumo' | 'deslocacao' | 'foto_antes' | 'materiais' | 'trabalho' | 'foto_depois' | 'finalizacao';

interface InstallationFlowModalsProps {
  service: Service;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface InstallationFormData {
  photoAntes: string | null;
  photoDepois: string | null;
  workPerformed: string;
  usedMaterials: PartEntry[];
  [key: string]: unknown;
}

export function InstallationFlowModals({ service, isOpen, onClose, onComplete }: InstallationFlowModalsProps) {
  const updateService = useUpdateService();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const [currentStep, setCurrentStep] = useState<ModalStep>('resumo');
  const [formData, setFormData] = useState<InstallationFormData>({
    photoAntes: null,
    photoDepois: null,
    workPerformed: '',
    usedMaterials: [],
  });
  const [derivedResumeStep, setDerivedResumeStep] = useState<ModalStep | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [showMaterialsModal, setShowMaterialsModal] = useState(false);
  const [cameraMode, setCameraMode] = useState<'antes' | 'depois'>('antes');
  const [showPayment, setShowPayment] = useState(false);
  const [isResuming, setIsResuming] = useState(false);

  // Flow persistence
  const { loadState, saveState, saveStateToDb, clearState } = useFlowPersistence(service.id, 'instalacao');

  // Load saved state on mount
  useEffect(() => {
    if (!isOpen) {
      setIsResuming(false);
      return;
    }

    const savedState = loadState();
    if (savedState) {
      setCurrentStep(savedState.currentStep as ModalStep);
      setFormData(savedState.formData as InstallationFormData);
      return;
    }

    setIsResuming(true);
    // No localStorage → derive step from DB (handles phone/browser restart)
    deriveStepFromDb(service.id, 'instalacao', service as unknown as Record<string, unknown>).then(({ step, formDataOverrides }) => {
      const resumeStep = step === 'resumo' ? 'resumo' : step;
      setDerivedResumeStep(resumeStep as ModalStep);

      // Show Resumo first
      setCurrentStep('resumo');

      setFormData((prev) => ({
        ...prev,
        ...formDataOverrides,
      }));
      setIsResuming(false);
    }).catch(() => setIsResuming(false));
  }, [isOpen, loadState, service]);

  // Save state on step/formData change
  useEffect(() => {
    if (isOpen && currentStep !== 'resumo') {
      saveState(currentStep, formData);
      saveStateToDb(currentStep, formData);
    }
  }, [isOpen, currentStep, formData, saveState, saveStateToDb]);

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
        photo_type: cameraMode === 'antes' ? 'instalacao_antes' : 'instalacao_depois',
        file_url: imageData,
        description: cameraMode === 'antes' ? 'Foto antes da instalação' : 'Foto após instalação',
      });

      queryClient.invalidateQueries({ queryKey: ['service-photos', service.id] });

      if (cameraMode === 'antes') {
        setFormData(prev => ({ ...prev, photoAntes: imageData }));
      } else {
        setFormData(prev => ({ ...prev, photoDepois: imageData }));
      }

      setShowCamera(false);
      toast.success('Foto guardada!');
    } catch (error) {
      console.error('Error saving photo:', error);
      toast.error('Erro ao guardar foto');
    }
  };

  const handleMaterialsConfirm = async (materials: PartEntry[]) => {
    // Save materials to database
    for (const material of materials) {
      await supabase.from('service_parts').insert({
        service_id: service.id,
        part_name: material.name,
        part_code: material.reference || null,
        quantity: material.quantity,
        is_requested: false,
        arrived: true,
        cost: 0,
      });
    }

    setFormData(prev => ({ ...prev, usedMaterials: materials }));
    setShowMaterialsModal(false);
    queryClient.invalidateQueries({ queryKey: ['service-parts', service.id] });
    toast.success('Materiais registados!');

    // Advance to next step
    setCurrentStep('trabalho');
  };

  const handleSignatureComplete = async (signatureData: string, signerName: string) => {
    setIsSubmitting(true);
    try {
      // Save signature
      await supabase.from('service_signatures').insert({
        service_id: service.id,
        signature_type: 'instalacao',
        file_url: signatureData,
        signer_name: signerName || service.customer?.name,
      });

      // Determine final status - installations go to a_precificar
      const needsPricing = !service.is_warranty && (service.final_price || 0) === 0;

      await updateService.mutateAsync({
        id: service.id,
        status: needsPricing ? 'a_precificar' : 'finalizado',
        service_location: 'entregue',
        pending_pricing: needsPricing,
        work_performed: formData.workPerformed || 'Instalação realizada',
      });

      // Log activity
      await logServiceCompletion(
        service.code || 'N/A',
        service.id,
        profile?.full_name || 'Técnico',
        user?.id
      );

      // Clear persisted state (localStorage + DB)
      clearState();
      saveStateToDb(null as any);

      queryClient.invalidateQueries({ queryKey: ['service-signatures', service.id] });
      setShowSignature(false);
      toast.success(needsPricing ? 'Instalação concluída! Aguarda precificação.' : 'Instalação concluída com sucesso!');
      onComplete();
    } catch (error) {
      console.error('Error completing installation:', error);
      toast.error('Erro ao concluir instalação');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCurrentStep('resumo');
    setFormData({
      photoAntes: null,
      photoDepois: null,
      workPerformed: '',
      usedMaterials: [],
    });
    onClose();
  };

  const openCameraAntes = () => {
    setCameraMode('antes');
    setShowCamera(true);
  };

  const openCameraDepois = () => {
    setCameraMode('depois');
    setShowCamera(true);
  };

  // Validation
  const canProceedFromFotoAntes = formData.photoAntes !== null;
  const canProceedFromFotoDepois = formData.photoDepois !== null;

  // Progress calculation (6 steps after resumo)
  const stepIndex = ['deslocacao', 'foto_antes', 'materiais', 'trabalho', 'foto_depois', 'finalizacao'].indexOf(currentStep);
  const showProgress = currentStep !== 'resumo';

  const ProgressBar = () => (
    <div className="flex gap-1.5 mb-4">
      {[0, 1, 2, 3, 4, 5].map((idx) => (
        <div
          key={idx}
          className={cn(
            'h-1.5 flex-1 rounded-full transition-colors',
            idx <= stepIndex ? 'bg-yellow-500' : 'bg-muted'
          )}
        />
      ))}
    </div>
  );

  const ModalHeader = ({ title, step }: { title: string; step: string }) => (
    <DialogHeader className="p-0 mb-3">
      <div className="bg-yellow-500 text-black px-4 py-2 rounded-lg -mx-6 -mt-6 mb-3">
        <DialogTitle className="text-base font-bold text-black">Instalação</DialogTitle>
        <DialogDescription className="text-yellow-800 text-xs mt-0.5">
          {service.code} - {service.customer?.name || 'Cliente'}
        </DialogDescription>
      </div>
      {showProgress && <ProgressBar />}
      <div className="flex items-center gap-2">
        <Badge className="bg-yellow-100 text-yellow-700 text-[10px]">{step}</Badge>
        <span className="font-semibold text-sm">{title}</span>
      </div>
    </DialogHeader>
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Modal 1: Resumo */}
      <Dialog open={currentStep === 'resumo' && !showCamera && !showSignature && !showMaterialsModal && !showPayment} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto p-6" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
          <ModalHeader title="Resumo da Instalação" step="Passo 1" />

          <div className="space-y-3 bg-muted/50 rounded-lg p-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-muted-foreground text-xs">Cliente</p>
                <p className="font-medium">{service.customer?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Telefone</p>
                {(service.contact_phone || service.customer?.phone) ? (
                  <a href={`tel:${service.contact_phone || service.customer?.phone}`} className="font-medium text-primary hover:underline">
                    {service.contact_phone || service.customer?.phone}
                  </a>
                ) : (
                  <p className="font-medium">N/A</p>
                )}
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
              <p className="text-muted-foreground text-xs">Equipamento a Instalar</p>
              <p className="font-medium">
                {[service.appliance_type, service.brand, service.model].filter(Boolean).join(' ') || 'N/A'}
              </p>
            </div>
            {service.fault_description && (
              <div>
                <p className="text-muted-foreground text-xs">Observações</p>
                <p className="font-medium">{service.fault_description}</p>
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
              onClick={() => {
                if (derivedResumeStep && derivedResumeStep !== 'resumo') {
                  setCurrentStep(derivedResumeStep);
                } else {
                  setCurrentStep('deslocacao');
                }
              }}
              disabled={isResuming}
            >
              {isResuming ? "A carregar..." : "Iniciar Instalação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Deslocação */}
      <Dialog open={currentStep === 'deslocacao' && !showCamera && !showSignature && !showMaterialsModal && !showPayment} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto p-6" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
          <ModalHeader title="Deslocação" step="Passo 2" />

          <div className="space-y-4">
            <div className="bg-yellow-50 rounded-lg p-4 text-sm">
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
              Abrir no Mapa
            </Button>
          </div>

          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setCurrentStep('resumo')}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <Button
              className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black"
              onClick={() => setCurrentStep('foto_antes')}
            >
              Cheguei ao Local <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Foto Antes */}
      <Dialog open={currentStep === 'foto_antes' && !showCamera && !showSignature && !showMaterialsModal && !showPayment} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto p-6" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
          <ModalHeader title="Foto Antes da Instalação" step="Passo 3" />

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Tire uma foto do local <strong>antes</strong> de iniciar a instalação.
            </p>

            {formData.photoAntes ? (
              <div className="relative">
                <img
                  src={formData.photoAntes}
                  alt="Foto antes"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute bottom-2 right-2"
                  onClick={openCameraAntes}
                >
                  Nova Foto
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full h-32 flex-col gap-2"
                onClick={openCameraAntes}
              >
                <Camera className="h-8 w-8 text-muted-foreground" />
                <span>Tirar Foto (Antes)</span>
              </Button>
            )}
          </div>

          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setCurrentStep('deslocacao')}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <Button
              className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black"
              onClick={() => setCurrentStep('materiais')}
              disabled={!canProceedFromFotoAntes}
            >
              Continuar <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 4: Materiais */}
      <Dialog open={currentStep === 'materiais' && !showCamera && !showSignature && !showMaterialsModal && !showPayment} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto p-6" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
          <ModalHeader title="Materiais Utilizados" step="Passo 4" />

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Registe os materiais utilizados na instalação (tubagem, cabos, acessórios, etc.)
            </p>

            {formData.usedMaterials.length > 0 ? (
              <div className="space-y-2">
                <Label className="text-sm">Materiais registados:</Label>
                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  {formData.usedMaterials.map((m, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{m.name}</span>
                      <span className="text-muted-foreground">x{m.quantity}</span>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMaterialsModal(true)}
                >
                  Editar materiais
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full h-24 flex-col gap-2"
                onClick={() => setShowMaterialsModal(true)}
              >
                <Package className="h-6 w-6 text-muted-foreground" />
                <span>Registar Materiais</span>
              </Button>
            )}
          </div>

          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setCurrentStep('foto_antes')}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <Button
              className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black"
              onClick={() => setCurrentStep('trabalho')}
            >
              {formData.usedMaterials.length > 0 ? 'Continuar' : 'Sem Materiais'}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 5: Descrição do Trabalho */}
      <Dialog open={currentStep === 'trabalho' && !showCamera && !showSignature && !showMaterialsModal && !showPayment} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto p-6" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
          <ModalHeader title="Descrição do Trabalho" step="Passo 5" />

          <div className="space-y-4">
            <div>
              <Label htmlFor="work_performed" className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Descreva o trabalho realizado
              </Label>
              <Textarea
                id="work_performed"
                placeholder="Descreva brevemente a instalação realizada..."
                value={formData.workPerformed}
                onChange={(e) => setFormData(prev => ({ ...prev, workPerformed: e.target.value }))}
                rows={4}
                className="mt-1.5 text-sm"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setCurrentStep('materiais')}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <Button
              className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black"
              onClick={() => setCurrentStep('foto_depois')}
            >
              Continuar <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 6: Foto Depois */}
      <Dialog open={currentStep === 'foto_depois' && !showCamera && !showSignature && !showMaterialsModal && !showPayment} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-md max-w-[95vw] max-h-[90vh] overflow-y-auto p-6" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
          <ModalHeader title="Foto Após a Instalação" step="Passo 6" />

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Tire uma foto do equipamento instalado <strong>após</strong> a conclusão.
            </p>

            <div className="grid grid-cols-2 gap-2">
              {/* Preview foto antes */}
              <div className="relative">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" /> Antes
                </p>
                {formData.photoAntes && (
                  <img
                    src={formData.photoAntes}
                    alt="Foto antes"
                    className="w-full h-24 object-cover rounded-lg opacity-70"
                  />
                )}
              </div>

              {/* Foto depois */}
              <div>
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" /> Depois
                </p>
                {formData.photoDepois ? (
                  <div className="relative">
                    <img
                      src={formData.photoDepois}
                      alt="Foto depois"
                      className="w-full h-24 object-cover rounded-lg"
                    />
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full h-24 flex-col gap-1 text-xs"
                    onClick={openCameraDepois}
                  >
                    <Camera className="h-5 w-5 text-muted-foreground" />
                    <span>Tirar Foto</span>
                  </Button>
                )}
              </div>
            </div>

            {formData.photoDepois && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={openCameraDepois}
              >
                <Camera className="h-4 w-4 mr-2" />
                Tirar Nova Foto (Depois)
              </Button>
            )}
          </div>

          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setCurrentStep('trabalho')}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <Button
              className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black"
              onClick={() => setShowPayment(true)}
              disabled={!canProceedFromFotoDepois || isSubmitting}
            >
              Concluir Instalação <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Camera Modal */}
      <CameraCapture
        open={showCamera}
        onOpenChange={setShowCamera}
        onCapture={handlePhotoCapture}
        title={cameraMode === 'antes' ? 'Foto Antes da Instalação' : 'Foto Após a Instalação'}
      />

      {/* Materials Modal */}
      <UsedPartsModal
        open={showMaterialsModal}
        onOpenChange={setShowMaterialsModal}
        onConfirm={handleMaterialsConfirm}
        title="Registar Material Utilizado"
        subtitle="Adicione os materiais utilizados na instalação (tubagem, cabos, acessórios, etc.)"
        initialParts={formData.usedMaterials.length > 0 ? formData.usedMaterials : undefined}
      />

      {/* Payment Step - Before Signature */}
      <FieldPaymentStep
        service={service}
        open={showPayment}
        onSkip={() => { setShowPayment(false); setShowSignature(true); }}
        onComplete={() => { setShowPayment(false); setShowSignature(true); }}
        headerBg="bg-yellow-500"
        headerText="text-black"
        badgeBg="bg-yellow-100"
        badgeText="text-yellow-700"
        flowTitle="Instalação"
      />

      {/* Signature Modal - Updated title */}
      <SignatureCanvas
        open={showSignature}
        onOpenChange={setShowSignature}
        onConfirm={handleSignatureComplete}
        title="Confirmação de instalação realizada"
      />
    </>
  );
}
