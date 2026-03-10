import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { SERVICE_STATUS_CONFIG, type Service, type ServiceStatus } from '@/types/database';
import { cn } from '@/lib/utils';

interface ServiceStatusBadgeProps {
    service: Pick<Service, 'status' | 'pending_pricing' | 'final_price' | 'service_location' | 'service_type'>;
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
export const ServiceStatusBadge = React.forwardRef<HTMLSpanElement, ServiceStatusBadgeProps>(
    ({ service, className }, ref) => {
        const isClientSideRepair =
            service.status === 'concluidos' &&
            (service.service_location === 'cliente' || (service.service_type as string) === 'visita');

        const statusConfig = {
            ...(SERVICE_STATUS_CONFIG[service.status as ServiceStatus]
                ?? { label: service.status, color: 'bg-muted text-muted-foreground' }),
            ...(isClientSideRepair ? { label: 'Concluído' } : {}),
        };

        const needsPricing =
            service.status !== 'cancelado' && service.pending_pricing === true && (service.final_price ?? 0) === 0;

        const isDebtState =
            service.status !== 'cancelado' &&
            (service.final_price ?? 0) > 0 &&
            service.status !== 'finalizado' &&
            service.status !== 'em_debito' &&
            (service.status === 'em_espera_de_peca' || service.status === 'para_pedir_peca');

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
                {isDebtState && (
                    <Badge className="text-xs bg-red-100 text-red-700 border border-red-300">
                        Em Débito
                    </Badge>
                )}
            </span>
        );
    }
);

ServiceStatusBadge.displayName = 'ServiceStatusBadge';
