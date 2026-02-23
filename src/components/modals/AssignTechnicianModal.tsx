import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { humanizeError } from '@/utils/errorMessages';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useTechnicians } from '@/hooks/useTechnicians';
import { useUpdateService } from '@/hooks/useServices';
import { notifyServiceAssigned } from '@/utils/notificationUtils';
import { logTechnicianAssignment } from '@/utils/activityLogUtils';
import { formatShiftLabel } from '@/utils/dateUtils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Service, ServiceStatus } from '@/types/database';

const formSchema = z.object({
  technician_id: z.string().min(1, 'Selecione um técnico'),
  scheduled_date: z.date({ required_error: 'Selecione uma data' }),
  scheduled_shift: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AssignTechnicianModalProps {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AssignTechnicianModal({
  service,
  open,
  onOpenChange,
  onSuccess,
}: AssignTechnicianModalProps) {
  const { user, profile } = useAuth();
  const { data: technicians = [] } = useTechnicians();
  const updateService = useUpdateService();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      technician_id: service?.technician_id || '',
      scheduled_date: service?.scheduled_date ? new Date(service.scheduled_date) : undefined,
      scheduled_shift: service?.scheduled_shift || '',
    },
  });

  const handleSubmit = async (values: FormValues) => {
    if (!service) return;

    try {
      // Determinar o status correto com base nas regras:
      // - Oficina + técnico atribuído: 'na_oficina' (se estiver em estado inicial)
      // - Estados avançados não devem ser revertidos (em_execucao, para_pedir_peca, etc.)
      // - Cliente: não alterar status (manter como está)
      const advancedStates = ['em_execucao', 'para_pedir_peca', 'em_espera_de_peca', 'a_precificar', 'concluidos', 'finalizado'];
      const isAdvancedState = advancedStates.includes(service.status);

      let newStatus: ServiceStatus | undefined;
      if (!isAdvancedState) {
        if (service.service_location === 'oficina') {
          // Na oficina: atribuir técnico = 'na_oficina'
          newStatus = 'na_oficina';
        }
        // Para cliente: não definir status (deixar o trigger do banco normalizar se necessário)
      }
      // Se já está em estado avançado, não incluir status no update

      await updateService.mutateAsync({
        id: service.id,
        technician_id: values.technician_id,
        scheduled_date: values.scheduled_date.toISOString().split('T')[0],
        scheduled_shift: (values.scheduled_shift as any) || null,
        ...(newStatus && { status: newStatus }),
        skipToast: true, // We'll show contextual message below
      });

      // Get the technician's user_id to send notification and show contextual feedback
      const selectedTech = technicians.find(t => t.id === values.technician_id);
      if (selectedTech?.profile_id) {
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .eq('id', selectedTech.profile_id)
            .maybeSingle();

          if (profileData?.user_id) {
            // Send notification
            await notifyServiceAssigned(
              service.id,
              service.code || 'N/A',
              profileData.user_id,
              values.scheduled_date.toISOString().split('T')[0],
              values.scheduled_shift
            );

            // Log activity
            await logTechnicianAssignment(
              service.code || 'N/A',
              service.id,
              profileData.full_name || 'Técnico',
              user?.id,
              profile?.full_name || undefined
            );
          }
        } catch (notificationError) {
          // Log but don't fail - notification is not critical
          console.warn('Failed to send notification:', notificationError);
        }
      }

      // Show contextual feedback message
      const techName = selectedTech?.profile?.full_name || 'Técnico';
      if (service.service_location === 'oficina') {
        toast.success(`${techName} atribuído! Serviço na oficina, aguarda início.`);
      } else {
        const dateStr = format(values.scheduled_date, "dd/MM", { locale: pt });
        const timeLabel = formatShiftLabel(values.scheduled_shift) || 'sem turno';
        toast.success(`${techName} agendado para ${dateStr}, ${timeLabel}.`);
      }

      onOpenChange(false);
      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error('Error assigning technician:', error);
      toast.error(humanizeError(error));
    }
  };

  if (!service) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-w-[95vw] max-h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle>Atribuir Técnico - {service.code}</DialogTitle>
          <p className="text-sm text-muted-foreground">O técnico selecionado receberá uma notificação com os detalhes do serviço.</p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
            <div className="space-y-6 px-6 py-4">
              <FormField
                control={form.control}
                name="technician_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Técnico *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar técnico" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {technicians.length === 0 ? (
                          <SelectItem value="" disabled>
                            Nenhum técnico disponível
                          </SelectItem>
                        ) : (
                          technicians.map((tech) => (
                            <SelectItem key={tech.id} value={tech.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: tech.color || '#3B82F6' }}
                                />
                                {tech.profile?.full_name || 'Técnico'}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="scheduled_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'dd/MM/yyyy', { locale: pt })
                            ) : (
                              <span>Selecionar data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="scheduled_shift"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Turno</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar turno" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="manha">Manhã</SelectItem>
                        <SelectItem value="tarde">Tarde</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </div>

            <DialogFooter className="px-6 py-4 border-t flex-shrink-0 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={updateService.isPending}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {updateService.isPending ? 'A atribuir...' : 'Confirmar Atribuição'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
