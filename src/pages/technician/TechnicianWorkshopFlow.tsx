import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Play, Wrench, Package, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { RequestPartModal } from '@/components/modals/RequestPartModal';
import { useUpdateService } from '@/hooks/useServices';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Service } from '@/types/database';

const formSchema = z.object({
  detected_fault: z.string().min(1, 'Descrição da avaria é obrigatória'),
  brand: z.string().min(1, 'Marca é obrigatória'),
  model: z.string().min(1, 'Modelo é obrigatório'),
  serial_number: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type FlowStep = 'initial' | 'in_progress' | 'completed';

export default function TechnicianWorkshopFlow() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<FlowStep>('initial');
  const [showPartModal, setShowPartModal] = useState(false);

  const updateService = useUpdateService();

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

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      detected_fault: service?.detected_fault || '',
      brand: service?.brand || '',
      model: service?.model || '',
      serial_number: service?.serial_number || '',
    },
  });

  const handleStartRepair = async () => {
    if (!service) return;
    try {
      await updateService.mutateAsync({
        id: service.id,
        status: 'em_execucao',
      });
      setCurrentStep('in_progress');
      toast.success('Reparação iniciada!');
    } catch (error) {
      console.error('Error starting repair:', error);
    }
  };

  const handleCompleteRepair = async (values: FormValues) => {
    if (!service) return;
    try {
      await updateService.mutateAsync({
        id: service.id,
        status: 'concluidos',
        pending_pricing: true,
        detected_fault: values.detected_fault,
        brand: values.brand,
        model: values.model,
        serial_number: values.serial_number,
      });

      setCurrentStep('completed');
      toast.success('Reparação concluída! Aguarda precificação.');
      
      // Navigate back after delay
      setTimeout(() => navigate('/oficina'), 2000);
    } catch (error) {
      console.error('Error completing repair:', error);
      toast.error('Erro ao concluir reparação');
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
            Reparação na Oficina
            <Badge className="bg-purple-500">{service.code}</Badge>
          </h1>
          <p className="text-muted-foreground">Fluxo de reparação em oficina</p>
        </div>
      </div>

      {/* Service Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Wrench className="h-5 w-5" />
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
            <p className="text-sm text-muted-foreground">Equipamento</p>
            <p className="font-medium">
              {service.appliance_type || 'N/A'}
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

      {/* Repair Form & Actions */}
      {currentStep !== 'completed' && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleCompleteRepair)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Diagnóstico e Reparação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="detected_fault"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Resumo da Avaria Detectada *</FormLabel>
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

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="brand"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Marca *</FormLabel>
                        <FormControl>
                          <Input placeholder="Marca" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Modelo *</FormLabel>
                        <FormControl>
                          <Input placeholder="Modelo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="serial_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Série</FormLabel>
                      <FormControl>
                        <Input placeholder="Número de série (opcional)" {...field} />
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
                {/* Step 1: Start Repair */}
                <Button
                  type="button"
                  className="w-full h-14 text-lg"
                  onClick={handleStartRepair}
                  disabled={currentStep !== 'initial'}
                >
                  <Play className="h-5 w-5 mr-2" />
                  {currentStep === 'initial' ? 'Iniciar Reparação' : 'Reparação em Curso'}
                </Button>

                {/* Step 2: Request Part */}
                <Button
                  type="button"
                  className="w-full h-14 text-lg"
                  variant="outline"
                  onClick={() => setShowPartModal(true)}
                  disabled={currentStep === 'initial'}
                >
                  <Package className="h-5 w-5 mr-2" />
                  Pedir Peça
                </Button>

                {/* Step 3: Complete Repair */}
                <Button
                  type="submit"
                  className="w-full h-14 text-lg bg-green-600 hover:bg-green-700"
                  disabled={currentStep === 'initial'}
                >
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Concluir Reparação
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
            <h2 className="text-xl font-bold text-green-800">Reparação Concluída!</h2>
            <p className="text-green-600 mt-2">A aguardar precificação. A redirecionar...</p>
          </CardContent>
        </Card>
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
