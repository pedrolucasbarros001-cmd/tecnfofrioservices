import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, ChevronDown } from 'lucide-react';
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
import { WeeklyAgenda } from '@/components/agenda/WeeklyAgenda';
import { ServiceTypeSelector, type ServiceCreationType } from '@/components/modals/ServiceTypeSelector';
import { CreateServiceModal } from '@/components/modals/CreateServiceModal';
import { CreateInstallationModal } from '@/components/modals/CreateInstallationModal';
import { CreateDeliveryModal } from '@/components/modals/CreateDeliveryModal';
import { ServiceDetailSheet } from '@/components/services/ServiceDetailSheet';
import { useServices } from '@/hooks/useServices';
import { SERVICE_STATUS_CONFIG, type Service, type ServiceStatus } from '@/types/database';
import { Calendar } from 'lucide-react';

export default function GeralPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<ServiceStatus | 'all'>(
    (searchParams.get('status') as ServiceStatus) || 'all'
  );
  
  // Modals
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showInstallationModal, setShowInstallationModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  
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

  const handleServiceTypeSelect = (type: ServiceCreationType) => {
    if (type === 'reparacao') setShowServiceModal(true);
    else if (type === 'instalacao') setShowInstallationModal(true);
    else if (type === 'entrega') setShowDeliveryModal(true);
  };

  const handleServiceClick = (service: Service) => {
    setSelectedService(service);
    setShowDetailSheet(true);
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

      {/* Services List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            A carregar serviços...
          </div>
        ) : filteredServices.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {searchTerm || selectedStatus !== 'all'
                ? 'Nenhum serviço encontrado com os filtros aplicados.'
                : 'Ainda não existem serviços. Crie o primeiro!'}
            </CardContent>
          </Card>
        ) : (
          filteredServices.map((service) => {
            const statusConfig = SERVICE_STATUS_CONFIG[service.status];
            return (
              <Card
                key={service.id}
                className="cursor-pointer hover:shadow-md transition-all"
                onClick={() => handleServiceClick(service)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-semibold text-primary">
                          {service.code}
                        </span>
                        <Badge className={statusConfig.color}>
                          {statusConfig.label}
                        </Badge>
                        {service.is_urgent && (
                          <Badge variant="destructive" className="animate-pulse">Urgente</Badge>
                        )}
                        {service.is_warranty && (
                          <Badge className="bg-purple-500 text-white">Garantia</Badge>
                        )}
                      </div>
                      <p className="font-medium truncate">
                        {service.customer?.name || 'Cliente não definido'}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {[service.appliance_type, service.brand, service.model]
                          .filter(Boolean)
                          .join(' • ') || 'Equipamento não definido'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {service.scheduled_date && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(service.scheduled_date).toLocaleDateString('pt-PT')}
                        </div>
                      )}
                      {service.technician?.profile && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {service.technician.profile.full_name}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        {filteredServices.length} serviço{filteredServices.length !== 1 ? 's' : ''} encontrado{filteredServices.length !== 1 ? 's' : ''}
      </p>

      {/* Modals */}
      <ServiceTypeSelector
        open={showTypeSelector}
        onOpenChange={setShowTypeSelector}
        onSelect={handleServiceTypeSelect}
      />
      <CreateServiceModal open={showServiceModal} onOpenChange={setShowServiceModal} />
      <CreateInstallationModal open={showInstallationModal} onOpenChange={setShowInstallationModal} />
      <CreateDeliveryModal open={showDeliveryModal} onOpenChange={setShowDeliveryModal} />
      
      {/* Detail Sheet */}
      <ServiceDetailSheet
        service={selectedService}
        open={showDetailSheet}
        onOpenChange={setShowDetailSheet}
      />
    </div>
  );
}
