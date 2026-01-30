import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Navigation, Camera, Package, CheckCircle2, MapPin, User, Truck, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { CameraCapture } from '@/components/shared/CameraCapture';
import { SignatureCanvas } from '@/components/shared/SignatureCanvas';
import { RequestPartModal } from '@/components/modals/RequestPartModal';
import { useUpdateService } from '@/hooks/useServices';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Service } from '@/types/database';

const formSchema = z.object({
  detected_fault: z.string().min(1, 'Descrição da avaria é obrigatória'),
  outcome: z.enum(['fixed', 'take_to_workshop', 'need_part']),
});

type FormValues = z.infer<typeof formSchema>;

type FlowStep = 'traveling' | 'arrived' | 'working' | 'completed';

export default function TechnicianVisitFlow() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<FlowStep>('traveling');
  const [showCamera, setShowCamera] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [showPartModal, setShowPartModal] = useState(false);

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

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      detected_fault: '',
      outcome: 'fixed',
    },
  });

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

  const handleArrived = async () => {
    if (!service) return;
    try {
      await updateService.mutateAsync({
        id: service.id,
        status: 'em_execucao',
      });
      setCurrentStep('arrived');
      setShowCamera(true);
    } catch (error) {
      console.error('Error updating arrival:', error);
    }
  };

  const handlePhotoCapture = async (photoData: string) => {
    if (!service) return;
    try {
      await supabase.from('service_photos').insert({
        service_id: service.id,
        photo_type: 'visita',
        file_url: photoData,
        description: 'Foto da visita',
      });
      toast.success('Foto guardada!');
      setShowCamera(false);
      setCurrentStep('working');
    } catch (error) {
      console.error('Error saving photo:', error);
      toast.error('Erro ao guardar foto');
    }
  };

  const handleComplete = async (values: FormValues) => {
    if (!service) return;

    if (values.outcome === 'take_to_workshop') {
      // Take to workshop - need signature first
      setShowSignature(true);
    } else if (values.outcome === 'need_part') {
      // Need part - open part modal
      setShowPartModal(true);
    } else {
      // Fixed on site - need signature
      setShowSignature(true);
    }
  };

  const handleSignatureComplete = async (signatureData: string, values?: FormValues) => {
    if (!service) return;
    const formValues = values || form.getValues();

    try {
      // Save signature
      await supabase.from('service_signatures').insert({
        service_id: service.id,
        signature_type: 'visita',
        file_url: signatureData,
        signer_name: service.customer?.name,
      });

      if (formValues.outcome === 'take_to_workshop') {
        // Update to workshop - remove technician so service becomes available for assignment
        await updateService.mutateAsync({
          id: service.id,
          status: 'por_fazer',           // Trigger will enforce this anyway
          service_location: 'oficina',
          technician_id: null,           // REMOVE technician - service becomes available
          detected_fault: formValues.detected_fault,
          scheduled_date: null,          // Clear schedule - will be set when assumed
          scheduled_shift: null,
        });
        toast.success('Equipamento marcado para levar à oficina');
      } else {
        // Fixed on site - finalize
        await updateService.mutateAsync({
          id: service.id,
          status: 'concluidos',
          pending_pricing: true,
          detected_fault: formValues.detected_fault,
        });
        toast.success('Visita concluída!');
      }

      setShowSignature(false);
      setCurrentStep('completed');
      
      setTimeout(() => navigate('/servicos'), 2000);
    } catch (error) {
      console.error('Error completing visit:', error);
      toast.error('Erro ao concluir visita');
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
            Visita ao Cliente
            <Badge className="bg-blue-500">{service.code}</Badge>
          </h1>
          <p className="text-muted-foreground">Fluxo de visita técnica</p>
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

          <div>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Avaria Reportada
            </p>
            <p className="font-medium">
              {service.fault_description || 'N/A'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Actions based on step */}
      {currentStep === 'traveling' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Deslocação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              className="w-full h-14 text-lg"
              variant="outline"
              onClick={handleNavigate}
            >
              <Navigation className="h-5 w-5 mr-2" />
              Caminho para o Cliente
            </Button>

            <Button
              className="w-full h-14 text-lg"
              onClick={handleArrived}
            >
              <Camera className="h-5 w-5 mr-2" />
              Cheguei ao Local
            </Button>
          </CardContent>
        </Card>
      )}

      {(currentStep === 'arrived' || currentStep === 'working') && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleComplete)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Diagnóstico</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="detected_fault"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Qual avaria detectada? *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descreva a avaria detectada..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="outcome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Resultado da visita</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="space-y-3"
                        >
                          <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent">
                            <RadioGroupItem value="fixed" id="fixed" />
                            <Label htmlFor="fixed" className="cursor-pointer flex-1">
                              <span className="font-medium">Reparado no local</span>
                              <p className="text-sm text-muted-foreground">O equipamento foi reparado</p>
                            </Label>
                          </div>
                          <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent">
                            <RadioGroupItem value="take_to_workshop" id="take_to_workshop" />
                            <Label htmlFor="take_to_workshop" className="cursor-pointer flex-1">
                              <span className="font-medium">Levar para Oficina</span>
                              <p className="text-sm text-muted-foreground">Precisa de reparação em oficina</p>
                            </Label>
                          </div>
                          <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent">
                            <RadioGroupItem value="need_part" id="need_part" />
                            <Label htmlFor="need_part" className="cursor-pointer flex-1">
                              <span className="font-medium">Precisa de Peça</span>
                              <p className="text-sm text-muted-foreground">É necessário encomendar peça</p>
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  type="button"
                  className="w-full h-14 text-lg"
                  variant="outline"
                  onClick={() => setShowCamera(true)}
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Tirar Mais Fotos
                </Button>

                <Button
                  type="button"
                  className="w-full h-14 text-lg"
                  variant="outline"
                  onClick={() => setShowPartModal(true)}
                >
                  <Package className="h-5 w-5 mr-2" />
                  Pedir Peça
                </Button>

                <Button
                  type="submit"
                  className="w-full h-14 text-lg bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Concluir Visita
                </Button>
              </CardContent>
            </Card>
          </form>
        </Form>
      )}

      {/* Completion Message */}
      {currentStep === 'completed' && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="py-8 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-green-800">Visita Concluída!</h2>
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
          onConfirm={(signatureData, _signerName) => handleSignatureComplete(signatureData, form.getValues())}
          title="Assinatura do Cliente para Conclusão de Visita"
        />
      )}

      {/* Request Part Modal */}
      <RequestPartModal
        service={service}
        open={showPartModal}
        onOpenChange={setShowPartModal}
      />
    </div>
  );
}
