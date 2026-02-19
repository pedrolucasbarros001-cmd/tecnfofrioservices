import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  MapPin,
  Phone,
  Mail,
  Calendar,
  Wrench,
  AlertCircle,
  Shield,
  FileText,
  Tag,
  Clock,
  User,
  Package,
  CreditCard,
  Truck,
  Camera,
  PenTool,
  UserPlus,
  Play,
  ShoppingCart,
  CheckCircle,
  CheckCircle2,
  DollarSign,
  ClipboardList,
  Pencil,
} from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
// ServiceTagModal removed - using dedicated page instead
import { AssignTechnicianModal } from '@/components/modals/AssignTechnicianModal';
import { SetPriceModal } from '@/components/modals/SetPriceModal';
import { RegisterPaymentModal } from '@/components/modals/RegisterPaymentModal';
import { DeliveryManagementModal } from '@/components/modals/DeliveryManagementModal';
import { AssignDeliveryModal } from '@/components/modals/AssignDeliveryModal';
import { ForceStateModal } from '@/components/modals/ForceStateModal';
import { RequestPartModal } from '@/components/modals/RequestPartModal';
import { ConfirmPartOrderModal } from '@/components/modals/ConfirmPartOrderModal';
import { PartArrivedModal } from '@/components/modals/PartArrivedModal';
import { ContactClientModal } from '@/components/modals/ContactClientModal';
import { RescheduleServiceModal } from '@/components/modals/RescheduleServiceModal';
import { PartArrivalIndicator } from '@/components/shared/PartArrivalIndicator';
import { EditServiceDetailsModal } from '@/components/modals/EditServiceDetailsModal';
import { StateActionButtons } from './StateActionButtons';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateService, useDeleteService } from '@/hooks/useServices';
import { supabase } from '@/integrations/supabase/client';
import { SERVICE_STATUS_CONFIG, type Service, type ServiceStatus, type ServicePart, type ServicePayment, type ServicePhoto, type ServiceSignature } from '@/types/database';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { openInNewTabPreservingQuery } from '@/utils/openInNewTab';

// Helper: descrição amigável para tipos de assinatura
const getSignatureDescription = (type: string | null): string => {
  switch (type) {
    case 'recolha':
      return 'Autorização de levantamento do aparelho para reparação em oficina';
    case 'entrega':
      return 'Confirmação da entrega do aparelho';
    case 'visita':
      return 'Confirmação da execução do serviço no local';
    case 'pedido_peca':
      return 'Autorização para encomenda de peça';
    default:
      return 'Assinatura do cliente';
  }
};

// Helper: label amigável para tipos de foto
const getPhotoTypeLabel = (type: string | null): string => {
  switch (type) {
    case 'visita': return 'Visita';
    case 'oficina': return 'Oficina';
    case 'entrega': return 'Entrega';
    case 'instalacao': return 'Instalação';
    case 'instalacao_antes': return 'Antes (Instalação)';
    case 'instalacao_depois': return 'Depois (Instalação)';
    case 'antes': return 'Antes';
    case 'depois': return 'Depois';
    case 'aparelho': return 'Aparelho';
    case 'etiqueta': return 'Etiqueta';
    case 'estado': return 'Estado';
    default: return 'Foto';
  }
};
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ServiceDetailSheetProps {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onServiceUpdated?: () => void;
}

// Helper function to get relevant progress steps based on service type
const getServiceProgressSteps = (service: Service) => {
  const isWorkshop = service.service_location === 'oficina';
  const isDelivery = service.service_type === 'entrega';
  const isInstallation = service.service_type === 'instalacao';

  if (isDelivery) {
    return [
      { label: 'Criado', statuses: ['por_fazer', 'em_execucao', 'concluidos', 'em_debito', 'finalizado'] },
      { label: 'Em Curso', statuses: ['em_execucao', 'concluidos', 'em_debito', 'finalizado'] },
      { label: 'Entregue', statuses: ['concluidos', 'em_debito', 'finalizado'] },
      { label: 'Concluído', statuses: ['finalizado'] },
    ];
  }

  if (isInstallation) {
    return [
      { label: 'Criado', statuses: ['por_fazer', 'em_execucao', 'concluidos', 'em_debito', 'finalizado'] },
      { label: 'Instalação', statuses: ['em_execucao', 'concluidos', 'em_debito', 'finalizado'] },
      { label: 'Concluído', statuses: ['concluidos', 'em_debito', 'finalizado'] },
      { label: 'Concluído', statuses: ['finalizado'] },
    ];
  }

  if (isWorkshop) {
    return [
      { label: 'Criado', statuses: ['por_fazer', 'na_oficina', 'em_execucao', 'para_pedir_peca', 'em_espera_de_peca', 'a_precificar', 'concluidos', 'em_debito', 'finalizado'] },
      { label: 'Oficina', statuses: ['na_oficina', 'em_execucao', 'para_pedir_peca', 'em_espera_de_peca', 'a_precificar', 'concluidos', 'em_debito', 'finalizado'] },
      { label: 'Reparação', statuses: ['em_execucao', 'para_pedir_peca', 'em_espera_de_peca', 'a_precificar', 'concluidos', 'em_debito', 'finalizado'] },
      { label: 'Reparado', statuses: ['concluidos', 'em_debito', 'finalizado'] },
      { label: 'Concluído', statuses: ['finalizado'] },
    ];
  }

  // Visit service (default)
  return [
    { label: 'Criado', statuses: ['por_fazer', 'em_execucao', 'para_pedir_peca', 'em_espera_de_peca', 'a_precificar', 'concluidos', 'em_debito', 'finalizado'] },
    { label: 'Visita', statuses: ['em_execucao', 'para_pedir_peca', 'em_espera_de_peca', 'a_precificar', 'concluidos', 'em_debito', 'finalizado'] },
    { label: 'Concluído', statuses: ['concluidos', 'em_debito', 'finalizado'] },
    { label: 'Concluído', statuses: ['finalizado'] },
  ];
};

export function ServiceDetailSheet({ service, open, onOpenChange, onServiceUpdated }: ServiceDetailSheetProps) {
  const navigate = useNavigate();
  const { role } = useAuth();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  // Modal states
  // showTagModal removed - using dedicated page instead
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showSetPriceModal, setShowSetPriceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showAssignDeliveryModal, setShowAssignDeliveryModal] = useState(false);
  const [showForceStateModal, setShowForceStateModal] = useState(false);
  const [showRequestPartModal, setShowRequestPartModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showConfirmPartOrderModal, setShowConfirmPartOrderModal] = useState(false);
  const [showPartArrivedModal, setShowPartArrivedModal] = useState(false);
  const [showEditDetailsModal, setShowEditDetailsModal] = useState(false);

  // Fetch service parts
  const { data: serviceParts = [] } = useQuery({
    queryKey: ['service-parts', service?.id],
    queryFn: async () => {
      if (!service?.id) return [];
      const { data, error } = await supabase
        .from('service_parts')
        .select('*')
        .eq('service_id', service.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ServicePart[];
    },
    enabled: !!service?.id && open,
  });

  // Fetch service payments
  const { data: servicePayments = [] } = useQuery({
    queryKey: ['service-payments', service?.id],
    queryFn: async () => {
      if (!service?.id) return [];
      const { data, error } = await supabase
        .from('service_payments')
        .select('*, receiver:profiles!service_payments_received_by_fkey(full_name)')
        .eq('service_id', service.id)
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return data as unknown as (ServicePayment & { receiver: { full_name: string | null } | null })[];
    },
    enabled: !!service?.id && open, // Técnicos também veem pagamentos
  });

  // Fetch service photos
  const { data: servicePhotos = [] } = useQuery({
    queryKey: ['service-photos', service?.id],
    queryFn: async () => {
      if (!service?.id) return [];
      const { data, error } = await supabase
        .from('service_photos')
        .select('*, creator:profiles!service_photos_uploaded_by_fkey(full_name)')
        .eq('service_id', service.id)
        .order('uploaded_at', { ascending: false });
      if (error) throw error;
      return data as unknown as (ServicePhoto & { creator: { full_name: string | null } | null })[];
    },
    enabled: !!service?.id && open,
  });

  // Fetch service signatures
  const { data: serviceSignatures = [] } = useQuery({
    queryKey: ['service-signatures', service?.id],
    queryFn: async () => {
      if (!service?.id) return [];
      const { data, error } = await supabase
        .from('service_signatures')
        .select('*')
        .eq('service_id', service.id)
        .order('signed_at', { ascending: true });
      if (error) throw error;
      return data as ServiceSignature[];
    },
    enabled: !!service?.id && open,
  });

  // Fetch activity logs for this service
  const { data: activityLogs = [] } = useQuery({
    queryKey: ['activity-logs', service?.id],
    queryFn: async () => {
      if (!service?.id) return [];
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*, actor:profiles!activity_logs_actor_id_fkey(full_name)')
        .eq('service_id', service.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as (any & { actor: { full_name: string | null } | null })[];
    },
    enabled: !!service?.id && open,
  });

  if (!service) return null;

  const statusConfig = SERVICE_STATUS_CONFIG[service.status];

  const handleStartExecution = () => {
    // Navigate to appropriate technician flow
    if (service.service_type === 'entrega') {
      navigate(`/technician/delivery/${service.id}`);
    } else if (service.service_type === 'instalacao') {
      navigate(`/technician/installation/${service.id}`);
    } else if (service.service_location === 'oficina') {
      navigate(`/technician/workshop/${service.id}`);
    } else {
      navigate(`/technician/visit/${service.id}`);
    }
  };

  const handleFinalize = async () => {
    try {
      await updateService.mutateAsync({
        id: service.id,
        status: 'finalizado',
        skipToast: true,
      });
      toast.success(`${service.code} finalizado com sucesso!`);
      onServiceUpdated?.();
    } catch (error) {
      console.error('Error finalizing service:', error);
    }
  };

  // Handler to open the confirm part order modal
  const handleConfirmPartOrder = () => {
    setShowConfirmPartOrderModal(true);
  };

  // Handler to open the part arrived modal
  const handleMarkPartArrived = () => {
    setShowPartArrivedModal(true);
  };


  const handleDelete = async () => {
    try {
      await deleteService.mutateAsync(service.id);
      onOpenChange(false);
      onServiceUpdated?.();
    } catch (error) {
      console.error('Error deleting service:', error);
    }
  };

  const handleModalSuccess = () => {
    onServiceUpdated?.();
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-[600px] p-0 flex flex-col">
          <ScrollArea className="flex-1">
            {/* Header */}
            <SheetHeader className="sticky top-0 z-10 bg-card p-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ficha do Serviço</p>
                  <SheetTitle className="font-mono text-xl">{service.code}</SheetTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => openInNewTabPreservingQuery(`/print/service/${service.id}`)}>
                    <FileText className="h-4 w-4 mr-1" />
                    Ver Ficha
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openInNewTabPreservingQuery(`/print/tag/${service.id}`)}>
                    <Tag className="h-4 w-4 mr-1" />
                    Ver Etiqueta
                  </Button>
                </div>
              </div>
            </SheetHeader>

            <div className="p-4 space-y-6">
              {/* Status Timeline - Horizontal (filtered by service type) */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-4 text-sm">Progresso do Serviço</h4>
                {(() => {
                  const progressSteps = getServiceProgressSteps(service);
                  const currentStatus = service.status as ServiceStatus;

                  return (
                    <div className="flex items-center justify-between overflow-x-auto pb-2 gap-1">
                      {progressSteps.map((step, index) => {
                        const isCompleted = step.statuses.includes(currentStatus);
                        const isCurrent = step.statuses.includes(currentStatus) &&
                          !progressSteps[index + 1]?.statuses.includes(currentStatus);

                        return (
                          <div key={step.label} className="flex flex-col items-center min-w-[60px] relative flex-1">
                            {/* Connector line */}
                            {index > 0 && (
                              <div
                                className={cn(
                                  "absolute top-4 right-1/2 w-full h-0.5 -translate-y-1/2",
                                  isCompleted ? "bg-primary" : "bg-muted-foreground/20"
                                )}
                                style={{ width: 'calc(100% + 8px)', right: '50%' }}
                              />
                            )}

                            <div
                              className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all relative z-10",
                                isCurrent ? "bg-primary text-primary-foreground scale-110 ring-4 ring-primary/20" :
                                  isCompleted ? "bg-primary/80 text-primary-foreground" :
                                    "bg-muted-foreground/20 text-muted-foreground"
                              )}
                            >
                              {index + 1}
                            </div>
                            <span className={cn(
                              "text-[10px] mt-1 text-center leading-tight",
                              isCurrent ? "text-primary font-medium" : "text-muted-foreground"
                            )}>
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Tags */}
              <div className="flex gap-2 flex-wrap">
                {/* Estado principal - sempre primeiro */}
                <Badge className={statusConfig.color}>{statusConfig.label}</Badge>

                {/* Tipo de serviço */}
                {service.service_type === 'instalacao' && (
                  <Badge className="bg-yellow-500 text-black">
                    <Wrench className="h-3 w-3 mr-1" />
                    Instalação
                  </Badge>
                )}
                {service.service_type === 'entrega' && (
                  <Badge className="bg-green-500 text-white">
                    <Truck className="h-3 w-3 mr-1" />
                    Entrega
                  </Badge>
                )}
                {service.service_type === 'reparacao' && service.service_location === 'oficina' && (
                  <Badge className="bg-orange-500 text-white">
                    <Wrench className="h-3 w-3 mr-1" />
                    Oficina
                  </Badge>
                )}
                {service.service_type === 'reparacao' && service.service_location === 'cliente' && (
                  <Badge className="bg-blue-500 text-white">
                    <MapPin className="h-3 w-3 mr-1" />
                    Visita
                  </Badge>
                )}

                {/* Tags complementares - NÃO duplicar estado */}
                {service.is_urgent && (
                  <Badge variant="destructive" className="animate-pulse">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Urgente
                  </Badge>
                )}
                {service.is_warranty && (
                  <Badge className="bg-purple-500 text-white">
                    <Shield className="h-3 w-3 mr-1" />
                    Garantia
                  </Badge>
                )}

                {/* A Precificar - só se estado não for a_precificar */}
                {service.pending_pricing && service.status !== 'a_precificar' && (
                  <Badge className="bg-yellow-500 text-black">
                    A Precificar
                  </Badge>
                )}

                {/* Em Débito - indica débito coexistente */}
                {service.status !== 'em_debito' &&
                  (service.final_price || 0) > 0 &&
                  (service.amount_paid || 0) < (service.final_price || 0) && (
                    <Badge className="bg-red-500 text-white">
                      Em Débito
                    </Badge>
                  )}
              </div>

              {/* Customer Info */}
              <Section
                title="Cliente"
                bgColor="bg-blue-50"
                borderColor="border-l-blue-500"
              >
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {service.customer?.name || 'Sem cliente'}
                </h3>
                {service.customer && (
                  <div className="space-y-1 mt-2 text-sm">
                    {service.customer.nif && (
                      <p className="text-muted-foreground">NIF: {service.customer.nif}</p>
                    )}
                    {service.customer.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{service.customer.phone}</span>
                      </div>
                    )}
                    {service.customer.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{service.customer.email}</span>
                      </div>
                    )}
                    {service.customer.address && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>
                          {[service.customer.address, service.customer.postal_code, service.customer.city]
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </Section>

              {/* Equipment Info */}
              <Section
                title="Detalhes do Serviço"
                bgColor="bg-pink-50"
                borderColor="border-l-pink-500"
                action={role === 'dono' ? (
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowEditDetailsModal(true)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                ) : undefined}
              >
                <div className="flex items-center gap-2 mb-2">
                  {service.service_type === 'instalacao' ? (
                    <Badge className="bg-yellow-500 text-black border-yellow-500">INSTALAÇÃO</Badge>
                  ) : service.service_type === 'entrega' ? (
                    <Badge className="bg-green-500 text-white border-green-500">ENTREGA</Badge>
                  ) : service.service_location === 'cliente' ? (
                    <Badge className="border-blue-500 text-blue-600 bg-blue-50">VISITA</Badge>
                  ) : (
                    <Badge className="bg-orange-500 text-white border-orange-500">OFICINA</Badge>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="font-medium">
                    {[service.appliance_type, service.brand, service.model]
                      .filter(Boolean)
                      .join(' • ') || 'Não especificado'}
                  </p>
                  {service.serial_number && (
                    <p className="text-sm text-muted-foreground">
                      S/N: {service.serial_number}
                    </p>
                  )}
                </div>

                {service.fault_description && (
                  <div className="mt-3 p-3 bg-white rounded-lg border">
                    <p className="text-xs text-muted-foreground uppercase mb-1">Avaria Reportada</p>
                    <p className="text-sm">{service.fault_description}</p>
                  </div>
                )}

                {service.detected_fault && (
                  <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-[10px] text-amber-700 uppercase font-medium mb-1">
                      Detectada por: {service.technician?.profile?.full_name || 'Técnico'}
                    </p>
                    <p className="text-xs text-amber-600 uppercase mb-1">Avaria Detectada</p>
                    <p className="text-sm">{service.detected_fault}</p>
                  </div>
                )}

                {service.work_performed && (
                  <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-[10px] text-green-700 uppercase font-medium mb-1">
                      Realizado por: {service.technician?.profile?.full_name || 'Técnico'}
                    </p>
                    <p className="text-xs text-green-600 uppercase mb-1">Trabalho Realizado</p>
                    <p className="text-sm">{service.work_performed}</p>
                  </div>
                )}
              </Section>

              {/* Schedule Info */}
              <Section
                title="Agendamento"
                bgColor="bg-green-50"
                borderColor="border-l-green-500"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {service.scheduled_date
                        ? format(new Date(service.scheduled_date), "d 'de' MMMM", { locale: pt })
                        : 'Não agendado'}
                    </span>
                  </div>
                  {service.scheduled_shift && (
                    <Badge variant="secondary" className="capitalize">
                      {service.scheduled_shift === 'manha' ? 'Manhã' :
                        service.scheduled_shift === 'tarde' ? 'Tarde' :
                          service.scheduled_shift === 'noite' ? 'Noite' :
                            service.scheduled_shift}
                    </Badge>
                  )}
                </div>

                {service.technician?.profile && (
                  <div className="flex items-center gap-3 mt-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium"
                      style={{ backgroundColor: service.technician.color || '#3B82F6' }}
                    >
                      {service.technician.profile.full_name?.charAt(0) || 'T'}
                    </div>
                    <div>
                      <p className="font-medium">{service.technician.profile.full_name}</p>
                      <p className="text-xs text-muted-foreground">Técnico responsável</p>
                    </div>
                  </div>
                )}
              </Section>

              {/* Pricing - Enhanced financial section */}
              {(service.labor_cost > 0 || service.parts_cost > 0 || service.final_price > 0) && (
                <Section
                  title="Informação Financeira"
                  bgColor="bg-emerald-50"
                  borderColor="border-l-emerald-500"
                >
                  <div className="space-y-2">
                    {service.labor_cost > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Mão de Obra</span>
                        <span className="font-medium">{service.labor_cost.toFixed(2)} €</span>
                      </div>
                    )}
                    {service.parts_cost > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Peças</span>
                        <span className="font-medium">{service.parts_cost.toFixed(2)} €</span>
                      </div>
                    )}
                    {service.discount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Desconto</span>
                        <span>-{service.discount.toFixed(2)} €</span>
                      </div>
                    )}
                    {service.final_price > 0 && (
                      <>
                        <Separator />
                        <div className="flex justify-between font-semibold text-lg">
                          <span>TOTAL</span>
                          <span className="text-primary">{service.final_price.toFixed(2)} €</span>
                        </div>
                      </>
                    )}
                    {/* Valor já pago */}
                    {(service.amount_paid || 0) > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Já Pago</span>
                        <span>{(service.amount_paid || 0).toFixed(2)} €</span>
                      </div>
                    )}
                    {/* Em débito e falta para pagamento */}
                    {service.final_price > 0 && (service.amount_paid || 0) < service.final_price && (
                      <>
                        <div className="flex justify-between text-sm text-red-600 font-medium">
                          <span>Em Débito</span>
                          <span>{(service.final_price - (service.amount_paid || 0)).toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between text-sm text-amber-600 font-medium bg-amber-50 p-2 rounded">
                          <span>Falta para Pagamento Completo</span>
                          <span>{(service.final_price - (service.amount_paid || 0)).toFixed(2)} €</span>
                        </div>
                      </>
                    )}
                  </div>
                </Section>
              )}

              {/* History */}
              <Section
                title="Histórico"
                bgColor="bg-gray-50"
                borderColor="border-l-gray-400"
              >
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Criado em:</span>
                    <span>{format(new Date(service.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: pt })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Última atualização:</span>
                    <span>{format(new Date(service.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: pt })}</span>
                  </div>
                </div>
              </Section>

              {/* Parts Used / Requested */}
              {serviceParts.length > 0 && (
                <Section
                  title="Peças Utilizadas/Solicitadas"
                  bgColor="bg-yellow-50"
                  borderColor="border-l-yellow-500"
                >
                  <div className="space-y-2">
                    {serviceParts.map((part) => (
                      <div key={part.id} className="flex items-center justify-between p-2 bg-white rounded border text-sm">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-yellow-600" />
                            <span className="font-medium">{part.part_name}</span>
                            {part.part_code && (
                              <span className="text-xs text-muted-foreground">({part.part_code})</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>Qtd: {part.quantity}</span>
                            {part.cost && part.cost > 0 && (
                              <span>• Custo: {part.cost.toFixed(2)} €</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {part.arrived ? (
                            <Badge className="bg-green-500 text-white text-xs">Chegou</Badge>
                          ) : part.is_requested ? (
                            <Badge className="bg-orange-500 text-white text-xs">Pedida</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Registada</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between pt-2 border-t font-medium text-sm">
                      <span>Total Peças:</span>
                      <span className="text-primary">
                        {serviceParts.reduce((sum, p) => sum + ((p.cost || 0) * (p.quantity || 1)), 0).toFixed(2)} €
                      </span>
                    </div>
                  </div>
                </Section>
              )}

              {/* Payment History - For dono, secretaria and tecnico */}
              {(role === 'dono' || role === 'secretaria' || role === 'tecnico') && servicePayments.length > 0 && (
                <Section
                  title="Histórico de Pagamentos"
                  bgColor="bg-teal-50"
                  borderColor="border-l-teal-500"
                >
                  <div className="space-y-2">
                    {servicePayments.map((payment) => (
                      <div key={payment.id} className="space-y-1">
                        {payment.receiver?.full_name && (
                          <p className="text-[10px] text-muted-foreground uppercase font-medium pl-1">
                            Recebido por: {payment.receiver.full_name}
                          </p>
                        )}
                        <div className="flex items-center justify-between p-2 bg-white rounded border text-sm">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-teal-600" />
                            <div>
                              <p className="font-medium">{payment.amount.toFixed(2)} €</p>
                              <p className="text-xs text-muted-foreground">
                                {payment.payment_date && format(new Date(payment.payment_date), "dd/MM/yyyy", { locale: pt })}
                                {payment.payment_method && ` • ${payment.payment_method.toUpperCase()}`}
                              </p>
                            </div>
                          </div>
                          {payment.description && (
                            <span className="text-xs text-muted-foreground max-w-[150px] truncate">
                              {payment.description}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between pt-2 border-t font-medium text-sm">
                      <span>Total Pago:</span>
                      <span className="text-green-600">
                        {servicePayments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)} €
                      </span>
                    </div>
                  </div>
                </Section>
              )}

              {/* Service Photos */}
              {servicePhotos.length > 0 && (
                <Section
                  title="Fotos do Serviço"
                  bgColor="bg-indigo-50"
                  borderColor="border-l-indigo-500"
                >
                  <div className="grid grid-cols-3 gap-2">
                    {servicePhotos.map((photo) => (
                      <div key={photo.id} className="flex flex-col gap-1">
                        {photo.creator?.full_name && (
                          <p className="text-[9px] text-muted-foreground truncate" title={photo.creator.full_name}>
                            Por: {photo.creator.full_name.split(' ')[0]}
                          </p>
                        )}
                        <div className="relative">
                          <a href={photo.file_url} target="_blank" rel="noopener noreferrer">
                            <img
                              src={photo.file_url}
                              alt={photo.description || 'Foto do serviço'}
                              className="w-full h-20 object-cover rounded border hover:opacity-80 transition-opacity cursor-pointer"
                            />
                          </a>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 rounded-b text-center capitalize">
                            {getPhotoTypeLabel(photo.photo_type)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Camera className="h-3 w-3" />
                    {servicePhotos.length} foto{servicePhotos.length !== 1 ? 's' : ''} • Clique para ampliar
                  </p>
                </Section>
              )}

              {/* Service Signatures */}
              {serviceSignatures.length > 0 && (
                <Section
                  title="Assinaturas do Cliente"
                  bgColor="bg-violet-50"
                  borderColor="border-l-violet-500"
                >
                  <div className="space-y-3">
                    {serviceSignatures.map((sig) => (
                      <div key={sig.id} className="flex items-start gap-3 p-3 bg-white rounded-lg border">
                        <a href={sig.file_url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={sig.file_url}
                            alt="Assinatura"
                            className="w-24 h-14 object-contain border rounded bg-gray-50 hover:opacity-80 transition-opacity cursor-pointer"
                          />
                        </a>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <PenTool className="h-4 w-4 text-violet-600" />
                            <span className="font-medium text-sm">{sig.signer_name || 'Cliente'}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {getSignatureDescription(sig.signature_type)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(sig.signed_at), "dd/MM/yyyy 'às' HH:mm", { locale: pt })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Activity History Timeline */}
              {activityLogs.length > 0 && (
                <Section
                  title="Histórico de Atividades"
                  bgColor="bg-slate-50"
                  borderColor="border-l-slate-500"
                >
                  <div className="space-y-3">
                    {activityLogs.map((log, index) => (
                      <ActivityLogItem key={log.id} log={log} isLast={index === activityLogs.length - 1} />
                    ))}
                  </div>
                </Section>
              )}

              {/* Notes */}
              {service.notes && (
                <Section
                  title="Observações"
                  bgColor="bg-slate-50"
                  borderColor="border-l-slate-400"
                >
                  <p className="text-sm whitespace-pre-wrap">{service.notes}</p>
                </Section>
              )}
            </div>
          </ScrollArea>

          {/* Fixed Footer with Actions */}
          <div className="flex-shrink-0 border-t bg-card p-4">
            <StateActionButtons
              service={service}
              onAssignTechnician={() => setShowAssignModal(true)}
              onViewDetails={() => { }}
              onStartExecution={role === 'tecnico' ? handleStartExecution : undefined}
              onSetPrice={(role === 'dono' || role === 'secretaria') ? () => setShowSetPriceModal(true) : undefined}
              onRegisterPayment={(role === 'dono' || role === 'secretaria') ? () => setShowPaymentModal(true) : undefined}
              onManageDelivery={(role === 'dono' || role === 'secretaria') ? () => setShowDeliveryModal(true) : undefined}
              onFinalize={(role === 'dono' || role === 'secretaria') ? handleFinalize : undefined}
              onRequestPart={(role === 'dono' || role === 'tecnico') ? () => setShowRequestPartModal(true) : undefined}
              onConfirmPartOrder={role === 'dono' ? handleConfirmPartOrder : undefined}
              onMarkPartArrived={role === 'dono' ? handleMarkPartArrived : undefined}
              onForceState={role === 'dono' ? () => setShowForceStateModal(true) : undefined}
              onContactClient={role === 'secretaria' ? () => setShowContactModal(true) : undefined}
              onDelete={role === 'dono' ? () => setShowDeleteDialog(true) : undefined}
              onReschedule={(role === 'dono' || role === 'secretaria') ? () => setShowRescheduleModal(true) : undefined}
            />
            <p className="text-xs text-muted-foreground text-center mt-3">
              O aparelho só pode permanecer na oficina por até 30 dias após a conclusão do serviço.
            </p>
          </div>
        </SheetContent>
      </Sheet>

      {/* All Modals */}
      <AssignTechnicianModal
        open={showAssignModal}
        onOpenChange={(open) => {
          setShowAssignModal(open);
          if (!open) handleModalSuccess();
        }}
        service={service}
      />
      <SetPriceModal
        open={showSetPriceModal}
        onOpenChange={(open) => {
          setShowSetPriceModal(open);
          if (!open) handleModalSuccess();
        }}
        service={service}
      />
      <RegisterPaymentModal
        open={showPaymentModal}
        onOpenChange={(open) => {
          setShowPaymentModal(open);
          if (!open) handleModalSuccess();
        }}
        service={service}
      />
      <DeliveryManagementModal
        open={showDeliveryModal}
        onOpenChange={(open) => {
          setShowDeliveryModal(open);
          if (!open) handleModalSuccess();
        }}
        service={service}
        onAssignDelivery={() => {
          setShowDeliveryModal(false);
          setShowAssignDeliveryModal(true);
        }}
      />
      <ForceStateModal
        open={showForceStateModal}
        onOpenChange={(open) => {
          setShowForceStateModal(open);
          if (!open) handleModalSuccess();
        }}
        service={service}
      />
      <RequestPartModal
        open={showRequestPartModal}
        onOpenChange={(open) => {
          setShowRequestPartModal(open);
          if (!open) handleModalSuccess();
        }}
        service={service}
      />
      <ContactClientModal
        open={showContactModal}
        onOpenChange={setShowContactModal}
        service={service}
      />
      <AssignDeliveryModal
        open={showAssignDeliveryModal}
        onOpenChange={(open) => {
          setShowAssignDeliveryModal(open);
          if (!open) handleModalSuccess();
        }}
        service={service}
      />
      <RescheduleServiceModal
        open={showRescheduleModal}
        onOpenChange={(open) => {
          setShowRescheduleModal(open);
          if (!open) handleModalSuccess();
        }}
        service={service}
      />
      <ConfirmPartOrderModal
        open={showConfirmPartOrderModal}
        onOpenChange={(open) => {
          setShowConfirmPartOrderModal(open);
          if (!open) handleModalSuccess();
        }}
        service={service}
      />
      <PartArrivedModal
        open={showPartArrivedModal}
        onOpenChange={(open) => {
          setShowPartArrivedModal(open);
          if (!open) handleModalSuccess();
        }}
        service={service}
      />

      <EditServiceDetailsModal
        open={showEditDetailsModal}
        onOpenChange={setShowEditDetailsModal}
        service={service}
        onSuccess={handleModalSuccess}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Serviço</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja eliminar o serviço {service.code}?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface SectionProps {
  title: string;
  bgColor: string;
  borderColor: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

function Section({ title, bgColor, borderColor, children, action }: SectionProps) {
  return (
    <div className={cn(
      "rounded-lg p-4 border-l-4",
      bgColor,
      borderColor
    )}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          {title}
        </h4>
        {action}
      </div>
      {children}
    </div>
  );
}

// Activity log action type icons and colors
const ACTION_TYPE_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; bgColor: string; iconColor: string }> = {
  atribuicao: { icon: UserPlus, bgColor: 'bg-blue-100', iconColor: 'text-blue-600' },
  inicio_execucao: { icon: Play, bgColor: 'bg-green-100', iconColor: 'text-green-600' },
  levantamento: { icon: Package, bgColor: 'bg-orange-100', iconColor: 'text-orange-600' },
  pedido_peca: { icon: ShoppingCart, bgColor: 'bg-yellow-100', iconColor: 'text-yellow-600' },
  peca_chegou: { icon: CheckCircle, bgColor: 'bg-green-100', iconColor: 'text-green-600' },
  conclusao: { icon: CheckCircle2, bgColor: 'bg-emerald-100', iconColor: 'text-emerald-600' },
  precificacao: { icon: DollarSign, bgColor: 'bg-purple-100', iconColor: 'text-purple-600' },
  pagamento: { icon: CreditCard, bgColor: 'bg-teal-100', iconColor: 'text-teal-600' },
  entrega: { icon: Truck, bgColor: 'bg-green-100', iconColor: 'text-green-600' },
  tarefa: { icon: ClipboardList, bgColor: 'bg-gray-100', iconColor: 'text-gray-600' },
};

interface ActivityLogItemProps {
  log: {
    id: string;
    action_type: string;
    description: string;
    created_at: string;
    is_public: boolean;
    actor?: {
      full_name: string | null;
    } | null;
  };
  isLast: boolean;
}

function ActivityLogItem({ log, isLast }: ActivityLogItemProps) {
  const config = ACTION_TYPE_CONFIG[log.action_type] || {
    icon: Clock,
    bgColor: 'bg-gray-100',
    iconColor: 'text-gray-600'
  };
  const Icon = config.icon;

  return (
    <div className="flex gap-3">
      {/* Icon with vertical line */}
      <div className="flex flex-col items-center">
        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", config.bgColor)}>
          <Icon className={cn("h-4 w-4", config.iconColor)} />
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-muted-foreground/20 mt-1" />}
      </div>

      {/* Content */}
      <div className="flex-1 pb-3">
        {log.actor?.full_name && (
          <p className="text-[10px] text-muted-foreground uppercase font-medium leading-none mb-1">
            {log.actor.full_name}
          </p>
        )}
        <p className="text-sm">{log.description}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: pt })}
        </p>
      </div>
    </div>
  );
}
