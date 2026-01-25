import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Printer, Snowflake } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SERVICE_STATUS_CONFIG } from '@/types/database';
import type { Service } from '@/types/database';

interface ServicePrintModalProps {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ServicePrintModal({ service, open, onOpenChange }: ServicePrintModalProps) {
  if (!service) return null;

  const handlePrint = () => {
    window.print();
  };

  const statusConfig = SERVICE_STATUS_CONFIG[service.status];
  const qrData = JSON.stringify({ code: service.code, id: service.id });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Pré-visualização da Ficha</DialogTitle>
          <Button onClick={handlePrint} size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </DialogHeader>

        {/* Printable Content */}
        <div className="border rounded-lg p-6 bg-white print:border-0 print:p-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Snowflake className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold">TECNOFRIO</span>
            </div>
            <div className="text-right">
              <h1 className="text-xl font-bold">Ficha de Serviço</h1>
            </div>
          </div>

          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-lg font-mono font-bold">Código: {service.code}</p>
              <p className="text-sm text-muted-foreground">
                Data de Entrada: {format(new Date(service.created_at), "dd/MM/yyyy HH:mm", { locale: pt })}
              </p>
            </div>
            <QRCodeSVG value={qrData} size={80} level="M" />
          </div>

          <Separator className="my-4" />

          {/* Customer Data */}
          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-3 border-b pb-1">Dados do Cliente</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Nome:</span>{' '}
                <span className="font-medium">{service.customer?.name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Contribuinte:</span>{' '}
                <span className="font-medium">{service.customer?.nif || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Telefone:</span>{' '}
                <span className="font-medium">{service.customer?.phone || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Email:</span>{' '}
                <span className="font-medium">{service.customer?.email || 'N/A'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Morada:</span>{' '}
                <span className="font-medium">
                  {[service.customer?.address, service.customer?.postal_code, service.customer?.city]
                    .filter(Boolean)
                    .join(', ') || 'N/A'}
                </span>
              </div>
            </div>
          </section>

          <Separator className="my-4" />

          {/* Service Details */}
          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-3 border-b pb-1">Detalhes do Serviço</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Categoria:</span>{' '}
                <span className="font-medium capitalize">{service.service_type || 'Reparação'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Tipo:</span>{' '}
                <span className="font-medium">
                  {service.service_location === 'cliente' ? 'Visita' : 'Oficina'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Localização:</span>{' '}
                <span className="font-medium capitalize">{service.service_location || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Estado:</span>{' '}
                <span className="font-medium">{statusConfig?.label || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Prioridade:</span>{' '}
                <span className="font-medium">{service.is_urgent ? 'Urgente' : 'Normal'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Data Agendada:</span>{' '}
                <span className="font-medium">
                  {service.scheduled_date 
                    ? format(new Date(service.scheduled_date), "dd/MM/yyyy", { locale: pt })
                    : 'Não agendado'}
                </span>
              </div>
            </div>
          </section>

          <Separator className="my-4" />

          {/* Equipment Details */}
          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-3 border-b pb-1">Detalhes do Equipamento</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Tipo:</span>{' '}
                <span className="font-medium">{service.appliance_type || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Marca:</span>{' '}
                <span className="font-medium">{service.brand || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Modelo:</span>{' '}
                <span className="font-medium">{service.model || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Nº Série:</span>{' '}
                <span className="font-medium">{service.serial_number || 'N/A'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Avaria Reportada:</span>{' '}
                <span className="font-medium">{service.fault_description || 'N/A'}</span>
              </div>
            </div>
          </section>

          <Separator className="my-4" />

          {/* Terms */}
          <section className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
            <h3 className="font-semibold text-amber-800 mb-2">IMPORTANTE - Termos de Guarda</h3>
            <p className="text-amber-700 text-xs leading-relaxed">
              O equipamento será guardado pelo período máximo de 30 dias após a conclusão do serviço 
              ou notificação do orçamento. Após este prazo, a empresa reserva-se o direito de 
              dispor do equipamento sem qualquer responsabilidade. O cliente é responsável pelo 
              levantamento do equipamento dentro do prazo estipulado.
            </p>
          </section>

          {/* Signature Area */}
          <div className="grid grid-cols-2 gap-8 mt-8 pt-4">
            <div className="border-t border-gray-400 pt-2">
              <p className="text-xs text-muted-foreground text-center">Assinatura do Cliente</p>
            </div>
            <div className="border-t border-gray-400 pt-2">
              <p className="text-xs text-muted-foreground text-center">Assinatura do Funcionário</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
