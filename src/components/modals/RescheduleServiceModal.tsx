import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { CalendarIcon, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useTechnicians } from '@/hooks/useTechnicians';
import { useUpdateService } from '@/hooks/useServices';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { humanizeError } from '@/utils/errorMessages';
import type { Service } from '@/types/database';

interface RescheduleServiceModalProps {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const formSchema = z.object({
  change_technician: z.boolean(),
  technician_id: z.string().optional(),
  scheduled_date: z.date({ required_error: 'Selecione uma data' }),
  scheduled_shift: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function RescheduleServiceModal({
  service,
  open,
  onOpenChange,
  onSuccess,
}: RescheduleServiceModalProps) {
  const { data: technicians = [] } = useTechnicians();
  const updateService = useUpdateService();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      change_technician: false,
      technician_id: '',
      scheduled_date: undefined,
      scheduled_shift: undefined,
    },
  });

  const changeTechnician = form.watch('change_technician');

  // Reset form when service changes or modal opens
  useEffect(() => {
    if (service && open) {
      form.reset({
        change_technician: false,
        technician_id: service.technician_id || '',
        scheduled_date: service.scheduled_date 
          ? new Date(service.scheduled_date) 
          : undefined,
        scheduled_shift: service.scheduled_shift || '',
      });
    }
  }, [service, open, form]);

  // Get current technician name
  const currentTechnician = technicians.find(t => t.id === service?.technician_id);
  const currentTechnicianName = currentTechnician?.profile?.full_name || 'Não atribuído';

  const handleSubmit = async (values: FormValues) => {
    if (!service) return;

    setIsSubmitting(true);
    try {
      const updateData: Record<string, unknown> = {
        id: service.id,
        scheduled_date: values.scheduled_date.toISOString().split('T')[0],
        scheduled_shift: values.scheduled_shift || null,
      };

      // Only update technician if checkbox is checked and a new technician is selected
      if (values.change_technician && values.technician_id && values.technician_id !== service.technician_id) {
        updateData.technician_id = values.technician_id;
      }

      await updateService.mutateAsync(updateData as any);

      toast.success('Serviço reagendado! O técnico será notificado.');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error rescheduling service:', error);
      toast.error(humanizeError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!service) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-w-[95vw] max-h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Reagendar Serviço - {service.code}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">Selecione nova data e hora. O técnico será notificado da alteração.</p>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
         <div className="flex-1 overflow-y-auto min-h-0 px-6">
          <div className="space-y-6 py-4">
          {/* Current Assignment Info */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Atribuição Atual</p>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{currentTechnicianName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarIcon className="h-4 w-4" />
              <span>
                {service.scheduled_date 
                  ? format(new Date(service.scheduled_date), "dd 'de' MMMM 'de' yyyy", { locale: pt })
                  : 'Sem data'}
                {service.scheduled_shift && (
                  <> • <span className="capitalize">{service.scheduled_shift}</span></>
                )}
              </span>
            </div>
          </div>

          {/* Change Technician Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="change_technician"
              checked={changeTechnician}
              onCheckedChange={(checked) => form.setValue('change_technician', checked === true)}
            />
            <Label htmlFor="change_technician" className="cursor-pointer">
              Alterar Técnico
            </Label>
          </div>

          {/* Technician Select - Only visible when checkbox is checked */}
          {changeTechnician && (
            <div className="space-y-2">
              <Label>Novo Técnico</Label>
              <Select
                value={form.watch('technician_id')}
                onValueChange={(value) => form.setValue('technician_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar técnico" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {technicians.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: tech.color || '#3B82F6' }} 
                        />
                        {tech.profile?.full_name || 'Técnico'}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* New Date */}
          <div className="space-y-2">
            <Label>Nova Data *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !form.watch('scheduled_date') && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {form.watch('scheduled_date') 
                    ? format(form.watch('scheduled_date'), "dd 'de' MMMM 'de' yyyy", { locale: pt })
                    : 'Selecionar data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={form.watch('scheduled_date')}
                  onSelect={(date) => date && form.setValue('scheduled_date', date)}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  locale={pt}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {form.formState.errors.scheduled_date && (
              <p className="text-sm text-destructive">{form.formState.errors.scheduled_date.message}</p>
            )}
          </div>

          {/* New Time */}
          <div className="space-y-2">
            <Label>Nova Hora</Label>
            <Input
              type="time"
              value={form.watch('scheduled_shift') || ''}
              onChange={(e) => form.setValue('scheduled_shift', e.target.value)}
            />
          </div>

          </div>
         </div>
          <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'A guardar...' : 'Confirmar Reagendamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
