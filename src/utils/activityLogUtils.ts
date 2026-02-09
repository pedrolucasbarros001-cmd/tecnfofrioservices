import { supabase } from '@/integrations/supabase/client';

/**
 * Activity Log Types
 */
export type ActivityActionType =
  | 'atribuicao'
  | 'inicio_execucao'
  | 'levantamento'
  | 'pedido_peca'
  | 'peca_chegou'
  | 'conclusao'
  | 'precificacao'
  | 'pagamento'
  | 'entrega'
  | 'tarefa'
  | 'transferencia_solicitada'
  | 'transferencia_aceite'
  | 'transferencia_recusada';

export interface ActivityLogData {
  serviceId?: string;
  actorId?: string;
  actionType: ActivityActionType;
  description: string;
  metadata?: Record<string, unknown>;
  isPublic?: boolean;
}

/**
 * Log an activity to the activity_logs table
 */
export async function logActivity({
  serviceId,
  actorId,
  actionType,
  description,
  metadata,
  isPublic = false,
}: ActivityLogData): Promise<void> {
  try {
    const insertData: Record<string, unknown> = {
      service_id: serviceId || null,
      actor_id: actorId || null,
      action_type: actionType,
      description,
      metadata: metadata || null,
      is_public: isPublic,
    };

    const { error } = await supabase.from('activity_logs').insert(insertData as never);

    if (error) {
      console.error('Error logging activity:', error);
    }
  } catch (error) {
    console.error('Error in logActivity:', error);
  }
}

/**
 * Log technician assignment
 */
export async function logTechnicianAssignment(
  serviceCode: string,
  serviceId: string,
  technicianName: string,
  actorId?: string,
  actorName?: string
): Promise<void> {
  await logActivity({
    serviceId,
    actorId,
    actionType: 'atribuicao',
    description: `${actorName || 'Utilizador'} atribuiu ${serviceCode} ao técnico ${technicianName}`,
    isPublic: true,
  });
}

/**
 * Log service start
 */
export async function logServiceStart(
  serviceCode: string,
  serviceId: string,
  technicianName: string,
  actorId?: string
): Promise<void> {
  await logActivity({
    serviceId,
    actorId,
    actionType: 'inicio_execucao',
    description: `Técnico ${technicianName} começou ${serviceCode}`,
    isPublic: true,
  });
}

/**
 * Log equipment pickup to workshop
 */
export async function logWorkshopPickup(
  serviceCode: string,
  serviceId: string,
  technicianName: string,
  actorId?: string
): Promise<void> {
  await logActivity({
    serviceId,
    actorId,
    actionType: 'levantamento',
    description: `Equipamento ${serviceCode} levantado para oficina por ${technicianName}`,
    isPublic: true,
  });
}

/**
 * Log part request
 */
export async function logPartRequest(
  serviceCode: string,
  serviceId: string,
  partName: string,
  technicianName: string,
  actorId?: string
): Promise<void> {
  await logActivity({
    serviceId,
    actorId,
    actionType: 'pedido_peca',
    description: `Técnico ${technicianName} solicitou peça "${partName}" para ${serviceCode}`,
    isPublic: true,
  });
}

/**
 * Log part arrival
 */
export async function logPartArrival(
  serviceCode: string,
  serviceId: string,
  partName: string,
  actorId?: string
): Promise<void> {
  await logActivity({
    serviceId,
    actorId,
    actionType: 'peca_chegou',
    description: `Peça "${partName}" chegou para ${serviceCode}`,
    isPublic: true,
  });
}

/**
 * Log service completion
 */
export async function logServiceCompletion(
  serviceCode: string,
  serviceId: string,
  technicianName: string,
  actorId?: string
): Promise<void> {
  await logActivity({
    serviceId,
    actorId,
    actionType: 'conclusao',
    description: `Técnico ${technicianName} concluiu reparação de ${serviceCode}`,
    isPublic: true,
  });
}

/**
 * Log pricing set
 */
export async function logPricingSet(
  serviceCode: string,
  serviceId: string,
  price: number,
  actorId?: string,
  actorName?: string
): Promise<void> {
  await logActivity({
    serviceId,
    actorId,
    actionType: 'precificacao',
    description: `${actorName || 'Dono'} definiu preço €${price.toFixed(2)} para ${serviceCode}`,
    isPublic: false,
  });
}

/**
 * Log payment
 */
export async function logPayment(
  serviceCode: string,
  serviceId: string,
  amount: number,
  actorId?: string,
  actorName?: string
): Promise<void> {
  await logActivity({
    serviceId,
    actorId,
    actionType: 'pagamento',
    description: `Registado pagamento de €${amount.toFixed(2)} para ${serviceCode}`,
    isPublic: false,
  });
}

/**
 * Log delivery
 */
export async function logDelivery(
  serviceCode: string,
  serviceId: string,
  clientName: string,
  actorId?: string
): Promise<void> {
  await logActivity({
    serviceId,
    actorId,
    actionType: 'entrega',
    description: `Equipamento ${serviceCode} entregue a ${clientName}`,
    isPublic: true,
  });
}

/**
 * Log task/notification sent
 */
export async function logTaskSent(
  message: string,
  recipientType: 'tecnico' | 'secretaria' | 'todos',
  recipientName?: string,
  actorId?: string,
  actorName?: string
): Promise<void> {
  const recipient = recipientType === 'todos' 
    ? 'todos' 
    : recipientName || recipientType;

  await logActivity({
    actorId,
    actionType: 'tarefa',
    description: `${actorName || 'Utilizador'} enviou tarefa para ${recipient}: "${message}"`,
    isPublic: recipientType === 'todos',
    metadata: { recipientType, message },
  });
}

/**
 * Log transfer request
 */
export async function logTransferRequested(
  serviceCode: string,
  serviceId: string,
  fromTechnicianName: string,
  toTechnicianName: string,
  actorId?: string
): Promise<void> {
  await logActivity({
    serviceId,
    actorId,
    actionType: 'transferencia_solicitada',
    description: `${fromTechnicianName} solicitou transferência de ${serviceCode} para ${toTechnicianName}`,
    isPublic: true,
  });
}

/**
 * Log transfer accepted
 */
export async function logTransferAccepted(
  serviceCode: string,
  serviceId: string,
  fromTechnicianName: string,
  toTechnicianName: string,
  actorId?: string
): Promise<void> {
  await logActivity({
    serviceId,
    actorId,
    actionType: 'transferencia_aceite',
    description: `${toTechnicianName} aceitou assumir ${serviceCode} de ${fromTechnicianName}`,
    isPublic: true,
  });
}

/**
 * Log transfer rejected
 */
export async function logTransferRejected(
  serviceCode: string,
  serviceId: string,
  fromTechnicianName: string,
  toTechnicianName: string,
  actorId?: string
): Promise<void> {
  await logActivity({
    serviceId,
    actorId,
    actionType: 'transferencia_recusada',
    description: `${toTechnicianName} recusou assumir ${serviceCode} de ${fromTechnicianName}`,
    isPublic: false,
  });
}
