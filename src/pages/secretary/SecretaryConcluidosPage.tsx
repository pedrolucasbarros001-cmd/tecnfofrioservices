import { useState } from 'react';
import { CheckCircle2, Truck, Phone, Clock } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DeliveryManagementModal } from '@/components/modals/DeliveryManagementModal';
import { AssignDeliveryModal } from '@/components/modals/AssignDeliveryModal';
import { ContactClientModal } from '@/components/modals/ContactClientModal';
import { useServices, useUpdateService } from '@/hooks/useServices';
import type { Service } from '@/types/database';
import { toast } from 'sonner';

export default function SecretaryConcluidosPage() {
  const [currentService, setCurrentService] = useState<Service | null>(null);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showAssignDeliveryModal, setShowAssignDeliveryModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  const { data: services = [], isLoading } = useServices({ status: 'concluidos' });
  const updateService = useUpdateService();

  // Filter only services in workshop awaiting delivery
  const workshopServices = services.filter(
    (s) => s.service_location === 'oficina' && !s.delivery_method
  );

  const handleManageDelivery = (service: Service) => {
    setCurrentService(service);
    setShowDeliveryModal(true);
  };

  const handleAssignDelivery = () => {
    setShowDeliveryModal(false);
    setShowAssignDeliveryModal(true);
  };

  const handleMarkPickedUp = async (service: Service) => {
    try {
      await updateService.mutateAsync({
        id: service.id,
        status: 'finalizado',
        service_location: 'entregue',
        pickup_date: new Date().toISOString(),
      });
      toast.success('Serviço finalizado - Cliente recolheu');
    } catch (error) {
      console.error('Error finalizing service:', error);
    }
  };

  const handleContactClient = (service: Service) => {
    setCurrentService(service);
    setShowContactModal(true);
  };

  const getDaysInWorkshop = (service: Service) => {
    if (!service.created_at) return 0;
    return differenceInDays(new Date(), new Date(service.created_at));
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Concluídos</h1>
        <p className="text-muted-foreground">
          Serviços tecnicamente concluídos aguardando entrega ou recolha
        </p>
      </div>

      {/* Services Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Serviços Concluídos na Oficina
            <Badge variant="secondary">{workshopServices.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              A carregar...
            </div>
          ) : workshopServices.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Não há serviços concluídos aguardando entrega.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Aparelho</TableHead>
                  <TableHead>Tempo na Oficina</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workshopServices.map((service) => {
                  const daysInWorkshop = getDaysInWorkshop(service);
                  const isOld = daysInWorkshop > 30;

                  return (
                    <TableRow
                      key={service.id}
                      className={isOld ? 'bg-destructive/5' : ''}
                    >
                      <TableCell className="font-mono font-semibold text-primary">
                        {service.code}
                      </TableCell>
                      <TableCell className="font-medium">
                        {service.customer?.name || 'Sem cliente'}
                      </TableCell>
                      <TableCell>{service.customer?.phone || '-'}</TableCell>
                      <TableCell>
                        {[service.appliance_type, service.brand]
                          .filter(Boolean)
                          .join(' ') || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={isOld ? 'destructive' : 'secondary'}
                        >
                          {daysInWorkshop} dias
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {service.delivery_method === 'client_pickup' ? (
                          <Badge variant="outline">Cliente Recolhe</Badge>
                        ) : service.delivery_technician_id ? (
                          <Badge className="bg-blue-500">Técnico Atribuído</Badge>
                        ) : (
                          <Badge variant="secondary">Não definido</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          {service.delivery_method === 'client_pickup' ? (
                            <Button
                              size="sm"
                              onClick={() => handleMarkPickedUp(service)}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Dar Baixa
                            </Button>
                          ) : !service.delivery_method ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleManageDelivery(service)}
                            >
                              <Truck className="h-4 w-4 mr-1" />
                              Gerir Entrega
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleContactClient(service)}
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <DeliveryManagementModal
        service={currentService}
        open={showDeliveryModal}
        onOpenChange={setShowDeliveryModal}
        onAssignDelivery={handleAssignDelivery}
      />
      <AssignDeliveryModal
        service={currentService}
        open={showAssignDeliveryModal}
        onOpenChange={setShowAssignDeliveryModal}
      />
      <ContactClientModal
        service={currentService}
        open={showContactModal}
        onOpenChange={setShowContactModal}
      />
    </div>
  );
}
