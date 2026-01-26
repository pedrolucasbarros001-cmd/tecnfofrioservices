import { useState, useEffect } from 'react';
import { Camera, Package, CheckCircle2, ArrowLeft, ArrowRight } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { useUpdateService } from '@/hooks/useServices';
import { toast } from 'sonner';
import type { Service } from '@/types/database';

type ModalStep = 'resumo' | 'contexto' | 'identificacao' | 'revisao' | 'finalizacao';

interface WorkshopFlowModalsProps {
  service: Service;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface FormData {
  detectedFault: string;
  photoFile: File | null;
  photoPreview: string | null;
  brand: string;
  model: string;
  serialNumber: string;
  finalizationType: 'pedir_peca' | 'concluido';
}

export function WorkshopFlowModals({ service, isOpen, onClose, onComplete }: WorkshopFlowModalsProps) {
  const updateService = useUpdateService();
  const [currentStep, setCurrentStep] = useState<ModalStep>('resumo');
  const [formData, setFormData] = useState<FormData>({
    detectedFault: '',
    photoFile: null,
    photoPreview: null,
    brand: '',
    model: '',
    serialNumber: '',
    finalizationType: 'concluido',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill form with existing data
  useEffect(() => {
    if (service && isOpen) {
      setFormData(prev => ({
        ...prev,
        detectedFault: service.detected_fault || '',
        brand: service.brand || '',
        model: service.model || '',
        serialNumber: service.serial_number || '',
      }));
      setCurrentStep('resumo');
    }
  }, [service, isOpen]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, photoFile: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photoPreview: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setFormData(prev => ({ ...prev, photoFile: null, photoPreview: null }));
  };

  const handleStart = async () => {
    try {
      await updateService.mutateAsync({
        id: service.id,
        status: 'em_execucao',
      });
      toast.success('Reparação iniciada!');
      setCurrentStep('contexto');
    } catch (error) {
      console.error('Error starting repair:', error);
      toast.error('Erro ao iniciar reparação');
    }
  };

  const handleFinalize = async () => {
    setIsSubmitting(true);
    try {
      if (formData.finalizationType === 'pedir_peca') {
        // Save current status before changing to para_pedir_peca
        const currentStatus = service.status;
        
        await updateService.mutateAsync({
          id: service.id,
          status: 'para_pedir_peca',
          detected_fault: formData.detectedFault,
          brand: formData.brand,
          model: formData.model,
          serial_number: formData.serialNumber,
          last_status_before_part_request: currentStatus,
        });
        toast.success('Pedido de peça registado!');
      } else {
        await updateService.mutateAsync({
          id: service.id,
          status: 'concluidos',
          pending_pricing: true,
          detected_fault: formData.detectedFault,
          brand: formData.brand,
          model: formData.model,
          serial_number: formData.serialNumber,
        });
        toast.success('Reparação concluída! Aguarda precificação.');
      }
      onComplete();
    } catch (error) {
      console.error('Error finalizing:', error);
      toast.error('Erro ao finalizar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCurrentStep('resumo');
    setFormData({
      detectedFault: '',
      photoFile: null,
      photoPreview: null,
      brand: '',
      model: '',
      serialNumber: '',
      finalizationType: 'concluido',
    });
    onClose();
  };

  // Validation
  const canProceedFromContexto = formData.detectedFault.trim().length > 0;
  const canProceedFromIdentificacao = formData.brand.trim().length > 0 && formData.model.trim().length > 0;

  // Progress calculation (steps 2-5 = indices 0-3)
  const stepIndex = ['contexto', 'identificacao', 'revisao', 'finalizacao'].indexOf(currentStep);
  const showProgress = currentStep !== 'resumo';

  const ProgressBar = () => (
    <div className="flex gap-1.5 mb-4">
      {[0, 1, 2, 3].map((idx) => (
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
      <Dialog open={currentStep === 'resumo'} onOpenChange={() => handleClose()}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-6">
          <ModalHeader title="Resumo do Serviço" step="Passo 1" />

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
            <Button className="flex-1 bg-orange-500 hover:bg-orange-600" onClick={handleStart}>
              Começar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Contexto + Foto */}
      <Dialog open={currentStep === 'contexto'} onOpenChange={() => handleClose()}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-6">
          <ModalHeader title="Contexto e Foto" step="Passo 2" />

          <div className="space-y-4">
            <div>
              <Label htmlFor="detected_fault" className="text-sm">
                Descrição da avaria detectada <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="detected_fault"
                placeholder="Descreva a avaria que detectou..."
                value={formData.detectedFault}
                onChange={(e) => setFormData(prev => ({ ...prev, detectedFault: e.target.value }))}
                rows={3}
                className="mt-1.5 text-sm"
              />
            </div>

            <div>
              <Label className="text-sm">Tirar Foto (opcional)</Label>
              <div className="mt-1.5">
                {formData.photoPreview ? (
                  <div className="relative">
                    <img
                      src={formData.photoPreview}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute bottom-2 right-2 text-xs h-7"
                      onClick={removePhoto}
                    >
                      Remover
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <Camera className="h-6 w-6 text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground">Clique para tirar foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handlePhotoChange}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setCurrentStep('resumo')}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <Button
              className="flex-1 bg-orange-500 hover:bg-orange-600"
              onClick={() => setCurrentStep('identificacao')}
              disabled={!canProceedFromContexto}
            >
              Continuar <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Identificação */}
      <Dialog open={currentStep === 'identificacao'} onOpenChange={() => handleClose()}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-6">
          <ModalHeader title="Identificação do Aparelho" step="Passo 3" />

          <div className="space-y-4">
            <div>
              <Label htmlFor="brand" className="text-sm">
                Marca <span className="text-destructive">*</span>
              </Label>
              <Input
                id="brand"
                placeholder="Ex: Samsung, LG, Bosch..."
                value={formData.brand}
                onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="model" className="text-sm">
                Modelo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="model"
                placeholder="Ex: RT35K5530S8"
                value={formData.model}
                onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="serial" className="text-sm">
                Número de Série (opcional)
              </Label>
              <Input
                id="serial"
                placeholder="Número de série do aparelho"
                value={formData.serialNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, serialNumber: e.target.value }))}
                className="mt-1.5"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setCurrentStep('contexto')}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <Button
              className="flex-1 bg-orange-500 hover:bg-orange-600"
              onClick={() => setCurrentStep('revisao')}
              disabled={!canProceedFromIdentificacao}
            >
              Continuar <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 4: Revisão */}
      <Dialog open={currentStep === 'revisao'} onOpenChange={() => handleClose()}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-6">
          <ModalHeader title="Revisão" step="Passo 4" />

          <div className="space-y-3 bg-muted/50 rounded-lg p-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Avaria Detectada</p>
              <p className="font-medium">{formData.detectedFault}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-muted-foreground text-xs">Marca</p>
                <p className="font-medium">{formData.brand}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Modelo</p>
                <p className="font-medium">{formData.model}</p>
              </div>
            </div>

            {formData.serialNumber && (
              <div>
                <p className="text-muted-foreground text-xs">Número de Série</p>
                <p className="font-medium">{formData.serialNumber}</p>
              </div>
            )}

            {formData.photoPreview && (
              <div>
                <p className="text-muted-foreground text-xs mb-1.5">Foto</p>
                <img
                  src={formData.photoPreview}
                  alt="Foto do aparelho"
                  className="w-full h-24 object-cover rounded-lg"
                />
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setCurrentStep('identificacao')}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <Button
              className="flex-1 bg-orange-500 hover:bg-orange-600"
              onClick={() => setCurrentStep('finalizacao')}
            >
              Continuar <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 5: Finalização */}
      <Dialog open={currentStep === 'finalizacao'} onOpenChange={() => handleClose()}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-6">
          <ModalHeader title="Finalização" step="Passo 5" />

          <RadioGroup
            value={formData.finalizationType}
            onValueChange={(val) => setFormData(prev => ({ ...prev, finalizationType: val as 'pedir_peca' | 'concluido' }))}
            className="space-y-3"
          >
            <label
              htmlFor="pedir_peca"
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors',
                formData.finalizationType === 'pedir_peca'
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-muted hover:border-muted-foreground/30'
              )}
            >
              <RadioGroupItem value="pedir_peca" id="pedir_peca" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-orange-500 shrink-0" />
                  <span className="font-medium text-sm">Pedir peça</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Necessita de uma peça não disponível
                </p>
              </div>
            </label>

            <label
              htmlFor="concluido"
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors',
                formData.finalizationType === 'concluido'
                  ? 'border-green-500 bg-green-50'
                  : 'border-muted hover:border-muted-foreground/30'
              )}
            >
              <RadioGroupItem value="concluido" id="concluido" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  <span className="font-medium text-sm">Reparação concluída</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Reparação concluída com sucesso
                </p>
              </div>
            </label>
          </RadioGroup>

          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setCurrentStep('revisao')}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <Button
              className={cn(
                'flex-1',
                formData.finalizationType === 'concluido'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-orange-500 hover:bg-orange-600'
              )}
              onClick={handleFinalize}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'A processar...' : 'Finalizar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
