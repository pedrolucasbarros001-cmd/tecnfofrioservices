// TECNOFRIO Database Types

export type AppRole = 'dono' | 'secretaria' | 'tecnico' | 'monitor';

export type ServiceType = 'reparacao' | 'instalacao' | 'entrega' | 'manutencao';

export type ServiceLocation = 'cliente' | 'oficina' | 'entregue';

export type ServiceStatus =
  | 'por_fazer'
  | 'em_execucao'
  | 'na_oficina'
  | 'para_pedir_peca'
  | 'em_espera_de_peca'
  | 'a_precificar'
  | 'concluidos'
  /**
   * @deprecated financial flag derived from final_price/amount_paid.
   * Keep for backwards compatibility but avoid writing this value.
   * Services should remain in their operational state and the UI
   * determines "em débito" by data, not status.
   */
  | 'em_debito'
  | 'finalizado'
  | 'cancelado';

export type ScheduledShift = 'manha' | 'tarde' | 'noite' | string;

export type PaymentMethod = 'dinheiro' | 'multibanco' | 'transferencia' | 'mbway';

export type PhotoType =
  | 'visita'       // Genérica (legado)
  | 'aparelho'     // Foto geral do aparelho
  | 'etiqueta'     // Etiqueta/placa do aparelho
  | 'estado'       // Estado físico (amassados, danos)
  | 'oficina'
  | 'entrega'
  | 'instalacao'
  | 'instalacao_antes'
  | 'instalacao_depois'
  | 'antes'
  | 'depois';

// Photo type labels for display
export const PHOTO_TYPE_LABELS: Record<PhotoType, string> = {
  aparelho: 'Aparelho',
  etiqueta: 'Etiqueta',
  estado: 'Estado',
  visita: 'Visita',
  oficina: 'Oficina',
  entrega: 'Entrega',
  instalacao: 'Instalação',
  instalacao_antes: 'Antes (Instalação)',
  instalacao_depois: 'Depois (Instalação)',
  antes: 'Antes',
  depois: 'Depois',
};

export type SignatureType = 'recolha' | 'entrega' | 'visita' | 'pedido_peca';

export type BudgetStatus = 'pendente' | 'aprovado' | 'recusado' | 'convertido';

export type DeliveryMethod = 'technician_delivery' | 'client_pickup';

export type TransferRequestStatus = 'pendente' | 'aceite' | 'recusado' | 'cancelado';
export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  onboarding_completed: boolean;
  onboarding_step: number;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  nif: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  customer_type: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Technician {
  id: string;
  profile_id: string;
  specialization: string | null;
  color: string;
  active: boolean;
  created_at: string;
  profile?: Profile;
}

export interface Service {
  id: string;
  code: string;
  customer_id: string | null;
  technician_id: string | null;
  service_type: ServiceType;
  service_location: ServiceLocation;
  status: ServiceStatus;
  appliance_type: string | null;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  fault_description: string | null;
  detected_fault: string | null;
  work_performed: string | null;
  is_warranty: boolean;
  warranty_brand: string | null;
  warranty_process_number: string | null;
  is_urgent: boolean;
  is_sale: boolean;
  is_installation: boolean;
  pending_pricing: boolean;
  scheduled_date: string | null;
  scheduled_shift: ScheduledShift | null;
  labor_cost: number;
  parts_cost: number;
  discount: number;
  final_price: number;
  amount_paid: number;
  delivery_method: DeliveryMethod | null;
  delivery_technician_id: string | null;
  delivery_date: string | null;
  pickup_date: string | null;
  service_address: string | null;
  service_postal_code: string | null;
  service_city: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  notes: string | null;
  last_status_before_part_request: string | null;
  pricing_description: string | null;
  pnc: string | null;
  flow_step: string | null;
  flow_data: any | null;
  owner_confirmed: boolean;
  owner_confirmed_at: string | null;
  last_payment_reminder_sent_at: string | null;
  last_part_notice_sent_at: string | null;
  last_visit_report_sent_at: string | null;
  awaiting_budget_approval: boolean | null;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  technician?: Technician;
}

export interface ServicePart {
  id: string;
  service_id: string;
  part_name: string;
  part_code: string | null;
  quantity: number;
  cost: number;
  iva_rate: number;
  is_requested: boolean;
  estimated_arrival: string | null;
  arrived: boolean;
  supplier: string | null;
  notes: string | null;
  registered_by: string | null;
  registered_location: string | null;
  created_at: string;
}

export interface ServiceDocument {
  id: string;
  service_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  uploaded_by: string | null;
  created_at: string;
}

export interface ServicePhoto {
  id: string;
  service_id: string;
  photo_type: PhotoType;
  file_url: string;
  description: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
}

export interface ServiceSignature {
  id: string;
  service_id: string;
  signature_type: SignatureType;
  file_url: string;
  signer_name: string | null;
  signed_at: string;
}

export interface ServicePayment {
  id: string;
  service_id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string;
  description: string | null;
  received_by: string | null;
  created_at: string;
}

export interface Budget {
  id: string;
  code: string;
  customer_id: string | null;
  appliance_type: string | null;
  brand: string | null;
  model: string | null;
  fault_description: string | null;
  estimated_labor: number;
  estimated_parts: number;
  estimated_total: number;
  status: BudgetStatus;
  converted_service_id: string | null;
  source_service_id: string | null;
  valid_until: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  customer?: Customer;
}

export interface Notification {
  id: string;
  user_id: string;
  notification_type: string | null;
  title: string;
  message: string | null;
  is_read: boolean;
  service_id: string | null;
  created_at: string;
}

export interface ServiceTransferRequest {
  id: string;
  service_id: string;
  from_technician_id: string;
  to_technician_id: string;
  status: TransferRequestStatus;
  message: string | null;
  created_at: string;
  resolved_at: string | null;
}

// Status labels and colors mapping - Institutional Blue design (text > color)
export const SERVICE_STATUS_CONFIG: Record<ServiceStatus, {
  label: string;
  color: string;
  intensity: 'dim' | 'normal' | 'active';
}> = {
  por_fazer: { label: 'Aberto', color: 'bg-primary/10 text-primary', intensity: 'normal' },
  em_execucao: { label: 'Em Execução', color: 'bg-primary/20 text-primary font-medium', intensity: 'active' },
  na_oficina: { label: 'Oficina', color: 'bg-primary/10 text-primary', intensity: 'normal' },
  para_pedir_peca: { label: 'Pedir Peça', color: 'bg-primary/10 text-primary border border-dashed border-primary/30', intensity: 'normal' },
  em_espera_de_peca: { label: 'Espera de Peça', color: 'bg-primary/10 text-primary', intensity: 'normal' },
  a_precificar: { label: 'Orçamentar', color: 'bg-primary/10 text-primary', intensity: 'normal' },
  concluidos: { label: 'Oficina Reparados', color: 'bg-primary/20 text-primary font-medium', intensity: 'active' },
  em_debito: { label: 'Em Débito', color: 'bg-primary/10 text-primary border-l-2 border-l-destructive', intensity: 'normal' },
  finalizado: { label: 'Concluídos', color: 'bg-primary/5 text-primary/60', intensity: 'dim' },
  cancelado: { label: 'Cancelado', color: 'bg-destructive/5 text-destructive/60 line-through', intensity: 'dim' },
};

export const SERVICE_TYPE_CONFIG: Record<ServiceType, { label: string; icon: string }> = {
  reparacao: { label: 'Reparação', icon: 'Wrench' },
  instalacao: { label: 'Instalação', icon: 'Settings' },
  entrega: { label: 'Entrega', icon: 'Truck' },
  manutencao: { label: 'Manutenção', icon: 'Tool' },
};

export const SHIFT_CONFIG: Record<ScheduledShift, { label: string; time: string }> = {
  manha: { label: 'Manhã', time: '08:00 - 12:00' },
  tarde: { label: 'Tarde', time: '14:00 - 18:00' },
  noite: { label: 'Noite', time: '18:00 - 22:00' },
};
