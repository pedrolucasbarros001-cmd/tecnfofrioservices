import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUpdateService } from '@/hooks/useServices';
import { SERVICE_STATUS_CONFIG, type Service, type ServiceStatus } from '@/types/database';

interface ForceStateModalProps {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ForceStateModal({ service, open, onOpenChange }: ForceStateModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<ServiceStatus | ''>('');
  const updateService = useUpdateService();

  const handleSubmit = async () => {
    if (!service || !selectedStatus) return;

    try {
      await updateService.mutateAsync({
        id: service.id,
        status: selectedStatus,
      });

      onOpenChange(false);
      setSelectedStatus('');
    } catch (error) {
      console.error('Error forcing state change:', error);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedStatus('');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            Mudar Status do Serviço
          </DialogTitle>
          <DialogDescription className="text-sm">
            Esta ação força a mudança de estado do serviço. Use apenas em situações excepcionais.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {service && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium">{service.code}</p>
              <p className="text-muted-foreground">
                Estado atual: {SERVICE_STATUS_CONFIG[service.status]?.label || service.status}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="status">Novo Estado</Label>
            <Select 
              value={selectedStatus} 
              onValueChange={(v) => setSelectedStatus(v as ServiceStatus)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar estado" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SERVICE_STATUS_CONFIG).map(([status, config]) => (
                  <SelectItem 
                    key={status} 
                    value={status}
                    disabled={status === service?.status}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${config.color}`} />
                      {config.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            <p className="font-medium">⚠️ Atenção</p>
            <p>Esta operação ignora as regras normais de transição de estados e pode causar inconsistências nos dados.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={updateService.isPending || !selectedStatus}
            variant="destructive"
          >
            {updateService.isPending ? 'A alterar...' : 'Confirmar Mudança'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
