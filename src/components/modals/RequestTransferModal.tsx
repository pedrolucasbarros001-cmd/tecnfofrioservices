import { useState } from 'react';
import { ArrowRightLeft, Loader2, User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTechnicians } from '@/hooks/useTechnicians';
import { useCreateTransferRequest, useCurrentTechnicianId } from '@/hooks/useServiceTransfers';
import { cn } from '@/lib/utils';
import type { Service } from '@/types/database';

interface RequestTransferModalProps {
  service: Service;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RequestTransferModal({ service, open, onOpenChange }: RequestTransferModalProps) {
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  
  const { data: technicians = [], isLoading: loadingTechnicians } = useTechnicians(true);
  const { data: currentTechnicianId } = useCurrentTechnicianId();
  const createTransfer = useCreateTransferRequest();

  // Filter out current technician from the list
  const availableTechnicians = technicians.filter(t => t.id !== currentTechnicianId);

  const handleSubmit = async () => {
    if (!selectedTechnicianId || !currentTechnicianId) return;

    await createTransfer.mutateAsync({
      serviceId: service.id,
      fromTechnicianId: currentTechnicianId,
      toTechnicianId: selectedTechnicianId,
      message: message.trim() || undefined,
    });

    // Reset and close
    setSelectedTechnicianId(null);
    setMessage('');
    onOpenChange(false);
  };

  const handleClose = () => {
    setSelectedTechnicianId(null);
    setMessage('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Solicitar Transferência
          </DialogTitle>
          <DialogDescription>
            Envie um pedido para outro técnico assumir o serviço{' '}
            <span className="font-mono font-semibold">{service.code}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Service summary */}
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <p className="font-medium">{service.customer?.name || 'Cliente não definido'}</p>
            <p className="text-muted-foreground">
              {[service.appliance_type, service.brand, service.model].filter(Boolean).join(' • ')}
            </p>
          </div>

          {/* Technician selection */}
          <div className="space-y-2">
            <Label>Selecione o técnico</Label>
            {loadingTechnicians ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : availableTechnicians.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum outro técnico disponível</p>
              </div>
            ) : (
              <ScrollArea className="h-48">
                <RadioGroup
                  value={selectedTechnicianId || ''}
                  onValueChange={setSelectedTechnicianId}
                  className="space-y-2"
                >
                  {availableTechnicians.map((tech) => (
                    <div
                      key={tech.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                        selectedTechnicianId === tech.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/50'
                      )}
                      onClick={() => setSelectedTechnicianId(tech.id)}
                    >
                      <RadioGroupItem value={tech.id} id={tech.id} />
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={tech.profile?.avatar_url || undefined} />
                        <AvatarFallback 
                          style={{ backgroundColor: tech.color || '#3B82F6' }}
                          className="text-white text-sm font-medium"
                        >
                          {tech.profile?.full_name?.charAt(0) || 'T'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">
                          {tech.profile?.full_name || 'Técnico'}
                        </p>
                        {tech.specialization && (
                          <p className="text-xs text-muted-foreground truncate">
                            {tech.specialization}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </ScrollArea>
            )}
          </div>

          {/* Optional message */}
          <div className="space-y-2">
            <Label htmlFor="message">Mensagem (opcional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ex: Não consigo ir a tempo, podes fazer?"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedTechnicianId || createTransfer.isPending}
          >
            {createTransfer.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                A enviar...
              </>
            ) : (
              <>
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Enviar Pedido
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
