import { differenceInDays, format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface PartArrivalIndicatorProps {
  estimatedArrival: string | null;
  className?: string;
  showLabel?: boolean;
}

export function PartArrivalIndicator({ 
  estimatedArrival, 
  className,
  showLabel = true,
}: PartArrivalIndicatorProps) {
  if (!estimatedArrival) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn('flex items-center gap-1 text-xs', className)}>
              <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
              {showLabel && <span className="text-muted-foreground">Sem previsão</span>}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Previsão de chegada não definida</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const arrival = new Date(estimatedArrival);
  arrival.setHours(0, 0, 0, 0);
  
  const daysRemaining = differenceInDays(arrival, today);

  const getIndicatorConfig = () => {
    if (daysRemaining < 0) {
      return {
        color: 'bg-destructive',
        textColor: 'text-destructive',
        label: `Atrasada ${Math.abs(daysRemaining)} dia${Math.abs(daysRemaining) !== 1 ? 's' : ''}`,
        icon: AlertTriangle,
        tooltip: `Prevista para ${format(arrival, 'dd/MM/yyyy', { locale: pt })} - Atrasada!`,
      };
    }
    if (daysRemaining === 0) {
      return {
        color: 'bg-destructive',
        textColor: 'text-destructive',
        label: 'Chega hoje',
        icon: Clock,
        tooltip: 'Prevista para hoje',
      };
    }
    if (daysRemaining <= 2) {
      return {
        color: 'bg-amber-500',
        textColor: 'text-amber-600',
        label: daysRemaining === 1 ? 'Chega amanhã' : `Chega em ${daysRemaining} dias`,
        icon: Clock,
        tooltip: `Prevista para ${format(arrival, 'dd/MM/yyyy', { locale: pt })}`,
      };
    }
    return {
      color: 'bg-green-500',
      textColor: 'text-green-600',
      label: `Chega em ${daysRemaining} dias`,
      icon: CheckCircle,
      tooltip: `Prevista para ${format(arrival, 'dd/MM/yyyy', { locale: pt })}`,
    };
  };

  const config = getIndicatorConfig();
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center gap-1.5 text-xs', className)}>
            <div className={cn('w-2 h-2 rounded-full animate-pulse', config.color)} />
            {showLabel && (
              <span className={cn('font-medium', config.textColor)}>
                {config.label}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <p>{config.tooltip}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
