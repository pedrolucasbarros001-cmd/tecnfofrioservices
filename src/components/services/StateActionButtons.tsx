import { 
  UserPlus, 
  Play, 
  DollarSign, 
  CreditCard, 
  Truck,
  CheckCircle,
  Eye,
  MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
}: StateActionButtonsProps) {
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
        return {
          label: 'Iniciar',
          icon: Play,
          onClick: onStartExecution || (() => {}),
          className: 'bg-green-600 hover:bg-green-700 text-white',
        };

      case 'em_execucao':
        return {
          label: 'Acompanhar',
          icon: Eye,
          onClick: onViewDetails,
          className: 'bg-blue-600 hover:bg-blue-700 text-white',
        };

      case 'na_oficina':
      case 'para_pedir_peca':
      case 'em_espera_de_peca':
        return {
          label: 'Ver Detalhes',
          icon: Eye,
          onClick: onViewDetails,
        };

      case 'a_precificar':
        return {
          label: 'Definir Preço',
          icon: DollarSign,
          onClick: onSetPrice || (() => {}),
          className: 'bg-emerald-600 hover:bg-emerald-700 text-white',
        };

      case 'concluidos':
        return {
          label: 'Gerir Entrega',
          icon: Truck,
          onClick: onManageDelivery || (() => {}),
          className: 'bg-teal-600 hover:bg-teal-700 text-white',
        };

      case 'em_debito':
        return {
          label: 'Registar Pagamento',
          icon: CreditCard,
          onClick: onRegisterPayment || (() => {}),
          className: 'bg-orange-600 hover:bg-orange-700 text-white',
        };

      case 'finalizado':
        return {
          label: 'Ver Histórico',
          icon: Eye,
          onClick: onViewDetails,
        };

      default:
        return {
          label: 'Ver Detalhes',
          icon: Eye,
          onClick: onViewDetails,
        };
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
          {!service.technician_id && (
            <DropdownMenuItem onClick={onAssignTechnician}>
              <UserPlus className="h-4 w-4 mr-2" />
              Atribuir Técnico
            </DropdownMenuItem>
          )}
          {service.status === 'concluidos' && onRegisterPayment && (
            <DropdownMenuItem onClick={onRegisterPayment}>
              <CreditCard className="h-4 w-4 mr-2" />
              Registar Pagamento
            </DropdownMenuItem>
          )}
          {(service.status === 'em_debito' || service.status === 'concluidos') && onFinalize && (
            <DropdownMenuItem onClick={onFinalize}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Finalizar Serviço
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
