import { supabase } from '@/integrations/supabase/client';

/**
 * Notification utility functions for automatic business event notifications
 */

type NotificationType = 
  | 'peca_pedida' 
  | 'peca_chegou' 
  | 'servico_atrasado' 
  | 'servico_atribuido' 
  | 'precificacao' 
  | 'entrega_agendada' 
  | 'tarefa_tecnico'
  | 'tarefa_secretaria'
  | 'tarefa_geral';

interface NotificationData {
  user_id: string;
  notification_type: NotificationType;
  title: string;
  message: string;
  service_id?: string;
}

/**
 * Create a notification in the database
 */
async function createNotification(data: NotificationData): Promise<void> {
  const { error } = await supabase.from('notifications').insert({
    user_id: data.user_id,
    notification_type: data.notification_type,
    title: data.title,
    message: data.message,
    service_id: data.service_id || null,
    is_read: false,
  });

  if (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * Get all users with a specific role
 */
async function getUsersByRole(role: 'dono' | 'secretaria' | 'tecnico'): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', role);

  if (error) {
    console.error('Error fetching users by role:', error);
    return [];
  }

  return data?.map((r) => r.user_id) || [];
}

/**
 * Notify when a technician requests a part
 */
export async function notifyPartRequested(
  serviceId: string,
  serviceCode: string,
  technicianName: string,
  partName: string
): Promise<void> {
  try {
    // Notify all owners and secretaries
    const [owners, secretaries] = await Promise.all([
      getUsersByRole('dono'),
      getUsersByRole('secretaria'),
    ]);

    const recipients = [...new Set([...owners, ...secretaries])];

    const notifications = recipients.map((userId) =>
      createNotification({
        user_id: userId,
        notification_type: 'peca_pedida',
        title: `Peça solicitada - ${serviceCode}`,
        message: `${technicianName} solicitou "${partName}" para o serviço ${serviceCode}`,
        service_id: serviceId,
      })
    );

    await Promise.all(notifications);
  } catch (error) {
    console.error('Error notifying part request:', error);
  }
}

/**
 * Notify when a service needs pricing
 */
export async function notifyPricingNeeded(
  serviceId: string,
  serviceCode: string,
  technicianName?: string
): Promise<void> {
  try {
    const owners = await getUsersByRole('dono');

    const notifications = owners.map((userId) =>
      createNotification({
        user_id: userId,
        notification_type: 'precificacao',
        title: `Precificação necessária - ${serviceCode}`,
        message: technicianName
          ? `${technicianName} concluiu o serviço ${serviceCode}. Aguarda definição de preço.`
          : `O serviço ${serviceCode} está concluído e aguarda definição de preço.`,
        service_id: serviceId,
      })
    );

    await Promise.all(notifications);
  } catch (error) {
    console.error('Error notifying pricing needed:', error);
  }
}

/**
 * Notify a technician when a service is assigned to them
 */
export async function notifyServiceAssigned(
  serviceId: string,
  serviceCode: string,
  technicianUserId: string,
  scheduledDate?: string,
  shift?: string
): Promise<void> {
  try {
    const scheduleInfo = scheduledDate
      ? ` para ${new Date(scheduledDate).toLocaleDateString('pt-PT')}${shift ? ` (${shift})` : ''}`
      : '';

    await createNotification({
      user_id: technicianUserId,
      notification_type: 'servico_atribuido',
      title: `Novo serviço atribuído - ${serviceCode}`,
      message: `Foi-lhe atribuído o serviço ${serviceCode}${scheduleInfo}.`,
      service_id: serviceId,
    });
  } catch (error) {
    console.error('Error notifying service assigned:', error);
  }
}

/**
 * Notify when a part has arrived
 */
export async function notifyPartArrived(
  serviceId: string,
  serviceCode: string,
  technicianUserId: string,
  partName: string
): Promise<void> {
  try {
    await createNotification({
      user_id: technicianUserId,
      notification_type: 'peca_chegou',
      title: `Peça chegou - ${serviceCode}`,
      message: `A peça "${partName}" chegou para o serviço ${serviceCode}. O trabalho pode ser retomado.`,
      service_id: serviceId,
    });
  } catch (error) {
    console.error('Error notifying part arrived:', error);
  }
}

/**
 * Notify when a delivery is scheduled
 */
export async function notifyDeliveryScheduled(
  serviceId: string,
  serviceCode: string,
  technicianUserId: string,
  deliveryDate: string,
  clientName: string
): Promise<void> {
  try {
    await createNotification({
      user_id: technicianUserId,
      notification_type: 'entrega_agendada',
      title: `Entrega agendada - ${serviceCode}`,
      message: `Entrega para ${clientName} agendada para ${new Date(deliveryDate).toLocaleDateString('pt-PT')}.`,
      service_id: serviceId,
    });
  } catch (error) {
    console.error('Error notifying delivery scheduled:', error);
  }
}
