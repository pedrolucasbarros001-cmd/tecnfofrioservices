import { useState } from 'react';
import { Wrench, Send, UserPlus, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ServiceDetailSheet } from '@/components/services/ServiceDetailSheet';
import { AssignTechnicianModal } from '@/components/modals/AssignTechnicianModal';
import { SendTaskModal } from '@/components/modals/SendTaskModal';
import { useServices } from '@/hooks/useServices';
import { SERVICE_STATUS_CONFIG, type Service } from '@/types/database';
import { cn } from '@/lib/utils';

export default function OficinaPage() {
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [serviceToAssign, setServiceToAssign] = useState<Service | null>(null);

  const { data: services = [], isLoading } = useServices({ location: 'oficina' });

  const handleServiceClick = (service: Service) => {
    setSelectedService(service);
    setShowDetailSheet(true);
  };

  const handleAssignClick = (e: React.MouseEvent, service: Service) => {
    e.stopPropagation();
    setServiceToAssign(service);
    setShowAssignModal(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10">
            <Wrench className="h-6 w-6 text-purple-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Oficina</h1>
            <p className="text-muted-foreground">Serviços atualmente na oficina</p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setShowTaskModal(true)}>
            <Send className="h-4 w-4 mr-2" />
            Enviar Tarefa
          </Button>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            A carregar serviços...
          </div>
        ) : services.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhum serviço na oficina.
            </CardContent>
          </Card>
        ) : (
          services.map((service) => {
            const statusConfig = SERVICE_STATUS_CONFIG[service.status as keyof typeof SERVICE_STATUS_CONFIG];
            const hasTechnician = !!service.technician;

            return (
              <Card
                key={service.id}
                className={cn(
                  "cursor-pointer hover:shadow-lg transition-all border-l-4",
                  service.is_urgent ? "border-l-red-500" : "border-l-purple-500"
                )}
                onClick={() => handleServiceClick(service)}
              >
                <CardContent className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-mono text-xl font-bold text-primary">
                        {service.code}
                      </p>
                      <Badge className={cn("mt-1", statusConfig?.color || "bg-gray-500")}>
                        {statusConfig?.label || service.status}
                      </Badge>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      {service.is_urgent && (
                        <Badge variant="destructive" className="animate-pulse flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Urgente
                        </Badge>
                      )}
                      {service.is_warranty && (
                        <Badge variant="outline" className="text-blue-600 border-blue-600">
                          Garantia
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Separator className="my-3" />

                  {/* Customer & Equipment */}
                  <div className="mb-3">
                    <p className="font-semibold text-lg truncate">
                      {service.customer?.name || 'Cliente não definido'}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {[service.appliance_type, service.brand, service.model]
                        .filter(Boolean)
                        .join(' • ') || 'Equipamento não especificado'}
                    </p>
                  </div>

                  {/* Fault Description */}
                  {service.fault_description && (
                    <div className="bg-muted/50 rounded-lg p-3 mb-3">
                      <p className="text-xs text-muted-foreground uppercase mb-1">Avaria</p>
                      <p className="text-sm line-clamp-2">{service.fault_description}</p>
                    </div>
                  )}

                  <Separator className="my-3" />

                  {/* Technician Section */}
                  {hasTechnician ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                          style={{ backgroundColor: service.technician?.color || '#3B82F6' }}
                        >
                          {service.technician?.profile?.full_name?.charAt(0) || 'T'}
                        </div>
                        <span className="text-sm font-medium">
                          {service.technician?.profile?.full_name}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => handleAssignClick(e, service)}
                      >
                        Reatribuir
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-yellow-500/10 p-3 rounded-lg">
                      <div className="flex items-center gap-2 text-yellow-600">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">Sem Técnico</span>
                      </div>
                      <Button
                        size="sm"
                        onClick={(e) => handleAssignClick(e, service)}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Atribuir
                      </Button>
                    </div>
                  )}

                  {/* Entry Time */}
                  <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      Entrada: {format(new Date(service.created_at), "dd/MM 'às' HH:mm")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Modals */}
      <ServiceDetailSheet
        service={selectedService}
        open={showDetailSheet}
        onOpenChange={setShowDetailSheet}
      />

      <AssignTechnicianModal
        service={serviceToAssign}
        open={showAssignModal}
        onOpenChange={setShowAssignModal}
      />

      <SendTaskModal
        open={showTaskModal}
        onOpenChange={setShowTaskModal}
      />
    </div>
  );
}
