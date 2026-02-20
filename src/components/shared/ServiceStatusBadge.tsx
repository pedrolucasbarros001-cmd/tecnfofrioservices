import { Badge } from '@/components/ui/badge';
import { SERVICE_STATUS_CONFIG, type Service, type ServiceStatus } from '@/types/database';
import { cn } from '@/lib/utils';

interface ServiceStatusBadgeProps {
    service: Pick<Service, 'status' | 'pending_pricing' | 'final_price'>;
    className?: string;
}

/**
 * Mostra o badge de estado do serviço.
 *
 * Regra de precificação:
 * Se o serviço ainda não tem preço definido (pending_pricing=true e final_price=0),
 * exibe um badge "A Precificar" a laranja COEXISTINDO com o estado de execução.
 * Não substitui nem bloqueia nenhum fluxo.
 */
export function ServiceStatusBadge({ service, className }: ServiceStatusBadgeProps) {
    const statusConfig = SERVICE_STATUS_CONFIG[service.status as ServiceStatus]
        ?? { label: service.status, color: 'bg-muted text-muted-foreground' };

    const needsPricing =
        service.pending_pricing === true && (service.final_price ?? 0) === 0;

    return (
        <span className={cn('inline-flex flex-wrap items-center gap-1', className)}>
            <Badge className={cn('text-xs font-medium', statusConfig.color)}>
                {statusConfig.label}
            </Badge>
            {needsPricing && (
                <Badge className="text-xs bg-orange-100 text-orange-700 border border-orange-300">
                    A Precificar
                </Badge>
            )}
        </span>
    );
}
