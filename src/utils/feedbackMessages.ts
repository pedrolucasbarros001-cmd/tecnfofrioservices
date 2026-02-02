import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { SERVICE_STATUS_CONFIG, type Service, type ServiceStatus } from '@/types/database';

/**
 * Contextual feedback messages for service actions
 * These messages inform the user about what happened, the new state, and next steps
 */

export type ShiftType = 'manha' | 'tarde' | 'noite';

const shiftLabels: Record<ShiftType, string> = {
  manha: 'manhã',
  tarde: 'tarde',
  noite: 'noite',
};

/**
 * Get feedback message for technician assignment
 */
export function getAssignmentMessage(
  service: Service,
  technicianName: string,
  scheduledDate?: Date,
  shift?: ShiftType
): string {
  const techName = technicianName || 'Técnico';
  
  if (service.service_location === 'oficina') {
    return `${techName} atribuído! Serviço na oficina, aguarda início.`;
  }
  
  // Client location - show scheduled date and shift
  if (scheduledDate && shift) {
    const dateStr = format(scheduledDate, "dd/MM", { locale: pt });
    const shiftLabel = shiftLabels[shift] || shift;
    return `${techName} agendado para ${dateStr}, ${shiftLabel}.`;
  }
  
  return `${techName} atribuído ao serviço.`;
}

/**
 * Get feedback message for pricing
 */
export function getPricingMessage(
  price: number,
  isWarranty: boolean,
  serviceLocation: string
): string {
  if (isWarranty) {
    return 'Garantia aplicada! Serviço sem custo para o cliente.';
  }
  
  const nextStep = serviceLocation === 'oficina' 
    ? 'Pronto para entrega.' 
    : 'Serviço concluído.';
  
  return `Preço definido: €${price.toFixed(2)}. ${nextStep}`;
}

/**
 * Get feedback message for payment
 */
export function getPaymentMessage(
  amountPaid: number,
  remainingBalance: number,
  serviceCode: string
): string {
  if (remainingBalance <= 0) {
    return `Pagamento completo! ${serviceCode} sem débito.`;
  }
  
  return `Pagamento de €${amountPaid.toFixed(2)} registado. Em falta: €${remainingBalance.toFixed(2)}`;
}

/**
 * Get feedback message for part request
 */
export function getPartRequestMessage(
  partName: string,
  serviceCode: string
): string {
  return `Peça "${partName}" solicitada! ${serviceCode} aguarda aprovação.`;
}

/**
 * Get feedback message for status transition
 */
export function getStatusTransitionMessage(
  fromStatus: ServiceStatus,
  toStatus: ServiceStatus,
  serviceCode: string
): string {
  const fromLabel = SERVICE_STATUS_CONFIG[fromStatus]?.label || fromStatus;
  const toLabel = SERVICE_STATUS_CONFIG[toStatus]?.label || toStatus;
  
  return `Estado forçado: ${fromLabel} → ${toLabel}`;
}

/**
 * Get feedback message for delivery method
 */
export function getDeliveryMessage(
  method: 'client_pickup' | 'technician_delivery',
  customerName?: string
): string {
  if (method === 'client_pickup') {
    const name = customerName || 'cliente';
    return `Recolha pelo cliente definida! Notificar ${name}.`;
  }
  
  return 'Entrega por técnico configurada.';
}

/**
 * Get feedback message for repair start
 */
export function getRepairStartMessage(serviceCode: string): string {
  return `Em execução! ${serviceCode} está a ser reparado.`;
}

/**
 * Get feedback message for repair completion
 */
export function getRepairCompleteMessage(serviceCode: string): string {
  return `${serviceCode} concluído! Aguarda precificação pelo dono.`;
}

/**
 * Get feedback message for part order confirmation
 */
export function getPartOrderConfirmMessage(serviceCode: string): string {
  return `Pedido confirmado! ${serviceCode} em espera de peça.`;
}

/**
 * Get feedback message for part arrival
 */
export function getPartArrivedMessage(serviceCode: string): string {
  return `Peça chegou! ${serviceCode} pronto para continuar.`;
}

/**
 * Get feedback message for service finalization
 */
export function getFinalizeMessage(serviceCode: string): string {
  return `${serviceCode} concluído com sucesso!`;
}
