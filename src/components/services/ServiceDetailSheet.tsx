import * as React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
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
import { PhotoGalleryModal } from '@/components/shared/PhotoGalleryModal';
import { CancelPartSelectionModal } from '@/components/modals/CancelPartSelectionModal';
import { StateActionButtons } from './StateActionButtons';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateService, useDeleteService, useFullServiceData } from '@/hooks/useServices';
import { supabase } from '@/integrations/supabase/client';
import { SERVICE_STATUS_CONFIG, type Service, type ServiceStatus, type ServicePart, type ServicePayment, type ServicePhoto, type ServiceSignature } from '@/types/database';
import { ServiceStatusBadge } from '@/components/shared/ServiceStatusBadge';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { logActivity } from '@/utils/activityLogUtils';
import { openInNewTabPreservingQuery } from '@/utils/openInNewTab';
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
import { humanizeError } from '@/utils/errorMessages';
import { formatShiftLabel } from '@/utils/dateUtils';

// Helper: safe date formatting to prevent crashes on "Invalid Date"
const safeFormat = (date: any, formatStr: string, options?: any) => {
  if (!date) return '-';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '-';
    return format(d, formatStr, options);
  } catch (e) {
    console.error('[ServiceDetailSheet] Date formatting error:', e);
    return '-';
  }
};

const safeNumber = (val: any) => {
  const num = Number(val);
  return isNaN(num) ? 0 : num;
};

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



// LazyImage: shows skeleton until image loads, then fades in
function LazyImage({ src, alt, className, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [loaded, setLoaded] = React.useState(false);
  return (
    <div className="relative">
      {!loaded && <Skeleton className={cn("absolute inset-0", className)} />}
      <img
        src={src}
        alt={alt}
        className={cn(className, "transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0")}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        {...props}
      />
    </div>
  );
}

interface ServiceDetailSheetProps {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onServiceUpdated?: () => void;
}

// Helper function to get relevant progress steps based on service type.  **operational states only**
//
// The UI used to include `'em_debito'` in the arrays below, which encouraged
// writing that value back to the database.  debt is now a *derived* flag that
// is shown by `ServiceStatusBadge` and should never be pushed as a status.  We
// keep the old label around for colouring, but the progress steps themselves
// are strictly about workflow.
const getServiceProgressSteps = (service: Service) => {
  const isWorkshop = service.service_location === 'oficina';
  const isDelivery = service.service_type === 'entrega';
  const isInstallation = service.service_type === 'instalacao';

  if (isDelivery) {
    return [
      { label: 'Criado', statuses: ['por_fazer', 'em_execucao', 'concluidos', 'finalizado'] },
      { label: 'Em Curso', statuses: ['em_execucao', 'concluidos', 'finalizado'] },
      { label: 'Entregue', statuses: ['concluidos', 'finalizado'] },
      { label: 'Concluído', statuses: ['finalizado'] },
    ];
  }

  if (isInstallation) {
    return [
      { label: 'Criado', statuses: ['por_fazer', 'em_execucao', 'concluidos', 'finalizado'] },
      { label: 'Instalação', statuses: ['em_execucao', 'concluidos', 'finalizado'] },
      { label: 'Concluído', statuses: ['concluidos', 'finalizado'] },
      { label: 'Concluído', statuses: ['finalizado'] },
    ];
  }

  if (isWorkshop) {
    return [
      { label: 'Criado', statuses: ['por_fazer', 'na_oficina', 'em_execucao', 'para_pedir_peca', 'em_espera_de_peca', 'a_precificar', 'concluidos', 'finalizado'] },
      { label: 'Oficina', statuses: ['na_oficina', 'em_execucao', 'para_pedir_peca', 'em_espera_de_peca', 'a_precificar', 'concluidos', 'finalizado'] },
      { label: 'Reparação', statuses: ['em_execucao', 'para_pedir_peca', 'em_espera_de_peca', 'a_precificar', 'concluidos', 'finalizado'] },
      { label: 'Reparado', statuses: ['concluidos', 'finalizado'] },
      { label: 'Concluído', statuses: ['finalizado'] },
    ];
  }

  // Visit service (default)
  return [
    { label: 'Criado', statuses: ['por_fazer', 'em_execucao', 'para_pedir_peca', 'em_espera_de_peca', 'a_precificar', 'concluidos', 'finalizado'] },
    { label: 'Visita', statuses: ['em_execucao', 'para_pedir_peca', 'em_espera_de_peca', 'a_precificar', 'concluidos', 'finalizado'] },
    { label: 'Concluído', statuses: ['concluidos', 'finalizado'] },
    { label: 'Concluído', statuses: ['finalizado'] },
  ];
};

export function ServiceDetailSheet({ service, open, onOpenChange, onServiceUpdated }: ServiceDetailSheetProps) {
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const queryClient = useQueryClient();
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
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showCancelPartSelectionModal, setShowCancelPartSelectionModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<ServicePayment | null>(null);
  const [isDeletingPayment, setIsDeletingPayment] = useState(false);
  
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [isSendingPartNotice, setIsSendingPartNotice] = useState(false);

  // Email Functions
  const handleSendPaymentReminder = async () => {
    if (!service?.customer?.email) {
      toast.error('O cliente não tem email registado.');
      return;
    }
    
    setIsSendingReminder(true);
    try {
      const debtAmount = (safeNumber(service?.final_price) - safeNumber((fullData?.payments || []).reduce((sum: number, p: any) => sum + (Number(p?.amount) || 0), 0))).toFixed(2);
      
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #0b4a99; border-bottom: 2px solid #0b4a99; padding-bottom: 10px;">Aviso de Pagamento Pendente</h2>
          <p>Caro(a) <strong>${service.customer.name}</strong>,</p>
          <p>Verificamos que existe um valor pendente referente à reparação do seu equipamento (Serviço #${service.code}).</p>
          
          <div style="margin: 30px 0; padding: 20px; background-color: #fff3cd; border: 1px solid #ffeeba; border-radius: 5px; text-align: center;">
            <p style="margin: 0; font-size: 16px; color: #856404;">Valor em Débito:</p>
            <p style="margin: 10px 0 0 0; font-size: 24px; font-weight: bold; color: #d39e00;">${debtAmount} €</p>
          </div>
          
          <p>Agradecemos a liquidação do valor com a maior brevidade possível para concluir o processo de faturação.</p>
          <p>Em caso de dúvida ou se já efetuou o pagamento, por favor ignore esta mensagem ou contacte-nos.</p>
          
          <p style="margin-top: 30px; font-size: 12px; color: #888; text-align: center;">Com os melhores cumprimentos,<br>A Equipa Tecnofrio Services</p>
        </div>
      `;
      
      await supabase.functions.invoke('send-email-notification', {
        body: {
          to: service.customer.email,
          subject: `Lembrete de Pagamento - Serviço ${service.code}`,
          html: emailHtml
        }
      });
      
      await logActivity({
        serviceId: service.id,
        actorId: user?.id,
        actionType: 'nota_adicionada',
        description: `Lembrete de pagamento (${debtAmount}€) enviado por email para ${service.customer.email}`,
        isPublic: true,
      });

      toast.success('Lembrete de pagamento enviado com sucesso!');
    } catch (error) {
      console.error('Erro ao enviar lembrete:', error);
      toast.error('Ocorreu um erro ao enviar o lembrete.');
    } finally {
      setIsSendingReminder(false);
    }
  };

  const handleSendPartNotice = async () => {
    if (!service?.customer?.email) {
      toast.error('O cliente não tem email registado.');
      return;
    }
    
    setIsSendingPartNotice(true);
    try {
      const pendingParts = (fullData?.parts || []).filter((p: any) => p.is_requested && !p.arrived);
      const partsListHtml = pendingParts.map((p: any) => `<li>${p.part_name}</li>`).join('');
      
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #e67e22; border-bottom: 2px solid #e67e22; padding-bottom: 10px;">Aviso: A Aguardar Material</h2>
          <p>Caro(a) <strong>${service.customer.name}</strong>,</p>
          <p>Informamos que a reparação do seu equipamento encontra-se de momento a <strong>aguardar a receção do seguinte material</strong> pelos nossos fornecedores:</p>
          
          <ul style="margin: 20px 0; padding-left: 20px; color: #555;">
            ${partsListHtml || '<li>Material de reparação</li>'}
          </ul>
          
          <p>Estaremos a monitorizar a encomenda e entraremos em contacto consigo para agendar a intervenção assim que o material dê entrada nas nossas instalações.</p>
          <p>Agradecemos a sua compreensão e paciência.</p>
          
          <p style="margin-top: 30px; font-size: 12px; color: #888; text-align: center;">Com os melhores cumprimentos,<br>A Equipa Tecnofrio Services</p>
        </div>
      `;
      
      await supabase.functions.invoke('send-email-notification', {
        body: {
          to: service.customer.email,
          subject: `Aviso de Material - Serviço ${service.code}`,
          html: emailHtml
        }
      });
      
      await logActivity({
        serviceId: service.id,
        actorId: user?.id,
        actionType: 'nota_adicionada',
        description: `Aviso "Aguardar Peça" enviado por email para ${service.customer.email}`,
        isPublic: true,
      });

      toast.success('Aviso de espera de peça enviado com sucesso!');
    } catch (error) {
      console.error('Erro ao enviar aviso:', error);
      toast.error('Ocorreu um erro ao enviar o aviso.');
    } finally {
      setIsSendingPartNotice(false);
    }
  };

  // Consolidate status, parts, payments, photos, signatures into one request (logs loaded separately)
  const { data: fullData, isLoading: isLoadingFull } = useFullServiceData(service?.id, open);

  // Load activity logs separately to reduce main query weight
  const { data: activityLogsData } = useQuery({
    queryKey: ['activity-logs', service?.id],
    queryFn: async () => {
      if (!service?.id) return [];
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*, actor:profiles!activity_logs_actor_id_fkey(full_name)')
        .eq('service_id', service.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!service?.id && open,
  });

  const serviceParts = fullData?.parts || [];
  const servicePayments = fullData?.payments || [];
  // photos already sorted in useFullServiceData
  const servicePhotos = fullData?.photos || [];
  const serviceSignatures = fullData?.signatures || [];
  const activityLogs = activityLogsData || [];

  // Resolve registered_by names for service parts
  const partRegisteredByIds = [...new Set(serviceParts.map((p: any) => p?.registered_by).filter(Boolean))];
  const { data: partAuthorProfiles } = useQuery({
    queryKey: ['part-authors', service?.id, partRegisteredByIds.join(',')],
    queryFn: async () => {
      if (!service?.id || partRegisteredByIds.length === 0) return [];
      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', partRegisteredByIds);
      return data || [];
    },
    enabled: !!service?.id && partRegisteredByIds.length > 0 && open,
  });

  const partAuthorMap: Record<string, string> = {};
  (partAuthorProfiles || []).forEach((p: any) => { partAuthorMap[p.user_id] = p.full_name || 'Técnico'; });

  // Group parts by registered_location + registered_by
  const groupedParts = serviceParts.reduce((groups: Record<string, typeof serviceParts>, part: any) => {
    const loc = part.registered_location || 'oficina';
    const by = part.registered_by || 'unknown';
    const key = `${loc}__${by}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(part);
    return groups;
  }, {} as Record<string, typeof serviceParts>);

  // Calculate consolidated financials from parts
  const totalArticlesAmount = serviceParts
    .filter((p: any) => !p.is_requested)
    .reduce((sum: number, p: any) => sum + ((p.cost || 0) * (p.quantity || 1)), 0);

  const totalArticlesIVA = serviceParts
    .filter((p: any) => !p.is_requested)
    .reduce((sum: number, p: any) => sum + (((p.cost || 0) * (p.quantity || 1)) * ((p.iva_rate || 0) / 100)), 0);

  const totalPaidAmount = (servicePayments || []).reduce((sum: number, p: any) => sum + (Number(p?.amount) || 0), 0);

  const handleDeletePart = async (partId: string) => {
    try {
      // Get the part name before updating for the log
      const partToDelete = serviceParts.find(p => p.id === partId);
      const partName = partToDelete?.part_name || 'Artigo';

      // 1. Update part: is_requested = false, estimated_arrival = null
      const { error: updatePartError } = await supabase
        .from('service_parts')
        .update({
          is_requested: false,
          estimated_arrival: null,
          notes: `[Cancelado em ${new Date().toLocaleDateString('pt-PT')}]`
        })
        .eq('id', partId);

      if (updatePartError) throw updatePartError;

      // 2. Log the activity
      await logActivity({
        serviceId: service.id,
        actorId: user?.id,
        actionType: 'cancelamento',
        description: `Cancelado pedido do artigo: ${partName}`,
        isPublic: true,
      });

      // 3. Check if any other parts are still pending
      const remainingPendingParts = serviceParts.filter(
        p => p.id !== partId && p.is_requested && !p.arrived
      );

      if (remainingPendingParts.length === 0) {
        // No more pending parts; restore whatever operational state the
        // service held before the part request, falling back to current
        // status if we don't know.  This keeps the financial axis
        // untouched and avoids hardcoding 'por_fazer'.
        const newStatus = (service.last_status_before_part_request || service.status) as ServiceStatus;
        await updateService.mutateAsync({
          id: service.id,
          status: newStatus,
          last_status_before_part_request: null,
          skipToast: true,
        });
        toast.success(`Artigo "${partName}" cancelado. Estado operacional restaurado.`);
      } else {
        toast.success(`Pedido do artigo "${partName}" cancelado.`);
      }

      queryClient.invalidateQueries({ queryKey: ['service-parts', service.id] });
      queryClient.invalidateQueries({ queryKey: ['full-service-data', service.id] });
    } catch (err) {
      console.error('Error cancelling part:', err);
      toast.error('Erro ao cancelar pedido de peça');
    }
  };


  const handleDeletePhoto = async (photoId: string) => {
    try {
      const { error } = await supabase
        .from('service_photos')
        .delete()
        .eq('id', photoId);

      if (error) throw error;

      if (service?.id) {
        queryClient.invalidateQueries({ queryKey: ['service-photos', service.id] });
        queryClient.invalidateQueries({ queryKey: ['service-full', service.id] });
        queryClient.invalidateQueries({ queryKey: ['service-consult', service.id] });
      }
      toast.success('Foto eliminada com sucesso');
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error('Erro ao eliminar foto');
    }
  };

  // Use fullData (which has fresh customer join) when available, fallback to prop
  const displayService = fullData || service;

  // Priority: pricing_description (admin-edited) > service_parts (technician-registered)
  const centralItems = React.useMemo(() => {
    if (!displayService) return [];
    // If pricing_description exists with items, always use it (it's the admin's final version)
    if (displayService?.pricing_description) {
      try {
        const parsed = JSON.parse(displayService.pricing_description);
        if (parsed.items && Array.isArray(parsed.items) && parsed.items.length > 0) {
          return parsed.items;
        }
      } catch (e) {
        // fall through to service_parts
      }
    }
    return [];
  }, [displayService?.pricing_description]);

  if (!service) return null;

  const statusConfig = SERVICE_STATUS_CONFIG[service.status as keyof typeof SERVICE_STATUS_CONFIG] || { label: 'Desconhecido', color: 'bg-gray-500 text-white' };

  const handleStartExecution = () => {
    if (!service) return;
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

  // Operational transition initiated by owner/admin: mark the
  // service as finished. This touches only the status axis; no
  // financial field is modified here.
  const handleFinalize = async () => {
    if (!service) return;
    try {
      await updateService.mutateAsync({
        id: service.id,
        status: 'finalizado',
        skipToast: true,
      });
      toast.success(`${service.code || 'Serviço'} finalizado com sucesso!`);
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

  const handleCancelService = async () => {
    if (!service) return;
    try {
      // cancellation is an operational decision, but we also clear the
      // financial flag `pending_pricing` because a cancelled job should
      // never appear in the pricing queue. This is a legitimate axis
      // crossover with explicit business intent, not a side effect.
      await updateService.mutateAsync({
        id: service.id,
        status: 'cancelado',
        pending_pricing: false,
        skipToast: true,
      });

      await logActivity({
        serviceId: service.id,
        actorId: user?.id,
        actionType: 'cancelamento',
        description: `Serviço ${service.code || ''} cancelado (colocado em standby).`,
        isPublic: true,
      });

      toast.success(`Serviço ${service.code || ''} cancelado.`);
      setShowCancelDialog(false);
      onServiceUpdated?.();
    } catch (error) {
      console.error('Error cancelling service:', error);
      toast.error('Erro ao cancelar o serviço.');
    }
  };

  const handleReopenService = async () => {
    if (!service) return;
    try {
      await updateService.mutateAsync({
        id: service.id,
        status: 'por_fazer',
        skipToast: true,
      });

      await logActivity({
        serviceId: service.id,
        actorId: user?.id,
        actionType: 'inicio_execucao',
        description: `Serviço ${service.code || ''} reaberto.`,
        isPublic: true,
      });

      toast.success(`Serviço ${service.code || ''} reaberto com sucesso.`);
      onServiceUpdated?.();
    } catch (error) {
      console.error('Error reopening service:', error);
      toast.error('Erro ao reabrir o serviço.');
    }
  };

  const handleModalSuccess = () => {
    onServiceUpdated?.();
  };

  const handleCancelPartOrder = async () => {
    setShowCancelPartSelectionModal(true);
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
                  if (!service) return null;
                  const progressSteps = getServiceProgressSteps(service);
                  const currentStatus = (service.status || 'por_fazer') as ServiceStatus;

                  return (
                    <div className="flex items-center justify-between overflow-x-auto pb-2 gap-1">
                      {progressSteps.map((step, index) => {
                        const isCompleted = step.statuses.includes(currentStatus);
                        const isCurrent = step.statuses.includes(currentStatus) &&
                          (!progressSteps[index + 1] || !progressSteps[index + 1]?.statuses.includes(currentStatus));

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
                {/* Estado principal - sempre primeiro (inclui badge 'A Precificar' se pending_pricing) */}
                <ServiceStatusBadge service={service} />

                {/* Tags complementares */}
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

              </div>

              {/* Customer Info */}
              <Section
                title="Cliente"
                bgColor="bg-blue-50"
                borderColor="border-l-blue-500"
              >
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {displayService.contact_name || displayService.customer?.name || 'Sem cliente'}
                </h3>
                <div className="space-y-1 mt-2 text-sm">
                  {displayService.customer?.nif && (
                    <p className="text-muted-foreground">NIF: {displayService.customer.nif}</p>
                  )}
                  {(displayService.contact_phone || displayService.customer?.phone) && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{displayService.contact_phone || displayService.customer?.phone}</span>
                    </div>
                  )}
                  {(displayService.contact_email || displayService.customer?.email) && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span>{displayService.contact_email || displayService.customer?.email}</span>
                    </div>
                  )}
                  {(displayService.service_address || displayService.customer?.address) && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>
                        {[displayService.service_address || displayService.customer?.address, displayService.service_postal_code || displayService.customer?.postal_code, displayService.service_city || displayService.customer?.city]
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                    </div>
                  )}
                </div>
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
                        ? safeFormat(service.scheduled_date, "d 'de' MMMM", { locale: pt })
                        : 'Não agendado'}
                    </span>
                  </div>
                  {service.scheduled_shift && (
                    <Badge variant="secondary">
                      {formatShiftLabel(service.scheduled_shift)}
                    </Badge>
                  )}
                </div>

                {service?.technician?.profile && (
                  <div className="flex items-center gap-3 mt-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium"
                      style={{ backgroundColor: service?.technician?.color || '#3B82F6' }}
                    >
                      {service?.technician?.profile?.full_name?.charAt(0) || 'T'}
                    </div>
                    <div>
                      <p className="font-medium">{service?.technician?.profile?.full_name}</p>
                      <p className="text-xs text-muted-foreground">Técnico responsável</p>
                    </div>
                  </div>
                )}
              </Section>

              {/* Artigos / Intervenções - Grouped by technician/location or from Central */}
              {(serviceParts.filter((p: any) => !p.is_requested).length > 0 || centralItems.length > 0) && (
                <Section
                  title="Artigos / Intervenções"
                  bgColor="bg-yellow-50"
                  borderColor="border-l-yellow-500"
                >
                  <div className="space-y-4">
                    {serviceParts.filter((p: any) => !p.is_requested).length > 0 ? (
                      Object.entries(groupedParts).map(([key, parts]: [string, any[]]) => {
                        const nonRequestedParts = parts.filter((p: any) => !p.is_requested);
                        if (nonRequestedParts.length === 0) return null;
                        const [loc, byId] = key.split('__');
                        const authorName = partAuthorMap[byId] || 'Técnico';
                        const locationLabel = loc === 'visita' ? 'Visita' : 'Oficina';
                        const groupSubtotal = nonRequestedParts.reduce((sum: number, p: any) => sum + ((p.cost || 0) * (p.quantity || 1)), 0);
                        const firstDate = nonRequestedParts[0]?.created_at;

                        return (
                          <div key={key} className="space-y-2 border rounded-lg p-2 bg-white/50">
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium border-b pb-1 mb-2">
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3 w-3" />
                                <span>{locationLabel}</span>
                                <span>•</span>
                                <User className="h-3 w-3" />
                                <span>{authorName}</span>
                              </div>
                              {firstDate && !isNaN(new Date(firstDate).getTime()) && (
                                <span>{safeFormat(firstDate, 'dd/MM/yyyy', { locale: pt })}</span>
                              )}
                            </div>

                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-muted-foreground border-b border-dashed">
                                  <th className="text-left py-1 font-normal">Ref.</th>
                                  <th className="text-left py-1 font-normal">Descrição</th>
                                  <th className="text-center py-1 font-normal">Qtd</th>
                                  <th className="text-right py-1 font-normal">Preço</th>
                                  <th className="text-right py-1 font-normal">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {nonRequestedParts.map((part: any) => {
                                  const lineTotal = (part.cost || 0) * (part.quantity || 1);
                                  return (
                                    <tr key={part.id} className="border-b border-dashed last:border-0">
                                      <td className="py-2 text-muted-foreground">{part.part_code || '-'}</td>
                                      <td className="py-2 font-medium">{part.part_name}</td>
                                      <td className="py-2 text-center">{part.quantity}</td>
                                      <td className="py-2 text-right">{(Number(part.cost) || 0).toFixed(2)}€</td>
                                      <td className="py-2 text-right font-semibold">{(Number(lineTotal) || 0).toFixed(2)}€</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                            <div className="flex justify-end text-[11px] font-bold border-t pt-1 mt-1 text-primary">
                              Subtotal: {(Number(groupSubtotal) || 0).toFixed(2)} €
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="border rounded-lg p-2 bg-white/50">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-muted-foreground border-b border-dashed">
                              <th className="text-left py-1 font-normal">Ref.</th>
                              <th className="text-left py-1 font-normal">Descrição</th>
                              <th className="text-center py-1 font-normal">Qtd</th>
                              <th className="text-right py-1 font-normal">Preço</th>
                              <th className="text-right py-1 font-normal">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {centralItems.map((item: any, idx: number) => {
                              const qty = Number(item.qty || item.quantity || 1);
                              const price = Number(item.unit_price || item.price || 0);
                              const lineTotal = qty * price;
                              return (
                                <tr key={idx} className="border-b border-dashed last:border-0">
                                  <td className="py-2 text-muted-foreground">{item.ref || item.article || '-'}</td>
                                  <td className="py-2 font-medium">{item.desc || item.description || '-'}</td>
                                  <td className="py-2 text-center">{qty}</td>
                                  <td className="py-2 text-right">{price.toFixed(2)}€</td>
                                  <td className="py-2 text-right font-semibold">{lineTotal.toFixed(2)}€</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </Section>
              )}

              {/* Artigos Encomendados */}
              {serviceParts.filter((p: any) => p.is_requested).length > 0 && (
                <Section
                  title="Artigos Encomendados"
                  bgColor="bg-orange-50"
                  borderColor="border-l-orange-500"
                >
                  <div className="space-y-2">
                    {serviceParts.filter((p: any) => p.is_requested).map((part: any) => (
                      <div key={part.id} className="flex items-center justify-between p-2 bg-background rounded border text-sm">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-orange-600" />
                          <span className="font-medium">{part.part_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={part.arrived ? "bg-green-500 text-white text-xs" : "bg-orange-500 text-white text-xs"}>
                            {part.arrived ? 'Chegou' : 'Pedida'}
                          </Badge>
                          {role === 'dono' && !part.arrived && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                if (window.confirm('Tem a certeza que deseja cancelar este pedido de peça?')) {
                                  handleDeletePart(part.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Consolidated Financial Summary */}
              {(totalArticlesAmount > 0 || service.final_price > 0 || service.labor_cost > 0) && (
                <Section
                  title="Resumo Financeiro"
                  bgColor="bg-emerald-50"
                  borderColor="border-l-emerald-500"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal Artigos</span>
                      <span className="font-medium">{(Number(totalArticlesAmount) || 0).toFixed(2)} €</span>
                    </div>
                    {totalArticlesIVA > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">IVA</span>
                        <span className="font-medium">{totalArticlesIVA.toFixed(2)} €</span>
                      </div>
                    )}
                    {safeNumber(service?.labor_cost) > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Mão de obra</span>
                        <span className="font-medium">{safeNumber(service?.labor_cost).toFixed(2)} €</span>
                      </div>
                    )}
                    {safeNumber(service?.discount) > 0 && (
                      <div className="flex justify-between items-center text-sm text-destructive">
                        <span>Desconto</span>
                        <span>-{safeNumber(service?.discount).toFixed(2)} €</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>Total</span>
                      <span className="text-primary">{safeNumber(service?.final_price).toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between items-center text-sm pt-2">
                      <span className="text-muted-foreground">Total Pago</span>
                      <span>{safeNumber(totalPaidAmount).toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-medium border-t border-dashed pt-2">
                      <span>Restante</span>
                      <span>{(safeNumber(service?.final_price) - safeNumber(totalPaidAmount)).toFixed(2)} €</span>
                    </div>
                    {safeNumber(service?.final_price) > 0 && safeNumber(totalPaidAmount) < safeNumber(service?.final_price) && (
                      <div className="flex flex-col gap-2 mt-2">
                        <div className="flex justify-between text-sm font-medium p-2 rounded bg-destructive/10 text-destructive">
                          <span>🔴 Em Débito</span>
                          <span>{(safeNumber(service?.final_price) - safeNumber(totalPaidAmount)).toFixed(2)} €</span>
                        </div>
                        {(role === 'dono' || role === 'secretaria') && service.customer?.email && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full border-destructive text-destructive hover:bg-destructive hover:text-white transition-colors"
                            onClick={handleSendPaymentReminder}
                            disabled={isSendingReminder}
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            {isSendingReminder ? 'A enviar lembrete...' : 'Enviar Lembrete de Pagamento'}
                          </Button>
                        )}
                        {(role === 'dono' || role === 'secretaria') && !service.customer?.email && (
                          <div className="text-[10px] text-center text-muted-foreground uppercase">
                            Para enviar lembrete, edite a ficha e adicione um email.
                          </div>
                        )}
                      </div>
                    )}
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
                              <p className="font-medium">{(Number(payment.amount) || 0).toFixed(2)} €</p>
                              <p className="text-xs text-muted-foreground">
                                {safeFormat(payment.payment_date, "dd/MM/yyyy", { locale: pt })}
                                {payment.payment_method && ` • ${payment.payment_method.toUpperCase()}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {payment.description && (
                              <span className="text-xs text-muted-foreground max-w-[150px] truncate">
                                {payment.description}
                              </span>
                            )}
                            {role === 'dono' && (
                              <button
                                onClick={() => setPaymentToDelete(payment)}
                                className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                                title="Apagar pagamento"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between pt-2 border-t font-medium text-sm">
                      <span>Total Pago:</span>
                      <span className="font-medium text-primary">
                        {((servicePayments || []).reduce((sum, p) => sum + safeNumber(p?.amount), 0)).toFixed(2)} €
                      </span>
                    </div>
                  </div>
                </Section>
              )}

              {/* Service Photos */}
              {(isLoadingFull || servicePhotos.length > 0) && (
                <Section
                  title="Fotos do Serviço"
                  bgColor="bg-indigo-50"
                  borderColor="border-l-indigo-500"
                >
                  {isLoadingFull ? (
                    <div className="grid grid-cols-3 gap-2">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="w-full h-20 rounded" />
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-2">
                        {servicePhotos.map((photo, idx) => (
                          <div key={photo.id} className="flex flex-col gap-1">
                            <div className="relative cursor-pointer" onClick={() => setSelectedPhotoIndex(idx)}>
                              <LazyImage
                                src={photo.file_url}
                                alt={photo.description || 'Foto do serviço'}
                                className="w-full h-20 object-cover rounded border hover:opacity-80 transition-opacity"
                              />
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
                    </>
                  )}
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
                          <LazyImage
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
                            {safeFormat(sig.signed_at, "dd/MM/yyyy 'às' HH:mm", { locale: pt })}
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
              onCancelPartOrder={(role === 'dono' || role === 'secretaria') ? handleCancelPartOrder : undefined}
              onNotifyPartWait={(role === 'dono' || role === 'secretaria') ? handleSendPartNotice : undefined}
              onCancel={(role === 'dono' || role === 'secretaria') && service.status !== 'cancelado' && service.status !== 'finalizado' ? () => setShowCancelDialog(true) : undefined}
              onReopen={(role === 'dono' || role === 'secretaria') && service.status === 'cancelado' ? handleReopenService : undefined}
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

      <CancelPartSelectionModal
        open={showCancelPartSelectionModal}
        onOpenChange={setShowCancelPartSelectionModal}
        service={service}
        onSuccess={handleModalSuccess}
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

      {/* Cancel (Deactivate) Service Confirmation */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar Serviço</AlertDialogTitle>
            <AlertDialogDescription>
              O serviço <strong>{service.code}</strong> ficará inativo e visualmente marcado como cancelado.
              Todos os registos, fotos e histórico serão preservados. Pode reativar o serviço a qualquer momento via &quot;Mudar Status (Forçado)&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelService}
              className="bg-muted text-muted-foreground hover:bg-muted/80"
            >
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Payment Confirmation */}
      <AlertDialog open={!!paymentToDelete} onOpenChange={(open) => !open && setPaymentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar Pagamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja apagar o pagamento de{' '}
              <strong>{paymentToDelete?.amount.toFixed(2)} €</strong>
              {paymentToDelete?.payment_date && ` do dia ${safeFormat(paymentToDelete.payment_date, "dd/MM/yyyy", { locale: pt })}`}
              ? O saldo do serviço será recalculado automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingPayment}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeletingPayment}
              onClick={async (e) => {
                e.preventDefault();
                if (!paymentToDelete || !service) return;
                setIsDeletingPayment(true);
                try {
                  const { error: delError } = await supabase
                    .from('service_payments')
                    .delete()
                    .eq('id', paymentToDelete.id);
                  if (delError) throw delError;

                  // Recalculate amount_paid from remaining payments
                  const { data: remaining, error: sumError } = await supabase
                    .from('service_payments')
                    .select('amount')
                    .eq('service_id', service.id);
                  if (sumError) throw sumError;

                  const newTotal = (remaining || []).reduce((s, p) => s + (Number(p?.amount) || 0), 0);
                  await updateService.mutateAsync({
                    id: service.id,
                    amount_paid: newTotal,
                    skipToast: true,
                  });

                  queryClient.invalidateQueries({ queryKey: ['service-payments'] });
                  queryClient.invalidateQueries({ queryKey: ['full-service-data'] });
                  setPaymentToDelete(null);
                  const newTotalPaid = (service?.amount_paid || 0) - (paymentToDelete?.amount || 0);
                  toast.success(`Pagamento de ${safeNumber(paymentToDelete?.amount).toFixed(2)} € eliminado. Novo total pago: ${safeNumber(newTotalPaid).toFixed(2)} €`);
                } catch (error) {
                  console.error('Error deleting payment:', error);
                  toast.error(humanizeError(error));
                } finally {
                  setIsDeletingPayment(false);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingPayment ? 'A eliminar...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Photo Lightbox Overlay */}
      {/* Photo Gallery Modal */}
      {servicePhotos.length > 0 && (
        <PhotoGalleryModal
          photos={servicePhotos}
          initialIndex={selectedPhotoIndex || 0}
          open={selectedPhotoIndex !== null}
          onOpenChange={(open) => !open && setSelectedPhotoIndex(null)}
          onDelete={(role === 'dono' || role === 'secretaria') ? handleDeletePhoto : undefined}
        />
      )}
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
  peca_encomendada: { icon: Clock, bgColor: 'bg-blue-50', iconColor: 'text-blue-500' },
  peca_chegou: { icon: CheckCircle, bgColor: 'bg-green-100', iconColor: 'text-green-600' },
  conclusao: { icon: CheckCircle2, bgColor: 'bg-emerald-100', iconColor: 'text-emerald-600' },
  precificacao: { icon: DollarSign, bgColor: 'bg-purple-100', iconColor: 'text-purple-600' },
  pagamento: { icon: CreditCard, bgColor: 'bg-teal-100', iconColor: 'text-teal-600' },
  entrega: { icon: Truck, bgColor: 'bg-green-100', iconColor: 'text-green-600' },
  tarefa: { icon: ClipboardList, bgColor: 'bg-gray-100', iconColor: 'text-gray-600' },
  nota_adicionada: { icon: Pencil, bgColor: 'bg-amber-100', iconColor: 'text-amber-600' },
  criacao: { icon: Plus, bgColor: 'bg-blue-50', iconColor: 'text-blue-600' },
  cancelamento: { icon: X, bgColor: 'bg-red-100', iconColor: 'text-red-600' },
  servico_editado: { icon: Pencil, bgColor: 'bg-slate-100', iconColor: 'text-slate-600' },
  transferencia_solicitada: { icon: UserPlus, bgColor: 'bg-indigo-50', iconColor: 'text-indigo-600' },
  transferencia_aceite: { icon: CheckCircle2, bgColor: 'bg-green-50', iconColor: 'text-green-600' },
  transferencia_recusada: { icon: X, bgColor: 'bg-red-50', iconColor: 'text-red-600' },
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
          {safeFormat(log.created_at, "dd/MM/yyyy 'às' HH:mm", { locale: pt })}
        </p>
      </div>
    </div>
  );
}
