import { QRCodeSVG } from 'qrcode.react';
import { Printer } from 'lucide-react';
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
import tecnofrioLogoFull from '@/assets/tecnofrio-logo-full.png';
import { printServiceTag } from '@/utils/printUtils';

interface ServiceTagModalProps {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ServiceTagModal({ service, open, onOpenChange }: ServiceTagModalProps) {
  if (!service) return null;

  const handlePrint = () => {
    printServiceTag('print-service-tag');
  };

  // Generate a full URL for QR code that redirects to the appropriate technician flow
  const qrData = `${window.location.origin}/technician/service/${service.id}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Etiqueta de Serviço - {service.code}</DialogTitle>
        </DialogHeader>

        {/* Tag content - this will be printed */}
        <div id="print-service-tag" className="border rounded-lg p-4 bg-card">
          <Separator className="bg-primary h-1 mb-4" />
          
          <div className="text-center space-y-3">
            {/* Logo/Brand */}
            <div className="flex items-center justify-center">
              <img 
                src={tecnofrioLogoFull} 
                alt="TECNOFRIO" 
                className="h-10 object-contain"
              />
            </div>
            
            {/* QR Code */}
            <div className="flex justify-center py-2">
              <QRCodeSVG
                value={qrData}
                size={140}
                level="H"
                includeMargin={false}
                className="border p-2 rounded-lg bg-white"
              />
            </div>
            
            {/* Service Code */}
            <p className="text-2xl font-mono font-bold tracking-wider text-foreground">
              {service.code}
            </p>
            
            {/* Service Details */}
            <div className="text-left space-y-1 px-2 text-sm">
              <p>
                <span className="text-muted-foreground">Cliente:</span>{' '}
                <span className="font-medium text-foreground">{service.customer?.name || 'N/A'}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Equipamento:</span>{' '}
                <span className="font-medium text-foreground">
                  {[service.appliance_type, service.brand].filter(Boolean).join(' ') || 'N/A'}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground">Telefone:</span>{' '}
                <span className="font-medium text-foreground">{service.customer?.phone || 'N/A'}</span>
              </p>
            </div>
            
            {/* Footer Note */}
            <p className="text-xs text-muted-foreground px-2 pt-1 border-t">
              Leia o QR Code para ver detalhes e histórico online
            </p>
          </div>
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
