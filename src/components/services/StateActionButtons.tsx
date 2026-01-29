import { 
  UserPlus, 
  Play, 
  DollarSign, 
  CreditCard, 
  Truck,
  CheckCircle,
  Eye,
  MoreHorizontal,
  Package,
  RefreshCw,
  Phone,
  AlertTriangle,
  Trash2,
  CalendarClock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import type { Service, ServiceStatus } from '@/types/database';

interface StateActionButtonsProps {
  service: Service;
  onAssignTechnician: () => void;
  onViewDetails: () => void;
  onStartExecution?: () => void;
  onSetPrice?: () => void;
  onRegisterPayment?: () => void;
  onManageDelivery?: () => void;
  onFinalize?: () => void;
  onRequestPart?: () => void;
  onConfirmPartOrder?: () => void;
  onMarkPartArrived?: () => void;
  onForceState?: () => void;
  onContactClient?: () => void;
  onDelete?: () => void;
  onReschedule?: () => void;
}

interface ActionConfig {
  label: string;
  icon: typeof UserPlus;
  onClick: () => void;
  className?: string;
}

export function StateActionButtons({
  service,
  onAssignTechnician,
  onViewDetails,
  onStartExecution,
  onSetPrice,
  onRegisterPayment,
  onManageDelivery,
  onFinalize,
  onRequestPart,
  onConfirmPartOrder,
  onMarkPartArrived,
  onForceState,
  onContactClient,
  onDelete,
  onReschedule,
}: StateActionButtonsProps) {
  const { role } = useAuth();
  const isDono = role === 'dono';
  const isSecretaria = role === 'secretaria';
  const isTecnico = role === 'tecnico';

  const isWarrantyService = service.is_warranty || false;
  const isServicePriced = (service.final_price || 0) > 0 || isWarrantyService;
  const isServiceInDebit = !isWarrantyService && isServicePriced && (service.amount_paid || 0) < (service.final_price || 0);
  const canBeFinalized = (isServicePriced || isWarrantyService) && !isServiceInDebit && service.status === 'concluidos';

  const getMainAction = (): ActionConfig | null => {
    switch (service.status as ServiceStatus) {
      case 'por_fazer':
        if (!service.technician_id) {
          return {
            label: 'Atribuir Técnico',
            icon: UserPlus,
            onClick: onAssignTechnician,
            className: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white',
          };
        }
        if (isTecnico && onStartExecution) {
          return {
            label: 'Iniciar',
            icon: Play,
            onClick: onStartExecution,
            className: 'bg-green-600 hover:bg-green-700 text-white',
          };
        }
        return null;

      case 'em_execucao':
        return null;

      case 'na_oficina':
        if (isTecnico && onStartExecution) {
          return {
            label: 'Iniciar',
            icon: Play,
            onClick: onStartExecution,
            className: 'bg-green-600 hover:bg-green-700 text-white',
          };
        }
        return null;

      case 'para_pedir_peca':
        if (isDono && onConfirmPartOrder) {
          return {
            label: 'Registar Pedido',
            icon: Package,
            onClick: onConfirmPartOrder,
            className: 'bg-yellow-600 hover:bg-yellow-700 text-white',
          };
        }
        return null;

      case 'em_espera_de_peca':
        if (isDono && onMarkPartArrived) {
          return {
            label: 'Peça Chegou',
            icon: CheckCircle,
            onClick: onMarkPartArrived,
            className: 'bg-green-600 hover:bg-green-700 text-white',
          };
        }
        return null;

      case 'a_precificar':
        if (isDono && onSetPrice) {
          return {
            label: 'Definir Preço',
            icon: DollarSign,
            onClick: onSetPrice,
            className: 'bg-emerald-600 hover:bg-emerald-700 text-white',
          };
        }
        return null;

      case 'concluidos':
        if ((isDono || isSecretaria) && service.service_location === 'oficina' && onManageDelivery) {
          return {
            label: 'Gerir Entrega',
            icon: Truck,
            onClick: onManageDelivery,
            className: 'bg-teal-600 hover:bg-teal-700 text-white',
          };
        }
        return null;

      case 'em_debito':
        if ((isDono || isSecretaria) && onRegisterPayment) {
          return {
            label: 'Registar Pagamento',
            icon: CreditCard,
            onClick: onRegisterPayment,
            className: 'bg-orange-600 hover:bg-orange-700 text-white',
          };
        }
        return null;

      case 'finalizado':
        return null;

      default:
        return null;
    }
  };

  const mainAction = getMainAction();

  return (
    <div className="flex items-center gap-2">
      {mainAction && (
        <Button
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            mainAction.onClick();
          }}
          className={mainAction.className}
        >
          <mainAction.icon className="h-4 w-4 mr-1" />
          {mainAction.label}
        </Button>
      )}
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button variant="outline" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-popover">
          <DropdownMenuItem onClick={onViewDetails}>
            <Eye className="h-4 w-4 mr-2" />
            Ver Detalhes
          </DropdownMenuItem>

          {/* Assign/Reassign Technician */}
          {!service.technician_id && (isDono || isSecretaria) && (
            <DropdownMenuItem onClick={onAssignTechnician}>
              <UserPlus className="h-4 w-4 mr-2" />
              Atribuir Técnico
            </DropdownMenuItem>
          )}
          {service.technician_id && service.status !== 'finalizado' && isDono && (
            <DropdownMenuItem onClick={onAssignTechnician}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reatribuir Técnico
            </DropdownMenuItem>
          )}

          {/* Reschedule Service - Dono or Secretaria */}
          {service.technician_id && service.status !== 'finalizado' && (isDono || isSecretaria) && onReschedule && (
            <DropdownMenuItem onClick={onReschedule}>
              <CalendarClock className="h-4 w-4 mr-2" />
              Reagendar Serviço
            </DropdownMenuItem>
          )}

          {/* Request Part - Technician or Dono during execution */}
          {(service.status === 'em_execucao' || service.status === 'na_oficina') && onRequestPart && (isTecnico || isDono) && (
            <DropdownMenuItem onClick={onRequestPart}>
              <Package className="h-4 w-4 mr-2" />
              Solicitar Peça
            </DropdownMenuItem>
          )}

          {/* Set Price - Only Dono */}
          {(service.status === 'a_precificar' || (service.status === 'concluidos' && !isServicePriced)) && isDono && onSetPrice && (
            <DropdownMenuItem onClick={onSetPrice}>
              <DollarSign className="h-4 w-4 mr-2" />
              Definir Preço
            </DropdownMenuItem>
          )}

          {/* Register Payment - Dono or Secretaria */}
          {isServicePriced && isServiceInDebit && (isDono || isSecretaria) && onRegisterPayment && (
            <DropdownMenuItem onClick={onRegisterPayment}>
              <CreditCard className="h-4 w-4 mr-2" />
              Registar Pagamento
            </DropdownMenuItem>
          )}

          {/* Contact Client - Secretaria for debit */}
          {isServiceInDebit && isSecretaria && onContactClient && (
            <DropdownMenuItem onClick={onContactClient}>
              <Phone className="h-4 w-4 mr-2" />
              Contactar Cliente
            </DropdownMenuItem>
          )}

          {/* Manage Delivery - Concluidos with workshop location */}
          {service.status === 'concluidos' && service.service_location === 'oficina' && (isDono || isSecretaria) && onManageDelivery && (
            <DropdownMenuItem onClick={onManageDelivery}>
              <Truck className="h-4 w-4 mr-2" />
              Gerir Entrega
            </DropdownMenuItem>
          )}

          {/* Finalize - When conditions met */}
          {canBeFinalized && (isDono || isSecretaria) && onFinalize && (
            <DropdownMenuItem onClick={onFinalize}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Finalizar Serviço
            </DropdownMenuItem>
          )}

          {/* Dono only actions */}
          {isDono && (
            <>
              <DropdownMenuSeparator />
              {onForceState && (
                <DropdownMenuItem onClick={onForceState} className="text-amber-600">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Mudar Status (Forçado)
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar Serviço
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
