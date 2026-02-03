import { Check, Clock, Package, Wrench, Truck, AlertCircle, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Service, ServiceStatus } from '@/types/database';

interface ServiceTimelineProps {
  service: Service;
  compact?: boolean;
}

// Timeline steps for different service types
const getTimelineSteps = (service: Service) => {
  const isWorkshop = service.service_location === 'oficina';
  const isDelivery = service.service_type === 'entrega';
  const isInstallation = service.service_type === 'instalacao';

  if (isDelivery) {
    return [
      { id: 'created', label: 'Criado', icon: Check, status: ['por_fazer', 'em_execucao', 'concluidos', 'em_debito', 'finalizado'] },
      { id: 'in_progress', label: 'Em Curso', icon: Truck, status: ['em_execucao', 'concluidos', 'em_debito', 'finalizado'] },
      { id: 'done', label: 'Entregue', icon: Check, status: ['concluidos', 'em_debito', 'finalizado'] },
      { id: 'finished', label: 'Concluído', icon: Check, status: ['finalizado'] },
    ];
  }

  if (isInstallation) {
    return [
      { id: 'created', label: 'Criado', icon: Check, status: ['por_fazer', 'em_execucao', 'concluidos', 'em_debito', 'finalizado'] },
      { id: 'in_progress', label: 'Instalação', icon: Wrench, status: ['em_execucao', 'concluidos', 'em_debito', 'finalizado'] },
      { id: 'done', label: 'Concluído', icon: Check, status: ['concluidos', 'em_debito', 'finalizado'] },
      { id: 'finished', label: 'Concluído', icon: Check, status: ['finalizado'] },
    ];
  }

  if (isWorkshop) {
    return [
      { id: 'created', label: 'Criado', icon: Check, status: ['por_fazer', 'na_oficina', 'em_execucao', 'para_pedir_peca', 'em_espera_de_peca', 'a_precificar', 'concluidos', 'em_debito', 'finalizado'] },
      { id: 'workshop', label: 'Oficina', icon: Package, status: ['na_oficina', 'em_execucao', 'para_pedir_peca', 'em_espera_de_peca', 'a_precificar', 'concluidos', 'em_debito', 'finalizado'] },
      { id: 'repair', label: 'Reparação', icon: Wrench, status: ['em_execucao', 'para_pedir_peca', 'em_espera_de_peca', 'a_precificar', 'concluidos', 'em_debito', 'finalizado'] },
      { id: 'done', label: 'Reparado', icon: Check, status: ['concluidos', 'em_debito', 'finalizado'] },
      { id: 'finished', label: 'Concluído', icon: Check, status: ['finalizado'] },
    ];
  }

  // Visit service
  return [
    { id: 'created', label: 'Criado', icon: Check, status: ['por_fazer', 'em_execucao', 'para_pedir_peca', 'em_espera_de_peca', 'a_precificar', 'concluidos', 'em_debito', 'finalizado'] },
    { id: 'visit', label: 'Visita', icon: Wrench, status: ['em_execucao', 'para_pedir_peca', 'em_espera_de_peca', 'a_precificar', 'concluidos', 'em_debito', 'finalizado'] },
    { id: 'done', label: 'Concluído', icon: Check, status: ['a_precificar', 'concluidos', 'em_debito', 'finalizado'] },
    { id: 'finished', label: 'Concluído', icon: Check, status: ['finalizado'] },
  ];
};

// Check if there's a pending state (waiting for part)
const hasPendingPartState = (status: ServiceStatus) => {
  return ['para_pedir_peca', 'em_espera_de_peca'].includes(status);
};

export function ServiceTimeline({ service, compact = false }: ServiceTimelineProps) {
  const steps = getTimelineSteps(service);
  const currentStatus = service.status as ServiceStatus;
  const isPendingPart = hasPendingPartState(currentStatus);

  return (
    <div className={cn("flex items-center gap-1", compact ? "gap-0.5" : "gap-2")}>
      {steps.map((step, index) => {
        const isCompleted = step.status.includes(currentStatus);
        const isCurrent = step.status[0] === currentStatus || 
          (step.status.includes(currentStatus) && !steps[index + 1]?.status.includes(currentStatus));
        const Icon = step.icon;

        return (
          <div key={step.id} className="flex items-center">
            {/* Step circle */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex items-center justify-center rounded-full transition-all",
                  compact ? "w-6 h-6" : "w-8 h-8",
                  isCurrent
                    ? "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-1"
                    : isCompleted
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Icon className={cn(compact ? "h-3 w-3" : "h-4 w-4")} />
              </div>
              {!compact && (
                <span
                  className={cn(
                    "text-[10px] mt-1 text-center leading-tight max-w-[50px]",
                    isCurrent ? "text-primary font-medium" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              )}
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "h-0.5 transition-colors",
                  compact ? "w-3" : "w-6",
                  isCompleted && steps[index + 1]?.status.includes(currentStatus)
                    ? "bg-primary"
                    : "bg-muted"
                )}
              />
            )}
          </div>
        );
      })}

      {/* Waiting for part indicator */}
      {isPendingPart && (
        <div className="flex items-center ml-2">
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
            currentStatus === 'para_pedir_peca' 
              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
              : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
          )}>
            <Clock className="h-3 w-3" />
            {currentStatus === 'para_pedir_peca' ? 'Pedir Peça' : 'Aguarda Peça'}
          </div>
        </div>
      )}
    </div>
  );
}

// Next step indicator component
interface NextStepIndicatorProps {
  service: Service;
  className?: string;
}

export function NextStepIndicator({ service, className }: NextStepIndicatorProps) {
  const getNextStep = (): { label: string; action: string } | null => {
    const status = service.status as ServiceStatus;
    const isWorkshop = service.service_location === 'oficina';
    const isWarranty = service.is_warranty;
    const hasTechnician = !!service.technician_id;
    const hasPrice = (service.final_price || 0) > 0;
    const isPaid = (service.amount_paid || 0) >= (service.final_price || 0);

    switch (status) {
      case 'por_fazer':
        if (!hasTechnician) return { label: 'Próximo passo', action: 'Atribuir técnico' };
        if (!service.scheduled_date) return { label: 'Próximo passo', action: 'Agendar data' };
        return { label: 'Próximo passo', action: 'Iniciar execução' };
      
      case 'na_oficina':
        if (!hasTechnician) return { label: 'Próximo passo', action: 'Assumir ou atribuir técnico' };
        return { label: 'Próximo passo', action: 'Iniciar reparação' };
      
      case 'em_execucao':
        return { label: 'Próximo passo', action: 'Concluir reparação' };
      
      case 'para_pedir_peca':
        return { label: 'Próximo passo', action: 'Confirmar pedido de peça' };
      
      case 'em_espera_de_peca':
        return { label: 'Próximo passo', action: 'Registar chegada da peça' };
      
      case 'a_precificar':
        return { label: 'Próximo passo', action: 'Definir preço' };
      
      case 'concluidos':
        if (isWorkshop) {
          if (!isPaid && !isWarranty) return { label: 'Próximo passo', action: 'Registar pagamento' };
          return { label: 'Próximo passo', action: 'Definir entrega' };
        }
        return { label: 'Próximo passo', action: 'Finalizar serviço' };
      
      case 'em_debito':
        return { label: 'Próximo passo', action: 'Registar pagamento' };
      
      case 'finalizado':
        return null;
      
      default:
        return null;
    }
  };

  const nextStep = getNextStep();

  if (!nextStep) return null;

  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      <span className="text-muted-foreground">{nextStep.label}:</span>
      <span className="font-medium text-primary">{nextStep.action}</span>
    </div>
  );
}

// Urgency indicator for time-sensitive items
interface UrgencyIndicatorProps {
  service: Service;
  className?: string;
}

export function UrgencyIndicator({ service, className }: UrgencyIndicatorProps) {
  const createdAt = new Date(service.created_at);
  const now = new Date();
  const daysInSystem = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

  // Different thresholds based on status
  const isWaitingPart = service.status === 'em_espera_de_peca';
  const isInWorkshop = service.service_location === 'oficina';
  const isCompleted = service.status === 'concluidos';

  // Part waiting urgency
  if (isWaitingPart) {
    if (daysInSystem >= 14) {
      return (
        <div className={cn("flex items-center gap-1 text-xs font-medium text-red-600", className)}>
          <AlertCircle className="h-3 w-3" />
          +{daysInSystem}d aguardando peça
        </div>
      );
    }
    if (daysInSystem >= 7) {
      return (
        <div className={cn("flex items-center gap-1 text-xs font-medium text-yellow-600", className)}>
          <Clock className="h-3 w-3" />
          {daysInSystem}d aguardando peça
        </div>
      );
    }
  }

  // Workshop time urgency (for completed items waiting for pickup)
  if (isCompleted && isInWorkshop) {
    if (daysInSystem >= 30) {
      return (
        <div className={cn("flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded", className)}>
          <AlertCircle className="h-3 w-3 animate-pulse" />
          +30 dias na oficina
        </div>
      );
    }
    if (daysInSystem >= 15) {
      return (
        <div className={cn("flex items-center gap-1 text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded", className)}>
          <Clock className="h-3 w-3" />
          +15 dias na oficina
        </div>
      );
    }
  }

  // General workshop time
  if (isInWorkshop && !['concluidos', 'finalizado'].includes(service.status)) {
    if (daysInSystem >= 30) {
      return (
        <div className={cn("flex items-center gap-1 text-xs font-medium text-red-500", className)}>
          <AlertCircle className="h-3 w-3" />
          +30d
        </div>
      );
    }
    if (daysInSystem >= 15) {
      return (
        <div className={cn("flex items-center gap-1 text-xs font-medium text-orange-500", className)}>
          <Clock className="h-3 w-3" />
          +15d
        </div>
      );
    }
  }

  return null;
}
