import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getBusinessDaysRemaining, parseLocalDate } from '@/utils/dateUtils';

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

  // Parse as local date (pure YYYY-MM-DD) to avoid UTC day shift
  let arrival: Date;
  try {
    arrival = parseLocalDate(estimatedArrival);
  } catch {
    return null;
  }

  // Validate date before proceeding - prevents crash on invalid dates
  if (isNaN(arrival.getTime())) {
    return null;
  }

  const businessDaysRemaining = getBusinessDaysRemaining(arrival);

  const getIndicatorConfig = () => {
    if (businessDaysRemaining < 0) {
      // Overdue - Red
      const absVal = Math.abs(businessDaysRemaining);
      return {
        color: 'bg-red-500',
        textColor: 'text-red-600',
        label: `Atrasada ${absVal} dia${absVal !== 1 ? 's úteis' : ' útil'}`,
        icon: AlertTriangle,
        tooltip: `Prevista para ${format(arrival, 'dd/MM/yyyy', { locale: pt })} - Atrasada!`,
      };
    }
    if (businessDaysRemaining === 0) {
      // Arrives today - Red
      return {
        color: 'bg-red-500',
        textColor: 'text-red-600',
        label: 'Chega hoje',
        icon: Clock,
        tooltip: 'Prevista para hoje',
      };
    }
    if (businessDaysRemaining === 1) {
      // Arrives tomorrow - Orange
      return {
        color: 'bg-orange-500',
        textColor: 'text-orange-600',
        label: 'Chega amanhã',
        icon: Clock,
        tooltip: `Prevista para ${format(arrival, 'dd/MM/yyyy', { locale: pt })}`,
      };
    }
    if (businessDaysRemaining <= 3) {
      // 2-3 business days - Yellow
      return {
        color: 'bg-yellow-400',
        textColor: 'text-yellow-600',
        label: `Chega em ${businessDaysRemaining} dias úteis`,
        icon: Clock,
        tooltip: `Prevista para ${format(arrival, 'dd/MM/yyyy', { locale: pt })}`,
      };
    }
    // 4+ business days - Green
    return {
      color: 'bg-green-500',
      textColor: 'text-green-600',
      label: `Chega em ${businessDaysRemaining} dias úteis`,
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
