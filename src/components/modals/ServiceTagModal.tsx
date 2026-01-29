import { createPortal } from 'react-dom';
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
    printServiceTag();
  };

  // Generate a full URL for QR code that redirects to the appropriate technician flow
  const qrData = `${window.location.origin}/technician/service/${service.id}`;

  // Print content component - rendered via portal for printing
  const PrintTagContent = () => (
    <div className="print-portal print-only">
      <div className="print-tag">
        <div style={{ borderTop: '4px solid #0066cc', marginBottom: '12px' }} />
        
        <div style={{ textAlign: 'center' }}>
          {/* Logo */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
            <img 
              src={tecnofrioLogoFull} 
              alt="TECNOFRIO" 
              style={{ height: '36px', objectFit: 'contain' }}
            />
          </div>
          
          {/* QR Code */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
            <div style={{ border: '1px solid #e5e7eb', padding: '8px', borderRadius: '8px', backgroundColor: 'white' }}>
              <QRCodeSVG
                value={qrData}
                size={140}
                level="H"
                includeMargin={false}
              />
            </div>
          </div>
          
          {/* Service Code */}
          <p className="service-code" style={{ fontSize: '20px', fontFamily: 'monospace', fontWeight: 'bold', letterSpacing: '2px', margin: '12px 0' }}>
            {service.code}
          </p>
          
          {/* Service Details */}
          <div style={{ textAlign: 'left', padding: '0 8px', fontSize: '11px' }}>
            <p style={{ marginBottom: '4px' }}>
              <span style={{ color: '#666' }}>Cliente:</span>{' '}
              <span style={{ fontWeight: '500' }}>{service.customer?.name || 'N/A'}</span>
            </p>
            <p style={{ marginBottom: '4px' }}>
              <span style={{ color: '#666' }}>Equipamento:</span>{' '}
              <span style={{ fontWeight: '500' }}>
                {[service.appliance_type, service.brand].filter(Boolean).join(' ') || 'N/A'}
              </span>
            </p>
            <p style={{ marginBottom: '4px' }}>
              <span style={{ color: '#666' }}>Telefone:</span>{' '}
              <span style={{ fontWeight: '500' }}>{service.customer?.phone || 'N/A'}</span>
            </p>
          </div>
          
          {/* Footer Note */}
          <p style={{ fontSize: '9px', color: '#666', padding: '8px', borderTop: '1px solid #e5e7eb', marginTop: '8px' }}>
            Leia o QR Code para ver detalhes e histórico online
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Etiqueta de Serviço - {service.code}</DialogTitle>
          </DialogHeader>

          {/* Tag content - preview on screen */}
          <div className="border rounded-lg p-4 bg-card">
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

      {/* Print Portal - rendered directly in body, hidden on screen */}
      {open && createPortal(<PrintTagContent />, document.body)}
    </>
  );
}
