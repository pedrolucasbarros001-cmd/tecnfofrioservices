import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, ChevronDown, MapPin, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { WeeklyAgenda } from '@/components/agenda/WeeklyAgenda';
import { CreateServiceModal } from '@/components/modals/CreateServiceModal';
import { CreateInstallationModal } from '@/components/modals/CreateInstallationModal';
import { CreateDeliveryModal } from '@/components/modals/CreateDeliveryModal';
import { AssignTechnicianModal } from '@/components/modals/AssignTechnicianModal';
import { SetPriceModal } from '@/components/modals/SetPriceModal';
import { RegisterPaymentModal } from '@/components/modals/RegisterPaymentModal';
import { RequestPartModal } from '@/components/modals/RequestPartModal';
import { ConfirmPartOrderModal } from '@/components/modals/ConfirmPartOrderModal';
import { PartArrivedModal } from '@/components/modals/PartArrivedModal';
import { DeliveryManagementModal } from '@/components/modals/DeliveryManagementModal';
import { AssignDeliveryModal } from '@/components/modals/AssignDeliveryModal';
import { ForceStateModal } from '@/components/modals/ForceStateModal';
import { ContactClientModal } from '@/components/modals/ContactClientModal';
import { RescheduleServiceModal } from '@/components/modals/RescheduleServiceModal';
import { EditServiceDetailsModal } from '@/components/modals/EditServiceDetailsModal';
import { ServiceDetailSheet } from '@/components/services/ServiceDetailSheet';
import { StateActionButtons } from '@/components/services/StateActionButtons';
import { PartArrivalIndicator } from '@/components/shared/PartArrivalIndicator';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { usePaginatedServices, useUpdateService, useDeleteService } from '@/hooks/useServices';
import { SERVICE_STATUS_CONFIG, SHIFT_CONFIG, type Service, type ServiceStatus } from '@/types/database';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
export default function GeralPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<ServiceStatus | 'all'>(searchParams.get('status') as ServiceStatus || 'all');
  const PAGE_SIZE = 50;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Current service for actions
  const [currentService, setCurrentService] = useState<Service | null>(null);

  // Modals - Creation
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showInstallationModal, setShowInstallationModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);

  // Modals - Management
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showSetPriceModal, setShowSetPriceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRequestPartModal, setShowRequestPartModal] = useState(false);
  const [showDeliveryMgmtModal, setShowDeliveryMgmtModal] = useState(false);
  const [showAssignDeliveryModal, setShowAssignDeliveryModal] = useState(false);
  const [showForceStateModal, setShowForceStateModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showConfirmPartOrderModal, setShowConfirmPartOrderModal] = useState(false);
  const [showPartArrivedModal, setShowPartArrivedModal] = useState(false);
  const [showEditDetailsModal, setShowEditDetailsModal] = useState(false);
  // Detail sheet
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  // Mapear "a_precificar" do URL para "pending_pricing" (todos com pending_pricing=true)
  const effectiveStatus = selectedStatus === 'a_precificar' ? 'pending_pricing' : selectedStatus;
  
  const {
    data: result,
    isLoading
  } = usePaginatedServices({
    status: effectiveStatus as any,
    page: currentPage,
    pageSize: PAGE_SIZE,
    searchTerm: debouncedSearch || undefined,
  });

  const services = result?.data || [];
  const totalCount = result?.totalCount || 0;
  const totalPages = result?.totalPages || 0;
  
  // Fetch pending parts for all services (for the thermometer indicator)
  const { data: pendingPartsMap = {} } = useQuery({
    queryKey: ['all-pending-parts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_parts')
        .select('service_id, estimated_arrival')
        .eq('is_requested', true)
        .eq('arrived', false);
      if (error) throw error;
      const map: Record<string, string | null> = {};
      (data || []).forEach(part => {
        if (!map[part.service_id] || (part.estimated_arrival && (!map[part.service_id] || part.estimated_arrival < map[part.service_id]!))) {
          map[part.service_id] = part.estimated_arrival;
        }
      });
      return map;
    },
  });
  
  const updateService = useUpdateService();
  const deleteService = useDeleteService();
  const filteredServices = services;
  const handleStatusFilter = (status: ServiceStatus | 'all') => {
    setSelectedStatus(status);
    setCurrentPage(1);
    if (status === 'all') {
      searchParams.delete('status');
    } else {
      searchParams.set('status', status);
    }
    setSearchParams(searchParams);
  };
  const handleServiceClick = (service: Service) => {
    setSelectedService(service);
    setShowDetailSheet(true);
  };

  // Action handlers
  const handleAssignTechnician = (service: Service) => {
    setCurrentService(service);
    setShowAssignModal(true);
  };
  const handleSetPrice = (service: Service) => {
    setCurrentService(service);
    setShowSetPriceModal(true);
  };
  const handleRegisterPayment = (service: Service) => {
    setCurrentService(service);
    setShowPaymentModal(true);
  };
  const handleRequestPart = (service: Service) => {
    setCurrentService(service);
    setShowRequestPartModal(true);
  };
  const handleManageDelivery = (service: Service) => {
    setCurrentService(service);
    setShowDeliveryMgmtModal(true);
  };
  const handleAssignDelivery = () => {
    setShowAssignDeliveryModal(true);
  };
  const handleForceState = (service: Service) => {
    setCurrentService(service);
    setShowForceStateModal(true);
  };
  const handleContactClient = (service: Service) => {
    setCurrentService(service);
    setShowContactModal(true);
  };
  const handleDeleteService = (service: Service) => {
    setCurrentService(service);
    setShowDeleteDialog(true);
  };
  const handleReschedule = (service: Service) => {
    setCurrentService(service);
    setShowRescheduleModal(true);
  };
  const confirmDelete = async () => {
    if (!currentService) return;
    try {
      await deleteService.mutateAsync(currentService.id);
      setShowDeleteDialog(false);
      setCurrentService(null);
    } catch (error) {
      console.error('Error deleting service:', error);
    }
  };
  const handleFinalize = async (service: Service) => {
    try {
      await updateService.mutateAsync({
        id: service.id,
        status: 'finalizado',
        service_location: 'entregue'
      });
      toast.success('Serviço concluído!');
    } catch (error) {
      console.error('Error finalizing service:', error);
    }
  };
  // Handler to open the confirm part order modal
  const handleConfirmPartOrder = (service: Service) => {
    setCurrentService(service);
    setShowConfirmPartOrderModal(true);
  };

  // Handler to open the part arrived modal
  const handleMarkPartArrived = (service: Service) => {
    setCurrentService(service);
    setShowPartArrivedModal(true);
  };
  const handleEditDetails = (service: Service) => {
    setCurrentService(service);
    setShowEditDetailsModal(true);
  };
  return <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" data-tour="geral-header">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestão Geral</h1>
          <p className="text-muted-foreground">Gerir todos os serviços</p>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="shrink-0" data-tour="new-service-btn">
              Novo Serviço
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover">
            <DropdownMenuItem onClick={() => setShowServiceModal(true)}>
              Nova Reparação
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowInstallationModal(true)}>
              Nova Instalação
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowDeliveryModal(true)}>
              Nova Entrega Direta
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md" data-tour="search-bar">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Pesquisar por código, cliente, equipamento..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
      </div>

      {/* Status Filter */}
      

      {/* Weekly Agenda - only show when no status filter */}
      {selectedStatus === 'all' && <WeeklyAgenda services={services} onServiceClick={handleServiceClick} />}

      {/* Services Table */}
      <Card data-tour="services-table">
        <CardContent className="p-0">
          {isLoading ? <div className="text-center py-12 text-muted-foreground">
              A carregar serviços...
            </div> : filteredServices.length === 0 ? <div className="py-12 text-center text-muted-foreground">
              {searchTerm || selectedStatus !== 'all' ? 'Nenhum serviço encontrado com os filtros aplicados.' : 'Ainda não existem serviços. Crie o primeiro!'}
            </div> : <div className="overflow-x-auto">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Tipo</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Técnico</TableHead>
                    <TableHead>Data + Turno</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
              {filteredServices.map(service => {
              const statusConfig = SERVICE_STATUS_CONFIG[service.status];
              
              // Type config based on service_type and service_location
              const getTypeConfig = () => {
                if (service.service_type === 'instalacao') {
                  return { label: 'INSTALAÇÃO', variant: 'type-instalacao' as const };
                }
                if (service.service_type === 'entrega') {
                  return { label: 'ENTREGA', variant: 'type-entrega' as const };
                }
                // Reparação - diferenciando por visita vs oficina
                if (service.service_location === 'cliente') {
                  return { label: 'REPARAÇÃO', variant: 'type-visita' as const };
                }
                return { label: 'REPARAÇÃO', variant: 'type-oficina' as const };
              };
              const typeConfig = getTypeConfig();
              
              return <TableRow key={service.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleServiceClick(service)}>
                      {/* Tipo - discrete badge */}
                      <TableCell>
                        <Badge variant={typeConfig.variant}>{typeConfig.label}</Badge>
                      </TableCell>
                      
                      {/* Código */}
                      <TableCell className="font-mono font-semibold text-primary">
                        {service.code}
                      </TableCell>
                      
                      {/* Cliente */}
                      <TableCell className="font-medium">
                        {service.customer?.name || 'Sem cliente'}
                      </TableCell>
                      
                      {/* Aparelho e Avaria */}
                      <TableCell>
                        <p className="font-medium text-sm">
                          {[service.appliance_type, service.brand].filter(Boolean).join(' ') || '-'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {service.fault_description || '-'}
                        </p>
                      </TableCell>
                      
                      {/* Estado */}
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge className={statusConfig.color}>
                            {statusConfig.label}
                          </Badge>
                          {/* Part arrival indicator for services waiting for parts */}
                          {service.status === 'em_espera_de_peca' && (
                            <PartArrivalIndicator 
                              estimatedArrival={pendingPartsMap[service.id] || null} 
                            />
                          )}
                        </div>
                      </TableCell>
                      
                      {/* Tags - Discrete, informative, not dominant */}
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {/* Urgente - subtle but noticeable */}
                          {service.is_urgent && (
                            <Badge variant="subtle-urgent" className="text-xs">Urgente</Badge>
                          )}
                          
                          {/* Garantia - subtle */}
                          {service.is_warranty && (
                            <Badge variant="subtle-warranty" className="text-xs">Garantia</Badge>
                          )}
                          
                          {/* A Precificar - só mostra se estado NÃO for a_precificar */}
                          {service.pending_pricing && service.status !== 'a_precificar' && (
                            <Badge variant="subtle-pricing" className="text-xs">A Precificar</Badge>
                          )}
                          
                          {/* Em Débito - indica débito quando estado principal é outro */}
                          {service.status !== 'em_debito' && 
                           (service.final_price || 0) > 0 && 
                           (service.amount_paid || 0) < (service.final_price || 0) && (
                            <Badge variant="subtle-debit" className="text-xs">Em Débito</Badge>
                          )}
                        </div>
                      </TableCell>
                      
                      {/* Técnico */}
                      <TableCell>
                        {service.technician?.profile ? <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium" style={{
                      backgroundColor: service.technician.color || '#3B82F6'
                    }}>
                              {service.technician.profile.full_name?.charAt(0) || 'T'}
                            </div>
                            <span className="text-sm">{service.technician.profile.full_name}</span>
                          </div> : <span className="text-muted-foreground text-sm">-</span>}
                      </TableCell>
                      
                      {/* Data + Turno */}
                      <TableCell>
                        {service.scheduled_date ? <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              {format(new Date(service.scheduled_date), 'dd/MM/yy', {
                        locale: pt
                      })}
                            </div>
                            {service.scheduled_shift && <Badge variant="outline" className="text-xs capitalize">
                                {SHIFT_CONFIG[service.scheduled_shift as keyof typeof SHIFT_CONFIG]?.label || service.scheduled_shift}
                              </Badge>}
                          </div> : <span className="text-muted-foreground text-sm">-</span>}
                      </TableCell>
                      
                      {/* Ações */}
                      <TableCell className="text-right">
                        <StateActionButtons service={service} onAssignTechnician={() => handleAssignTechnician(service)} onViewDetails={() => handleServiceClick(service)} onSetPrice={() => handleSetPrice(service)} onRegisterPayment={() => handleRegisterPayment(service)} onRequestPart={() => handleRequestPart(service)} onManageDelivery={() => handleManageDelivery(service)} onFinalize={() => handleFinalize(service)} onConfirmPartOrder={() => handleConfirmPartOrder(service)} onMarkPartArrived={() => handleMarkPartArrived(service)} onForceState={() => handleForceState(service)} onContactClient={() => handleContactClient(service)} onDelete={() => handleDeleteService(service)} onReschedule={() => handleReschedule(service)} onEditDetails={() => handleEditDetails(service)} />
                      </TableCell>
                    </TableRow>;
            })}
              </TableBody>
            </Table>
          </div>}
        </CardContent>
      </Card>

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={PAGE_SIZE}
        onPageChange={setCurrentPage}
        itemLabel="serviço"
      />

      {/* Creation Modals */}
      <CreateServiceModal open={showServiceModal} onOpenChange={setShowServiceModal} />
      <CreateInstallationModal open={showInstallationModal} onOpenChange={setShowInstallationModal} />
      <CreateDeliveryModal open={showDeliveryModal} onOpenChange={setShowDeliveryModal} />
      
      {/* Management Modals */}
      <AssignTechnicianModal service={currentService} open={showAssignModal} onOpenChange={setShowAssignModal} />
      <SetPriceModal service={currentService} open={showSetPriceModal} onOpenChange={setShowSetPriceModal} />
      <RegisterPaymentModal service={currentService} open={showPaymentModal} onOpenChange={setShowPaymentModal} />
      <RequestPartModal service={currentService} open={showRequestPartModal} onOpenChange={setShowRequestPartModal} requireSignature={currentService?.service_location === 'cliente'} />
      <ConfirmPartOrderModal service={currentService} open={showConfirmPartOrderModal} onOpenChange={setShowConfirmPartOrderModal} />
      <PartArrivedModal service={currentService} open={showPartArrivedModal} onOpenChange={setShowPartArrivedModal} />
      <DeliveryManagementModal service={currentService} open={showDeliveryMgmtModal} onOpenChange={setShowDeliveryMgmtModal} onAssignDelivery={handleAssignDelivery} />
      <AssignDeliveryModal service={currentService} open={showAssignDeliveryModal} onOpenChange={setShowAssignDeliveryModal} />
      <ForceStateModal service={currentService} open={showForceStateModal} onOpenChange={setShowForceStateModal} />
      <ContactClientModal service={currentService} open={showContactModal} onOpenChange={setShowContactModal} />
      <RescheduleServiceModal service={currentService} open={showRescheduleModal} onOpenChange={setShowRescheduleModal} />
      <EditServiceDetailsModal open={showEditDetailsModal} onOpenChange={setShowEditDetailsModal} service={currentService} onSuccess={() => {}} />

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Eliminação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja eliminar o serviço {currentService?.code}? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Detail Sheet */}
      <ServiceDetailSheet service={selectedService} open={showDetailSheet} onOpenChange={setShowDetailSheet} />
    </div>;
}