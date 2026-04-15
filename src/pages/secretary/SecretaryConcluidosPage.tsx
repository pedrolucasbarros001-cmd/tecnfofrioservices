import { useState } from 'react';
import type { Service } from '@/types/database';
import { CheckCircle2, Truck, Phone, Clock, BadgeCheck, MoreHorizontal } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DeliveryManagementModal } from '@/components/modals/DeliveryManagementModal';
import { AssignDeliveryModal } from '@/components/modals/AssignDeliveryModal';
import { ContactClientModal } from '@/components/modals/ContactClientModal';
import { useServices, useUpdateService } from '@/hooks/useServices';
import { toast } from 'sonner';
import { CustomerLink } from '@/components/shared/CustomerLink';

export default function SecretaryConcluidosPage() {
  const [currentService, setCurrentService] = useState<Service | null>(null);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showAssignDeliveryModal, setShowAssignDeliveryModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  const { role } = useAuth();
  const isDono = role === 'dono';
  const queryClient = useQueryClient();

  const { data: services = [], isLoading } = useServices({ status: 'concluidos' });
  const updateService = useUpdateService();

  // Filter only services in workshop (status concluidos)
  const workshopServices = services.filter(
    (s) => s.service_location === 'oficina'
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

  const handleConfirmOwner = async (service: Service) => {
    try {
      const { error } = await supabase
        .from('services')
        .update({
          owner_confirmed: true,
          owner_confirmed_at: new Date().toISOString(),
        } as any)
        .eq('id', service.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success(`Pagamento do serviço ${service.code} confirmado.`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao confirmar pagamento.');
    }
  };

  const getDaysInWorkshop = (service: Service) => {
    if (!service.created_at) return 0;
    return differenceInDays(new Date(), new Date(service.created_at));
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div data-tour="concluidos-header" data-demo="concluidos-header">
        <h1 className="text-2xl font-bold tracking-tight">Oficina Reparados</h1>
        <p className="text-muted-foreground">
          Serviços reparados na oficina aguardando entrega ou recolha
        </p>
      </div>

      {/* Services Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Serviços Reparados na Oficina
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
              Não há serviços reparados aguardando entrega.
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
                  <TableHead>Confirmação</TableHead>
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
                        <CustomerLink customer={service.customer} />
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
                      <TableCell>
                        {service.final_price > 0 && service.amount_paid >= service.final_price ? (
                          service.owner_confirmed ? (
                            <Badge className="bg-green-600 text-white flex items-center gap-1 w-fit">
                              <BadgeCheck className="h-3 w-3" />
                              Confirmado
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-400 text-amber-900 w-fit">
                              Pendente Confirmação
                            </Badge>
                          )
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
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
                          {isDono && service.final_price > 0 && service.amount_paid >= service.final_price && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-popover">
                                {!service.owner_confirmed ? (
                                  <DropdownMenuItem
                                    onClick={() => handleConfirmOwner(service)}
                                    className="text-green-700 font-medium"
                                  >
                                    <BadgeCheck className="h-4 w-4 mr-2" />
                                    Confirmar Pagamento Recebido
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem disabled>
                                    <BadgeCheck className="h-4 w-4 mr-2 text-green-600" />
                                    Pagamento Confirmado ✓
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
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
