import { useState, useEffect } from 'react';
import { 
  Camera, 
  Package, 
  CheckCircle2, 
  ArrowLeft, 
  ArrowRight,
  FileText,
  Wrench
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
import { useAuth } from '@/contexts/AuthContext';
import { logServiceStart, logPartRequest, logServiceCompletion } from '@/utils/activityLogUtils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { CameraCapture } from '@/components/shared/CameraCapture';
import { UsedPartsModal, PartEntry } from '@/components/modals/UsedPartsModal';
import { ServicePreviousSummary } from '@/components/technician/ServicePreviousSummary';
import { DiagnosisPhotosGallery } from '@/components/technician/DiagnosisPhotosGallery';
import { useFlowPersistence } from '@/hooks/useFlowPersistence';
import type { Service } from '@/types/database';

type ModalStep = 'resumo' | 'iniciar' | 'diagnostico' | 'pecas_usadas' | 'pedir_peca' | 'conclusao';

interface WorkshopFlowModalsProps {
  service: Service;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface WorkshopFormData {
  detectedFault: string;
  workPerformed: string;
  usedParts: boolean;
  usedPartsList: PartEntry[];
  needsPartOrder: boolean;
  partToOrder: string;
  partNotes: string;
  [key: string]: unknown;
}

export function WorkshopFlowModals({ service, isOpen, onClose, onComplete }: WorkshopFlowModalsProps) {
  const updateService = useUpdateService();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const [currentStep, setCurrentStep] = useState<ModalStep>('resumo');
  const [formData, setFormData] = useState<WorkshopFormData>({
    detectedFault: '',
    workPerformed: '',
    usedParts: false,
    usedPartsList: [],
    needsPartOrder: false,
    partToOrder: '',
    partNotes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showPartsModal, setShowPartsModal] = useState(false);

  // Flow persistence
  const { loadState, saveState, clearState } = useFlowPersistence(service.id, 'oficina');

  // Check if service has previous execution history
  const hasPreviousHistory = !!service.detected_fault;

  // Load saved state or pre-fill from service
  useEffect(() => {
    if (isOpen) {
      const savedState = loadState();
      if (savedState) {
        setCurrentStep(savedState.currentStep as ModalStep);
        setFormData(savedState.formData as WorkshopFormData);
      } else {
        setCurrentStep('resumo');
        setFormData({
          detectedFault: service.detected_fault || '',
          workPerformed: service.work_performed || '',
          usedParts: false,
          usedPartsList: [],
          needsPartOrder: false,
          partToOrder: '',
          partNotes: '',
        });
      }
    }
  }, [isOpen, service, loadState]);

  // Save state on changes
  useEffect(() => {
    if (isOpen && currentStep !== 'resumo') {
      saveState(currentStep, formData);
    }
  }, [isOpen, currentStep, formData, saveState]);

  const handleStartRepair = async () => {
    try {
      await updateService.mutateAsync({
        id: service.id,
        status: 'em_execucao',
        skipToast: true,
      });
      
      // Log activity
      await logServiceStart(
        service.code || 'N/A',
        service.id,
        profile?.full_name || 'Técnico',
        user?.id
      );
      
      toast.success(`Em execução! ${service.code} está a ser reparado.`);
      setCurrentStep('diagnostico');
    } catch (error) {
      console.error('Error starting repair:', error);
      toast.error('Erro ao iniciar reparação');
    }
  };

  const handlePartsConfirm = async (parts: PartEntry[]) => {
    // Save parts to database
    for (const part of parts) {
      await supabase.from('service_parts').insert({
        service_id: service.id,
        part_name: part.name,
        part_code: part.reference || null,
        quantity: part.quantity,
        is_requested: false,
        arrived: true,
        cost: 0,
      });
    }
    
    setFormData(prev => ({ ...prev, usedPartsList: parts }));
    setShowPartsModal(false);
    queryClient.invalidateQueries({ queryKey: ['service-parts', service.id] });
    toast.success('Peças registadas!');
  };

  const handleRequestPart = async () => {
    if (!formData.partToOrder.trim()) {
      toast.error('Informe o nome da peça a pedir.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Save the part request
      await supabase.from('service_parts').insert({
        service_id: service.id,
        part_name: formData.partToOrder.trim(),
        notes: formData.partNotes || null,
        quantity: 1,
        is_requested: true,
        arrived: false,
        cost: 0,
      });

      // Update service status
      await updateService.mutateAsync({
        id: service.id,
        status: 'para_pedir_peca',
        last_status_before_part_request: service.status,
        detected_fault: formData.detectedFault,
        work_performed: formData.workPerformed,
        skipToast: true,
      });

      // Log activity
      await logPartRequest(
        service.code || 'N/A',
        service.id,
        formData.partToOrder.trim(),
        profile?.full_name || 'Técnico',
        user?.id
      );

      clearState();
      queryClient.invalidateQueries({ queryKey: ['service-parts', service.id] });
      toast.success(`Peça solicitada! ${service.code} aguarda aprovação.`);
      onComplete();
    } catch (error) {
      console.error('Error requesting part:', error);
      toast.error('Erro ao solicitar peça');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async () => {
    if (!formData.workPerformed.trim()) {
      toast.error('Descreva o trabalho realizado.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Update service to concluidos + pending_pricing
      await updateService.mutateAsync({
        id: service.id,
        status: 'concluidos',
        pending_pricing: true,
        detected_fault: formData.detectedFault,
        work_performed: formData.workPerformed,
        skipToast: true,
      });

      // Log activity
      await logServiceCompletion(
        service.code || 'N/A',
        service.id,
        profile?.full_name || 'Técnico',
        user?.id
      );

      clearState();
      toast.success(`${service.code} concluído! Aguarda precificação.`);
      onComplete();
    } catch (error) {
      console.error('Error completing repair:', error);
      toast.error('Erro ao concluir reparação');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCurrentStep('resumo');
    setFormData({
      detectedFault: '',
      workPerformed: '',
      usedParts: false,
      usedPartsList: [],
      needsPartOrder: false,
      partToOrder: '',
      partNotes: '',
    });
    onClose();
  };

  // Progress calculation (5 steps after resumo)
  const stepIndex = ['iniciar', 'diagnostico', 'pecas_usadas', 'pedir_peca', 'conclusao'].indexOf(currentStep);
  const showProgress = currentStep !== 'resumo';

  const ProgressBar = () => (
    <div className="flex gap-1.5 mb-4">
      {[0, 1, 2, 3, 4].map((idx) => (
        <div
          key={idx}
          className={cn(
            'h-1.5 flex-1 rounded-full transition-colors',
            idx <= stepIndex ? 'bg-orange-500' : 'bg-muted'
          )}
        />
      ))}
    </div>
  );

  const ModalHeader = ({ title, step }: { title: string; step: string }) => (
    <DialogHeader className="p-0 mb-3">
      <div className="bg-orange-500 text-white px-4 py-2 rounded-lg -mx-6 -mt-6 mb-3">
        <DialogTitle className="text-base font-bold text-white">Oficina</DialogTitle>
        <DialogDescription className="text-orange-100 text-xs mt-0.5">
          {service.code} - {service.customer?.name || 'Cliente'}
        </DialogDescription>
      </div>
      {showProgress && <ProgressBar />}
      <div className="flex items-center gap-2">
        <Badge className="bg-orange-100 text-orange-700 text-[10px]">{step}</Badge>
        <span className="font-semibold text-sm">{title}</span>
      </div>
    </DialogHeader>
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Modal 1: Resumo */}
      <Dialog open={currentStep === 'resumo' && !showCamera && !showPartsModal} onOpenChange={() => handleClose()}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-6">
          <ModalHeader title="Resumo do Serviço" step="Passo 1" />

          {/* Show previous summary if exists */}
          {hasPreviousHistory && (
            <ServicePreviousSummary
              service={service}
              onContinue={handleStartRepair}
              className="mb-4"
            />
          )}

          {/* Show diagnosis photos from visit */}
          <DiagnosisPhotosGallery serviceId={service.id} className="mb-4" />

          <div className="space-y-3 bg-muted/50 rounded-lg p-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-muted-foreground text-xs">Cliente</p>
                <p className="font-medium">{service.customer?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Código</p>
                <p className="font-mono font-medium">{service.code}</p>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Aparelho</p>
              <p className="font-medium">
                {[service.appliance_type, service.brand, service.model].filter(Boolean).join(' ') || 'N/A'}
              </p>
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
            {!hasPreviousHistory && (
              <Button className="flex-1 bg-orange-500 hover:bg-orange-600" onClick={handleStartRepair}>
                <Wrench className="h-4 w-4 mr-1" />
                Iniciar Reparação
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Diagnóstico Complementar */}
      <Dialog open={currentStep === 'diagnostico' && !showCamera && !showPartsModal} onOpenChange={() => handleClose()}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-6">
          <ModalHeader title="Diagnóstico" step="Passo 2" />

          <div className="space-y-4">
            <div>
              <Label htmlFor="detected_fault" className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Diagnóstico complementar <span className="text-muted-foreground text-xs">(opcional)</span>
              </Label>
              <Textarea
                id="detected_fault"
                placeholder="Adicione detalhes ao diagnóstico..."
                value={formData.detectedFault}
                onChange={(e) => setFormData(prev => ({ ...prev, detectedFault: e.target.value }))}
                rows={3}
                className="mt-1.5 text-sm"
              />
            </div>

            {/* Optional photo */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCamera(true)}
            >
              <Camera className="h-4 w-4 mr-1" />
              Tirar Foto (Opcional)
            </Button>
          </div>

          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setCurrentStep('resumo')}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <Button
              className="flex-1 bg-orange-500 hover:bg-orange-600"
              onClick={() => setCurrentStep('pecas_usadas')}
            >
              Continuar <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Peças Usadas */}
      <Dialog open={currentStep === 'pecas_usadas' && !showCamera && !showPartsModal} onOpenChange={() => handleClose()}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-6">
          <ModalHeader title="Peças Usadas" step="Passo 3" />

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Foi necessário usar peças nesta reparação?
            </p>

            <RadioGroup
              value={formData.usedParts ? 'sim' : 'nao'}
              onValueChange={(val) => setFormData(prev => ({ ...prev, usedParts: val === 'sim' }))}
              className="flex gap-4"
            >
              <label
                htmlFor="usedParts_nao"
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors',
                  !formData.usedParts
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-muted hover:border-muted-foreground/30'
                )}
              >
                <RadioGroupItem value="nao" id="usedParts_nao" />
                <span className="font-medium text-sm">Não</span>
              </label>

              <label
                htmlFor="usedParts_sim"
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors',
                  formData.usedParts
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-muted hover:border-muted-foreground/30'
                )}
              >
                <RadioGroupItem value="sim" id="usedParts_sim" />
                <span className="font-medium text-sm">Sim</span>
              </label>
            </RadioGroup>

            {formData.usedParts && (
              <div className="space-y-2">
                {formData.usedPartsList.length > 0 ? (
                  <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                    {formData.usedPartsList.map((p, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>{p.name}</span>
                        <span className="text-muted-foreground">x{p.quantity}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowPartsModal(true)}
                >
                  <Package className="h-4 w-4 mr-1" />
                  {formData.usedPartsList.length > 0 ? 'Editar Peças' : 'Registar Peças'}
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setCurrentStep('diagnostico')}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <Button
              className="flex-1 bg-orange-500 hover:bg-orange-600"
              onClick={() => setCurrentStep('pedir_peca')}
              disabled={formData.usedParts && formData.usedPartsList.length === 0}
            >
              Continuar <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 4: Pedir Peça */}
      <Dialog open={currentStep === 'pedir_peca' && !showCamera && !showPartsModal} onOpenChange={() => handleClose()}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-6">
          <ModalHeader title="Pedir Peça?" step="Passo 4" />

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              É necessário pedir alguma peça para continuar a reparação?
            </p>

            <RadioGroup
              value={formData.needsPartOrder ? 'sim' : 'nao'}
              onValueChange={(val) => setFormData(prev => ({ ...prev, needsPartOrder: val === 'sim' }))}
              className="flex gap-4"
            >
              <label
                htmlFor="needsPart_nao"
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors',
                  !formData.needsPartOrder
                    ? 'border-green-500 bg-green-50'
                    : 'border-muted hover:border-muted-foreground/30'
                )}
              >
                <RadioGroupItem value="nao" id="needsPart_nao" />
                <span className="font-medium text-sm">Não</span>
              </label>

              <label
                htmlFor="needsPart_sim"
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors',
                  formData.needsPartOrder
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-muted hover:border-muted-foreground/30'
                )}
              >
                <RadioGroupItem value="sim" id="needsPart_sim" />
                <span className="font-medium text-sm">Sim</span>
              </label>
            </RadioGroup>

            {formData.needsPartOrder && (
              <div className="space-y-3 pt-2">
                <div>
                  <Label htmlFor="partToOrder" className="text-sm">Nome da peça *</Label>
                  <Textarea
                    id="partToOrder"
                    placeholder="Nome/descrição da peça necessária..."
                    value={formData.partToOrder}
                    onChange={(e) => setFormData(prev => ({ ...prev, partToOrder: e.target.value }))}
                    rows={2}
                    className="mt-1.5 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="partNotes" className="text-sm">Observações (opcional)</Label>
                  <Textarea
                    id="partNotes"
                    placeholder="Informações adicionais..."
                    value={formData.partNotes}
                    onChange={(e) => setFormData(prev => ({ ...prev, partNotes: e.target.value }))}
                    rows={2}
                    className="mt-1.5 text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setCurrentStep('pecas_usadas')}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            {formData.needsPartOrder ? (
              <Button
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black"
                onClick={handleRequestPart}
                disabled={isSubmitting || !formData.partToOrder.trim()}
              >
                <Package className="h-4 w-4 mr-1" />
                Solicitar Peça
              </Button>
            ) : (
              <Button
                className="flex-1 bg-green-500 hover:bg-green-600"
                onClick={() => setCurrentStep('conclusao')}
              >
                Continuar <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 5: Conclusão */}
      <Dialog open={currentStep === 'conclusao' && !showCamera && !showPartsModal} onOpenChange={() => handleClose()}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-6">
          <ModalHeader title="Conclusão" step="Passo 5" />

          <div className="space-y-4">
            <div>
              <Label htmlFor="work_performed" className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Resumo da reparação *
              </Label>
              <Textarea
                id="work_performed"
                placeholder="Descreva o trabalho realizado..."
                value={formData.workPerformed}
                onChange={(e) => setFormData(prev => ({ ...prev, workPerformed: e.target.value }))}
                rows={4}
                className="mt-1.5 text-sm"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setCurrentStep('pedir_peca')}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <Button
              className="flex-1 bg-green-500 hover:bg-green-600"
              onClick={handleComplete}
              disabled={isSubmitting || !formData.workPerformed.trim()}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Concluir Reparação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Camera Modal */}
      <CameraCapture
        open={showCamera}
        onOpenChange={setShowCamera}
        onCapture={async (imageData) => {
          await supabase.from('service_photos').insert({
            service_id: service.id,
            photo_type: 'oficina',
            file_url: imageData,
            description: 'Foto da oficina',
          });
          queryClient.invalidateQueries({ queryKey: ['service-photos', service.id] });
          setShowCamera(false);
          toast.success('Foto guardada!');
        }}
        title="Foto do Aparelho"
      />

      {/* Parts Modal */}
      <UsedPartsModal
        open={showPartsModal}
        onOpenChange={setShowPartsModal}
        onConfirm={handlePartsConfirm}
        title="Registar Peças Utilizadas"
        subtitle="Adicione as peças utilizadas na reparação."
        initialParts={formData.usedPartsList.length > 0 ? formData.usedPartsList : undefined}
      />
    </>
  );
}
