import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, ChevronDown, MapPin, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { WeeklyAgenda } from '@/components/agenda/WeeklyAgenda';
import { CreateServiceModal } from '@/components/modals/CreateServiceModal';
import { CreateInstallationModal } from '@/components/modals/CreateInstallationModal';
import { CreateDeliveryModal } from '@/components/modals/CreateDeliveryModal';
import { AssignTechnicianModal } from '@/components/modals/AssignTechnicianModal';
import { ServiceDetailSheet } from '@/components/services/ServiceDetailSheet';
import { StateActionButtons } from '@/components/services/StateActionButtons';
import { useServices } from '@/hooks/useServices';
import { SERVICE_STATUS_CONFIG, SHIFT_CONFIG, type Service, type ServiceStatus } from '@/types/database';

export default function GeralPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<ServiceStatus | 'all'>(
    (searchParams.get('status') as ServiceStatus) || 'all'
  );
  
  // Modals
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showInstallationModal, setShowInstallationModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [serviceToAssign, setServiceToAssign] = useState<Service | null>(null);
  
  // Detail sheet
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showDetailSheet, setShowDetailSheet] = useState(false);

  const { data: services = [], isLoading } = useServices({ status: selectedStatus });

  const filteredServices = services.filter((service) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      service.code?.toLowerCase().includes(search) ||
      service.customer?.name?.toLowerCase().includes(search) ||
      service.appliance_type?.toLowerCase().includes(search) ||
      service.brand?.toLowerCase().includes(search)
    );
  });

  const handleStatusFilter = (status: ServiceStatus | 'all') => {
    setSelectedStatus(status);
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

  const handleAssignTechnician = (service: Service) => {
    setServiceToAssign(service);
    setShowAssignModal(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestão Geral</h1>
          <p className="text-muted-foreground">Gerir todos os serviços</p>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="shrink-0">
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
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por código, cliente, equipamento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <Button
          variant={selectedStatus === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleStatusFilter('all')}
          className="shrink-0"
        >
          Todos
        </Button>
        {Object.entries(SERVICE_STATUS_CONFIG).map(([status, config]) => (
          <Button
            key={status}
            variant={selectedStatus === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleStatusFilter(status as ServiceStatus)}
            className="shrink-0"
          >
            {config.label}
          </Button>
        ))}
      </div>

      {/* Weekly Agenda - only show when no status filter */}
      {selectedStatus === 'all' && (
        <WeeklyAgenda
          services={services}
          onServiceClick={handleServiceClick}
        />
      )}

      {/* Services Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              A carregar serviços...
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {searchTerm || selectedStatus !== 'all'
                ? 'Nenhum serviço encontrado com os filtros aplicados.'
                : 'Ainda não existem serviços. Crie o primeiro!'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Tipo</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Aparelho e Avaria</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Técnico</TableHead>
                  <TableHead>Data + Turno</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.map((service) => {
                  const statusConfig = SERVICE_STATUS_CONFIG[service.status];
                  const isVisit = service.service_location === 'cliente';
                  
                  return (
                    <TableRow
                      key={service.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleServiceClick(service)}
                    >
                      {/* Tipo */}
                      <TableCell>
                        {isVisit ? (
                          <MapPin className="h-5 w-5 text-blue-500" />
                        ) : (
                          <Badge variant="secondary" className="text-xs">OFICINA</Badge>
                        )}
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
                        <Badge className={statusConfig.color}>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      
                      {/* Tags */}
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {service.pending_pricing && (
                            <Badge className="bg-yellow-500 text-black text-xs">A Precificar</Badge>
                          )}
                          {service.is_urgent && (
                            <Badge variant="destructive" className="text-xs animate-pulse">Urgente</Badge>
                          )}
                          {service.is_warranty && (
                            <Badge className="bg-purple-500 text-white text-xs">Garantia</Badge>
                          )}
                        </div>
                      </TableCell>
                      
                      {/* Técnico */}
                      <TableCell>
                        {service.technician?.profile ? (
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                              style={{ backgroundColor: service.technician.color || '#3B82F6' }}
                            >
                              {service.technician.profile.full_name?.charAt(0) || 'T'}
                            </div>
                            <span className="text-sm">{service.technician.profile.full_name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      
                      {/* Data + Turno */}
                      <TableCell>
                        {service.scheduled_date ? (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              {format(new Date(service.scheduled_date), 'dd/MM/yy', { locale: pt })}
                            </div>
                            {service.scheduled_shift && (
                              <Badge variant="outline" className="text-xs capitalize">
                                {SHIFT_CONFIG[service.scheduled_shift as keyof typeof SHIFT_CONFIG]?.label || service.scheduled_shift}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      
                      {/* Ações */}
                      <TableCell className="text-right">
                        <StateActionButtons
                          service={service}
                          onAssignTechnician={() => handleAssignTechnician(service)}
                          onViewDetails={() => handleServiceClick(service)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        {filteredServices.length} serviço{filteredServices.length !== 1 ? 's' : ''} encontrado{filteredServices.length !== 1 ? 's' : ''}
      </p>

      {/* Modals */}
      <CreateServiceModal open={showServiceModal} onOpenChange={setShowServiceModal} />
      <CreateInstallationModal open={showInstallationModal} onOpenChange={setShowInstallationModal} />
      <CreateDeliveryModal open={showDeliveryModal} onOpenChange={setShowDeliveryModal} />
      <AssignTechnicianModal
        service={serviceToAssign}
        open={showAssignModal}
        onOpenChange={setShowAssignModal}
      />
      
      {/* Detail Sheet */}
      <ServiceDetailSheet
        service={selectedService}
        open={showDetailSheet}
        onOpenChange={setShowDetailSheet}
      />
    </div>
  );
}
