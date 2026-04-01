import { useState } from 'react';
import { useRealtime } from '@/hooks/useRealtime';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateServiceQueries } from '@/lib/queryInvalidation';
import { DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ServiceDetailSheet } from '@/components/services/ServiceDetailSheet';
import { StateActionButtons } from '@/components/services/StateActionButtons';
import { UploadDocumentModal } from '@/components/services/UploadDocumentModal';
import { SetPriceModal } from '@/components/modals/SetPriceModal';
import { SERVICE_STATUS_CONFIG } from '@/types/database';
import { CustomerLink } from '@/components/shared/CustomerLink';
import type { Service } from '@/types/database';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useServices } from '@/hooks/useServices';

export default function SecretaryPrecificarPage() {
  const queryClient = useQueryClient();
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [showSetPriceModal, setShowSetPriceModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [priceService, setPriceService] = useState<Service | null>(null);

  const { data: allServices = [], isLoading } = useServices({ status: 'all' });

  // Filter services with pending_pricing = true
  const precificarServices = allServices.filter((s) => s.pending_pricing === true);

  const handleRowClick = (service: Service) => {
    setSelectedService(service);
    setShowDetailSheet(true);
  };

  const handleSetPrice = (service: Service, e: React.MouseEvent) => {
    e.stopPropagation();
    setPriceService(service);
    setShowSetPriceModal(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Orçamentar</h1>
        <p className="text-muted-foreground">
          Serviços concluídos que aguardam definição de preço.
        </p>
      </div>

      <div className="border rounded-lg">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">A carregar...</div>
        ) : precificarServices.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            Não há serviços a precificar. Excelente!
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Aparelho</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {precificarServices.map((service) => {
                const statusConfig = SERVICE_STATUS_CONFIG[service.status];
                return (
                  <TableRow
                    key={service.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(service)}
                  >
                    <TableCell className="font-mono font-semibold text-primary">
                      {service.code}
                    </TableCell>
                    <TableCell className="font-medium">
                      <CustomerLink customer={service.customer} />
                    </TableCell>
                    <TableCell>
                      {[service.appliance_type, service.brand]
                        .filter(Boolean)
                        .join(' ') || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusConfig?.color}>
                        {statusConfig?.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {service.updated_at && !isNaN(new Date(service.updated_at).getTime())
                        ? format(new Date(service.updated_at), "dd/MM/yyyy", { locale: pt })
                        : "Data indisponível"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div onClick={(e) => e.stopPropagation()}>
                        <StateActionButtons
                          service={service}
                          onAssignTechnician={() => {
                            setSelectedService(service);
                            setShowDetailSheet(true);
                          }}
                          onViewDetails={() => {
                            setSelectedService(service);
                            setShowDetailSheet(true);
                          }}
                          onSetPrice={() => {
                            setPriceService(service);
                            setShowSetPriceModal(true);
                          }}
                          onAttachDocument={() => {
                            setSelectedService(service);
                            setShowUploadModal(true);
                          }}
                          viewContext="a_precificar"
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <ServiceDetailSheet
        service={selectedService}
        open={showDetailSheet}
        onOpenChange={setShowDetailSheet}
        onServiceUpdated={() => invalidateServiceQueries(queryClient)}
      />

      <SetPriceModal
        service={priceService}
        open={showSetPriceModal}
        onOpenChange={(open) => {
          setShowSetPriceModal(open);
          if (!open) invalidateServiceQueries(queryClient);
        }}
      />

      <UploadDocumentModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        serviceId={selectedService?.id || ''}
      />
    </div>
  );
}
