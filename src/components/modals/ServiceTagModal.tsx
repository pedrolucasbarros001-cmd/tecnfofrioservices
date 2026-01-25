import { QRCodeSVG } from 'qrcode.react';
import { Printer, Snowflake } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { Service } from '@/types/database';

interface ServiceTagModalProps {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ServiceTagModal({ service, open, onOpenChange }: ServiceTagModalProps) {
  if (!service) return null;

  const handlePrint = () => {
    window.print();
  };

  const qrData = JSON.stringify({
    code: service.code,
    id: service.id,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Etiqueta de Serviço - {service.code}</DialogTitle>
        </DialogHeader>

        <div className="print:block">
          <Separator className="bg-primary h-1 my-4" />
          
          <div className="text-center space-y-4">
            {/* Logo/Brand */}
            <div className="flex items-center justify-center gap-2">
              <Snowflake className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold">TECNOFRIO</span>
            </div>
            
            {/* QR Code */}
            <div className="flex justify-center py-4">
              <QRCodeSVG
                value={qrData}
                size={180}
                level="H"
                includeMargin
                className="border p-2 rounded-lg"
              />
            </div>
            
            {/* Service Code */}
            <p className="text-3xl font-mono font-bold tracking-wider">
              {service.code}
            </p>
            
            {/* Service Details */}
            <div className="text-left space-y-1 px-4">
              <p className="text-sm">
                <span className="text-muted-foreground">Cliente:</span>{' '}
                <span className="font-medium">{service.customer?.name || 'N/A'}</span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Equipamento:</span>{' '}
                <span className="font-medium">
                  {[service.appliance_type, service.brand].filter(Boolean).join(' ') || 'N/A'}
                </span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Telefone:</span>{' '}
                <span className="font-medium">{service.customer?.phone || 'N/A'}</span>
              </p>
            </div>
            
            {/* Footer Note */}
            <p className="text-xs text-muted-foreground px-4 pt-2">
              Leia o QR Code para ver detalhes e histórico online
            </p>
          </div>
          
          <Separator className="my-4" />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir Etiqueta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
