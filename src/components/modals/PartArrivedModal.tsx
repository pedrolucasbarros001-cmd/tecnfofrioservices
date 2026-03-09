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
import { useAuth } from '@/contexts/AuthContext';
import { logPartArrival } from '@/utils/activityLogUtils';
import type { Service, ServicePart, ScheduledShift } from '@/types/database';

interface PartArrivedModalProps {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Removed SHIFTS constant - replaced by time input

export function PartArrivedModal({ service, open, onOpenChange }: PartArrivedModalProps) {
  const { user } = useAuth();
  const [technicianId, setTechnicianId] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [scheduledShift, setScheduledShift] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [editableParts, setEditableParts] = useState<ServicePart[]>([]);
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

  // Update local state when pendingParts change
  useEffect(() => {
    if (pendingParts.length > 0) {
      setEditableParts(pendingParts);
    }
  }, [pendingParts]);

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
      // Update and mark all edited parts as arrived
      if (editableParts.length > 0) {
        const updatePromises = editableParts.map(part =>
          supabase
            .from('service_parts')
            .update({
              arrived: true,
              part_name: part.part_name,
              part_code: part.part_code,
              cost: typeof part.cost === 'string' ? parseFloat((part.cost as string).replace(',', '.')) : part.cost
            })
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
        notes: notes ? `${service.notes || ''}\n[Artigo chegou] ${notes}`.trim() : service.notes,
        // Keep last_status_before_part_request so UI shows "Continuar" button
        // It will be cleared when the technician completes the continuation flow
        skipToast: true,
      });

      // Log arrival for each part
      if (editableParts.length > 0) {
        const logPromises = editableParts.map(part =>
          logPartArrival(
            service.code || 'N/A',
            service.id,
            part.part_name,
            user?.id
          )
        );
        await Promise.all(logPromises);
      }

      queryClient.invalidateQueries({ queryKey: ['service-parts'] });
      queryClient.invalidateQueries({ queryKey: ['pending-parts'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });

      const techName = technicians.find(t => t.id === technicianId)?.profile?.full_name || 'Técnico';
      toast.success(`Artigo chegou! ${service.code} agendado para ${format(scheduledDate, 'dd/MM', { locale: pt })} - ${formatShiftLabel(scheduledShift)} (${techName}).`);
      onOpenChange(false);
    } catch (error) {
      console.error('Error marking part arrived:', error);
      toast.error('Erro ao registar chegada do artigo');
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
            Artigo Chegou - Agendar Continuação
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

            {/* Arrived Articles */}
            {editableParts.length > 0 && (
              <div className="space-y-4">
                <Label className="text-sm font-semibold">Artigos que Chegaram</Label>
                <div className="space-y-3">
                  {editableParts.map((part, index) => (
                    <div key={part.id} className="p-3 bg-muted/30 border rounded-lg relative group">
                      <div className="grid grid-cols-12 gap-2">
                        <div className="col-span-2 space-y-1">
                          <Label className="text-[10px] uppercase text-muted-foreground">Ref.</Label>
                          <Input
                            placeholder="Ref"
                            value={part.part_code || ''}
                            onChange={(e) => {
                              const newList = [...editableParts];
                              newList[index] = { ...part, part_code: e.target.value };
                              setEditableParts(newList);
                            }}
                            className="h-8 text-sm px-2"
                          />
                        </div>
                        <div className="col-span-4 space-y-1">
                          <Label className="text-[10px] uppercase text-muted-foreground">Descrição *</Label>
                          <Input
                            placeholder="Artigo"
                            value={part.part_name}
                            onChange={(e) => {
                              const newList = [...editableParts];
                              newList[index] = { ...part, part_name: e.target.value };
                              setEditableParts(newList);
                            }}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label className="text-[10px] uppercase text-muted-foreground text-center block">Qtd</Label>
                          <Input
                            type="number"
                            min="1"
                            value={part.quantity || 1}
                            onChange={(e) => {
                              const newList = [...editableParts];
                              newList[index] = { ...part, quantity: parseInt(e.target.value) || 1 };
                              setEditableParts(newList);
                            }}
                            className="h-8 text-sm text-center px-1"
                          />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label className="text-[10px] uppercase text-muted-foreground text-right block">Valor Unit.</Label>
                          <Input
                            type="text"
                            placeholder="0,00"
                            value={part.cost || ''}
                            onChange={(e) => {
                              const newList = [...editableParts];
                              newList[index] = { ...part, cost: e.target.value as any };
                              setEditableParts(newList);
                            }}
                            className="h-8 text-sm text-right px-2"
                          />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label className="text-[10px] uppercase text-muted-foreground text-right block">Total</Label>
                          <div className="h-8 flex items-center justify-end px-2 bg-muted/50 rounded text-xs font-medium">
                            {((parseInt(part.quantity?.toString()) || 0) * (parseFloat(part.cost?.toString().replace(',', '.')) || 0)).toFixed(2)} €
                          </div>
                        </div>
                      </div>
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
