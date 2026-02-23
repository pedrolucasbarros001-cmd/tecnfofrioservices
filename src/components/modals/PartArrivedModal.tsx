import { useState, useEffect } from 'react';
import { CheckCircle, Calendar, UserPlus, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { useUpdateService } from '@/hooks/useServices';
import { useTechnicians } from '@/hooks/useTechnicians';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatShiftLabel } from '@/utils/dateUtils';
import type { Service, ServicePart, ScheduledShift } from '@/types/database';

interface PartArrivedModalProps {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Removed SHIFTS constant - replaced by time input

export function PartArrivedModal({ service, open, onOpenChange }: PartArrivedModalProps) {
  const [technicianId, setTechnicianId] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [scheduledShift, setScheduledShift] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateService = useUpdateService();
  const queryClient = useQueryClient();
  const { data: technicians = [] } = useTechnicians();

  // Fetch pending parts for this service
  const { data: pendingParts = [] } = useQuery({
    queryKey: ['pending-parts', service?.id],
    queryFn: async () => {
      if (!service?.id) return [];
      const { data, error } = await supabase
        .from('service_parts')
        .select('*')
        .eq('service_id', service.id)
        .eq('is_requested', true)
        .eq('arrived', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ServicePart[];
    },
    enabled: !!service?.id && open,
  });

  // Reset form when modal opens and pre-fill with previous technician
  useEffect(() => {
    if (open && service) {
      setTechnicianId(service.technician_id || '');
      setScheduledDate(undefined);
      setScheduledShift('');
      setNotes('');
    }
  }, [open, service]);

  const handleSubmit = async () => {
    if (!service) return;

    if (!technicianId) {
      toast.error('Por favor, selecione um técnico.');
      return;
    }

    if (!scheduledDate) {
      toast.error('Por favor, selecione a data de agendamento.');
      return;
    }

    if (!scheduledShift) {
      toast.error('Por favor, selecione o turno.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Mark all pending parts as arrived
      if (pendingParts.length > 0) {
        const updatePromises = pendingParts.map(part =>
          supabase
            .from('service_parts')
            .update({ arrived: true })
            .eq('id', part.id)
        );
        await Promise.all(updatePromises);
      }

      // Restore to previous status or default based on location
      let previousStatus = service.last_status_before_part_request;

      if (!previousStatus) {
        // Fallback if no previous status saved
        previousStatus = service.service_location === 'cliente' ? 'por_fazer' : 'na_oficina';
      } else if (service.service_location === 'cliente' && previousStatus === 'na_oficina') {
        // Correction: if somehow a client service saved 'na_oficina' as previous, force 'por_fazer'
        previousStatus = 'por_fazer';
      }

      // Update service with technician, schedule, and restored status
      await updateService.mutateAsync({
        id: service.id,
        status: previousStatus as any,
        technician_id: technicianId,
        scheduled_date: format(scheduledDate, 'yyyy-MM-dd'),
        scheduled_shift: (scheduledShift as any) || null,
        notes: notes ? `${service.notes || ''}\n[Peça chegou] ${notes}`.trim() : service.notes,
        // Keep last_status_before_part_request so UI shows "Continuar" button
        // It will be cleared when the technician completes the continuation flow
        skipToast: true,
      });

      queryClient.invalidateQueries({ queryKey: ['service-parts'] });
      queryClient.invalidateQueries({ queryKey: ['pending-parts'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });

      const techName = technicians.find(t => t.id === technicianId)?.profile?.full_name || 'Técnico';
      toast.success(`Peça chegou! ${service.code} agendado para ${format(scheduledDate, 'dd/MM', { locale: pt })} - ${formatShiftLabel(scheduledShift)} (${techName}).`);
      onOpenChange(false);
    } catch (error) {
      console.error('Error marking part arrived:', error);
      toast.error('Erro ao registar chegada da peça');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-w-[95vw] max-h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Peça Chegou - Agendar Continuação
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 px-6">
          <div className="space-y-4 py-4">
            {/* Service Info */}
            {service && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium">{service.code}</p>
                <p className="text-muted-foreground">
                  {service.appliance_type} {service.brand} {service.model}
                </p>
              </div>
            )}

            {/* Arrived Parts */}
            {pendingParts.length > 0 && (
              <div className="space-y-2">
                <Label>Peças que Chegaram</Label>
                <div className="space-y-1">
                  {pendingParts.map((part) => (
                    <div key={part.id} className="p-2 bg-green-50 border border-green-200 rounded text-sm flex justify-between items-center">
                      <span className="text-green-800">{part.part_name}</span>
                      <span className="text-green-600">x{part.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Technician Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Técnico *
              </Label>
              <Select value={technicianId} onValueChange={setTechnicianId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o técnico" />
                </SelectTrigger>
                <SelectContent>
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

            {/* Schedule Date */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Data *
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !scheduledDate && 'text-muted-foreground'
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {scheduledDate
                      ? format(scheduledDate, 'PPP', { locale: pt })
                      : 'Selecione a data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={scheduledDate}
                    onSelect={setScheduledDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Shift Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Turno
              </Label>
              <Select value={scheduledShift || undefined} onValueChange={setScheduledShift}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar turno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manha">Manhã</SelectItem>
                  <SelectItem value="tarde">Tarde</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes (optional) */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                placeholder="Observações adicionais..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !technicianId || !scheduledDate || !scheduledShift}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? 'A registar...' : 'Confirmar e Agendar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
