import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Camera, Package, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { useUpdateService } from '@/hooks/useServices';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Service } from '@/types/database';

type WorkshopStep = 1 | 2 | 3 | 4 | 5;

export default function TechnicianWorkshopFlow() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const updateService = useUpdateService();

  const [currentStep, setCurrentStep] = useState<WorkshopStep>(1);
  const [detectedFault, setDetectedFault] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [finalizationType, setFinalizationType] = useState<'pedir_peca' | 'concluido'>('concluido');

  const { data: service, isLoading, refetch } = useQuery({
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

  // Pre-fill form with existing data
  useEffect(() => {
    if (service) {
      if (service.detected_fault) setDetectedFault(service.detected_fault);
      if (service.brand) setBrand(service.brand);
      if (service.model) setModel(service.model);
      if (service.serial_number) setSerialNumber(service.serial_number);
    }
  }, [service]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep((prev) => (prev + 1) as WorkshopStep);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as WorkshopStep);
    }
  };

  const handleStart = async () => {
    if (!service) return;
    try {
      await updateService.mutateAsync({
        id: service.id,
        status: 'em_execucao',
      });
      toast.success('Reparação iniciada!');
      handleNext();
    } catch (error) {
      console.error('Error starting repair:', error);
      toast.error('Erro ao iniciar reparação');
    }
  };

  const handleFinalize = async () => {
    if (!service) return;
    
    try {
      if (finalizationType === 'pedir_peca') {
        await updateService.mutateAsync({
          id: service.id,
          status: 'para_pedir_peca',
          detected_fault: detectedFault,
          brand,
          model,
          serial_number: serialNumber,
        });
        toast.success('Pedido de peça registado!');
      } else {
        await updateService.mutateAsync({
          id: service.id,
          status: 'concluidos',
          pending_pricing: true,
          detected_fault: detectedFault,
          brand,
          model,
          serial_number: serialNumber,
        });
        toast.success('Reparação concluída! Aguarda precificação.');
      }
      
      setTimeout(() => navigate('/servicos'), 1500);
    } catch (error) {
      console.error('Error finalizing:', error);
      toast.error('Erro ao finalizar');
    }
  };

  const handleCancel = () => {
    navigate('/servicos');
  };

  // Validation
  const canProceedFromStep2 = detectedFault.trim().length > 0;
  const canProceedFromStep3 = brand.trim().length > 0 && model.trim().length > 0;

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
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleCancel}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="bg-orange-500 text-white px-4 py-3 rounded-lg">
            <h1 className="text-xl font-bold">Oficina</h1>
            <p className="text-orange-100 text-sm">
              {service.code} - {service.customer?.name || 'Cliente'}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Bar - 4 segments for steps 2-5 */}
      {currentStep > 1 && (
        <div className="flex gap-2">
          {[2, 3, 4, 5].map((step) => (
            <div
              key={step}
              className={cn(
                'h-2 flex-1 rounded-full transition-colors',
                step <= currentStep ? 'bg-orange-500' : 'bg-gray-200'
              )}
            />
          ))}
        </div>
      )}

      {/* Step 1: Resumo */}
      {currentStep === 1 && (
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="text-center">
              <Badge className="bg-orange-100 text-orange-700 mb-4">Passo 1</Badge>
              <h2 className="text-xl font-bold">Resumo do Serviço</h2>
            </div>

            <div className="space-y-4 bg-muted/50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">{service.customer?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Código</p>
                  <p className="font-mono font-medium">{service.code}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Aparelho</p>
                <p className="font-medium">{service.appliance_type || 'N/A'}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Avaria Reportada</p>
                <p className="font-medium">{service.fault_description || 'Sem descrição'}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handleCancel}
              >
                Cancelar
              </Button>
              <Button 
                className="flex-1 bg-orange-500 hover:bg-orange-600"
                onClick={handleStart}
              >
                Começar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Contexto + Foto */}
      {currentStep === 2 && (
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="text-center">
              <Badge className="bg-orange-100 text-orange-700 mb-4">Passo 2</Badge>
              <h2 className="text-xl font-bold">Contexto e Foto</h2>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="detected_fault">Descrição da avaria detectada *</Label>
                <Textarea
                  id="detected_fault"
                  placeholder="Descreva a avaria que detectou..."
                  value={detectedFault}
                  onChange={(e) => setDetectedFault(e.target.value)}
                  rows={4}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="photo">Tirar Foto</Label>
                <div className="mt-2">
                  {photoPreview ? (
                    <div className="relative">
                      <img 
                        src={photoPreview} 
                        alt="Preview" 
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        className="absolute bottom-2 right-2"
                        onClick={() => {
                          setPhotoFile(null);
                          setPhotoPreview(null);
                        }}
                      >
                        Remover
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                      <Camera className="h-8 w-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">Clique para tirar foto</span>
                      <input
                        type="file"
                        id="photo"
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

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handlePrev}
              >
                Anterior
              </Button>
              <Button 
                className="flex-1 bg-orange-500 hover:bg-orange-600"
                onClick={handleNext}
                disabled={!canProceedFromStep2}
              >
                Continuar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Identificação */}
      {currentStep === 3 && (
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="text-center">
              <Badge className="bg-orange-100 text-orange-700 mb-4">Passo 3</Badge>
              <h2 className="text-xl font-bold">Identificação do Aparelho</h2>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="brand">Marca *</Label>
                <Input
                  id="brand"
                  placeholder="Ex: Samsung, LG, Bosch..."
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="model">Modelo *</Label>
                <Input
                  id="model"
                  placeholder="Ex: RT35K5530S8"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="serial">Número de Série (opcional)</Label>
                <Input
                  id="serial"
                  placeholder="Número de série do aparelho"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="mt-2"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handlePrev}
              >
                Anterior
              </Button>
              <Button 
                className="flex-1 bg-orange-500 hover:bg-orange-600"
                onClick={handleNext}
                disabled={!canProceedFromStep3}
              >
                Continuar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Revisão */}
      {currentStep === 4 && (
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="text-center">
              <Badge className="bg-orange-100 text-orange-700 mb-4">Passo 4</Badge>
              <h2 className="text-xl font-bold">Revisão</h2>
            </div>

            <div className="space-y-4 bg-muted/50 rounded-lg p-4">
              <div>
                <p className="text-sm text-muted-foreground">Avaria Detectada</p>
                <p className="font-medium">{detectedFault}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Marca</p>
                  <p className="font-medium">{brand}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Modelo</p>
                  <p className="font-medium">{model}</p>
                </div>
              </div>

              {serialNumber && (
                <div>
                  <p className="text-sm text-muted-foreground">Número de Série</p>
                  <p className="font-medium">{serialNumber}</p>
                </div>
              )}

              {photoPreview && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Foto</p>
                  <img 
                    src={photoPreview} 
                    alt="Foto do aparelho" 
                    className="w-full h-32 object-cover rounded-lg"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handlePrev}
              >
                Anterior
              </Button>
              <Button 
                className="flex-1 bg-orange-500 hover:bg-orange-600"
                onClick={handleNext}
              >
                Continuar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Finalização */}
      {currentStep === 5 && (
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="text-center">
              <Badge className="bg-orange-100 text-orange-700 mb-4">Passo 5</Badge>
              <h2 className="text-xl font-bold">Finalização</h2>
            </div>

            <RadioGroup 
              value={finalizationType} 
              onValueChange={(val) => setFinalizationType(val as 'pedir_peca' | 'concluido')}
              className="space-y-4"
            >
              <label 
                htmlFor="pedir_peca"
                className={cn(
                  'flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors',
                  finalizationType === 'pedir_peca' 
                    ? 'border-orange-500 bg-orange-50' 
                    : 'border-muted hover:border-muted-foreground/30'
                )}
              >
                <RadioGroupItem value="pedir_peca" id="pedir_peca" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-orange-500" />
                    <span className="font-medium">Pedir peça</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    A reparação necessita de uma peça que não está disponível
                  </p>
                </div>
              </label>

              <label 
                htmlFor="concluido"
                className={cn(
                  'flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors',
                  finalizationType === 'concluido' 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-muted hover:border-muted-foreground/30'
                )}
              >
                <RadioGroupItem value="concluido" id="concluido" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="font-medium">Reparação concluída</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    A reparação foi concluída com sucesso
                  </p>
                </div>
              </label>
            </RadioGroup>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handlePrev}
              >
                Anterior
              </Button>
              <Button 
                className={cn(
                  "flex-1",
                  finalizationType === 'concluido' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-orange-500 hover:bg-orange-600'
                )}
                onClick={handleFinalize}
              >
                Finalizar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
