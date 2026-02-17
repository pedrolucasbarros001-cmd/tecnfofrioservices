import { useState, useMemo } from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
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
import { useAuth } from '@/contexts/AuthContext';
import { SERVICE_STATUS_CONFIG, type Service, type ServiceStatus } from '@/types/database';

// Impact warnings based on status transitions
const getImpactWarnings = (fromStatus: ServiceStatus, toStatus: ServiceStatus): string[] => {
  const warnings: string[] = [];
  
  // If going back to earlier statuses from completed states
  if (['por_fazer', 'em_execucao', 'na_oficina'].includes(toStatus) && 
      ['concluidos', 'em_debito', 'finalizado'].includes(fromStatus)) {
    warnings.push('O serviço será reaberto e poderá requerer novo agendamento.');
    warnings.push('O técnico verá este serviço novamente na sua lista de trabalho.');
  }
  
  // If jumping directly to finalizado
  if (toStatus === 'finalizado') {
    warnings.push('O serviço será marcado como entregue ao cliente.');
    if (fromStatus !== 'concluidos' && fromStatus !== 'em_debito') {
      warnings.push('Etapas intermediárias serão ignoradas (precificação, pagamento, entrega).');
    }
  }
  
  // If changing to/from part-related statuses
  if (['para_pedir_peca', 'em_espera_de_peca'].includes(toStatus) ||
      ['para_pedir_peca', 'em_espera_de_peca'].includes(fromStatus)) {
    warnings.push('O fluxo de peças pode ficar inconsistente.');
  }
  
  // If going to a_precificar from early states
  if (toStatus === 'a_precificar' && ['por_fazer', 'em_execucao'].includes(fromStatus)) {
    warnings.push('O serviço irá para precificação sem diagnóstico completo.');
  }
  
  // If going to concluidos
  if (toStatus === 'concluidos' && !['a_precificar', 'em_debito'].includes(fromStatus)) {
    warnings.push('O serviço será marcado como concluído e pronto para entrega.');
  }
  
  return warnings;
};

interface ForceStateModalProps {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ForceStateModal({ service, open, onOpenChange }: ForceStateModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<ServiceStatus | ''>('');
  const updateService = useUpdateService();
  const { role } = useAuth();
  
  const isAdmin = role === 'dono';

  // Calculate impact warnings when status changes
  const impactWarnings = useMemo(() => {
    if (!service || !selectedStatus) return [];
    return getImpactWarnings(service.status as ServiceStatus, selectedStatus);
  }, [service, selectedStatus]);

  const handleSubmit = async () => {
    if (!service || !selectedStatus || !isAdmin) return;

    const oldStatus = service.status as ServiceStatus;

    try {
      const updatePayload: any = {
        id: service.id,
        status: selectedStatus,
        skipToast: true,
      };

      // Auto-set service_location when forcing to workshop status
      if (selectedStatus === 'na_oficina') {
        updatePayload.service_location = 'oficina';
      }

      await updateService.mutateAsync(updatePayload);

      // Show warning toast with transition details
      const oldLabel = SERVICE_STATUS_CONFIG[oldStatus]?.label || oldStatus;
      const newLabel = SERVICE_STATUS_CONFIG[selectedStatus]?.label || selectedStatus;
      toast.warning(`Estado forçado: ${oldLabel} → ${newLabel}`);

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

  // Only admin can use this modal
  if (!isAdmin) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              Acesso Negado
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              Apenas o administrador pode forçar mudanças de estado.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

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

          {/* Dynamic Impact Warnings */}
          {impactWarnings.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
              <p className="font-medium text-red-800 mb-2">⚠️ IMPACTOS DESTA MUDANÇA:</p>
              <ul className="list-disc list-inside space-y-1 text-red-700">
                {impactWarnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

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
