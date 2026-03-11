import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { SERVICE_STATUS_CONFIG, type Service, type ServiceStatus } from '@/types/database';
import { cn } from '@/lib/utils';

interface ServiceStatusBadgeProps {
    service: Pick<Service, 'status' | 'pending_pricing' | 'final_price' | 'service_location' | 'service_type' | 'amount_paid'>;
    className?: string;
}

// helpers exposed for other components that need the same derived logic
export function computeNeedsPricing(service: Pick<Service, 'status' | 'pending_pricing' | 'final_price'>) {
    return (
        !service.status ||
        service.status !== 'cancelado' &&
        service.pending_pricing === true &&
        (service.final_price ?? 0) === 0
    );
}

export function computeIsDebt(service: Pick<Service, 'status' | 'final_price' | 'amount_paid'>) {
    return (
        service.status !== 'cancelado' &&
        (service.final_price ?? 0) > 0 &&
        (service.amount_paid ?? 0) < (service.final_price ?? 0)
    );
}

/**
 * Mostra o badge de estado do serviço.
 *
 * Regra de precificação:
 * Se o serviço ainda não tem preço definido (pending_pricing=true e final_price=0),
 * exibe um badge "A Precificar" a laranja COEXISTINDO com o estado de execução.
 * Não substitui nem bloqueia nenhum fluxo.
 */
export const ServiceStatusBadge = React.forwardRef<HTMLSpanElement, ServiceStatusBadgeProps>(
    ({ service, className }, ref) => {
        // primary operational badge
        const statusConfig = SERVICE_STATUS_CONFIG[service.status as ServiceStatus] || {
            label: service.status,
            color: 'bg-muted text-muted-foreground',
        };

        // derive extra flags independently of status
        const needsPricing =
            !service.status ||
            service.status !== 'cancelado' &&
            service.pending_pricing === true &&
            (service.final_price ?? 0) === 0;

        const isDebt =
            service.status !== 'cancelado' &&
            (service.final_price ?? 0) > 0 &&
            (service.amount_paid ?? 0) < (service.final_price ?? 0);

        return (
            <span ref={ref} className={cn('inline-flex flex-wrap items-center gap-1', className)}>
                <Badge className={cn('text-xs font-medium', statusConfig.color)}>
                    {statusConfig.label}
                </Badge>
                {needsPricing && (
                    <Badge className="text-xs bg-orange-100 text-orange-700 border border-orange-300">
                        Orçamentar
                    </Badge>
                )}
                {isDebt && (
                    <Badge className="text-xs bg-red-100 text-red-700 border border-red-300">
                        Em Débito
                    </Badge>
                )}
            </span>
        );
    }
);

ServiceStatusBadge.displayName = 'ServiceStatusBadge';
