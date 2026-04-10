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
  Pencil,
  Ban,
  Mail,
  Paperclip,
  FolderOpen,
  BadgeCheck,
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
  onViewDetails?: () => void;
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
  onEditDetails?: () => void;
  onCancel?: () => void;
  onReopen?: () => void;
  onCancelPartOrder?: () => void;
  onNotifyPartWait?: () => void;
  onAttachDocument?: () => void;
  onViewDocuments?: () => void;
  hasDocuments?: boolean;
  onConfirmOwner?: () => void;
  /** When set, restricts the main button to only the action that matches
   * this filter context. Use the active filter/card status from the parent page. */
  viewContext?: ServiceStatus | 'all';
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
  onEditDetails,
  onCancel,
  onReopen,
  onCancelPartOrder,
  onNotifyPartWait,
  onAttachDocument,
  onViewDocuments,
  hasDocuments,
  onConfirmOwner,
  viewContext,
}: StateActionButtonsProps) {
  const { role } = useAuth();
  const isDono = role === 'dono';
  const isSecretaria = role === 'secretaria';
  const isTecnico = role === 'tecnico';

  const isWarrantyService = service?.is_warranty || false;
  const isServicePriced = (service?.final_price || 0) > 0 || isWarrantyService;
  const isServiceInDebit = !isWarrantyService && isServicePriced && (service?.amount_paid || 0) < (service?.final_price || 0);
  const canBeFinalized = (isServicePriced || isWarrantyService) && !isServiceInDebit && service?.status === 'concluidos';

  // Unified button style - all actions are primary blue
  const primaryButtonClass = 'bg-primary text-primary-foreground hover:bg-primary/90';

  const getMainAction = (): ActionConfig | null => {
    // When a viewContext is active (user clicked a specific filter card),
    // the main button is determined by that context — not the service's own status.
    // This keeps buttons scoped to the navigation context the user is in.
    const contextStatus: ServiceStatus =
      viewContext && viewContext !== 'all'
        ? viewContext as ServiceStatus
        : (service?.status as ServiceStatus);

    switch (contextStatus) {
      case 'por_fazer':
        if (!service?.technician_id) {
          return {
            label: 'Atribuir Técnico',
            icon: UserPlus,
            onClick: onAssignTechnician,
            className: primaryButtonClass,
          };
        }
        if (isTecnico && onStartExecution) {
          return {
            label: 'Iniciar',
            icon: Play,
            onClick: onStartExecution,
            className: primaryButtonClass,
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
            className: primaryButtonClass,
          };
        }
        return null;

      case 'para_pedir_peca':
        if ((isDono || isSecretaria) && onConfirmPartOrder) {
          return {
            label: 'Registar Pedido',
            icon: Package,
            onClick: onConfirmPartOrder,
            className: primaryButtonClass,
          };
        }
        return null;

      case 'em_espera_de_peca':
        if ((isDono || isSecretaria) && onMarkPartArrived) {
          return {
            label: 'Peça Chegou',
            icon: CheckCircle,
            onClick: onMarkPartArrived,
            className: primaryButtonClass,
          };
        }
        return null;

      case 'a_precificar':
        if ((isDono || isSecretaria) && onSetPrice) {
          return {
            label: 'Orçamentar',
            icon: DollarSign,
            onClick: onSetPrice,
            className: primaryButtonClass,
          };
        }
        return null;

      // Serviços finalizados que ainda precisam de precificação
      case 'finalizado':
        if ((isDono || isSecretaria) && service?.pending_pricing && onSetPrice) {
          return {
            label: 'Orçamentar',
            icon: DollarSign,
            onClick: onSetPrice,
            className: primaryButtonClass,
          };
        }
        return null;

      case 'concluidos': {
        // Priority 1: Pricing must be resolved first
        const needsPricing = service?.pending_pricing || !isServicePriced;
        if (needsPricing && (isDono || isSecretaria) && onSetPrice) {
          return {
            label: 'Orçamentar',
            icon: DollarSign,
            onClick: onSetPrice,
            className: primaryButtonClass,
          };
        }
        // Priority 2: Delivery management after pricing is done
        if (!needsPricing && (isDono || isSecretaria) && service?.service_location === 'oficina' && onManageDelivery) {
          return {
            label: 'Gerir Entrega',
            icon: Truck,
            onClick: onManageDelivery,
            className: primaryButtonClass,
          };
        }
        // Priority 3: Payment if in debit
        if (!needsPricing && isServiceInDebit && (isDono || isSecretaria) && onRegisterPayment) {
          return {
            label: 'Registar Pagamento',
            icon: CreditCard,
            onClick: onRegisterPayment,
            className: primaryButtonClass,
          };
        }
        return null;
      }

      // 'em_debito' is no longer an actual status stored in the database.
      // actions that were previously shown for it are handled by the
      // 'concluidos' branch using the `isServiceInDebit` flag above.
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
          {/* Anexar Documento - Everyone can attach documents */}
          {onAttachDocument && (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAttachDocument(); }}>
              <Paperclip className="h-4 w-4 mr-2" />
              Anexar Documento
            </DropdownMenuItem>
          )}

          {/* Ver Anexos - Only shown when documents exist */}
          {hasDocuments && onViewDocuments && (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewDocuments(); }}>
              <FolderOpen className="h-4 w-4 mr-2" />
              Ver Anexos
            </DropdownMenuItem>
          )}

          {onViewDetails && (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewDetails(); }}>
              <Eye className="h-4 w-4 mr-2" />
              Ver Detalhes
            </DropdownMenuItem>
          )}

          {/* Cancel Part Order - Dono or Secretaria when in waiting state */}
          {service?.status === 'em_espera_de_peca' && (isDono || isSecretaria) && onCancelPartOrder && (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCancelPartOrder(); }} className="text-amber-600">
              <Package className="h-4 w-4 mr-2" />
              Cancelar Pedido de Artigo
            </DropdownMenuItem>
          )}

          {/* Notify part wait */}
          {service?.status === 'em_espera_de_peca' && (isDono || isSecretaria) && onNotifyPartWait && (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onNotifyPartWait(); }} className="text-orange-600">
              <Mail className="h-4 w-4 mr-2" />
              Notificar Atraso da Peça
            </DropdownMenuItem>
          )}

          {/* Assign/Reassign Technician */}
          {!service?.technician_id && (isDono || isSecretaria) && (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAssignTechnician(); }}>
              <UserPlus className="h-4 w-4 mr-2" />
              Atribuir Técnico
            </DropdownMenuItem>
          )}
          {service?.technician_id && service?.status !== 'finalizado' && (isDono || isSecretaria) && (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAssignTechnician(); }}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reatribuir Técnico
            </DropdownMenuItem>
          )}

          {/* Reschedule Service - Dono or Secretaria */}
          {service?.technician_id && service?.status !== 'finalizado' && (isDono || isSecretaria) && onReschedule && (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onReschedule(); }}>
              <CalendarClock className="h-4 w-4 mr-2" />
              Reagendar Serviço
            </DropdownMenuItem>
          )}

          {/* Request Part - Technician or Dono during execution */}
          {(service?.status === 'em_execucao' || service?.status === 'na_oficina') && onRequestPart && (isTecnico || isDono || isSecretaria) && (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRequestPart(); }}>
              <Package className="h-4 w-4 mr-2" />
              Solicitar Peça
            </DropdownMenuItem>
          )}

          {/* Set Price - Dono or Secretaria */}
          {(service?.pending_pricing || service?.status === 'a_precificar' || (service?.status === 'concluidos' && !isServicePriced)) && (isDono || isSecretaria) && onSetPrice && (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSetPrice(); }}>
              <DollarSign className="h-4 w-4 mr-2" />
              Orçamentar
            </DropdownMenuItem>
          )}

          {/* Register Payment - Dono or Secretaria */}
          {isServicePriced && isServiceInDebit && (isDono || isSecretaria) && onRegisterPayment && (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRegisterPayment(); }}>
              <CreditCard className="h-4 w-4 mr-2" />
              Registar Pagamento
            </DropdownMenuItem>
          )}

          {/* Contact Client - Secretaria for debit */}
          {isServiceInDebit && isSecretaria && onContactClient && (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onContactClient(); }}>
              <Phone className="h-4 w-4 mr-2" />
              Contactar Cliente
            </DropdownMenuItem>
          )}

          {/* Manage Delivery - Concluidos with workshop location AND pricing resolved */}
          {service?.status === 'concluidos' && service?.service_location === 'oficina' && !service?.pending_pricing && isServicePriced && (isDono || isSecretaria) && onManageDelivery && (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onManageDelivery(); }}>
              <Truck className="h-4 w-4 mr-2" />
              Gerir Entrega
            </DropdownMenuItem>
          )}

          {/* Finalize - When conditions met */}
          {canBeFinalized && (isDono || isSecretaria) && onFinalize && (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onFinalize(); }}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Finalizar Serviço
            </DropdownMenuItem>
          )}

          {/* Edit Details - Dono or Secretaria */}
          {(isDono || isSecretaria) && onEditDetails && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEditDetails(); }}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar Detalhes
              </DropdownMenuItem>
            </>
          )}


          {/* Dono only actions */}
          {isDono && (
            <>
              <DropdownMenuSeparator />
              {/* Confirm Owner Payment - only for finalizado (visually "Concluídos"), fully paid */}
              {service?.status === 'finalizado' && isServicePriced && !isServiceInDebit && onConfirmOwner && (
                !service?.owner_confirmed ? (
                  <DropdownMenuItem
                    onClick={(e) => { e.stopPropagation(); onConfirmOwner(); }}
                    className="text-green-700 font-medium"
                  >
                    <BadgeCheck className="h-4 w-4 mr-2" />
                    Confirmar Pagamento Recebido
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem disabled>
                    <BadgeCheck className="h-4 w-4 mr-2 text-green-600" />
                    Pagamento Confirmado ✓
                  </DropdownMenuItem>
                )
              )}
              {onForceState && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onForceState(); }} className="text-amber-600">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Mudar Status (Forçado)
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar Serviço
                </DropdownMenuItem>
              )}
            </>
          )}

          {/* Cancel Service - Dono or Secretaria */}
          {onCancel && (isDono || isSecretaria) && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onCancel(); }}
                className="text-muted-foreground"
              >
                <Ban className="h-4 w-4 mr-2" />
                Cancelar Serviço
              </DropdownMenuItem>
            </>
          )}

          {/* Reopen Service - Dono or Secretaria */}
          {service.status === 'cancelado' && (isDono || isSecretaria) && onReopen && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onReopen(); }}
                className="text-primary font-medium"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reabrir Serviço
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
