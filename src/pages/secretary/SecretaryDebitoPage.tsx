import { useState } from 'react';
import { DollarSign, Phone } from 'lucide-react';
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
import { RegisterPaymentModal } from '@/components/modals/RegisterPaymentModal';
import { ContactClientModal } from '@/components/modals/ContactClientModal';
import { ServiceDetailSheet } from '@/components/services/ServiceDetailSheet';
import { useServices } from '@/hooks/useServices';
import { CustomerLink } from '@/components/shared/CustomerLink';
import type { Service } from '@/types/database';

export default function SecretaryDebitoPage() {
  const [currentService, setCurrentService] = useState<Service | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showDetailSheet, setShowDetailSheet] = useState(false);

  const { data: allServices = [], isLoading } = useServices({ status: 'all' });

  // Filter services with pending payment
  const debitServices = allServices.filter((service) => {
    const finalPrice = service.final_price || 0;
    const amountPaid = service.amount_paid || 0;
    return finalPrice > 0 && amountPaid < finalPrice;
  });

  const totalDebit = debitServices.reduce((sum, service) => {
    const pending = (service.final_price || 0) - (service.amount_paid || 0);
    return sum + pending;
  }, 0);

  const handleRegisterPayment = (service: Service) => {
    setCurrentService(service);
    setShowPaymentModal(true);
  };

  const handleContactClient = (service: Service) => {
    setCurrentService(service);
    setShowContactModal(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div data-tour="debito-header" data-demo="debito-header">
        <h1 className="text-2xl font-bold tracking-tight">Em Débito</h1>
        <p className="text-muted-foreground">
          Serviços com preço definido e saldo pendente.
        </p>
      </div>

      {/* Services Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Serviços com Pagamento Pendente
            <Badge variant="destructive">{debitServices.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              A carregar...
            </div>
          ) : debitServices.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Não há serviços em débito. Excelente!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Aparelho</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead className="text-right">Já Pago</TableHead>
                  <TableHead className="text-right">Em Falta</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {debitServices.map((service) => {
                  const finalPrice = service.final_price || 0;
                  const amountPaid = service.amount_paid || 0;
                  const pending = finalPrice - amountPaid;

                  return (
                    <TableRow
                      key={service.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedService(service);
                        setShowDetailSheet(true);
                      }}
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
                      <TableCell className="text-right font-medium">
                        {formatCurrency(finalPrice)}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatCurrency(amountPaid)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-bold text-destructive">
                          {formatCurrency(pending)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleContactClient(service)}
                          >
                            <Phone className="h-4 w-4 mr-1" />
                            Contactar
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleRegisterPayment(service)}
                          >
                            <DollarSign className="h-4 w-4 mr-1" />
                            Registrar
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
      <RegisterPaymentModal
        service={currentService}
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
      />
      <ContactClientModal
        service={currentService}
        open={showContactModal}
        onOpenChange={setShowContactModal}
      />

      {/* Service Detail Sheet */}
      <ServiceDetailSheet
        service={selectedService}
        open={showDetailSheet}
        onOpenChange={setShowDetailSheet}
      />
    </div>
  );
}
